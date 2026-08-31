/**
 * RETENTION ENGINE — Fase 7.4
 *
 * Cálculo determinístico do perfil de retenção longitudinal por tópico.
 */

import type {
  AnalyticsContextInput,
  RetentionProfile,
  TopicEvidenceItem,
  InterventionType,
} from "./types";

const clamp01 = (val: number): number => Math.max(0, Math.min(1, val));
const clamp11 = (val: number): number => Math.max(-1, Math.min(1, val));

/** Meia-vida padrão da memória para tópicos jurídicos/fiscais (14 dias) */
const MEMORY_HALF_LIFE_DAYS = 14;
const DECAY_LAMBDA = Math.LN2 / MEMORY_HALF_LIFE_DAYS;

/**
 * Calcula o Risco de Decaimento / Esquecimento baseado nos dias decorridos.
 */
export function calculateDecayRisk(daysSinceStudy: number | null): number {
  if (daysSinceStudy === null || daysSinceStudy === undefined || isNaN(daysSinceStudy)) {
    return 1.0;
  }
  if (daysSinceStudy <= 0) return 0.0;
  const risk = 1.0 - Math.exp(-DECAY_LAMBDA * daysSinceStudy);
  return clamp01(risk);
}

/**
 * Calcula a tendência do domínio (masteryTrend) comparando a segunda metade
 * das evidências com a primeira metade.
 */
