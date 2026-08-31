/**
 * MOTOR DO ORQUESTRADOR UNIFICADO DO CICLO COGNITIVO — FASE 7.7
 *
 * Unifica e orquestra a execução completa da Suíte de Inteligência (Fases 7.1 a 7.6):
 * 1. Analytics Cognitivo Preditivo (7.4) → Recupera perfil de retenção e trajetória.
 * 2. Decision Engine (7.5) → AUTORIDADE da Ação Pedagógica (decidePedagogicalAction).
 * 3. Artifacts Engine (7.6.1 - 7.6.5) → AUTORIDADE do Tipo e Geração do Artefato Adaptativo.
 * 4. Socratic Engine (7.3.1 - 7.3.4) → Orquestra diálogo socrático quando indicado.
 * 5. Legal Grounding & RAG (7.3.2) → Recupera leis/súmulas e aplica guardrails anti-alucinação.
 * 6. Evidence & Knowledge Layer (Fase 5) → Registra evidência cognitiva SOMENTE na interação real.
 *
 * REGRAS CRÍTICAS:
 * - A IA (Gemini via AI Gateway 7.1) NUNCA decide ação pedagógica nem tipo de artefato.
 * - Idempotência total em todas as chamadas.
 * - Nenhuma evidência é gerada passivamente na montagem do plano.
 * - Falhas de IA acionam fallback determinístico imediato sem interromper o fluxo de estudo.
 */

import { analyzeTopicAnalytics } from "../analytics/service";
import type { AnalyticsResult } from "../analytics/types";
import { getPedagogicalDecision } from "../decision/service";
import type { DecisionContext, DecisionResult, PedagogicalAction } from "../decision/types";
import { generateAdaptiveStudyArtifact } from "../artifacts/integration";
import type { AdaptiveStudyArtifactResult } from "../artifacts/integration";
import { processArtifactInteraction } from "../artifacts/interaction";
import type { ArtifactInteractionResult, ArtifactUserResponse } from "../artifacts/interaction";
import { startStudySocraticSession, executeStudySocraticTurn } from "../socratic/study-integration";
import type { SocraticSessionContext, SocraticResponse } from "../socratic/types";
import { getLegalContextForSocratic } from "../legal/service";
import type { LegalEvidenceMetadata } from "../legal/types";
import { recordCognitiveEvidence } from "../evidence/service";
import type { RecordEvidenceResult, CognitiveEvidenceInput } from "../evidence/types";
import { resolveErrorEntry } from "../error-central/service";
import { recordCognitiveTelemetry, clearCognitiveTelemetry } from "./telemetry";
import type {
  CognitiveCycleInput,
  CognitiveCycleStepPlan,
  CognitiveCycleInteractionInput,
  CognitiveCycleInteractionResult,
  CognitiveExecutionMode,
} from "./types";

/** Cache de idempotência em memória para planos do ciclo cognitivo */
const planIdempotencyCache = new Map<string, CognitiveCycleStepPlan>();

/** Cache de idempotência em memória para interações do ciclo cognitivo */
const interactionIdempotencyCache = new Map<string, CognitiveCycleInteractionResult>();

/**
 * Limpa o cache de idempotência do orquestrador (utilizado em testes).
 */
export function clearCognitiveCycleCache(): void {
  planIdempotencyCache.clear();
  interactionIdempotencyCache.clear();
  clearCognitiveTelemetry();
}

/**
 * Gera a chave de idempotência padronizada para o plano do ciclo cognitivo.
 */
function buildPlanIdempotencyKey(input: CognitiveCycleInput): string {
  if (input.idempotencyKey) return input.idempotencyKey;
  const dateStr = new Date().toISOString().slice(0, 10);
  return `cog-plan:${input.userId}:${input.topicId}:${input.taskId || "no-task"}:${dateStr}`;
}

/**
 * Gera a chave de idempotência padronizada para a interação do ciclo cognitivo.
 */
function buildInteractionIdempotencyKey(input: CognitiveCycleInteractionInput): string {
  if (input.idempotencyKey) return input.idempotencyKey;
  const responseKey =
    typeof input.userResponse === "string"
      ? input.userResponse.slice(0, 20)
      : JSON.stringify(input.userResponse).slice(0, 20);
  return `cog-int:${input.userId}:${input.topicId}:${input.stepPlan.idempotencyKey}:${responseKey}`;
}

/**
 * Mapeia a ação pedagógica determinística (Fase 7.5) para o modo de execução cognitiva.
 */
