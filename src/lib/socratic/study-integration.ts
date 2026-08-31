/**
 * SOCRATIC STUDY INTEGRATION SERVICE (Fase 7.3.3)
 *
 * Conecta o Socratic Engine (7.3.1) e RAG Jurídico (7.3.2) ao fluxo real de estudo:
 * Questão → resposta do aluno → avaliação → Socratic Engine → RAG Jurídico → pista →
 * nova tentativa → consolidação → Evidence Layer → Knowledge Engine → Review Engine.
 *
 * REGRAS DE OURO:
 * 1. O Professor Fiscal guia o raciocínio socrático com fundamentação jurídica (RAG).
 * 2. Os motores determinísticos (Knowledge, Error Central, Review Engine) mantêm a autoridade do estado.
 * 3. Toda interação socrática relevante emite evidência cognitiva unificada com source: "socratic_tutor".
 */

import { supabase } from "@/integrations/supabase/client";
import {
  submitAnswer,
  type SubmitAnswerInput,
  type SubmitAnswerResult,
} from "@/lib/questions/attempt-service";
import { processLegalSocraticTurn } from "@/lib/legal/service";
import { retrieveLegalSources } from "@/lib/legal/retrieval";
import { recordCognitiveEvidence } from "@/lib/evidence/service";
import { remediateErrorEntry } from "@/lib/error-central/service";
import { recordReviewEvent, getTopicReviewDecision } from "@/lib/review/service";
import {
  saveSocraticSession,
  loadSocraticSession,
  emitSocraticCognitiveEvidence,
} from "./socratic-persistence";
import type {
  SocraticPedagogicalMode,
  SocraticSessionContext,
  SocraticServiceResult,
  SocraticQuestionContext,
} from "./types";
import type { LegalEvidenceMetadata, LegalSource } from "@/lib/legal/types";
import type { DeclaredConfidence } from "@/lib/evidence/types";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS E CONTRATOS
// ─────────────────────────────────────────────────────────────────────────────

export type StartSocraticSessionInput = {
  sessionId?: string;
  topicId: string;
  topicName: string;
  subjectName?: string;
  questionContext?: {
    questionId?: string;
    statement: string;
    options?: string[];
    correctAnswer?: string;
    targetConcept?: string;
    expectedReasoning?: string;
  };
  pedagogicalMode?: SocraticPedagogicalMode;
  errorContext?: {
    errorCategory?: string;
    errorPattern?: string;
    isRecurring?: boolean;
    errorEntryId?: string;
  };
  reviewType?: string;
  contextMetadata?: Record<string, unknown>;
};

export type ProcessSocraticTurnInput = {
  socraticContext: SocraticSessionContext;
  studentAnswerText?: string;
  forceRefresh?: boolean;
  customSources?: LegalSource[];
};

export type IntegratedSocraticResult = {
  socraticResult: SocraticServiceResult & { legalEvidenceMetadata?: LegalEvidenceMetadata };
  evidenceProcessed: boolean;
  consolidated: boolean;
};

export type SubmitAnswerWithSocraticInput = SubmitAnswerInput & {
  enableSocraticTutor?: boolean;
  existingSocraticContext?: SocraticSessionContext;
  questionStatement?: string;
  options?: string[];
  correctAnswer?: string;
  topicName?: string;
  subjectName?: string;
};