export function calculateMasteryTrend(evidences: TopicEvidenceItem[]): number {
  const scored = evidences.filter(
    (e) => typeof e.score === "number" && e.score !== null && !isNaN(e.score),
  );
  if (scored.length < 2) return 0;

  const mid = Math.floor(scored.length / 2);
  const firstHalf = scored.slice(0, mid);
  const secondHalf = scored.slice(mid);

  const avgFirst = firstHalf.reduce((acc, e) => acc + (e.score ?? 0), 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((acc, e) => acc + (e.score ?? 0), 0) / secondHalf.length;

  return clamp11(avgSecond - avgFirst);
}

/**
 * Calcula a tendência de confiança declarada ou computada.
 */
export function calculateConfidenceTrend(evidences: TopicEvidenceItem[]): number {
  const withConfidence = evidences.filter(
    (e) =>
      typeof e.declaredConfidence === "number" &&
      e.declaredConfidence !== null &&
      !isNaN(e.declaredConfidence),
  );

  if (withConfidence.length < 2) return 0;

  const mid = Math.floor(withConfidence.length / 2);
  const firstHalf = withConfidence.slice(0, mid);
  const secondHalf = withConfidence.slice(mid);

  const avgFirst =
    firstHalf.reduce((acc, e) => acc + (e.declaredConfidence ?? 3), 0) / firstHalf.length;
  const avgSecond =
    secondHalf.reduce((acc, e) => acc + (e.declaredConfidence ?? 3), 0) / secondHalf.length;

  // Normaliza escala de 1..5 para variação em -1..1
  return clamp11((avgSecond - avgFirst) / 4);
}

/**
 * Calcula o índice de reincidência de erros (0.0 a 1.0).
 */
export function calculateErrorRecurrence(
  evidences: TopicEvidenceItem[],
  recurringErrorsCount?: number,
  unresolvedErrorsCount?: number,
): number {
  if (typeof recurringErrorsCount === "number" && recurringErrorsCount > 0) {
    return clamp01(recurringErrorsCount / (recurringErrorsCount + 3));
  }

  const scored = evidences.filter(
    (e) => typeof e.score === "number" && e.score !== null && !isNaN(e.score),
  );
  if (scored.length === 0) return 0;

  const errors = scored.filter((e) => (e.score ?? 0) < 0.7);
  if (errors.length === 0) return 0;

  // Se houver mais de um erro com intervalo curto ou alta proporção de falhas
  const errorRate = errors.length / scored.length;
  const unresolvedFactor =
    typeof unresolvedErrorsCount === "number" ? clamp01(unresolvedErrorsCount / 5) : 0;

  return clamp01(errorRate * 0.7 + unresolvedFactor * 0.3);
}

/**
 * Calcula a eficácia de um determinado tipo de intervenção (revisão ou socrático).
 * Retorna o ganho médio de score ou taxa de acerto posterior.
 * Retorna null se houver menos de 3 amostras.
 */
export function calculateInterventionEffectiveness(
  evidences: TopicEvidenceItem[],
  targetInterventionKinds: string[],
): number | null {
  const pairs: number[] = [];

  for (let i = 0; i < evidences.length - 1; i++) {
    const curr = evidences[i];
    if (
      targetInterventionKinds.includes(curr.kind) ||
      targetInterventionKinds.includes(curr.source)
    ) {
      // Procurar próxima evidência de avaliação (practice ou recall)
      for (let j = i + 1; j < evidences.length; j++) {
        const next = evidences[j];
        if (typeof next.score === "number" && next.score !== null && !isNaN(next.score)) {
          pairs.push(next.score);
          break; // pega a primeira avaliação pós-intervenção
        }
      }
    }
  }

  if (pairs.length < 3) return null;

  const avgScorePost = pairs.reduce((acc, s) => acc + s, 0) / pairs.length;
  return clamp01(avgScorePost);
}

/**
 * Calcula o Perfil de Retenção consolidado para um tópico.
 */
export function computeRetentionProfile(input: AnalyticsContextInput): RetentionProfile {
  const {
    topicId,
    evidences,
    knowledgeState,
    mastery: inputMastery,
    confidence: inputConfidence,
    daysSinceStudy: inputDaysSinceStudy,
    recentErrors,
    unresolvedErrors,
    recurringErrors,
    referenceDate = new Date(),
  } = input;

  // Ordenar evidências por timestamp ascendente
  const sortedEvidences = [...evidences].sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    return tA - tB;
  });

  const evidenceCount = sortedEvidences.length;
  const lastEvidence = evidenceCount > 0 ? sortedEvidences[evidenceCount - 1] : null;
  const lastEvidenceAt = lastEvidence ? lastEvidence.timestamp : null;

  // Se não houver dados
  if (evidenceCount === 0 && !inputMastery) {
    return {
      topicId,
      retentionScore: 0,
      masteryTrend: 0,
      confidenceTrend: 0,
      decayRisk: 1.0,
      errorRecurrence: 0,
      reviewEffectiveness: null,
      socraticEffectiveness: null,
      lastEvidenceAt: null,
      evidenceCount: 0,
      currentKnowledgeState: knowledgeState ?? "SEM_EVIDENCIA",
    };
  }

  // Calcular dias desde último estudo se não fornecido explicitamente
  let computedDaysSinceStudy = inputDaysSinceStudy;
  if ((computedDaysSinceStudy === undefined || computedDaysSinceStudy === null) && lastEvidenceAt) {
    const diffMs = referenceDate.getTime() - new Date(lastEvidenceAt).getTime();
    computedDaysSinceStudy = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  }

  const decayRisk = calculateDecayRisk(computedDaysSinceStudy ?? null);
  const masteryTrend = calculateMasteryTrend(sortedEvidences);
  const confidenceTrend = calculateConfidenceTrend(sortedEvidences);

  // Estimativa de mastery
  const scoredEvidences = sortedEvidences.filter(
    (e) => typeof e.score === "number" && e.score !== null && !isNaN(e.score),
  );
  let computedMastery = inputMastery;
  if (computedMastery === undefined || computedMastery === null) {
    if (scoredEvidences.length > 0) {
      computedMastery =
        scoredEvidences.reduce((acc, e) => acc + (e.score ?? 0), 0) / scoredEvidences.length;
    } else {
      computedMastery = 0;
    }
  }

  // Estimativa de confiança
  let computedConfidence = inputConfidence;
  if (computedConfidence === undefined || computedConfidence === null) {
    computedConfidence = 1 - Math.exp(-evidenceCount / 8);
  }

  const errorRecurrence = calculateErrorRecurrence(
    sortedEvidences,
    recurringErrors,
    unresolvedErrors,
  );

  const reviewEffectiveness = calculateInterventionEffectiveness(sortedEvidences, [
    "review",
    "recall",
    "review_session",
    "flashcard_deck",
  ]);

  const socraticEffectiveness = calculateInterventionEffectiveness(sortedEvidences, [
    "socratic",
    "socratic_tutor",
    "remediation",
    "error_central",
  ]);

  // Fórmula determinística do retentionScore
  const retentionScore = clamp01(
    computedMastery * 0.45 +
      (1.0 - decayRisk) * 0.35 +
      computedConfidence * 0.2 -
      errorRecurrence * 0.15,
  );

  return {
    topicId,
    retentionScore,
    masteryTrend,
    confidenceTrend,
    decayRisk,
    errorRecurrence,
    reviewEffectiveness,
    socraticEffectiveness,
    lastEvidenceAt,
    evidenceCount,
    currentKnowledgeState: knowledgeState ?? (evidenceCount > 0 ? "APRENDIZAGEM" : "SEM_EVIDENCIA"),
  };
}
