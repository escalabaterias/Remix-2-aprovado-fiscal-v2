/**
 * PERSISTÊNCIA COGNITIVA E IDEMPOTÊNCIA DO PROFESSOR FISCAL (Fase 7.3.4)
 *
 * Responsável por:
 * 1. Sanitizar metadados pedagógicos (remoção de API keys, tokens e dados sensíveis).
 * 2. Garantir idempotência na emissão de evidências cognitivas socráticas.
 * 3. Persistir o estado da sessão socrática em repositório de longa duração.
 * 4. Mapear e emitir os eventos SOCRATIC_EVIDENCE_KINDS (ATTEMPT, RECALL, HINT, REMEDIATION, SUCCESS).
 * 5. Orquestrar integração determinística com Evidence Layer, Knowledge Engine, Error Central e Review Engine.
 */

import { supabase } from "@/integrations/supabase/client";
import { recordCognitiveEvidence } from "@/lib/evidence/service";
import { remediateErrorEntry } from "@/lib/error-central/service";
import { recordReviewKnowledge } from "@/lib/knowledge/service";
import { recordReviewEvent } from "@/lib/review/service";
import { SOCRATIC_EVIDENCE_KINDS } from "./types";
import type {
  SocraticSessionContext,
  SocraticTurnSummary,
  SocraticResponse,
  StudentResponseClassification,
  SocraticPedagogicalMode,
  SocraticState,
} from "./types";
import type { LegalEvidenceMetadata } from "@/lib/legal/types";
import type { CognitiveEvidenceKind } from "@/lib/evidence/types";

// Cache em memória de chaves de idempotência para performance instantânea na sessão
const recordedIdempotencyKeys = new Set<string>();

// Cache em memória de sessões para fallback local resiliente
const sessionCache = new Map<string, SocraticSessionContext>();

/**
 * Limpa os caches em memória de sessões e idempotência (útil para isolamento de testes e reset de sessão).
 */
export function clearSocraticMemoryCache(): void {
  recordedIdempotencyKeys.clear();
  sessionCache.clear();
}

/**
 * Sanitiza metadados para garantir que nenhuma chave de API, token de autorização,
 * JWT, senha ou prompt privado completo seja persistido ou exposto.
 */
