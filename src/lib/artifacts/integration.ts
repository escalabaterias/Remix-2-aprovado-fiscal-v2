/**
 * INTEGRAÇÃO DOS ARTEFATOS AO CICLO COGNITIVO REAL — Fase 7.6.3
 *
 * Conecta: Erro/Questão -> Evidence/Knowledge -> Analytics 7.4 ->
 * Decision Engine 7.5 -> Artifacts Engine 7.6.1 -> Artifact Generator 7.6.2.
 *
 * REGRAS DE AUTORIDADE:
 * - Decision Engine é a autoridade da Ação Pedagógica (Fase 7.5).
 * - Artifacts Engine é a autoridade do Tipo de Artefato (Fase 7.6.1).
 * - Artifact Generator é a autoridade da Geração (Fase 7.6.2).
 * - A IA NÃO escolhe ação pedagógica nem tipo de artefato.
 * - Idempotência preservada.
 * - Falha de IA nunca bloqueia o fluxo de estudo (fallback determinístico).
 * - Criação de artefato NÃO registra evidência cognitiva automaticamente (evita duplicação).
 *   Evidência é registrada somente na interação/resultado pedagógico real do aluno.
 */

import type { DecisionContext, DecisionResult, PedagogicalAction } from "../decision/types";
import { getPedagogicalDecision } from "../decision/service";
import type {
  AnalyticsContextInput,
  CognitiveTrajectory,
  PredictivePriority,
  RetentionMatrixEntry,
  RetentionProfile,
} from "../analytics/types";
import { analyzeTopicAnalytics } from "../analytics/service";
import type { ErrorRecord } from "../knowledge/errors";
import type { KnowledgeState } from "../knowledge/engine";
import type { PrioritizedError } from "../error-central/engine";
import type { ErrorDetailResult } from "../error-central/service";
import type { LegalSource } from "../legal/types";
import type {
  ArtifactContext,
  ArtifactDecision,
  ArtifactKind,
  ArtifactSignals,
  ErrorTypeCategory,
} from "./types";
import { decideStudyArtifact } from "./engine";
import type { ArtifactGenerationContext, GeneratedArtifact } from "./generation-types";
import { generateStudyArtifact } from "./generator";
import {
  deriveArtifactPresentationProfile,
  type ArtifactPresentationProfile,
} from "./personalization";
import { recordCognitiveEvidence } from "../evidence/service";
import type {
  CognitiveEvidenceInput,
  CognitiveEvidenceKind,
  DeclaredConfidence,
  RecordEvidenceResult,
} from "../evidence/types";

/**
 * Entrada para integração do artefato ao ciclo cognitivo real.
 */
export interface AdaptiveStudyInputContext {
  userId: string;
  topicId: string;
  topicName: string;
  subjectId?: string | null;
  subjectName?: string | null;

  // Contexto da Central de Erros
  errorRecord?: ErrorRecord | null;
  errorDetail?: ErrorDetailResult | PrioritizedError | null;
  errorCategory?: string | null;
  errorTypeCategory?: ErrorTypeCategory | null;
  knownErrorsSummary?: string | null;

  // Contexto de Evidência e Conhecimento
  evidences?: CognitiveEvidenceInput[] | any[];
  knowledgeState?: KnowledgeState | null;
  mastery?: number | null;
  confidence?: number | null;
  daysSinceStudy?: number | null;

  // Perfil Analítico pré-computado (Fase 7.4)
  analyticsProfile?: RetentionProfile | null;
  analyticsTrajectory?: CognitiveTrajectory | null;
  analyticsMatrix?: RetentionMatrixEntry | null;
  predictivePriority?: PredictivePriority | null;

  // Contexto Jurídico de Grounding (Fase 7.3.2)
  legalSources?: LegalSource[] | null;

  // Outros contextos de estudo
  availableMinutes?: number | null;
  studyNotes?: string | null;

