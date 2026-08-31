/**
 * PRIORIDADE PREDITIVA — Fase 7.4
 *
 * Função pura determinística que produz o `predictivePriorityScore`
 * combinando retenção, risco de decaimento, reincidência de erro,
 * lacuna de domínio, urgência de revisão, peso do concurso e pré-requisitos.
 *
 * Fornece sinal adicional preditivo para consumo futuro por Planner/Review/Coach.
 */

import type {
  AnalyticsContextInput,
  PredictivePriority,
  PriorityFactors,
  RetentionProfile,
} from "./types";

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export const PRIORITY_WEIGHTS = {
  RETENTION: 0.2,
  DECAY: 0.2,
  ERROR_RECURRENCE: 0.15,
  MASTERY_GAP: 0.15,
  CONFIDENCE_GAP: 0.05,
  RECENCY: 0.05,
  REVIEW_URGENCY: 0.1,
  CONTEST_WEIGHT: 0.05,
  PREREQUISITE: 0.05,
} as const;

/**
 * Calcula a Prioridade Preditiva determinística para um tópico.
 */
export function calculatePredictivePriority(
  input: AnalyticsContextInput,
  profile: RetentionProfile,
): PredictivePriority {
  const {
    topicId,
    mastery = 0,
    confidence = 0,
    daysSinceStudy = 30,
    reviewUrgency = 0,
    contestWeight = 0.5,
    prerequisiteDeficit = 0,
  } = input;

  const retentionSignal = clamp01(1.0 - profile.retentionScore);
  const decaySignal = clamp01(profile.decayRisk);
  const errorRecurrenceSignal = clamp01(profile.errorRecurrence);
  const masterySignal = clamp01(1.0 - mastery);
  const confidenceSignal = clamp01(1.0 - confidence);
  const recencySignal = clamp01((daysSinceStudy ?? 30) / 30);
  const reviewUrgencySignal = clamp01(reviewUrgency);
  const contestWeightSignal = clamp01(contestWeight);
  const prerequisiteSignal = clamp01(prerequisiteDeficit);

  const factors: PriorityFactors = {
    retentionSignal,
    decaySignal,
    errorRecurrenceSignal,
    masterySignal,
    confidenceSignal,
    recencySignal,
    reviewUrgencySignal,
    contestWeightSignal,
    prerequisiteSignal,
  };

  const predictivePriorityScore = clamp01(
    factors.retentionSignal * PRIORITY_WEIGHTS.RETENTION +
      factors.decaySignal * PRIORITY_WEIGHTS.DECAY +
      factors.errorRecurrenceSignal * PRIORITY_WEIGHTS.ERROR_RECURRENCE +
      factors.masterySignal * PRIORITY_WEIGHTS.MASTERY_GAP +
      factors.confidenceSignal * PRIORITY_WEIGHTS.CONFIDENCE_GAP +
      factors.recencySignal * PRIORITY_WEIGHTS.RECENCY +
      factors.reviewUrgencySignal * PRIORITY_WEIGHTS.REVIEW_URGENCY +
      factors.contestWeightSignal * PRIORITY_WEIGHTS.CONTEST_WEIGHT +
      factors.prerequisiteSignal * PRIORITY_WEIGHTS.PREREQUISITE,
  );

  let primaryReason = "Prioridade preditiva regular calculada pelos sinais de retenção e estudo.";
  if (factors.errorRecurrenceSignal >= 0.4) {
    primaryReason = "Alta urgência preditiva por reincidência de erros não resolvidos.";
  } else if (factors.decaySignal >= 0.6) {
    primaryReason = "Urgência preditiva por risco elevado de esquecimento e decaimento.";
  } else if (factors.prerequisiteSignal >= 0.5) {
    primaryReason = "Urgência preditiva por déficit de pré-requisitos fundamentais no tópico.";
  } else if (predictivePriorityScore >= 0.7) {
    primaryReason =
      "Alta prioridade preditiva devido à combinação de lacuna de domínio e peso de concurso.";
  }

  return {
    topicId,
    predictivePriorityScore,
    factors,
    reason: primaryReason,
  };
}
