/**
 * MOTOR DE SELEÇÃO DE ARTEFATOS COGNITIVOS (ARTIFACTS ENGINE) — Fase 7.6.1
 *
 * Função pura e determinística que seleciona o artefato de estudo ideal
 * com base na Decisão Pedagógica (Fase 7.5), sinais do Error Central,
 * perfil de retenção e matriz cognitiva.
 */

import type { ArtifactContext, ArtifactDecision, ArtifactKind, ArtifactReason } from "./types";
import type { PedagogicalAction } from "../decision/types";

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * Ordem determinística estrita para desempate entre tipos de artefato.
 */
const ARTIFACT_DESEMPATE_ORDER: ArtifactKind[] = [
  "MNEMONIC",
  "COMPARISON_TABLE",
  "MIND_MAP",
  "FLASHCARD",
  "ACTIVE_RECALL",
  "SUMMARY",
];

/**
 * Calcula a confiança nos dados de entrada para decisão de artefato (0.0 a 1.0).
 */
export function calculateArtifactDataConfidence(context: ArtifactContext): number {
  let count = 0;
  const total = 5;

  if (context.decisionResult) count++;
  if (context.pedagogicalAction) count++;
  if (context.artifactSignals) count++;
  if (context.retentionProfile) count++;
  if (context.retentionMatrix) count++;

  if (count === 0) return 0.0;
  return clamp01(count / total);
}

/**
 * Seleciona o artefato de estudo ideal de forma pura e determinística.
 */
export function decideStudyArtifact(context: ArtifactContext): ArtifactDecision {
  const { userId, topicId, decisionResult, artifactSignals, retentionProfile, retentionMatrix } =
    context;

  const action: PedagogicalAction =
    context.pedagogicalAction ?? decisionResult?.primaryAction ?? "PRACTICE";

  const signals = artifactSignals ?? {};
  const reasons: ArtifactReason[] = [];

  const isMemorizationError =
    signals.errorTypeCategory === "MEMORIZATION" || signals.memorizationDifficulty === true;

  const isConceptualConfusion =
    signals.errorTypeCategory === "CONCEPTUAL_CONFUSION" || signals.confusableConcepts === true;

  const isOrganizationNeed =
    signals.errorTypeCategory === "ORGANIZATION" || signals.complexHierarchy === true;

  const isSynthesisNeed =
    signals.errorTypeCategory === "SYNTHESIS" || signals.synthesisNeed === true;

  const isLowActiveRecall =
    signals.lowActiveRecallRate === true || retentionMatrix?.category === "RETENÇÃO_FRÁGIL";

  let primaryArtifact: ArtifactKind = "FLASHCARD";
  let alternativeArtifact: ArtifactKind = "ACTIVE_RECALL";
  let suitabilityScore = 0.5;

  // 1. REGRAS DE ALTA PRIORIDADE COGNITIVA

  // 1.1 REMEDIATION/REVISÃO + ERRO DE MEMORIZAÇÃO -> MNEMONIC
  if ((action === "REMEDIATION" || action === "REVIEW") && isMemorizationError) {
    primaryArtifact = "MNEMONIC";
    alternativeArtifact = "FLASHCARD";
    suitabilityScore = 0.95;
    reasons.push({
      code: "REMEDIATION_MEMORIZATION_MNEMONIC",
      description:
        "Dificuldade de memorização identificada em remediação/revisão. Recomendado mnemônico de fixação.",
      weight: 0.95,
    });
  }
  // 1.2 CONCEITOS CONFUNDÍVEIS OU COMPARATIVOS -> COMPARISON_TABLE
  else if (isConceptualConfusion) {
    primaryArtifact = "COMPARISON_TABLE";
    alternativeArtifact = "MIND_MAP";
    suitabilityScore = 0.9;
    reasons.push({
      code: "CONCEPTUAL_CONFUSION_TABLE",
      description:
        "Conceitos semelhantes ou confundíveis identificados. Recomendada tabela comparativa de diferenciação.",
      weight: 0.9,
    });
  }
  // 1.3 DIFICULDADE DE ORGANIZAÇÃO OU HIERARQUIA COMPLEXA -> MIND_MAP
  else if (isOrganizationNeed) {
    primaryArtifact = "MIND_MAP";
    alternativeArtifact = "SUMMARY";
    suitabilityScore = 0.85;
    reasons.push({
      code: "ORGANIZATION_MIND_MAP",
      description:
        "Estrutura hierárquica complexa ou erro de organização. Recomendado mapa mental de conexões.",
      weight: 0.85,
    });
  }
  // 1.4 RECUPERAÇÃO ATIVA / FLASHCARD
  else if (action === "ACTIVE_RECALL" || action === "REVIEW" || isLowActiveRecall) {
    primaryArtifact = "FLASHCARD";
    alternativeArtifact = "ACTIVE_RECALL";
    suitabilityScore = 0.75;
    reasons.push({
      code: "ACTIVE_RECALL_FLASHCARD",
      description:
        "Necessidade de fortalecimento da recuperação ativa de memória. Recomendado flashcard / recall.",
      weight: 0.75,
    });
  }
  // 1.5 CONSOLIDAÇÃO OU NECESSIDADE DE SÍNTESE -> SUMMARY
  else if (action === "CONSOLIDATION" || action === "NEW_CONTENT" || isSynthesisNeed) {
    primaryArtifact = "SUMMARY";
    alternativeArtifact = "ACTIVE_RECALL";
    suitabilityScore = 0.65;
    reasons.push({
      code: "CONSOLIDATION_SYNTHESIS_SUMMARY",
      description:
        "Consolidação de domínio ou exposição a conteúdo. Recomendado resumo estruturado de síntese.",
      weight: 0.65,
    });
  }
  // 1.6 DOMÍNIO INTERMEDIÁRIO / PRÁTICA -> ACTIVE_RECALL
  else if (action === "PRACTICE" || action === "SOCRATIC") {
    primaryArtifact = "ACTIVE_RECALL";
    alternativeArtifact = "FLASHCARD";
    suitabilityScore = 0.6;
    reasons.push({
      code: "PRACTICE_ACTIVE_RECALL",
      description: "Ação de prática/socrático. Recomendada sessão orientada de recuperação ativa.",
      weight: 0.6,
    });
  }
  // FALLBACK DETERMINÍSTICO
  else {
    primaryArtifact = "FLASHCARD";
    alternativeArtifact = "SUMMARY";
    suitabilityScore = 0.5;
    reasons.push({
      code: "DEFAULT_DETERMINISTIC_ARTIFACT",
      description: "Seleção determinística de artefato padrão por ausência de sinal específico.",
      weight: 0.5,
    });
  }

  // Desempate/distinção determinística para alternativa
  if (alternativeArtifact === primaryArtifact) {
    alternativeArtifact =
      ARTIFACT_DESEMPATE_ORDER.find((a) => a !== primaryArtifact) ?? "FLASHCARD";
  }

  // Ajuste fino com perfil de retenção se presente
  if (retentionProfile) {
    suitabilityScore = clamp01(suitabilityScore * 0.85 + retentionProfile.retentionScore * 0.15);
  }

  const dataConfidence = calculateArtifactDataConfidence(context);

  return {
    userId,
    topicId,
    primaryArtifact,
    alternativeArtifact,
    pedagogicalAction: action,
    suitabilityScore: Number(suitabilityScore.toFixed(4)),
    reasons,
    dataConfidence: Number(dataConfidence.toFixed(4)),
    timestamp: new Date().toISOString(),
  };
}
