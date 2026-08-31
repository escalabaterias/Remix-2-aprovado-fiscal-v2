/**
 * MOTOR CENTRAL DE DECISÃO PEDAGÓGICA (DECISION ENGINE) — Fase 7.5
 *
 * Função pura e determinística que consolida todos os sinais do sistema
 * (Knowledge, Diagnosis, Review, Errors, Analytics 7.4 e Prerequisites)
 * e determina a ação pedagógica prioritária sem depender de IA.
 */

import type {
  DecisionContext,
  DecisionPriorityLevel,
  DecisionReason,
  DecisionResult,
  DecisionSignals,
  PedagogicalAction,
} from "./types";

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * Ordem determinística de desempate de ações.
 */
const ACTION_DESEMPATE_ORDER: PedagogicalAction[] = [
  "REMEDIATION",
  "REVIEW",
  "SOCRATIC",
  "ACTIVE_RECALL",
  "PRACTICE",
  "CONSOLIDATION",
  "NEW_CONTENT",
];

/**
 * Avalia a confiança dos dados de entrada (0.0 a 1.0).
 */
export function calculateDataConfidence(context: DecisionContext): number {
  const { signals, analyticsProfile } = context;
  let signalCount = 0;
  const totalPossible = 8;

  if (typeof signals.mastery === "number") signalCount++;
  if (typeof signals.confidence === "number") signalCount++;
  if (typeof signals.decayRisk === "number") signalCount++;
  if (typeof signals.reviewUrgency === "number") signalCount++;
  if (typeof signals.unresolvedErrors === "number" || typeof signals.recurringErrors === "number")
    signalCount++;
  if (typeof signals.prerequisiteDeficit === "number") signalCount++;
  if (typeof signals.knowledgeState === "string" && signals.knowledgeState !== "SEM_EVIDENCIA")
    signalCount++;
  if (analyticsProfile && analyticsProfile.evidenceCount > 0) signalCount++;

  if (signalCount === 0) return 0.0;
  return clamp01(signalCount / totalPossible);
}

/**
 * Função pura determinística de decisão pedagógica.
 */
