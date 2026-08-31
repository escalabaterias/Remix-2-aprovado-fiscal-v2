/**
 * EFICÁCIA DAS INTERVENÇÕES — Fase 7.4
 *
 * Medição observável do desempenho pós-intervenção para cada tipo pedagógico.
 * Declara estritamente insuficiência de dados quando houver menos de 3 amostras observadas.
 */

import type { InterventionType, InterventionEffectiveness, TopicEvidenceItem } from "./types";

const ALL_INTERVENTION_TYPES: InterventionType[] = [
  "review",
  "recall",
  "remediation",
  "practice",
  "exposure",
  "socratic",
];

const MIN_SAMPLES_THRESHOLD = 3;

/**
 * Mapeia o tipo de intervenção para os kinds/sources de evidência correspondentes.
 */
function mapInterventionKinds(type: InterventionType): string[] {
  switch (type) {
    case "review":
      return ["review", "review_session"];
    case "recall":
      return ["recall", "flashcard_deck"];
    case "remediation":
      return ["remediation", "error_central"];
    case "socratic":
      return ["socratic", "socratic_tutor"];
    case "practice":
      return ["practice", "question_bank"];
    case "exposure":
      return ["exposure", "planner_task"];
  }
}

/**
 * Avalia a eficácia de um tipo de intervenção a partir do histórico de evidências.
 */
export function evaluateSingleInterventionEffectiveness(
  evidences: TopicEvidenceItem[],
  type: InterventionType,
): InterventionEffectiveness {
  const targetKinds = mapInterventionKinds(type);
  const gains: number[] = [];
  const postScores: number[] = [];

  for (let i = 0; i < evidences.length - 1; i++) {
    const curr = evidences[i];
    if (targetKinds.includes(curr.kind) || targetKinds.includes(curr.source)) {
      // Procurar score anterior (pré-intervenção)
      let preScore = 0.5;
      for (let k = i - 1; k >= 0; k--) {
        if (typeof evidences[k].score === "number" && !isNaN(evidences[k].score!)) {
          preScore = evidences[k].score!;
          break;
        }
      }

      // Procurar score posterior (pós-intervenção)
      for (let j = i + 1; j < evidences.length; j++) {
        const next = evidences[j];
        if (typeof next.score === "number" && next.score !== null && !isNaN(next.score)) {
          postScores.push(next.score);
          gains.push(next.score - preScore);
          break;
        }
      }
    }
  }

  const sampleCount = postScores.length;
  const hasSufficientData = sampleCount >= MIN_SAMPLES_THRESHOLD;

  if (!hasSufficientData) {
    return {
      kind: type,
      sampleCount,
      successRate: null,
      averageScoreGain: null,
      hasSufficientData: false,
      assessment: `Evidências insuficientes (${sampleCount}/${MIN_SAMPLES_THRESHOLD} observações) para mensurar a eficácia de ${type}.`,
    };
  }

  const successes = postScores.filter((s) => s >= 0.7).length;
  const successRate = successes / sampleCount;
  const averageScoreGain = gains.reduce((a, b) => a + b, 0) / sampleCount;

  return {
    kind: type,
    sampleCount,
    successRate,
    averageScoreGain,
    hasSufficientData: true,
    assessment: `Eficácia observada: ${(successRate * 100).toFixed(0)}% de taxa de sucesso pós-intervenção (${sampleCount} amostras).`,
  };
}

/**
 * Avalia todas as intervenções para um conjunto de evidências.
 */
export function evaluateAllInterventions(
  evidences: TopicEvidenceItem[],
): Record<InterventionType, InterventionEffectiveness> {
  const sorted = [...evidences].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const result: Partial<Record<InterventionType, InterventionEffectiveness>> = {};
  for (const type of ALL_INTERVENTION_TYPES) {
    result[type] = evaluateSingleInterventionEffectiveness(sorted, type);
  }

  return result as Record<InterventionType, InterventionEffectiveness>;
}