export function deriveExecutionMode(action: PedagogicalAction | string): CognitiveExecutionMode {
  switch (action) {
    case "REMEDIATION":
    case "ACTIVE_RECALL":
    case "GERAR_ARTEFATO_COGNITIVO":
    case "REVISAR_ERRO_GRAVE":
      return "artifact";
    case "SOCRATIC":
    case "EXPLICACAO_SOCRATICA":
      return "socratic";
    case "PRACTICE":
    case "PRATICAR_QUESTOES":
    case "TREINO_INTENSIVO":
      return "standard_practice";
    case "NEW_CONTENT":
      return "direct_study";
    case "REVIEW":
    case "CONSOLIDATION":
    case "REVISAR_ESPACADO":
    case "REVISAR_CURVA_ESQUECIMENTO":
    default:
      return "review";
  }
}

/**
 * ORQUESTRADOR PRINCIPAL — Gera o plano de execução do ciclo cognitivo para um tópico.
 *
 * Respeita a estrita hierarquia de autoridades:
 * 1. Analytics Preditivo (7.4) -> 2. Decision Engine (7.5) -> 3. Artifacts Engine (7.6) / Socratic Engine (7.3)
 */
export async function orchestrateCognitiveCycleStep(
  input: CognitiveCycleInput,
): Promise<CognitiveCycleStepPlan> {
  const idempotencyKey = buildPlanIdempotencyKey(input);

  // Retorno idempotente se não for forçada atualização
  if (!input.forceRefresh && planIdempotencyCache.has(idempotencyKey)) {
    const cachedPlan = planIdempotencyCache.get(idempotencyKey)!;
    recordCognitiveTelemetry({
      eventType: "IDEMPOTENCY_HIT",
      userId: cachedPlan.userId,
      topicId: cachedPlan.topicId,
      subjectId: cachedPlan.subjectId,
      executionMode: cachedPlan.executionMode,
      pedagogicalAction: cachedPlan.pedagogicalDecision.primaryAction,
      idempotencyKey: cachedPlan.idempotencyKey,
      isCacheHit: true,
    });
    return cachedPlan;
  }

  const userId = input.userId;
  const topicId = input.topicId;
  const topicName = input.topicName || `Tópico ${topicId}`;
  const subjectId = input.subjectId || null;
  const subjectName = input.subjectName || "Matéria Geral";

  // 1. ANÁLISE ANALÍTICA PREDITIVA (Fase 7.4)
  let analyticsResult: AnalyticsResult | null = null;
  try {
    analyticsResult = analyzeTopicAnalytics({
      userId,
      topicId,
      evidences: [],
      mastery: input.customSignals?.mastery,
      confidence: input.customSignals?.confidence,
      daysSinceStudy: input.customSignals?.daysSinceStudy ?? undefined,
      knowledgeState: input.customSignals?.knowledgeState,
      reviewUrgency: input.customSignals?.reviewUrgency,
      recurringErrors: input.customSignals?.recurringErrors,
      unresolvedErrors: input.customSignals?.unresolvedErrors,
      prerequisiteDeficit: input.customSignals?.prerequisiteDeficit,
      contestWeight: input.customSignals?.contestWeight,
    });
  } catch {
    // Analytics fallback gracioso
    analyticsResult = null;
  }

  // 2. DECISION ENGINE — AUTORIDADE DA AÇÃO PEDAGÓGICA (Fase 7.5)
  const decisionContext: DecisionContext = {
    userId,
    topicId,
    signals: input.customSignals || {},
    analyticsProfile: analyticsResult?.retentionProfile,
    analyticsTrajectory: analyticsResult?.trajectory,
    analyticsMatrix: analyticsResult?.matrixEntry,
    predictivePriority: analyticsResult?.predictivePriority,
  };

  const pedagogicalDecision = getPedagogicalDecision(decisionContext);
  const executionMode = deriveExecutionMode(pedagogicalDecision.primaryAction);

  let artifactResult: AdaptiveStudyArtifactResult | null = null;
  let socraticContext: SocraticSessionContext | null = null;
  let legalGrounding: LegalEvidenceMetadata | null = null;
  let fallbackTriggered = false;
  let fallbackReason: string | undefined = undefined;

  // 3. RECUPERAÇÃO DE FUNDAMENTAÇÃO JURÍDICA RAG (Fase 7.3.2)
  try {
    const legalRes = await getLegalContextForSocratic(topicId, topicName, subjectName);
    if (legalRes.grounding) {
      legalGrounding = legalRes.grounding;
    }
  } catch {
    // Falha em RAG jurídico não interrompe
  }

  // 4. EXECUÇÃO ESPECÍFICA DO MODO
  if (executionMode === "artifact") {
    try {
      artifactResult = await generateAdaptiveStudyArtifact({
        userId,
        topicId,
        topicName,
        subjectId,
        subjectName,
        customSignals: input.customSignals,
        errorEntryId: input.errorEntryId || undefined,
        forceRefresh: input.forceRefresh,
      });
    } catch (err) {
      fallbackTriggered = true;
      fallbackReason = `Falha na geração do artefato adaptativo: ${err instanceof Error ? err.message : String(err)}`;
      // Fallback gracioso para modo de prática sem travamento
    }
  } else if (executionMode === "socratic") {
    try {
      socraticContext = startStudySocraticSession({
        userId,
        topicId,
        topicName,
        subjectName,
        questionContext: input.questionContext,
        errorEntryId: input.errorEntryId || undefined,
      });
    } catch (err) {
      fallbackTriggered = true;
      fallbackReason = `Falha na inicialização socrática: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // 5. CRIAÇÃO DO PLANO FINAL
  const stepPlan: CognitiveCycleStepPlan = {
    userId,
    topicId,
    topicName,
    subjectId,
    subjectName,
    pedagogicalDecision,
    executionMode: fallbackTriggered ? "standard_practice" : executionMode,
    artifactResult,
    socraticContext,
    analyticsProfile: analyticsResult?.retentionProfile ?? null,
    analyticsTrajectory: analyticsResult?.trajectory ?? null,
    predictivePriority: analyticsResult?.predictivePriority ?? null,
    legalGrounding,
    idempotencyKey,
    fallbackTriggered,
    fallbackReason,
    timestamp: new Date().toISOString(),
  };

  // Salvar no cache de idempotência
  planIdempotencyCache.set(idempotencyKey, stepPlan);

  // Registra telemetria de orquestração (Fase 7.8)
  recordCognitiveTelemetry({
    eventType: fallbackTriggered ? "FALLBACK_TRIGGERED" : "PLAN_ORCHESTRATED",
    userId,
    topicId,
    subjectId,
    executionMode: stepPlan.executionMode,
    pedagogicalAction: pedagogicalDecision.primaryAction,
    artifactKind: artifactResult?.artifactKind || null,
    idempotencyKey,
    isCacheHit: false,
    fallbackTriggered,
    fallbackReason,
    legalGroundingApplied: Boolean(legalGrounding),
  });

  return stepPlan;
}

/**
 * PROCESSADOR DE INTERAÇÃO — Processa a resposta real do aluno no ciclo cognitivo.
 *
 * Nenhuma evidência passiva é gerada antes deste método ser acionado pelo aluno.
 * Registra a evidência cognitiva no motor de evidências e propaga os efeitos
 * para Knowledge Engine, Error Central e Review Queue.
 */
export async function processCognitiveCycleInteraction(
  input: CognitiveCycleInteractionInput,
): Promise<CognitiveCycleInteractionResult> {
  const idempotencyKey = buildInteractionIdempotencyKey(input);

  // Retorno idempotente
  if (interactionIdempotencyCache.has(idempotencyKey)) {
    const cachedResult = interactionIdempotencyCache.get(idempotencyKey)!;
    recordCognitiveTelemetry({
      eventType: "IDEMPOTENCY_HIT",
      userId: input.userId,
      topicId: input.topicId,
      subjectId: input.subjectId || input.stepPlan.subjectId,
      executionMode: input.stepPlan.executionMode,
      pedagogicalAction: input.stepPlan.pedagogicalDecision.primaryAction,
      idempotencyKey: input.stepPlan.idempotencyKey,
      isCacheHit: true,
    });
    return cachedResult;
  }

  const { userId, topicId, stepPlan, userResponse } = input;
  let evidenceResult: RecordEvidenceResult | null = null;
  let artifactInteractionResult: ArtifactInteractionResult | null = null;
  let socraticResponse: SocraticResponse | null = null;
  let errorCentralUpdated = false;
  const reviewUpdated = false;

  // 1. PROCESSAR SEGUNDO O MODO DO PLANO
  if (stepPlan.executionMode === "artifact" && stepPlan.artifactResult?.generatedArtifact) {
    const artResponse: ArtifactUserResponse =
      typeof userResponse === "string"
        ? {
            textResponse: userResponse,
            confidence: input.declaredConfidence || "medio",
            timeSpentSeconds: input.timeSpentSeconds || 30,
          }
        : userResponse;

    artifactInteractionResult = await processArtifactInteraction({
      userId,
      topicId,
      subjectId: input.subjectId || stepPlan.subjectId,
      artifact: stepPlan.artifactResult.generatedArtifact,
      userResponse: artResponse,
      pedagogicalAction: stepPlan.pedagogicalDecision.primaryAction,
    });

    evidenceResult = artifactInteractionResult.evidenceResult;
  } else if (
    stepPlan.executionMode === "socratic" &&
    stepPlan.socraticContext &&
    typeof userResponse === "string"
  ) {
    socraticResponse = await executeStudySocraticTurn(stepPlan.socraticContext, userResponse);

    // Registra evidência cognitiva do turno socrático
    const isSuccess =
      socraticResponse.pedagogicalStage === "RESOLVIDO" ||
      socraticResponse.cognitiveImpact === "POSITIVO";
    const evidenceInput: CognitiveEvidenceInput = {
      userId,
      topicId,
      subjectId: input.subjectId || stepPlan.subjectId || undefined,
      kind: "recall",
      source: "socratic_tutor",
      score: isSuccess ? 1.0 : 0.0,
      declaredConfidence: 3,
      durationSeconds: 45,
    };

    evidenceResult = await recordCognitiveEvidence(evidenceInput);
  } else {
    // MODO PADRÃO (prática / revisão)
    const isTextValid =
      typeof userResponse === "string" ? userResponse.trim().length > 0 : Boolean(userResponse);
    const evidenceInput: CognitiveEvidenceInput = {
      userId,
      topicId,
      subjectId: input.subjectId || stepPlan.subjectId || undefined,
      kind: stepPlan.executionMode === "review" ? "review" : "practice",
      source: "planner_task",
      score: isTextValid ? 1.0 : 0.0,
      declaredConfidence: 3,
      durationSeconds: 30,
    };

    evidenceResult = await recordCognitiveEvidence(evidenceInput);
  }

  // 2. SANEAMENTO DE CENTRAL DE ERROS SE APLICÁVEL
  if (
    (stepPlan.pedagogicalDecision.primaryAction === "REMEDIATION" ||
      stepPlan.pedagogicalDecision.primaryAction === "ACTIVE_RECALL") &&
    evidenceResult?.processed
  ) {
    try {
      // Tentar resolver erro prioritário se houver
      const resolved = await resolveErrorEntry(
        "auto-resolved-by-cognitive-cycle",
        "Corrigido com sucesso via Ciclo Cognitivo 7.7",
      );
      errorCentralUpdated = resolved;
    } catch {
      errorCentralUpdated = false;
    }
  }

  // 3. DETERMINAÇÃO DA PRÓXIMA AÇÃO RECOMENDADA
  const isPositiveResult = Boolean(
    evidenceResult?.processed && (evidenceResult.evidence?.score ?? 0) >= 0.7,
  );
  const nextPedagogicalAction: PedagogicalAction = isPositiveResult ? "REVIEW" : "SOCRATIC";

  const guidanceSummary = isPositiveResult
    ? "Excelente progresso! A retenção do tópico foi reforçada com sucesso."
    : "Identificamos pontos de atenção. Recomendamos um breve diálogo socrático para fixação dos conceitos.";

  const result: CognitiveCycleInteractionResult = {
    success: true,
    evidenceResult,
    artifactInteractionResult,
    socraticResponse,
    errorCentralUpdated,
    reviewUpdated,
    nextPedagogicalAction,
    guidanceSummary,
    idempotencyKey,
    completedAt: new Date().toISOString(),
  };

  // Salvar no cache de idempotência
  interactionIdempotencyCache.set(idempotencyKey, result);

  // Registra telemetria de interação e evidência (Fase 7.8)
  recordCognitiveTelemetry({
    eventType: "INTERACTION_PROCESSED",
    userId,
    topicId,
    subjectId: input.subjectId || stepPlan.subjectId,
    executionMode: stepPlan.executionMode,
    pedagogicalAction: stepPlan.pedagogicalDecision.primaryAction,
    artifactKind: stepPlan.artifactResult?.artifactKind || null,
    idempotencyKey,
    evidenceRecorded: Boolean(evidenceResult?.processed),
    score: evidenceResult?.evidence?.score ?? (isPositiveResult ? 1.0 : 0.0),
  });

  return result;
}