export function sanitizeSocraticMetadata(
  rawMetadata?: Record<string, unknown>,
): Record<string, unknown> {
  if (!rawMetadata) return {};

  const SENSITIVE_LEAF_KEYS = [
    "apikey",
    "api_key",
    "bearertoken",
    "bearer",
    "jwt",
    "password",
    "secret",
    "authorization",
    "privateprompt",
    "systemprompt",
    "fullprompt",
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawMetadata)) {
    const lowerKey = key.toLowerCase();

    // Se for uma propriedade folha sensível, omitir
    if (SENSITIVE_LEAF_KEYS.some((s) => lowerKey === s || lowerKey.endsWith(s))) {
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeSocraticMetadata(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        item && typeof item === "object"
          ? sanitizeSocraticMetadata(item as Record<string, unknown>)
          : item,
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Gera uma chave de idempotência determinística para a evidência socrática.
 */
export function generateSocraticIdempotencyKey(params: {
  userId: string;
  sessionId: string;
  turnNumber: number;
  socraticEvidenceKind: string;
}): string {
  return `${params.userId}:${params.sessionId}:${params.turnNumber}:${params.socraticEvidenceKind}`;
}

/**
 * Verifica se uma evidência com a chave de idempotência já foi registrada.
 */
export async function isSocraticEvidenceRecorded(idempotencyKey: string): Promise<boolean> {
  if (recordedIdempotencyKeys.has(idempotencyKey)) {
    return true;
  }

  try {
    const { data } = await supabase
      .from("ai_results")
      .select("id")
      .eq("task_type", "socratic_evidence_idempotency")
      .eq("input_hash", idempotencyKey)
      .limit(1)
      .maybeSingle();

    if (data) {
      recordedIdempotencyKeys.add(idempotencyKey);
      return true;
    }
  } catch (err) {
    // Silencioso se offline/mock
  }

  return false;
}

/**
 * Marca uma chave de idempotência como registrada.
 */
export async function markSocraticEvidenceRecorded(
  idempotencyKey: string,
  userId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  recordedIdempotencyKeys.add(idempotencyKey);

  try {
    await supabase.from("ai_results").insert({
      user_id: userId,
      task_type: "socratic_evidence_idempotency",
      input_hash: idempotencyKey,
      output: {
        recordedAt: new Date().toISOString(),
        metadata: sanitizeSocraticMetadata(metadata),
      },
    });
  } catch (err) {
    // Silencioso se falhar gravação secundária
  }
}

/**
 * Persiste o estado completo de uma sessão socrática no repositório de longa duração (ai_results).
 */
export async function saveSocraticSession(
  context: SocraticSessionContext,
  userId?: string,
): Promise<boolean> {
  sessionCache.set(context.sessionId, context);

  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) return false;

    const sanitizedContext = {
      ...context,
      contextMetadata: sanitizeSocraticMetadata(context.contextMetadata),
    };

    // Upsert em ai_results com task_type = "socratic_session" e input_hash = sessionId
    const { data: existing } = await supabase
      .from("ai_results")
      .select("id")
      .eq("task_type", "socratic_session")
      .eq("input_hash", context.sessionId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("ai_results")
        .update({
          output: sanitizedContext as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("ai_results").insert({
        user_id: targetUserId,
        task_type: "socratic_session",
        input_hash: context.sessionId,
        output: sanitizedContext as any,
      });
    }

    return true;
  } catch (err) {
    console.error("Falha ao persistir sessão socrática (fallback em memória mantido):", err);
    return false;
  }
}

/**
 * Carrega o estado de uma sessão socrática persistida por sessionId.
 */
export async function loadSocraticSession(
  sessionId: string,
): Promise<SocraticSessionContext | null> {
  if (sessionCache.has(sessionId)) {
    return sessionCache.get(sessionId)!;
  }

  try {
    const { data } = await supabase
      .from("ai_results")
      .select("output")
      .eq("task_type", "socratic_session")
      .eq("input_hash", sessionId)
      .limit(1)
      .maybeSingle();

    if (data && data.output) {
      const ctx = data.output as unknown as SocraticSessionContext;
      sessionCache.set(sessionId, ctx);
      return ctx;
    }
  } catch (err) {
    console.error("Erro ao carregar sessão socrática:", err);
  }

  return null;
}

/**
 * Calcula a pontuação cognitiva objetiva baseada na ajuda/pistas necessárias.
 */
export function calculateSocraticCognitiveScore(params: {
  classification?: StudentResponseClassification;
  hintLevel: number;
  currentState: SocraticState;
  pedagogicalMode: SocraticPedagogicalMode;
}): number {
  const { classification, hintLevel, currentState } = params;

  if (classification === "INCORRECT" || classification === "NO_RESPONSE") {
    return 0.0;
  }

  if (classification === "PARTIALLY_CORRECT") {
    if (hintLevel <= 1) return 0.7;
    if (hintLevel === 2) return 0.5;
    return 0.3;
  }

  if (
    classification === "CORRECT" ||
    currentState === "CONSOLIDATING" ||
    currentState === "COMPLETED"
  ) {
    if (hintLevel === 0) return 1.0;
    if (hintLevel === 1) return 0.8;
    if (hintLevel === 2) return 0.6;
    if (hintLevel === 3) return 0.4;
    return 0.2;
  }

  return 0.5;
}

export type EmitSocraticEvidenceParams = {
  socraticContext: SocraticSessionContext;
  lastTurn?: SocraticTurnSummary;
  socraticResponse?: SocraticResponse | null;
  legalEvidenceMetadata?: LegalEvidenceMetadata;
  userId?: string;
};

export type EmitSocraticEvidenceResult = {
  emittedKinds: string[];
  processed: boolean;
  skippedKeys: string[];
  errorRemediated: boolean;
  reviewRecorded: boolean;
};

/**
 * Mapeia e emite todas as evidências cognitivas socráticas aplicáveis a um turno do Professor Fiscal.
 * Garante idempotência estrita, sanitização de metadados e propagação determinística.
 */
export async function emitSocraticCognitiveEvidence(
  params: EmitSocraticEvidenceParams,
): Promise<EmitSocraticEvidenceResult> {
  const { socraticContext, lastTurn, socraticResponse, legalEvidenceMetadata } = params;

  const targetUserId = params.userId || (await supabase.auth.getUser()).data.user?.id;

  if (!targetUserId) {
    return {
      emittedKinds: [],
      processed: false,
      skippedKeys: [],
      errorRemediated: false,
      reviewRecorded: false,
    };
  }

  const turnNumber = lastTurn?.turnNumber || socraticContext.currentTurnNumber;
  const hintLevel = lastTurn?.hintLevel ?? socraticContext.hintLevel ?? 0;
  const classification =
    lastTurn?.evaluationClassification || socraticResponse?.evaluation?.classification;
  const pedagogicalMode = socraticContext.pedagogicalMode;

  const score = calculateSocraticCognitiveScore({
    classification,
    hintLevel,
    currentState: socraticContext.currentState,
    pedagogicalMode,
  });

  const baseSanitizedMetadata = sanitizeSocraticMetadata({
    sessionId: socraticContext.sessionId,
    turnNumber,
    pedagogicalMode,
    currentState: socraticContext.currentState,
    hintLevel,
    targetConcept:
      socraticContext.currentQuestion?.targetConcept || socraticContext.pedagogicalGoal,
    questionId: socraticContext.currentQuestion?.questionId || socraticContext.currentQuestion?.id,
    classification,
    reasoningQuality: socraticResponse?.evaluation?.reasoningQuality,
    identifiedGap: socraticResponse?.detectedGap || socraticResponse?.evaluation?.identifiedGap,
    misconception: socraticResponse?.evaluation?.misconception,
    legalMetadata: legalEvidenceMetadata,
  });

  const emittedKinds: string[] = [];
  const skippedKeys: string[] = [];
  let errorRemediated = false;
  let reviewRecorded = false;

  // 1. Determinar quais SOCRATIC_EVIDENCE_KINDS se aplicam a este turno
  const kindsToEmit: {
    socraticKind: string;
    cognitiveKind: CognitiveEvidenceKind;
  }[] = [];

  // Toda interação de resposta do aluno gera SOCRATIC_ATTEMPT
  if (lastTurn?.studentAnswerText || socraticContext.studentAnswerText) {
    kindsToEmit.push({
      socraticKind: SOCRATIC_EVIDENCE_KINDS.ATTEMPT,
      cognitiveKind: "practice",
    });
  }

  // Se o modo for ACTIVE_RECALL
  if (pedagogicalMode === "ACTIVE_RECALL") {
    kindsToEmit.push({
      socraticKind: SOCRATIC_EVIDENCE_KINDS.RECALL,
      cognitiveKind: "recall",
    });
  }

  // Se uma pista foi fornecida no turno atual (ação HINT)
  if (lastTurn?.action === "HINT" || socraticResponse?.action === "HINT") {
    kindsToEmit.push({
      socraticKind: SOCRATIC_EVIDENCE_KINDS.HINT,
      cognitiveKind: pedagogicalMode === "ERROR_REMEDIATION" ? "remediation" : "practice",
    });
  }

  // Se for remediação de erro
  if (pedagogicalMode === "ERROR_REMEDIATION") {
    kindsToEmit.push({
      socraticKind: SOCRATIC_EVIDENCE_KINDS.REMEDIATION,
      cognitiveKind: "remediation",
    });
  }

  // Se atingiu consolidação, sucesso ou acerto
  const isSuccess =
    classification === "CORRECT" ||
    socraticContext.currentState === "CONSOLIDATING" ||
    socraticContext.currentState === "COMPLETED";

  if (isSuccess) {
    kindsToEmit.push({
      socraticKind: SOCRATIC_EVIDENCE_KINDS.SUCCESS,
      cognitiveKind:
        pedagogicalMode === "ERROR_REMEDIATION"
          ? "remediation"
          : pedagogicalMode === "REVIEW"
            ? "review"
            : pedagogicalMode === "ACTIVE_RECALL"
              ? "recall"
              : "practice",
    });
  }

  // 2. Processar cada tipo de evidência socrática com verificação de idempotência estrita
  for (const item of kindsToEmit) {
    const idempotencyKey = generateSocraticIdempotencyKey({
      userId: targetUserId,
      sessionId: socraticContext.sessionId,
      turnNumber,
      socraticEvidenceKind: item.socraticKind,
    });

    const alreadyRecorded = await isSocraticEvidenceRecorded(idempotencyKey);
    if (alreadyRecorded) {
      skippedKeys.push(idempotencyKey);
      continue;
    }

    // Registrar na Evidence Layer
    const evidenceResult = await recordCognitiveEvidence({
      userId: targetUserId,
      topicId: socraticContext.topicId,
      subjectId: socraticContext.subjectName ? undefined : null,
      kind: item.cognitiveKind,
      source: "socratic_tutor",
      timestamp: new Date().toISOString(),
      score,
      referenceId: socraticContext.sessionId,
      metadata: {
        ...baseSanitizedMetadata,
        socraticEvidenceKind: item.socraticKind,
        idempotencyKey,
      },
    });

    if (evidenceResult.processed) {
      emittedKinds.push(item.socraticKind);
      await markSocraticEvidenceRecorded(idempotencyKey, targetUserId, {
        socraticKind: item.socraticKind,
        score,
      });
    }
  }

  // 3. Orquestração com a Central de Erros quando há sucesso na remediação
  const errorContext = socraticContext.contextMetadata?.errorContext as
    { errorEntryId?: string } | undefined;

  if (errorContext?.errorEntryId && isSuccess) {
    try {
      await remediateErrorEntry({
        errorEntryId: errorContext.errorEntryId,
        result: "success",
        timestamp: new Date().toISOString(),
      });
      errorRemediated = true;
    } catch (err) {
      console.error("Erro ao remediar entrada de erro na Central de Erros:", err);
    }
  }

  // 4. Orquestração com o Review Engine se estiver no modo REVIEW
  if (pedagogicalMode === "REVIEW" && isSuccess) {
    try {
      await recordReviewKnowledge({
        userId: targetUserId,
        topicId: socraticContext.topicId,
        timestamp: new Date().toISOString(),
        referenceId: socraticContext.sessionId,
      });
      reviewRecorded = true;
    } catch (err) {
      console.error("Erro ao atualizar histórico de revisão:", err);
    }
  }

  return {
    emittedKinds,
    processed: emittedKinds.length > 0,
    skippedKeys,
    errorRemediated,
    reviewRecorded,
  };
}