export function decidePedagogicalAction(context: DecisionContext): DecisionResult {
  const {
    userId,
    topicId,
    signals,
    analyticsProfile,
    analyticsMatrix,
    predictivePriority,
    allowNewContent = false,
  } = context;

  const reasons: DecisionReason[] = [];
  const signalsUsed: DecisionSignals = { ...signals };

  const mastery = signals.mastery ?? analyticsProfile?.retentionScore ?? 0;
  const decayRisk = signals.decayRisk ?? analyticsProfile?.decayRisk ?? 0;
  const reviewUrgency = signals.reviewUrgency ?? 0;
  const unresolvedErrors = signals.unresolvedErrors ?? 0;
  const recurringErrors = signals.recurringErrors ?? 0;
  const prerequisiteDeficit = signals.prerequisiteDeficit ?? 0;
  const knowledgeState =
    signals.knowledgeState ?? analyticsProfile?.currentKnowledgeState ?? "SEM_EVIDENCIA";
  const errorRecurrence = analyticsProfile?.errorRecurrence ?? (recurringErrors > 0 ? 0.7 : 0);

  const dataConfidence = calculateDataConfidence(context);

  let primaryAction: PedagogicalAction = "CONSOLIDATION";
  let alternativeAction: PedagogicalAction = "PRACTICE";
  let priorityLevel: DecisionPriorityLevel = "MEDIUM";
  let baseScore = 0.5;

  // 1. AUTORIDADE MÁXIMA: BLOQUEIO DE PRÉ-REQUISITOS CRÍTICOS
  if (prerequisiteDeficit >= 0.5) {
    primaryAction = "REMEDIATION";
    alternativeAction = "REVIEW";
    priorityLevel = "CRITICAL";
    baseScore = 0.98;
    reasons.push({
      code: "PREREQUISITE_DEFICIT_CRITICAL",
      description: `Bloqueio crítico de pré-requisito (${(prerequisiteDeficit * 100).toFixed(0)}% de déficit). Impossível avançar em conteúdo novo.`,
      weight: 1.0,
    });
  }
  // 2. ERROS RECORRENTES OU PONTO CRÍTICO
  else if (
    recurringErrors >= 2 ||
    unresolvedErrors >= 2 ||
    knowledgeState === "PONTO_CRITICO" ||
    analyticsMatrix?.category === "REINCIDÊNCIA_DE_ERROS" ||
    errorRecurrence >= 0.4
  ) {
    if (knowledgeState === "CONCEITO_COMPROMETIDO" || recurringErrors >= 3) {
      primaryAction = "SOCRATIC";
      alternativeAction = "REMEDIATION";
    } else {
      primaryAction = "REMEDIATION";
      alternativeAction = "SOCRATIC";
    }
    priorityLevel = recurringErrors >= 2 || unresolvedErrors >= 3 ? "CRITICAL" : "HIGH";
    baseScore = clamp01(0.88 + errorRecurrence * 0.1);
    reasons.push({
      code: "RECURRENT_ERRORS_REMEDIATION",
      description: `Reincidência de erros não resolvidos (${unresolvedErrors} pendentes, ${recurringErrors} recorrentes). Exige remediação focada.`,
      weight: 0.9,
    });
  }
  // 3. REVISÃO URGENTE EXPLICITA
  else if (reviewUrgency >= 0.7 || knowledgeState === "REVISAO_URGENTE") {
    primaryAction = "REVIEW";
    alternativeAction = "ACTIVE_RECALL";
    priorityLevel = reviewUrgency >= 0.9 ? "CRITICAL" : "HIGH";
    baseScore = clamp01(0.78 + reviewUrgency * 0.09);
    reasons.push({
      code: "URGENT_REVIEW_REQUIRED",
      description: `Revisão urgente agendada (${(reviewUrgency * 100).toFixed(0)}% de urgência). Necessário proteger a retenção.`,
      weight: 0.85,
    });
  }
  // 4. RISCO ELEVADO DE ESQUECIMENTO / DECAY
  else if (
    decayRisk >= 0.6 ||
    analyticsMatrix?.category === "RISCO_DE_ESQUECIMENTO" ||
    (signals.daysSinceStudy ?? 0) >= 21
  ) {
    primaryAction = "REVIEW";
    alternativeAction = "ACTIVE_RECALL";
    priorityLevel = decayRisk >= 0.7 || (signals.daysSinceStudy ?? 0) >= 21 ? "HIGH" : "MEDIUM";
    baseScore = clamp01(0.68 + decayRisk * 0.09);
    reasons.push({
      code: "HIGH_DECAY_RISK",
      description: `Risco elevado de esquecimento por tempo sem estudo (${(decayRisk * 100).toFixed(0)}% de decaimento).`,
      weight: 0.75,
    });
  }
  // 5. DOMÍNIO FRÁGIL / RECUPERAÇÃO ATIVA
  else if (
    analyticsMatrix?.category === "RETENÇÃO_FRÁGIL" ||
    (mastery >= 0.35 && mastery < 0.65 && (signals.confidence ?? 1) < 0.6)
  ) {
    primaryAction = "ACTIVE_RECALL";
    alternativeAction = "PRACTICE";
    priorityLevel = "MEDIUM";
    baseScore = 0.6;
    reasons.push({
      code: "FRAGILE_RETENTION_RECALL",
      description: "Retenção frágil ou oscilante. Recomendada recuperação ativa por testes/cards.",
      weight: 0.65,
    });
  }
  // 6. PRÁTICA E APLICAÇÃO EM QUESTÕES
  else if (mastery >= 0.65 && mastery < 0.85) {
    primaryAction = "PRACTICE";
    alternativeAction = "CONSOLIDATION";
    priorityLevel = "MEDIUM";
    baseScore = 0.55;
    reasons.push({
      code: "PRACTICE_APPLICATION",
      description:
        "Domínio intermediário atingido. Prática intensiva de questões recomendada para fixação.",
      weight: 0.55,
    });
  }
  // 7. CONSOLIDAÇÃO E MAESTRIA ALTA
  else if (mastery >= 0.85 && decayRisk < 0.4 && unresolvedErrors === 0) {
    primaryAction = "CONSOLIDATION";
    alternativeAction = "PRACTICE";
    priorityLevel = "LOW";
    baseScore = 0.4;
    reasons.push({
      code: "MASTERY_CONSOLIDATION",
      description: "Excelente nível de domínio e estabilidade. Recomendada consolidação de topo.",
      weight: 0.4,
    });
  }
  // 8. CONTEÚDO NOVO (APENAS SE PERMITIDO E SEM BLOQUEIOS)
  else if (
    allowNewContent &&
    prerequisiteDeficit < 0.4 &&
    (knowledgeState === "SEM_EVIDENCIA" || evidenceCountIsZero(context))
  ) {
    primaryAction = "NEW_CONTENT";
    alternativeAction = "PRACTICE";
    priorityLevel = "MEDIUM";
    baseScore = 0.5;
    reasons.push({
      code: "NEW_CONTENT_READY",
      description: "Tópico pronto para exposição inicial de conteúdo novo sem impedimentos.",
      weight: 0.5,
    });
  }
  // FALLBACK DETERMINÍSTICO PARA DADOS INSUFICIENTES OU ZONA NEUTRA
  else {
    primaryAction = allowNewContent && prerequisiteDeficit < 0.4 ? "NEW_CONTENT" : "PRACTICE";
    alternativeAction = "CONSOLIDATION";
    priorityLevel = "LOW";
    baseScore = 0.35;
    reasons.push({
      code: "DEFAULT_DETERMINISTIC_DECISION",
      description: "Decisão determinística padrão por ausência de sinal crítico ou de emergência.",
      weight: 0.3,
    });
  }

  // Garantir que a ação alternativa seja distinta da primária
  if (alternativeAction === primaryAction) {
    alternativeAction = ACTION_DESEMPATE_ORDER.find((a) => a !== primaryAction) || "PRACTICE";
  }

  // Incorporar fine-tuning do score preditivo sem violar as faixas de autoridade
  if (predictivePriority) {
    baseScore = clamp01(baseScore + (predictivePriority.predictivePriorityScore - 0.5) * 0.08);
  }

  return {
    userId,
    topicId,
    primaryAction,
    alternativeAction,
    priorityLevel,
    decisionScore: Number(baseScore.toFixed(4)),
    reasons,
    signalsUsed,
    dataConfidence: Number(dataConfidence.toFixed(4)),
    timestamp: new Date().toISOString(),
  };
}

function evidenceCountIsZero(context: DecisionContext): boolean {
  return !context.analyticsProfile || context.analyticsProfile.evidenceCount === 0;
}