  // Decisões Existentes (para reutilização sem refazer cálculos)
  existingDecisionResult?: DecisionResult | null;
  existingArtifactDecision?: ArtifactDecision | null;
  existingPresentationProfile?: ArtifactPresentationProfile | null;

  // Controle de Confiança e Idempotência
  minConfidenceThreshold?: number;
  referenceDate?: string | Date | null;
  forceRegenerate?: boolean;
}

/**
 * Origem e contagem dos sinais utilizados na tomada de decisão.
 */
export interface SignalsOriginSummary {
  hasErrorContext: boolean;
  hasEvidenceContext: boolean;
  hasKnowledgeState: boolean;
  hasAnalyticsProfile: boolean;
  hasLegalSources: boolean;
  signalCount: number;
}

/**
 * Trilha de auditoria da decisão e geração.
 */
export interface ArtifactAuditTrail {
  decisionResult: DecisionResult;
  artifactDecision: ArtifactDecision;
  presentationProfile: ArtifactPresentationProfile;
  decisionSource: "REUSED" | "COMPUTED";
  artifactDecisionSource: "REUSED" | "COMPUTED";
  generatedAt: string;
  idempotencyKey: string;
}

/**
 * Resultado auditável da geração adaptativa de artefato.
 */
export interface AdaptiveStudyArtifactResult {
  success: boolean;
  skipped: boolean;
  skipReason?: string;
  pedagogicalAction: PedagogicalAction;
  selectedArtifactKind: ArtifactKind;
  artifact?: GeneratedArtifact;
  fallbackApplied: boolean;
  grounded: boolean;
  dataConfidence: number;
  signalsOrigin: SignalsOriginSummary;
  auditTrail: ArtifactAuditTrail;
  statusMessage?: string;
  errorMessage?: string;
}

/**
 * Entrada para registrar evidência pedagógica real ao interagir com o artefato.
 */
export interface RecordArtifactInteractionInput {
  userId: string;
  topicId: string;
  subjectId?: string | null;
  artifactId: string;
  artifactKind: ArtifactKind;
  pedagogicalAction: PedagogicalAction;
  score?: number | null;
  durationSeconds?: number;
  declaredConfidence?: DeclaredConfidence | null;
  timestamp?: string;
}

// Map estático para cache de idempotência
const artifactIntegrationCache = new Map<string, AdaptiveStudyArtifactResult>();

/**
 * Limpa o cache interno de idempotência para testes.
 */
export function clearArtifactIntegrationCache(): void {
  artifactIntegrationCache.clear();
}

/**
 * Mapeia strings de categoria de erro para ErrorTypeCategory.
 */
export function mapStringErrorCategoryToTypeCategory(
  category?: string | null,
): ErrorTypeCategory | undefined {
  if (!category) return undefined;
  const normalized = category.trim().toUpperCase();
  if (normalized.includes("MEMO") || normalized.includes("DECOREBA")) return "MEMORIZATION";
  if (normalized.includes("CONFUS") || normalized.includes("CONCEIT"))
    return "CONCEPTUAL_CONFUSION";
  if (normalized.includes("ORGANIZ") || normalized.includes("HIERARQ")) return "ORGANIZATION";
  if (normalized.includes("SINTES") || normalized.includes("SÍNTES")) return "SYNTHESIS";
  if (normalized.includes("APLIC") || normalized.includes("PRAT")) return "APPLICATION";
  if (normalized.includes("ATENC") || normalized.includes("ATENÇ")) return "ATTENTION";
  return undefined;
}

/**
 * Calcula a chave determinística de idempotência para o contexto.
 */
export function computeArtifactIdempotencyKey(
  input: AdaptiveStudyInputContext,
  pedagogicalAction: PedagogicalAction,
  artifactKind: ArtifactKind,
  refDateIso: string,
): string {
  const dateDay = refDateIso.slice(0, 10);
  const parts = [
    input.userId,
    input.topicId,
    pedagogicalAction,
    artifactKind,
    input.knownErrorsSummary || "",
    input.errorCategory || "",
    input.legalSources ? input.legalSources.length : 0,
    input.availableMinutes || 15,
    dateDay,
  ];

  return `art-idemp-${parts.join(":")}`;
}

