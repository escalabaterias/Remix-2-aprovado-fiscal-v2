/**
 * INTELLIGENT TIME ESTIMATOR — Fase 7.7.1
 *
 * Estimador contextual de tempo baseado no histórico real do usuário.
 *
 * PRINCÍPIOS:
 * 1. Função pura e determinística: sem Supabase, sem Date.now(), sem Math.random().
 * 2. Hierarquia de dados com fallback em 6 níveis:
 *    Level 1: Tópico + Tipo de Atividade
 *    Level 2: Tópico
 *    Level 3: Matéria + Tipo de Atividade
 *    Level 4: Matéria
 *    Level 5: Perfil Geral do Usuário (todas matérias/tópicos)
 *    Level 6: Baseline / Fallback padrão
 * 3. Proteções Estatísticas:
 *    - Filtro de Outliers: descarta razões < 0.2 ou > 4.0 (ex: cronômetro esquecido ligado).
 *    - Blending de Credibilidade (Smoothing Bayesiano com K = 3): combina a observação histórica
 *      com o baseline para pequenas amostras (N < 5), evitando distorções com poucos dados.
 *    - Limites de Segurança:
 *      - Limite de Razão: ratio clampado entre 0.5x e 2.0x do baseline.
 *      - Limite Mínimo de Duração: 15 min para blocos de estudo, 10 min para revisões/flashcards.
 *      - Limite Máximo de Duração: 120 min para estudo, 90 min para revisões.
 */

import type { ActivityKind } from "./engine";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE ENTRADA E SAÍDA
// ─────────────────────────────────────────────────────────────────────────────

export type HistoricalExecutionObservation = {
  subjectId: string;
  topicId?: string | null;
  activityKind: ActivityKind;
  plannedMinutes: number;
  actualMinutes: number;
  questionCount?: number | null;
  totalTimeSpentSeconds?: number | null;
};

export type EstimateTaskTimeInput = {
  subjectId: string;
  topicId?: string | null;
  activityKind: ActivityKind;
  baselineMinutes: number;
  questionCount?: number | null;
  history?: HistoricalExecutionObservation[];
  minMinutes?: number;
  maxMinutes?: number;
};

export type EstimateLevel =
  "topic_activity" | "topic" | "subject_activity" | "subject" | "user_overall" | "baseline";

