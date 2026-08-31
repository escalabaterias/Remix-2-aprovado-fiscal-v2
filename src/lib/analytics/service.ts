/**
 * SERVIÇO DE ANALYTICS COGNITIVO PREDITIVO — Fase 7.4
 *
 * Ponto de entrada unificado para processamento longitudinal de evidências e
 * cálculo de métricas de retenção, trajetória, matriz e prioridade preditiva.
 */

import type { AnalyticsContextInput, TopicAnalyticsResult } from "./types";
import { computeRetentionProfile } from "./retention";
import { reconstructCognitiveTrajectory } from "./trajectory";
import { classifyRetentionMatrix } from "./matrix";
import { evaluateAllInterventions } from "./effectiveness";
import { calculatePredictivePriority } from "./priority";

/**
 * Analisa deterministicamente um único tópico a partir do seu contexto analítico.
 * Função pura sem efeitos colaterais.
 */
export function analyzeTopicAnalytics(input: AnalyticsContextInput): TopicAnalyticsResult {
  const { userId, topicId } = input;

  const retentionProfile = computeRetentionProfile(input);
  const trajectory = reconstructCognitiveTrajectory(input);
  const matrixEntry = classifyRetentionMatrix(retentionProfile, trajectory);
  const interventions = evaluateAllInterventions(input.evidences);
  const predictivePriority = calculatePredictivePriority(input, retentionProfile);

  return {
    userId,
    topicId,
    retentionProfile,
    trajectory,
    matrixEntry,
    interventions,
    predictivePriority,
    computedAt: (input.referenceDate ?? new Date()).toISOString(),
  };
}

/**
 * Analisa múltiplos tópicos de forma determinística e isolada por usuário.
 */
export function analyzeUserTopicsAnalytics(
  inputs: AnalyticsContextInput[],
): TopicAnalyticsResult[] {
  return inputs.map((input) => analyzeTopicAnalytics(input));
}