/**
 * Função principal: Integra o ciclo cognitivo completo e gera o artefato adaptativo.
 */
export async function generateAdaptiveStudyArtifact(
  input: AdaptiveStudyInputContext,
): Promise<AdaptiveStudyArtifactResult> {
  const { userId, topicId, topicName } = input;

  if (!userId || !topicId || !topicName) {
    throw new Error("userId, topicId e topicName são obrigatórios para a integração de artefato.");
  }

  const refDate = input.referenceDate ? new Date(input.referenceDate) : new Date();
  const refDateIso = refDate.toISOString();
  const minConfidenceThreshold = input.minConfidenceThreshold ?? 0.2;

  // 1. Processar Analytics e Sinais
  const hasAnalyticsInput =
    !!input.analyticsProfile ||
    (input.evidences && input.evidences.length > 0) ||
    input.mastery !== undefined ||
    input.confidence !== undefined ||
    input.daysSinceStudy !== undefined ||
    !!input.knowledgeState;

  let analyticsProfile = input.analyticsProfile ?? undefined;
  let analyticsTrajectory = input.analyticsTrajectory ?? undefined;
  let analyticsMatrix = input.analyticsMatrix ?? undefined;
  let predictivePriority = input.predictivePriority ?? undefined;

  if (!analyticsProfile && hasAnalyticsInput) {
    const analyticsInput: AnalyticsContextInput = {
      userId,
      topicId,
      evidences: input.evidences || [],
      mastery: input.mastery ?? input.knowledgeState?.mastery ?? undefined,
      confidence: input.confidence ?? input.knowledgeState?.confidence ?? undefined,
      daysSinceStudy: input.daysSinceStudy ?? undefined,
      referenceDate: refDate,
    };
    const analyticsRes = analyzeTopicAnalytics(analyticsInput);
    analyticsProfile = analyticsRes.retentionProfile;
    analyticsTrajectory = analyticsRes.trajectory;
    analyticsMatrix = analyticsRes.matrixEntry;
    predictivePriority = analyticsRes.predictivePriority;
  }

  const derivedCategory =
    input.errorTypeCategory ??
    mapStringErrorCategoryToTypeCategory(input.errorCategory ?? input.errorRecord?.category);

  const artifactSignals: ArtifactSignals = {
    errorTypeCategory: derivedCategory,
    confusableConcepts:
      derivedCategory === "CONCEPTUAL_CONFUSION" ||
      !!(input.knownErrorsSummary && /confus/i.test(input.knownErrorsSummary)),
    complexHierarchy:
      derivedCategory === "ORGANIZATION" ||
      !!(input.knownErrorsSummary && /hierarqu|organiz/i.test(input.knownErrorsSummary)),
    lowActiveRecallRate:
      analyticsMatrix?.category === "RETENÇÃO_FRÁGIL" ||
      (input.evidences && input.evidences.length > 0 && analyticsProfile
        ? analyticsProfile.retentionScore < 0.5
        : false),
    synthesisNeed:
      derivedCategory === "SYNTHESIS" ||
      !!(input.knownErrorsSummary && /sintese|síntese|resumo/i.test(input.knownErrorsSummary)),
    memorizationDifficulty:
      derivedCategory === "MEMORIZATION" ||
      !!(input.knownErrorsSummary && /memori|decoreba/i.test(input.knownErrorsSummary)),
  };

  const signalsOrigin: SignalsOriginSummary = {
    hasErrorContext:
      !!input.errorRecord ||
      !!input.errorDetail ||
      !!input.knownErrorsSummary ||
      !!input.errorCategory,
    hasEvidenceContext: (input.evidences?.length ?? 0) > 0,
    hasKnowledgeState:
      !!input.knowledgeState || input.mastery !== undefined || input.confidence !== undefined,
    hasAnalyticsProfile: !!analyticsProfile,
    hasLegalSources: (input.legalSources?.length ?? 0) > 0,
    signalCount: [
      !!input.errorRecord || !!input.knownErrorsSummary,
      (input.evidences?.length ?? 0) > 0,
      !!input.knowledgeState || input.mastery !== undefined,
      !!analyticsProfile,
      (input.legalSources?.length ?? 0) > 0,
    ].filter(Boolean).length,
  };

  // 2. Obter ou Reutilizar Decisão Pedagógica (Fase 7.5 - Autoridade da Ação)
  let decisionResult: DecisionResult;
  let decisionSource: "REUSED" | "COMPUTED" = "COMPUTED";

  if (input.existingDecisionResult) {
    decisionResult = input.existingDecisionResult;
    decisionSource = "REUSED";
  } else {
    const decisionContext: DecisionContext = {
      userId,
      topicId,
      signals: {
        knowledgeState: input.knowledgeState ? "KNOWN" : undefined,
        mastery: input.mastery ?? input.knowledgeState?.mastery,
        confidence: input.confidence ?? input.knowledgeState?.confidence,
        daysSinceStudy: input.daysSinceStudy,
        recurringErrors: input.errorDetail ? 1 : 0,
        unresolvedErrors: input.errorRecord && !input.errorRecord.isResolved ? 1 : 0,
      },
      analyticsProfile,
      analyticsTrajectory,
      analyticsMatrix,
      predictivePriority,
      availableMinutes: input.availableMinutes ?? 15,
    };
    decisionResult = getPedagogicalDecision(decisionContext);
  }

  // 3. Obter ou Reutilizar Decisão de Artefato (Fase 7.6.1 - Autoridade do Tipo)
  let artifactDecision: ArtifactDecision;
  let artifactDecisionSource: "REUSED" | "COMPUTED" = "COMPUTED";

  if (input.existingArtifactDecision) {
    artifactDecision = input.existingArtifactDecision;
    artifactDecisionSource = "REUSED";
  } else {
    const artifactContext: ArtifactContext = {
      userId,
      topicId,
      decisionResult,
      pedagogicalAction: decisionResult.primaryAction,
      artifactSignals,
      retentionProfile: analyticsProfile,
      retentionMatrix: analyticsMatrix,
      availableMinutes: input.availableMinutes ?? 15,
    };
    artifactDecision = decideStudyArtifact(artifactContext);
  }

  // 3.5. Derivar Perfil de Personalização da Apresentação (Fase 7.6.5)
  const presentationProfile =
    input.existingPresentationProfile ??
    deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: artifactDecision.primaryArtifact,
      pedagogicalAction: decisionResult.primaryAction,
      errorTypeCategory: derivedCategory,
      isRecurrentError:
        !!input.errorDetail ||
        !!(input.errorRecord && !input.errorRecord.isResolved) ||
        (input.knownErrorsSummary ? /recorrent|repetid/i.test(input.knownErrorsSummary) : false),
      retentionProfile: analyticsProfile,
      retentionScore: analyticsProfile?.retentionScore,
      mastery: input.mastery ?? input.knowledgeState?.mastery,
      confidence: input.confidence ?? input.knowledgeState?.confidence,
      legalSourcesCount: input.legalSources?.length ?? 0,
      artifactSignals,
      trajectory: analyticsTrajectory,
      knowledgeState: input.knowledgeState,
    });

  // 4. Verificação de Dados Insuficientes
  const effectiveDataConfidence =
    signalsOrigin.signalCount === 0 ? 0.1 : artifactDecision.dataConfidence;

  if (effectiveDataConfidence < minConfidenceThreshold) {
    return {
      success: true,
      skipped: true,
      skipReason: `Dados insuficientes para uma decisão pedagógica confiável (dataConfidence = ${effectiveDataConfidence} < ${minConfidenceThreshold}).`,
      pedagogicalAction: decisionResult.primaryAction,
      selectedArtifactKind: artifactDecision.primaryArtifact,
      fallbackApplied: false,
      grounded: false,
      dataConfidence: effectiveDataConfidence,
      signalsOrigin,
      auditTrail: {
        decisionResult,
        artifactDecision,
        presentationProfile,
        decisionSource,
        artifactDecisionSource,
        generatedAt: refDateIso,
        idempotencyKey: "skipped-insufficient-data",
      },
      statusMessage: "Geração de artefato evitada por falta de dados suficientes.",
    };
  }

  // 5. Idempotência
  const idempotencyKey = computeArtifactIdempotencyKey(
    input,
    decisionResult.primaryAction,
    artifactDecision.primaryArtifact,
    refDateIso,
  );

  if (!input.forceRegenerate && artifactIntegrationCache.has(idempotencyKey)) {
    return artifactIntegrationCache.get(idempotencyKey)!;
  }

  // 6. Geração do Artefato através de generateStudyArtifact() (Fase 7.6.2)
  const generationContext: ArtifactGenerationContext = {
    userId,
    topicId,
    topicName,
    artifactDecision,
    decisionResult,
    presentationProfile,
    availableMinutes: input.availableMinutes ?? 15,
    legalSources: input.legalSources ?? [],
    studyNotes: input.studyNotes ?? "",
    knownErrorsSummary:
      input.knownErrorsSummary ??
      (input.errorRecord ? `Erro na categoria ${input.errorRecord.category || "Geral"}` : ""),
  };

  const genResult = await generateStudyArtifact(generationContext);

  // 7. Retornar Resultado Auditável
  const finalResult: AdaptiveStudyArtifactResult = {
    success: genResult.success,
    skipped: false,
    pedagogicalAction: decisionResult.primaryAction,
    selectedArtifactKind: artifactDecision.primaryArtifact,
    artifact: genResult.artifact,
    fallbackApplied: genResult.fallbackApplied,
    grounded: genResult.artifact.grounded,
    dataConfidence: artifactDecision.dataConfidence,
    signalsOrigin,
    auditTrail: {
      decisionResult,
      artifactDecision,
      presentationProfile,
      decisionSource,
      artifactDecisionSource,
      generatedAt: genResult.artifact.generatedAt || refDateIso,
      idempotencyKey,
    },
    statusMessage: genResult.statusMessage,
    errorMessage: genResult.errorMessage,
  };

  artifactIntegrationCache.set(idempotencyKey, finalResult);

  return finalResult;
}

/**
 * Registra a evidência pedagógica real SOMENTE quando o aluno interage/conclui o artefato.
 * Reutiliza a Evidence Layer existente sem criar evidência na simples geração.
 */
export async function recordArtifactInteractionEvidence(
  input: RecordArtifactInteractionInput,
): Promise<RecordEvidenceResult> {
  const kind: CognitiveEvidenceKind =
    input.artifactKind === "FLASHCARD" || input.artifactKind === "ACTIVE_RECALL"
      ? "recall"
      : input.pedagogicalAction === "REMEDIATION"
        ? "remediation"
        : input.pedagogicalAction === "REVIEW"
          ? "review"
          : "exposure";

  return recordCognitiveEvidence({
    userId: input.userId,
    topicId: input.topicId,
    subjectId: input.subjectId,
    kind,
    source: "manual",
    timestamp: input.timestamp || new Date().toISOString(),
    durationSeconds: input.durationSeconds ?? 0,
    score: input.score ?? null,
    declaredConfidence: input.declaredConfidence ?? null,
    referenceId: input.artifactId,
    metadata: {
      artifactId: input.artifactId,
      artifactKind: input.artifactKind,
      pedagogicalAction: input.pedagogicalAction,
    },
  });
}