export type SubmitAnswerWithSocraticResult = SubmitAnswerResult & {
  socraticContext?: SocraticSessionContext;
  socraticResponse?: SocraticServiceResult["response"];
  legalEvidenceMetadata?: LegalEvidenceMetadata;
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DE CRIAÇÃO E INICIALIZAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inicializa uma nova sessão socrática vinculada a uma questão, sessão de estudo,
 * erro ou revisão.
 */
export function startStudySocraticSession(
  input: StartSocraticSessionInput,
): SocraticSessionContext {
  const sessionId =
    input.sessionId || `socratic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const mode: SocraticPedagogicalMode =
    input.pedagogicalMode ||
    (input.errorContext
      ? "ERROR_REMEDIATION"
      : input.reviewType
        ? "REVIEW"
        : input.questionContext
          ? "QUESTION_ANALYSIS"
          : "CONCEPTUAL_REASONING");

  const questionCtx: SocraticQuestionContext | undefined = input.questionContext
    ? {
        id: input.questionContext.questionId,
        questionId: input.questionContext.questionId,
        statement: input.questionContext.statement,
        options: input.questionContext.options,
        correctAnswer: input.questionContext.correctAnswer,
        targetConcept: input.questionContext.targetConcept || input.topicName,
        expectedReasoning: input.questionContext.expectedReasoning,
      }
    : undefined;

  const ctx: SocraticSessionContext = {
    sessionId,
    topicId: input.topicId,
    topicName: input.topicName,
    subjectName: input.subjectName,
    pedagogicalGoal: questionCtx
      ? `Compreender o fundamento de ${questionCtx.targetConcept}`
      : `Dominar os conceitos essenciais de ${input.topicName}`,
    pedagogicalMode: mode,
    currentState: "QUESTION",
    currentTurnNumber: 1,
    hintLevel: 0,
    currentQuestion: questionCtx,
    turnHistory: [],
    constraints: {
      maxHints: 3,
      maxTurns: 6,
      allowDirectExplanationAfterMaxHints: true,
    },
    validTopicNames: [input.topicName],
    contextMetadata: {
      ...(input.contextMetadata || {}),
      ...(input.errorContext ? { errorContext: input.errorContext } : {}),
      ...(input.reviewType ? { reviewType: input.reviewType } : {}),
    },
  };

  saveSocraticSession(ctx).catch(() => {});
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUÇÃO DO TURNO SOCRÁTICO + GROUNDING + EVIDENCE (FASE 7.3.4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa um turno socrático com grounding jurídico, persiste a sessão e emite
 * evidências cognitivas socráticas com idempotência e sanitização.
 */
export async function executeStudySocraticTurn(
  input: ProcessSocraticTurnInput,
): Promise<IntegratedSocraticResult> {
  // 1. Processar o turno socrático com grounding jurídico
  const socraticResult = await processLegalSocraticTurn(
    input.socraticContext,
    input.studentAnswerText,
    {
      forceRefresh: input.forceRefresh,
      customSources: input.customSources,
    },
  );

  const updatedContext = socraticResult.updatedContext;
  const lastTurn = updatedContext.turnHistory[updatedContext.turnHistory.length - 1];

  // 2. Persistir o estado atualizado da sessão socrática (Fase 7.3.4)
  await saveSocraticSession(updatedContext);

  // 3. Mapear e emitir as evidências cognitivas de forma idempotente e sanitizada (Fase 7.3.4)
  const emitResult = await emitSocraticCognitiveEvidence({
    socraticContext: updatedContext,
    lastTurn,
    socraticResponse: socraticResult.response,
    legalEvidenceMetadata: socraticResult.legalEvidenceMetadata,
  });

  const isCompleted =
    socraticResult.status === "concluido" || updatedContext.currentState === "COMPLETED";
  const isConsolidating =
    updatedContext.currentState === "CONSOLIDATING" || updatedContext.currentState === "CORRECTING";

  return {
    socraticResult,
    evidenceProcessed: emitResult.processed,
    consolidated: isCompleted || isConsolidating,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRAÇÃO COM SUBMISSÃO DE QUESTÕES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submete uma resposta de questão e, caso o aluno erre ou solicite orientação,
 * ativa/avança o diálogo socrático com fundamentação jurídica RAG e persistência cognitiva.
 */
export async function submitAnswerWithSocraticFeedback(
  input: SubmitAnswerWithSocraticInput,
): Promise<SubmitAnswerWithSocraticResult> {
  // 1. Submeter resposta na via oficial do attempt-service (atualiza stats, question_attempts, error_entries, knowledge)
  const attemptResult = await submitAnswer(input);

  if (!input.enableSocraticTutor) {
    return attemptResult;
  }

  // 2. Se a resposta foi incorreta ou o tutor socrático estiver ativo, engajar o Professor Fiscal
  try {
    let socraticCtx = input.existingSocraticContext;

    if (!socraticCtx && input.sessionId) {
      socraticCtx = (await loadSocraticSession(input.sessionId)) || undefined;
    }

    if (!socraticCtx) {
      socraticCtx = startStudySocraticSession({
        sessionId: input.sessionId || undefined,
        topicId: attemptResult.feedback.topicId || "topico_desconhecido",
        topicName: input.topicName || "Direito Tributário",
        subjectName: input.subjectName,
        questionContext: {
          questionId: input.questionId,
          statement: input.questionStatement || "Questão de prova",
          options: input.options,
          correctAnswer: input.correctAnswer,
        },
        pedagogicalMode: input.isCorrect ? "QUESTION_ANALYSIS" : "ERROR_REMEDIATION",
        errorContext: attemptResult.errorEntryId
          ? {
              errorEntryId: attemptResult.errorEntryId,
              errorCategory: attemptResult.feedback.suggestedErrorCategory || "interpretação",
            }
          : undefined,
      });
    }

    // 3. Processar turno socrático fundamentado nas leis com persistência de evidência
    const turnResult = await executeStudySocraticTurn({
      socraticContext: socraticCtx,
      studentAnswerText: `Minha resposta foi a alternativa "${input.chosenAnswer}". Resultado: ${input.isCorrect ? "CORRETO" : "INCORRETO"}.`,
    });

    return {
      ...attemptResult,
      socraticContext: turnResult.socraticResult.updatedContext,
      socraticResponse: turnResult.socraticResult.response || undefined,
      legalEvidenceMetadata: turnResult.socraticResult.legalEvidenceMetadata,
    };
  } catch (err) {
    console.error("Erro ao integrar feedback socrático com a tentativa:", err);
    return attemptResult;
  }
}
