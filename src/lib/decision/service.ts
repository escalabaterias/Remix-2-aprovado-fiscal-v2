/**
 * SERVIÇO CENTRAL DE DECISÃO PEDAGÓGICA (DECISION SERVICE) — Fase 7.5
 *
 * Ponto de entrada unificado para tomada de decisão determinística por tópico
 * ou lote de tópicos para consumo por Planner, Scheduler e Mentor.
 */

import type { DecisionContext, DecisionResult } from "./types";
import { decidePedagogicalAction } from "./engine";
import { analyzeTopicAnalytics } from "../analytics/service";

/**
 * Processa o contexto e gera a decisão determinística para um único tópico.
 */
export function getPedagogicalDecision(context: DecisionContext): DecisionResult {
  // Se o contexto não tiver o profile do analytics 7.4 pré-computado, mas tiver evidências, podemos enriquecê-lo
  let enrichedContext = { ...context };

  if (!enrichedContext.analyticsProfile && enrichedContext.signals) {
    // Tentar construir o contexto analítico se houver dados de suporte
    const analyticsInput = {
      userId: enrichedContext.userId,
      topicId: enrichedContext.topicId,
      evidences: [],
      mastery: enrichedContext.signals.mastery,
      confidence: enrichedContext.signals.confidence,
      daysSinceStudy: enrichedContext.signals.daysSinceStudy ?? undefined,
      knowledgeState: enrichedContext.signals.knowledgeState,
      reviewUrgency: enrichedContext.signals.reviewUrgency,
      recurringErrors: enrichedContext.signals.recurringErrors,
      unresolvedErrors: enrichedContext.signals.unresolvedErrors,
      prerequisiteDeficit: enrichedContext.signals.prerequisiteDeficit,
      contestWeight: enrichedContext.signals.contestWeight,
    };

    const analyticsResult = analyzeTopicAnalytics(analyticsInput);
    enrichedContext = {
      ...enrichedContext,
      analyticsProfile: analyticsResult.retentionProfile,
      analyticsTrajectory: analyticsResult.trajectory,
      analyticsMatrix: analyticsResult.matrixEntry,
      predictivePriority: analyticsResult.predictivePriority,
    };
  }

  return decidePedagogicalAction(enrichedContext);
}

/**
 * Processa a decisão pedagógica determinística para múltiplos tópicos em lote,
 * ordenando os resultados por pontuação de prioridade (`decisionScore` descendente).
 */
export function getBatchPedagogicalDecisions(contexts: DecisionContext[]): DecisionResult[] {
  return contexts
    .map((ctx) => getPedagogicalDecision(ctx))
    .sort((a, b) => b.decisionScore - a.decisionScore);
}
