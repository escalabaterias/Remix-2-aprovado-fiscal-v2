/**
 * PERSONALIZAÇÃO ADAPTATIVA DOS ARTEFATOS — Fase 7.6.5
 *
 * Módulo responsável por determinar deterministicamente A FORMA E A APRESENTAÇÃO
 * do artefato cognitivo (complexidade, densidade, estrutura visual, exemplos,
 * intensidade de recall e detalhe jurídico) com base no perfil cognitivo do aluno.
 *
 * REGRAS RIGOROSAS DE AUTORIDADE:
 * - A decisão do TIPO do artefato é autoridade exclusiva do Artifacts Engine (7.6.1).
 * - A decisão da AÇÃO pedagógica é autoridade exclusiva do Decision Engine (7.5).
 * - Este módulo determina estritamente a APRESENTAÇÃO (forma/formato) do artefato.
 * - A IA não escolhe o tipo nem altera a estrutura do perfil de apresentação.
 * - Nenhuma evidência é registrada passivamente durante a personalização.
 */

import type { ArtifactKind, ErrorTypeCategory, ArtifactSignals } from "./types";
import type { PedagogicalAction } from "../decision/types";
import type { RetentionProfile, CognitiveTrajectory } from "../analytics/types";
import type { KnowledgeState } from "../knowledge/engine";

export type PresentationComplexity = "SIMPLE" | "STANDARD" | "ADVANCED";
export type PresentationDensity = "LOW" | "MEDIUM" | "HIGH";
export type PresentationVisualStructure = "LOW" | "MEDIUM" | "HIGH";
export type PresentationExampleLevel = "NONE" | "BASIC" | "APPLIED";
export type PresentationRecallIntensity = "LOW" | "MEDIUM" | "HIGH";
export type PresentationLegalDetailLevel = "NONE" | "BASIC" | "FULL";

export interface ArtifactPresentationProfile {
  complexity: PresentationComplexity;
  density: PresentationDensity;
  visualStructure: PresentationVisualStructure;
  exampleLevel: PresentationExampleLevel;
  recallIntensity: PresentationRecallIntensity;
  legalDetailLevel: PresentationLegalDetailLevel;
}

export interface ArtifactPersonalizationContext {
  userId: string;
  topicId: string;
  artifactKind: ArtifactKind;
  pedagogicalAction?: PedagogicalAction;
  errorTypeCategory?: ErrorTypeCategory;
  isRecurrentError?: boolean;
  retentionProfile?: RetentionProfile | null;
  retentionScore?: number | null;
  mastery?: number | null;
  confidence?: number | null;
  legalSourcesCount?: number;
  artifactSignals?: ArtifactSignals;
  trajectory?: CognitiveTrajectory | null;
  knowledgeState?: KnowledgeState | null;
  interactionHistory?: {
    averageScore?: number | null;
    interactionCount?: number;
  };
}

/**
 * Deriva determinística e puramente o perfil de apresentação do artefato.
 */
export function deriveArtifactPresentationProfile(
  context: ArtifactPersonalizationContext,
): ArtifactPresentationProfile {
  const {
    artifactKind,
    pedagogicalAction,
    errorTypeCategory,
    isRecurrentError = false,
    retentionProfile,
    retentionScore: rawRetentionScore,
    mastery: rawMastery,
    legalSourcesCount = 0,
    artifactSignals,
  } = context;

  const retentionScore = rawRetentionScore ?? retentionProfile?.retentionScore ?? 0.5;
  const mastery = rawMastery ?? 0.5;

  // 1. COMPLEXIDADE (SIMPLE | STANDARD | ADVANCED)
  let complexity: PresentationComplexity = "STANDARD";
  if (retentionScore < 0.5 || mastery < 0.4 || errorTypeCategory === "MEMORIZATION") {
    complexity = "SIMPLE";
  } else if (mastery >= 0.8 && retentionScore >= 0.7 && errorTypeCategory !== "MEMORIZATION") {
    complexity = "ADVANCED";
  }

  // 2. DENSIDADE (LOW | MEDIUM | HIGH)
  let density: PresentationDensity = "MEDIUM";
  if (errorTypeCategory === "MEMORIZATION" || mastery >= 0.8 || retentionScore < 0.4) {
    density = "LOW";
  } else if (
    isRecurrentError ||
    errorTypeCategory === "SYNTHESIS" ||
    errorTypeCategory === "ORGANIZATION" ||
    pedagogicalAction === "REMEDIATION"
  ) {
    density = "HIGH";
  }

  // 3. ESTRUTURA VISUAL (LOW | MEDIUM | HIGH)
  let visualStructure: PresentationVisualStructure = "MEDIUM";
  if (
    errorTypeCategory === "ORGANIZATION" ||
    errorTypeCategory === "CONCEPTUAL_CONFUSION" ||
    artifactKind === "MIND_MAP" ||
    artifactKind === "COMPARISON_TABLE" ||
    artifactSignals?.complexHierarchy ||
    artifactSignals?.confusableConcepts
  ) {
    visualStructure = "HIGH";
  } else if (artifactKind === "MNEMONIC" || errorTypeCategory === "MEMORIZATION") {
    visualStructure = "HIGH";
  } else if (artifactKind === "SUMMARY" && errorTypeCategory === "ATTENTION") {
    visualStructure = "MEDIUM";
  }

  // 4. NÍVEL DE EXEMPLOS (NONE | BASIC | APPLIED)
  let exampleLevel: PresentationExampleLevel = "BASIC";
  if (mastery >= 0.8 || isRecurrentError || errorTypeCategory === "APPLICATION") {
    exampleLevel = "APPLIED";
  } else if (artifactKind === "MNEMONIC" && errorTypeCategory === "MEMORIZATION") {
    exampleLevel = "BASIC";
  }

  // 5. INTENSIDADE DE RECALL (LOW | MEDIUM | HIGH)
  let recallIntensity: PresentationRecallIntensity = "MEDIUM";
  if (
    errorTypeCategory === "MEMORIZATION" ||
    retentionScore < 0.5 ||
    mastery >= 0.8 ||
    isRecurrentError ||
    artifactKind === "FLASHCARD" ||
    artifactKind === "ACTIVE_RECALL" ||
    artifactSignals?.lowActiveRecallRate
  ) {
    recallIntensity = "HIGH";
  } else if (retentionScore >= 0.8 && mastery >= 0.7 && artifactKind === "SUMMARY") {
    recallIntensity = "LOW";
  }

  // 6. DETALHAMENTO JURÍDICO (NONE | BASIC | FULL)
  let legalDetailLevel: PresentationLegalDetailLevel = "NONE";
  if (legalSourcesCount > 0) {
    if (
      legalSourcesCount >= 2 ||
      errorTypeCategory === "CONCEPTUAL_CONFUSION" ||
      isRecurrentError
    ) {
      legalDetailLevel = "FULL";
    } else {
      legalDetailLevel = "BASIC";
    }
  }

  return {
    complexity,
    density,
    visualStructure,
    exampleLevel,
    recallIntensity,
    legalDetailLevel,
  };
}