export type TimeEstimateResult = {
  estimatedMinutes: number;
  confidence: number;
  appliedLevel: EstimateLevel;
  sampleSize: number;
  executionRatio: number;
  reason: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE DOMÍNIO E SEGURANÇA
// ─────────────────────────────────────────────────────────────────────────────

/** Peso de credibilidade K para smoothing bayesiano: E_ratio = (N * obsRatio + K * 1.0) / (N + K) */
export const CREDIBILITY_K = 3;

/** Limite mínimo de razão de velocidade histórica vs planejada (0.5x) */
export const MIN_EXECUTION_RATIO = 0.5;

/** Limite máximo de razão de velocidade histórica vs planejada (2.0x) */
export const MAX_EXECUTION_RATIO = 2.0;

/** Outlier inferior: descartar execuções com actual/planned < 0.2 */
export const OUTLIER_LOW_RATIO = 0.2;

/** Outlier superior: descartar execuções com actual/planned > 4.0 */
export const OUTLIER_HIGH_RATIO = 4.0;

/** Limite mínimo padrão para blocos gerais (minutos) */
export const DEFAULT_MIN_TASK_MINUTES = 15;

/** Limite mínimo para atividades de curta duração (revisão, flashcards) */
export const SHORT_ACTIVITY_MIN_MINUTES = 10;

/** Limite máximo padrão para blocos gerais (minutos) */
export const DEFAULT_MAX_TASK_MINUTES = 120;

/** Limite máximo para revisões (minutos) */
export const REVIEW_MAX_TASK_MINUTES = 90;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS PURAS
// ─────────────────────────────────────────────────────────────────────────────

function isShortActivity(kind: ActivityKind): boolean {
  return kind === "revisao" || kind === "flashcards";
}

function safeFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Calcula a razão limpa (sem outliers) para um grupo de observações.
 * Retorna null se não houver observações válidas.
 */
function computeCleanGroupRatio(observations: HistoricalExecutionObservation[]): {
  ratio: number;
  cleanCount: number;
  avgSecondsPerQuestion: number | null;
} | null {
  if (!observations || observations.length === 0) return null;

  const validRatios: number[] = [];
  const questionTimes: number[] = [];

  for (const obs of observations) {
    if (
      !obs ||
      typeof obs.plannedMinutes !== "number" ||
      typeof obs.actualMinutes !== "number" ||
      obs.plannedMinutes <= 0 ||
      obs.actualMinutes <= 0
    ) {
      continue;
    }

    const rawRatio = obs.actualMinutes / obs.plannedMinutes;

    // Filtro de outliers agressivos
    if (rawRatio >= OUTLIER_LOW_RATIO && rawRatio <= OUTLIER_HIGH_RATIO) {
      validRatios.push(rawRatio);
    }

    if (
      typeof obs.questionCount === "number" &&
      obs.questionCount > 0 &&
      typeof obs.totalTimeSpentSeconds === "number" &&
      obs.totalTimeSpentSeconds > 0
    ) {
      const secPerQ = obs.totalTimeSpentSeconds / obs.questionCount;
      if (secPerQ >= 5 && secPerQ <= 600) {
        questionTimes.push(secPerQ);
      }
    }
  }

  if (validRatios.length === 0) return null;

  // Média limpa
  const sumRatio = validRatios.reduce((a, b) => a + b, 0);
  const meanRatio = sumRatio / validRatios.length;

  let avgSecPerQ: number | null = null;
  if (questionTimes.length > 0) {
    avgSecPerQ = questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length;
  }

  return {
    ratio: meanRatio,
    cleanCount: validRatios.length,
    avgSecondsPerQuestion: avgSecPerQ,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTIMADOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estima o tempo necessário para uma tarefa com base na hierarquia histórica do usuário.
 *
 * @param input Dados de entrada e histórico
 * @returns TimeEstimateResult determinístico e seguro
 */
export function estimateTaskTime(input: EstimateTaskTimeInput): TimeEstimateResult {
  const baseline = safeFinite(input.baselineMinutes, 50);
  const minMin =
    input.minMinutes ??
    (isShortActivity(input.activityKind) ? SHORT_ACTIVITY_MIN_MINUTES : DEFAULT_MIN_TASK_MINUTES);
  const maxMin =
    input.maxMinutes ??
    (input.activityKind === "revisao" ? REVIEW_MAX_TASK_MINUTES : DEFAULT_MAX_TASK_MINUTES);

  const history = input.history ?? [];

  // Se não houver histórico, fallback para o Level 6 (Baseline)
  if (history.length === 0) {
    const finalMinutes = clamp(baseline, minMin, maxMin);
    return {
      estimatedMinutes: Math.round(finalMinutes),
      confidence: 0,
      appliedLevel: "baseline",
      sampleSize: 0,
      executionRatio: 1.0,
      reason: `Sem histórico disponível; mantido tempo baseline de ${Math.round(finalMinutes)} min.`,
    };
  }

  // Filtragem hierárquica das observações
  const topicId = input.topicId;
  const subjectId = input.subjectId;
  const kind = input.activityKind;

  // Level 1: Tópico + Tipo de Atividade
  const l1Obs = topicId
    ? history.filter((h) => h.topicId === topicId && h.activityKind === kind)
    : [];
  const l1Stats = computeCleanGroupRatio(l1Obs);

  // Level 2: Tópico
  const l2Obs = topicId ? history.filter((h) => h.topicId === topicId) : [];
  const l2Stats = computeCleanGroupRatio(l2Obs);

  // Level 3: Matéria + Tipo de Atividade
  const l3Obs = history.filter((h) => h.subjectId === subjectId && h.activityKind === kind);
  const l3Stats = computeCleanGroupRatio(l3Obs);

  // Level 4: Matéria
  const l4Obs = history.filter((h) => h.subjectId === subjectId);
  const l4Stats = computeCleanGroupRatio(l4Obs);

  // Level 5: Perfil Geral do Usuário
  const l5Stats = computeCleanGroupRatio(history);

  // Seleção do nível
  let chosenLevel: EstimateLevel = "baseline";
  let chosenRatio = 1.0;
  let chosenCount = 0;
  let chosenSecPerQ: number | null = null;
  let levelDesc = "";

  if (l1Stats && l1Stats.cleanCount >= 1) {
    chosenLevel = "topic_activity";
    chosenRatio = l1Stats.ratio;
    chosenCount = l1Stats.cleanCount;
    chosenSecPerQ = l1Stats.avgSecondsPerQuestion;
    levelDesc = "tópico e atividade";
  } else if (l2Stats && l2Stats.cleanCount >= 1) {
    chosenLevel = "topic";
    chosenRatio = l2Stats.ratio;
    chosenCount = l2Stats.cleanCount;
    chosenSecPerQ = l2Stats.avgSecondsPerQuestion;
    levelDesc = "tópico";
  } else if (l3Stats && l3Stats.cleanCount >= 1) {
    chosenLevel = "subject_activity";
    chosenRatio = l3Stats.ratio;
    chosenCount = l3Stats.cleanCount;
    chosenSecPerQ = l3Stats.avgSecondsPerQuestion;
    levelDesc = "matéria e atividade";
  } else if (l4Stats && l4Stats.cleanCount >= 1) {
    chosenLevel = "subject";
    chosenRatio = l4Stats.ratio;
    chosenCount = l4Stats.cleanCount;
    chosenSecPerQ = l4Stats.avgSecondsPerQuestion;
    levelDesc = "matéria";
  } else if (l5Stats && l5Stats.cleanCount >= 1) {
    chosenLevel = "user_overall";
    chosenRatio = l5Stats.ratio;
    chosenCount = l5Stats.cleanCount;
    chosenSecPerQ = l5Stats.avgSecondsPerQuestion;
    levelDesc = "perfil geral do usuário";
  }

  if (chosenLevel === "baseline") {
    const finalMinutes = clamp(baseline, minMin, maxMin);
    return {
      estimatedMinutes: Math.round(finalMinutes),
      confidence: 0,
      appliedLevel: "baseline",
      sampleSize: 0,
      executionRatio: 1.0,
      reason: `Sem histórico com dados válidos; mantido tempo baseline de ${Math.round(finalMinutes)} min.`,
    };
  }

  // Blending de Credibilidade (Smoothing Bayesiano)
  // E_ratio = (N * obsRatio + K * 1.0) / (N + K)
  const blendedRatio =
    (chosenCount * chosenRatio + CREDIBILITY_K * 1.0) / (chosenCount + CREDIBILITY_K);

  // Clamp da razão final entre 0.5x e 2.0x do baseline
  const safeRatio = clamp(blendedRatio, MIN_EXECUTION_RATIO, MAX_EXECUTION_RATIO);

  // Cálculo do tempo estimado inicial
  let rawEstimate = baseline * safeRatio;

  // Se houver estimativa por questões específica e relevante
  if (
    typeof input.questionCount === "number" &&
    input.questionCount > 0 &&
    chosenSecPerQ !== null &&
    chosenSecPerQ > 0
  ) {
    const questionBasedMinutes = (input.questionCount * chosenSecPerQ) / 60;
    // Ponderação entre o tempo por questões e a estimativa de tempo geral do bloco (50/50)
    rawEstimate = 0.5 * rawEstimate + 0.5 * questionBasedMinutes;
  }

  // Clamp nos limites absoluto min/max
  const finalMinutes = clamp(rawEstimate, minMin, maxMin);

  // Confiança da estimativa (baseada na amostragem e nivel)
  const levelFactorMap: Record<EstimateLevel, number> = {
    topic_activity: 1.0,
    topic: 0.85,
    subject_activity: 0.7,
    subject: 0.55,
    user_overall: 0.4,
    baseline: 0,
  };
  const countFactor = clamp(chosenCount / (chosenCount + CREDIBILITY_K), 0, 1);
  const confidence = Number((levelFactorMap[chosenLevel] * countFactor).toFixed(2));

  const pctDiff = Math.round((safeRatio - 1.0) * 100);
  const diffSign = pctDiff >= 0 ? `+${pctDiff}%` : `${pctDiff}%`;

  const reason = `Estimativa contextual (${levelDesc}, N=${chosenCount}): ritmo ${diffSign} em relação ao padrão → ${Math.round(finalMinutes)} min.`;

  return {
    estimatedMinutes: Math.round(finalMinutes),
    confidence,
    appliedLevel: chosenLevel,
    sampleSize: chosenCount,
    executionRatio: Number(safeRatio.toFixed(2)),
    reason,
  };
}
