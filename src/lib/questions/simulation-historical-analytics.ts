/**
 * SIMULATION HISTORICAL ANALYTICS — Etapa 8.2.5
 *
 * Módulo puro, determinístico e sem efeitos colaterais para análise
 * longitudinal e evolutiva de simulados.
 *
 * RESPONSABILIDADES:
 *   - Agrupar e ordenar simulados concluídos em série cronológica.
 *   - Calcular evolução da acurácia, taxa de resposta, velocidade e variabilidade.
 *   - Detectar tendências determinísticas (IMPROVING, DECLINING, STABLE, VOLATILE, INSUFFICIENT_DATA).
 *   - Mapear trajetória histórica por disciplina e por tópico.
 *   - Gerar sinais históricos descritivos sem tomar decisões pedagógicas.
 *
 * REGRAS DE ARQUITETURA:
 *   - 100% FUNÇÕES PURAS e determinísticas.
 *   - Sem acesso ao banco / Supabase.
 *   - Sem chamadas de IA / LLM.
 *   - Sem efeitos colaterais ou mutação de inputs.
 *   - NÃO altera Knowledge, Diagnostic, Evidence, Review, Planner ou Scheduler.
 *   - NÃO prevê nota de aprovação, probabilidade, corte ou ranking (Etapa 9).
 */

import type { QuestionSet, QuestionSetItem } from "./types";
import { analyzeSimulationPerformance } from "./simulation-analytics";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS E CONTRATOS HISTÓRICOS
// ─────────────────────────────────────────────────────────────────────────────

export type SimulationTrend =
  "IMPROVING" | "DECLINING" | "STABLE" | "VOLATILE" | "INSUFFICIENT_DATA";

export type HistoricalSignalType =
  | "EVOLUTION"
  | "REGRESSION"
  | "STABLE"
  | "VOLATILE"
  | "PERSISTENT_WEAKNESS"
  | "RECOVERY"
  | "SPEED_IMPROVEMENT"
  | "SPEED_REGRESSION";

export type HistoricalSignal = {
  type: HistoricalSignalType;
  entityType: "overall" | "subject" | "topic" | "speed";
  entityId?: string;
  entityName?: string;
  label: string;
  description: string;
  value?: number;
};

export type SimulationHistoricalPoint = {
  setId: string;
  setName: string;
  completedAt: string;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercentage: number;
  responsePercentage: number;
  totalTimeSpentSeconds: number;
  avgTimePerQuestionSeconds: number;
};

export type OverallEvolutionSummary = {
  totalSimulations: number;
  firstPoint: SimulationHistoricalPoint | null;
  latestPoint: SimulationHistoricalPoint | null;
  bestPoint: SimulationHistoricalPoint | null;
  worstPoint: SimulationHistoricalPoint | null;
  averageAccuracyPercentage: number;
  accuracyDeltaPercentage: number; // Ex: +15.5 p.p.
  overallTrend: SimulationTrend;

  // Resposta e Velocidade
  averageResponsePercentage: number;
  responseRateDeltaPercentage: number;
  averageTimePerQuestionSeconds: number;
  speedDeltaSeconds: number; // negativo significa que ficou mais rápido
  speedTrend: "FASTER" | "SLOWER" | "STABLE" | "INSUFFICIENT_DATA";

  // Dispersão simples
  accuracyStandardDeviation: number;
  isVolatile: boolean;
};

export type SubjectHistoricalPerformance = {
  subjectId: string;
  subjectName: string;
  simulationCount: number;
  firstAccuracyPercentage: number;
  latestAccuracyPercentage: number;
  bestAccuracyPercentage: number;
  worstAccuracyPercentage: number;
  averageAccuracyPercentage: number;
  accuracyDeltaPercentage: number;
  trend: SimulationTrend;
  history: Array<{
    setId: string;
    completedAt: string;
    accuracyPercentage: number;
  }>;
};

export type TopicHistoricalPerformance = {
  topicId: string;
  topicName: string;
  subjectId: string | null;
  subjectName: string | null;
  simulationCount: number;
  firstAccuracyPercentage: number;
  latestAccuracyPercentage: number;
  bestAccuracyPercentage: number;
  worstAccuracyPercentage: number;
  averageAccuracyPercentage: number;
  accuracyDeltaPercentage: number;
  trend: SimulationTrend;
  isPersistentWeakness: boolean;
  history: Array<{
    setId: string;
    completedAt: string;
    accuracyPercentage: number;
  }>;
};

export type SimulationHistoricalInput = {
  simulations: Array<{
    set: QuestionSet;
    items: QuestionSetItem[];
  }>;
};

export type SimulationHistoricalAnalysis = {
  summary: OverallEvolutionSummary;
  timeline: SimulationHistoricalPoint[];
  subjects: SubjectHistoricalPerformance[];
  topics: TopicHistoricalPerformance[];
  signals: HistoricalSignal[];
  hasSufficientData: boolean;
  sampleSizeCategory: "EMPTY" | "INITIAL_POINT" | "DIRECT_COMPARISON" | "LONGITUDINAL_TREND";
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS E CONTRATOS COMPARATIVOS E BENCHMARKS (Etapa 8.2.6)
// ─────────────────────────────────────────────────────────────────────────────

export type ComparisonDirection = "IMPROVED" | "DECLINED" | "STABLE";

export type SimulationDirectComparison = {
  simA: SimulationHistoricalPoint;
  simB: SimulationHistoricalPoint;
  accuracyDeltaPp: number;
  responseDeltaPp: number;
  timeSpentDeltaSeconds: number;
  avgTimeDeltaSeconds: number;
  direction: ComparisonDirection;
};

export type WindowComparisonWindow = {
  label: string;
  baseCount: number;
  targetCount: number;
  baseAccuracy: number;
  targetAccuracy: number;
  accuracyDeltaPp: number;
  baseAvgTimeSeconds: number;
  targetAvgTimeSeconds: number;
  speedDeltaSeconds: number;
  direction: ComparisonDirection;
  hasSufficientData: boolean;
};

export type WindowComparison = {
  latestVsAvgPrevious3: WindowComparisonWindow | null;
  recent3VsPrevious3: WindowComparisonWindow | null;
  recent5VsPrevious5: WindowComparisonWindow | null;
};

export type InternalBenchmark = {
  bestScoreAccuracy: number;
  bestScoreSetId: string | null;
  bestScoreSetName: string | null;
  averageScoreAccuracy: number;
  medianScoreAccuracy: number;
  currentAccuracy: number | null;
  currentSetId: string | null;
  currentSetName: string | null;
  deltaVsAveragePp: number | null;
  deltaVsMedianPp: number | null;
  gapToBestPp: number | null;
  percentileRank: number | null;
  hasSufficientData: boolean;
};

export type BankPerformanceComparison = {
  examBoard: string;
  questionCount: number;
  simulationCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercentage: number;
  avgTimePerQuestionSeconds: number;
  status: "SUFFICIENT_DATA" | "INSUFFICIENT_DATA";
};

export type AccuracySpeedClassification =
  | "CONSISTENT_GROWTH"
  | "ACCURACY_UP_SPEED_DOWN"
  | "SPEED_UP_ACCURACY_DOWN"
  | "DOUBLE_DETERIORATION"
  | "STABLE";

export type AccuracySpeedMatrix = {
  classification: AccuracySpeedClassification;
  label: string;
  description: string;
  accuracyDeltaPp: number;
  speedDeltaSeconds: number;
};

export type ConsistencyClassification =
  | "CONSISTENTLY_STRONG"
  | "CONSISTENTLY_WEAK"
  | "IMPROVING"
  | "DECLINING"
  | "VOLATILE"
  | "INSUFFICIENT_DATA";

export type ComparativeAnalysis = {
  historicalAnalysis: SimulationHistoricalAnalysis;
  internalBenchmark: InternalBenchmark;
  windowComparison: WindowComparison;
  bankComparisons: BankPerformanceComparison[];
  accuracySpeedMatrix: AccuracySpeedMatrix | null;
  consistency: ConsistencyClassification;
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES DETERMINÍSTICAS (Puras)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o desvio padrão de uma série numérica.
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Classifica a tendência determinística de uma série de percentuais de acerto.
 */
export function classifyTrend(accuracySeries: number[]): SimulationTrend {
  if (accuracySeries.length < 2) return "INSUFFICIENT_DATA";

  const stdDev = calculateStandardDeviation(accuracySeries);
  const first = accuracySeries[0];
  const last = accuracySeries[accuracySeries.length - 1];
  const delta = last - first;

  // Se a oscilação é muito alta (> 18.0 p.p. de desvio padrão) com amostragem >= 3
  if (accuracySeries.length >= 3 && stdDev > 18.0) {
    return "VOLATILE";
  }

  // Thresholds determinísticos para evolução/regressão
  if (delta >= 5.0) return "IMPROVING";
  if (delta <= -5.0) return "DECLINING";
  return "STABLE";
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR PRINCIPAL DE ANÁLISE HISTÓRICA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa a análise longitudinal determinística de uma coleção de simulados do aluno.
 */
export function analyzeSimulationHistory(
  input: SimulationHistoricalInput,
): SimulationHistoricalAnalysis {
  // 1. Filtrar estritamente simulados concluídos com data válida
  const rawSimulations = Array.isArray(input?.simulations) ? input.simulations : [];
  const validSimulations = rawSimulations.filter(
    (s) => s && s.set && s.set.isCompleted && s.set.completedAt,
  );

  // 2. Ordenar cronologicamente estrito por completedAt ASC
  const sortedSimulations = [...validSimulations].sort((a, b) => {
    const timeA = new Date(a.set.completedAt!).getTime();
    const timeB = new Date(b.set.completedAt!).getTime();
    return timeA - timeB;
  });

  const totalSimulations = sortedSimulations.length;

  // Categoria de amostragem
  let sampleSizeCategory: SimulationHistoricalAnalysis["sampleSizeCategory"] = "EMPTY";
  if (totalSimulations === 1) sampleSizeCategory = "INITIAL_POINT";
  else if (totalSimulations === 2) sampleSizeCategory = "DIRECT_COMPARISON";
  else if (totalSimulations >= 3) sampleSizeCategory = "LONGITUDINAL_TREND";

  // Se não houver simulados válidos
  if (totalSimulations === 0) {
    return {
      summary: {
        totalSimulations: 0,
        firstPoint: null,
        latestPoint: null,
        bestPoint: null,
        worstPoint: null,
        averageAccuracyPercentage: 0,
        accuracyDeltaPercentage: 0,
        overallTrend: "INSUFFICIENT_DATA",
        averageResponsePercentage: 0,
        responseRateDeltaPercentage: 0,
        averageTimePerQuestionSeconds: 0,
        speedDeltaSeconds: 0,
        speedTrend: "INSUFFICIENT_DATA",
        accuracyStandardDeviation: 0,
        isVolatile: false,
      },
      timeline: [],
      subjects: [],
      topics: [],
      signals: [],
      hasSufficientData: false,
      sampleSizeCategory: "EMPTY",
    };
  }

  // 3. Mapear cada simulado para seu SimulationHistoricalPoint via Simulation Analytics
  const timeline: SimulationHistoricalPoint[] = [];
  const subjectMap = new Map<
    string,
    { name: string; history: Array<{ setId: string; completedAt: string; accuracy: number }> }
  >();
  const topicMap = new Map<
    string,
    {
      name: string;
      subjectId: string | null;
      subjectName: string | null;
      history: Array<{ setId: string; completedAt: string; accuracy: number }>;
    }
  >();

  for (const sim of sortedSimulations) {
    const singleAnalysis = analyzeSimulationPerformance({
      set: sim.set,
      items: sim.items,
    });

    const completedAtStr = sim.set.completedAt!;
    const point: SimulationHistoricalPoint = {
      setId: sim.set.setId,
      setName: sim.set.name || "Simulado sem nome",
      completedAt: completedAtStr,
      totalQuestions: singleAnalysis.overview.totalQuestions,
      answeredCount: singleAnalysis.overview.answeredCount,
      unansweredCount: singleAnalysis.overview.unansweredCount,
      correctCount: singleAnalysis.overview.correctCount,
      wrongCount: singleAnalysis.overview.wrongCount,
      accuracyPercentage: singleAnalysis.overview.accuracyPercentage,
      responsePercentage: singleAnalysis.overview.responsePercentage,
      totalTimeSpentSeconds: singleAnalysis.overview.totalTimeSpentSeconds,
      avgTimePerQuestionSeconds: singleAnalysis.overview.avgTimePerQuestionSeconds,
    };

    timeline.push(point);

    // Mapeamento de histórico por matéria
    for (const sub of singleAnalysis.subjectPerformance) {
      if (!sub.subjectId) continue;
      const existing = subjectMap.get(sub.subjectId) ?? { name: sub.subjectName, history: [] };
      existing.history.push({
        setId: sim.set.setId,
        completedAt: completedAtStr,
        accuracy: sub.accuracyPercentage,
      });
      subjectMap.set(sub.subjectId, existing);
    }

    // Mapeamento de histórico por tópico
    for (const top of singleAnalysis.topicPerformance) {
      if (!top.topicId) continue;
      const existing = topicMap.get(top.topicId) ?? {
        name: top.topicName,
        subjectId: top.subjectId,
        subjectName: top.subjectName,
        history: [],
      };
      existing.history.push({
        setId: sim.set.setId,
        completedAt: completedAtStr,
        accuracy: top.accuracyPercentage,
      });
      topicMap.set(top.topicId, existing);
    }
  }

  // 4. Métricas Globais da Linha do Tempo
  const accuracies = timeline.map((t) => t.accuracyPercentage);
  const responseRates = timeline.map((t) => t.responsePercentage);
  const avgTimes = timeline.map((t) => t.avgTimePerQuestionSeconds);

  const firstPoint = timeline[0];
  const latestPoint = timeline[timeline.length - 1];

  let bestPoint = timeline[0];
  let worstPoint = timeline[0];

  for (const pt of timeline) {
    if (pt.accuracyPercentage > bestPoint.accuracyPercentage) bestPoint = pt;
    if (pt.accuracyPercentage < worstPoint.accuracyPercentage) worstPoint = pt;
  }

  const avgAccuracy = Number((accuracies.reduce((a, b) => a + b, 0) / totalSimulations).toFixed(2));
  const accuracyDelta = Number(
    (latestPoint.accuracyPercentage - firstPoint.accuracyPercentage).toFixed(2),
  );
  const overallTrend = classifyTrend(accuracies);

  const avgResponseRate = Number(
    (responseRates.reduce((a, b) => a + b, 0) / totalSimulations).toFixed(2),
  );
  const responseRateDelta = Number(
    (latestPoint.responsePercentage - firstPoint.responsePercentage).toFixed(2),
  );

  const avgTimePerQ = Number((avgTimes.reduce((a, b) => a + b, 0) / totalSimulations).toFixed(2));
  const speedDelta = Number(
    (latestPoint.avgTimePerQuestionSeconds - firstPoint.avgTimePerQuestionSeconds).toFixed(2),
  );

  let speedTrend: OverallEvolutionSummary["speedTrend"] = "INSUFFICIENT_DATA";
  if (totalSimulations >= 2) {
    if (speedDelta <= -5.0) speedTrend = "FASTER";
    else if (speedDelta >= 5.0) speedTrend = "SLOWER";
    else speedTrend = "STABLE";
  }

  const stdDev = Number(calculateStandardDeviation(accuracies).toFixed(2));
  const isVolatile = totalSimulations >= 3 && stdDev > 18.0;

  const summary: OverallEvolutionSummary = {
    totalSimulations,
    firstPoint,
    latestPoint,
    bestPoint,
    worstPoint,
    averageAccuracyPercentage: avgAccuracy,
    accuracyDeltaPercentage: accuracyDelta,
    overallTrend,
    averageResponsePercentage: avgResponseRate,
    responseRateDeltaPercentage: responseRateDelta,
    averageTimePerQuestionSeconds: avgTimePerQ,
    speedDeltaSeconds: speedDelta,
    speedTrend,
    accuracyStandardDeviation: stdDev,
    isVolatile,
  };

  // 5. Histórico por Disciplina
  const subjectResults: SubjectHistoricalPerformance[] = [];
  for (const [subjectId, data] of subjectMap.entries()) {
    const subAccuracies = data.history.map((h) => h.accuracy);
    const subFirst = subAccuracies[0];
    const subLatest = subAccuracies[subAccuracies.length - 1];
    let subBest = subAccuracies[0];
    let subWorst = subAccuracies[0];

    for (const acc of subAccuracies) {
      if (acc > subBest) subBest = acc;
      if (acc < subWorst) subWorst = acc;
    }

    const subAvg = Number(
      (subAccuracies.reduce((a, b) => a + b, 0) / subAccuracies.length).toFixed(2),
    );
    const subDelta = Number((subLatest - subFirst).toFixed(2));
    const subTrend = classifyTrend(subAccuracies);

    subjectResults.push({
      subjectId,
      subjectName: data.name,
      simulationCount: data.history.length,
      firstAccuracyPercentage: subFirst,
      latestAccuracyPercentage: subLatest,
      bestAccuracyPercentage: subBest,
      worstAccuracyPercentage: subWorst,
      averageAccuracyPercentage: subAvg,
      accuracyDeltaPercentage: subDelta,
      trend: subTrend,
      history: data.history.map((h) => ({
        setId: h.setId,
        completedAt: h.completedAt,
        accuracyPercentage: h.accuracy,
      })),
    });
  }

  // 6. Histórico por Tópico
  const topicResults: TopicHistoricalPerformance[] = [];
  for (const [topicId, data] of topicMap.entries()) {
    const topAccuracies = data.history.map((h) => h.accuracy);
    const topFirst = topAccuracies[0];
    const topLatest = topAccuracies[topAccuracies.length - 1];
    let topBest = topAccuracies[0];
    let topWorst = topAccuracies[0];

    for (const acc of topAccuracies) {
      if (acc > topBest) topBest = acc;
      if (acc < topWorst) topWorst = acc;
    }

    const topAvg = Number(
      (topAccuracies.reduce((a, b) => a + b, 0) / topAccuracies.length).toFixed(2),
    );
    const topDelta = Number((topLatest - topFirst).toFixed(2));
    const topTrend = classifyTrend(topAccuracies);

    // Persistência de vulnerabilidade: testado em >= 2 simulados com acurácia média < 60%
    const isPersistentWeakness = topAccuracies.length >= 2 && topAvg < 60.0;

    topicResults.push({
      topicId,
      topicName: data.name,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      simulationCount: data.history.length,
      firstAccuracyPercentage: topFirst,
      latestAccuracyPercentage: topLatest,
      bestAccuracyPercentage: topBest,
      worstAccuracyPercentage: topWorst,
      averageAccuracyPercentage: topAvg,
      accuracyDeltaPercentage: topDelta,
      trend: topTrend,
      isPersistentWeakness,
      history: data.history.map((h) => ({
        setId: h.setId,
        completedAt: h.completedAt,
        accuracyPercentage: h.accuracy,
      })),
    });
  }

  // 7. Geração de Sinais Históricos Descritivos
  const signals: HistoricalSignal[] = [];

  if (totalSimulations >= 2) {
    if (overallTrend === "IMPROVING") {
      signals.push({
        type: "EVOLUTION",
        entityType: "overall",
        label: "Evolução Global Consistente",
        description: `Sua acurácia geral cresceu ${accuracyDelta > 0 ? "+" : ""}${accuracyDelta} p.p. desde o primeiro simulado.`,
        value: accuracyDelta,
      });
    } else if (overallTrend === "DECLINING") {
      signals.push({
        type: "REGRESSION",
        entityType: "overall",
        label: "Queda na Performance Geral",
        description: `Sua acurácia geral reduziu ${accuracyDelta} p.p. em relação aos primeiros simulados.`,
        value: accuracyDelta,
      });
    } else if (overallTrend === "STABLE") {
      signals.push({
        type: "STABLE",
        entityType: "overall",
        label: "Desempenho Estável",
        description: `Sua acurácia geral mantém-se estável em cerca de ${avgAccuracy}%.`,
        value: avgAccuracy,
      });
    }

    if (isVolatile) {
      signals.push({
        type: "VOLATILE",
        entityType: "overall",
        label: "Alta Oscilação nos Resultados",
        description:
          "Suas notas oscilam significativamente entre os simulados. Busque padronizar seu ritmo e atenção.",
        value: stdDev,
      });
    }

    // Sinal de Velocidade com Preservação de Contexto (Evita falso positivo se a precisão despencou)
    if (speedTrend === "FASTER") {
      if (accuracyDelta >= -3.0) {
        signals.push({
          type: "SPEED_IMPROVEMENT",
          entityType: "speed",
          label: "Aumento de Velocidade com Precisão Preservada",
          description: `Seu tempo por questão reduziu em ${Math.abs(speedDelta)}s mantendo bom nível de acerto.`,
          value: speedDelta,
        });
      }
    } else if (speedTrend === "SLOWER") {
      signals.push({
        type: "SPEED_REGRESSION",
        entityType: "speed",
        label: "Aumento do Tempo de Resolução",
        description: `Você está levando em média ${Math.abs(speedDelta)}s a mais por questão nos simulados recentes.`,
        value: speedDelta,
      });
    }

    // Sinais por Disciplina
    for (const sub of subjectResults) {
      if (sub.trend === "IMPROVING" && sub.accuracyDeltaPercentage >= 10.0) {
        signals.push({
          type: "EVOLUTION",
          entityType: "subject",
          entityId: sub.subjectId,
          entityName: sub.subjectName,
          label: `Evolução Notável em ${sub.subjectName}`,
          description: `Rendimento em ${sub.subjectName} cresceu +${sub.accuracyDeltaPercentage} p.p. ao longo dos simulados.`,
          value: sub.accuracyDeltaPercentage,
        });
      } else if (sub.trend === "DECLINING" && sub.accuracyDeltaPercentage <= -10.0) {
        signals.push({
          type: "REGRESSION",
          entityType: "subject",
          entityId: sub.subjectId,
          entityName: sub.subjectName,
          label: `Queda em ${sub.subjectName}`,
          description: `Rendimento em ${sub.subjectName} caiu ${sub.accuracyDeltaPercentage} p.p. em relação aos simulados anteriores.`,
          value: sub.accuracyDeltaPercentage,
        });
      }
    }

    // Sinais de Vulnerabilidade Persistente por Tópico
    for (const top of topicResults) {
      if (top.isPersistentWeakness) {
        signals.push({
          type: "PERSISTENT_WEAKNESS",
          entityType: "topic",
          entityId: top.topicId,
          entityName: top.topicName,
          label: `Vulnerabilidade Persistente em ${top.topicName}`,
          description: `Acurácia média de ${top.averageAccuracyPercentage}% mantida baixa ao longo de ${top.simulationCount} simulados.`,
          value: top.averageAccuracyPercentage,
        });
      }
    }
  }

  return {
    summary,
    timeline,
    subjects: subjectResults,
    topics: topicResults,
    signals,
    hasSufficientData: totalSimulations >= 1,
    sampleSizeCategory,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES COMPARATIVAS E BENCHMARKS (Etapa 8.2.6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compara dois simulados diretamente (simA x simB).
 */
export function compareTwoSimulations(
  simA: SimulationHistoricalPoint,
  simB: SimulationHistoricalPoint,
): SimulationDirectComparison {
  const accuracyDeltaPp = Number((simB.accuracyPercentage - simA.accuracyPercentage).toFixed(2));
  const responseDeltaPp = Number((simB.responsePercentage - simA.responsePercentage).toFixed(2));
  const timeSpentDeltaSeconds = simB.totalTimeSpentSeconds - simA.totalTimeSpentSeconds;
  const avgTimeDeltaSeconds = Number(
    (simB.avgTimePerQuestionSeconds - simA.avgTimePerQuestionSeconds).toFixed(2),
  );

  let direction: ComparisonDirection = "STABLE";
  if (accuracyDeltaPp >= 3.0) direction = "IMPROVED";
  else if (accuracyDeltaPp <= -3.0) direction = "DECLINED";

  return {
    simA,
    simB,
    accuracyDeltaPp,
    responseDeltaPp,
    timeSpentDeltaSeconds,
    avgTimeDeltaSeconds,
    direction,
  };
}

/**
 * Calcula a mediana de um array de números.
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calcula benchmarks internos do aluno contra seu próprio histórico.
 */
export function computeInternalBenchmarks(
  timeline: SimulationHistoricalPoint[],
  currentSetId?: string,
): InternalBenchmark {
  if (!timeline || timeline.length === 0) {
    return {
      bestScoreAccuracy: 0,
      bestScoreSetId: null,
      bestScoreSetName: null,
      averageScoreAccuracy: 0,
      medianScoreAccuracy: 0,
      currentAccuracy: null,
      currentSetId: null,
      currentSetName: null,
      deltaVsAveragePp: null,
      deltaVsMedianPp: null,
      gapToBestPp: null,
      percentileRank: null,
      hasSufficientData: false,
    };
  }

  const accuracies = timeline.map((p) => p.accuracyPercentage);
  const averageScoreAccuracy = Number(
    (accuracies.reduce((a, b) => a + b, 0) / accuracies.length).toFixed(2),
  );
  const medianScoreAccuracy = Number(calculateMedian(accuracies).toFixed(2));

  // Encontrar o melhor simulado (Personal Best)
  let bestPoint = timeline[0];
  for (const point of timeline) {
    if (point.accuracyPercentage > bestPoint.accuracyPercentage) {
      bestPoint = point;
    }
  }

  // Ponto atual (se currentSetId for passado e encontrado, usar ele; senão, último da timeline)
  const currentPoint =
    (currentSetId ? timeline.find((p) => p.setId === currentSetId) : null) ||
    timeline[timeline.length - 1];

  const currentAccuracy = currentPoint.accuracyPercentage;
  const deltaVsAveragePp = Number((currentAccuracy - averageScoreAccuracy).toFixed(2));
  const deltaVsMedianPp = Number((currentAccuracy - medianScoreAccuracy).toFixed(2));
  const gapToBestPp = Number((currentAccuracy - bestPoint.accuracyPercentage).toFixed(2));

  // Percentile Rank do ponto atual dentro do histórico do próprio aluno
  const countAtOrBelow = accuracies.filter((acc) => acc <= currentAccuracy).length;
  const percentileRank = Number(((countAtOrBelow / accuracies.length) * 100).toFixed(1));

  return {
    bestScoreAccuracy: bestPoint.accuracyPercentage,
    bestScoreSetId: bestPoint.setId,
    bestScoreSetName: bestPoint.setName,
    averageScoreAccuracy,
    medianScoreAccuracy,
    currentAccuracy,
    currentSetId: currentPoint.setId,
    currentSetName: currentPoint.setName,
    deltaVsAveragePp,
    deltaVsMedianPp,
    gapToBestPp,
    percentileRank,
    hasSufficientData: timeline.length >= 1,
  };
}

/**
 * Calcula comparações temporais por janelas (3vs3, 5vs5, último vs 3 anteriores).
 */
export function computeWindowComparisons(timeline: SimulationHistoricalPoint[]): WindowComparison {
  const computeWindow = (
    targetGroup: SimulationHistoricalPoint[],
    baseGroup: SimulationHistoricalPoint[],
    label: string,
  ): WindowComparisonWindow => {
    const targetAccAvg =
      targetGroup.reduce((a, b) => a + b.accuracyPercentage, 0) / targetGroup.length;
    const baseAccAvg = baseGroup.reduce((a, b) => a + b.accuracyPercentage, 0) / baseGroup.length;

    const targetSpeedAvg =
      targetGroup.reduce((a, b) => a + b.avgTimePerQuestionSeconds, 0) / targetGroup.length;
    const baseSpeedAvg =
      baseGroup.reduce((a, b) => a + b.avgTimePerQuestionSeconds, 0) / baseGroup.length;

    const accuracyDeltaPp = Number((targetAccAvg - baseAccAvg).toFixed(2));
    const speedDeltaSeconds = Number((targetSpeedAvg - baseSpeedAvg).toFixed(2));

    let direction: ComparisonDirection = "STABLE";
    if (accuracyDeltaPp >= 3.0) direction = "IMPROVED";
    else if (accuracyDeltaPp <= -3.0) direction = "DECLINED";

    return {
      label,
      baseCount: baseGroup.length,
      targetCount: targetGroup.length,
      baseAccuracy: Number(baseAccAvg.toFixed(2)),
      targetAccuracy: Number(targetAccAvg.toFixed(2)),
      accuracyDeltaPp,
      baseAvgTimeSeconds: Number(baseSpeedAvg.toFixed(2)),
      targetAvgTimeSeconds: Number(targetSpeedAvg.toFixed(2)),
      speedDeltaSeconds,
      direction,
      hasSufficientData: true,
    };
  };

  // 1. Último vs Média dos 3 Anteriores (requer pelo menos 2 simulados)
  let latestVsAvgPrevious3: WindowComparisonWindow | null = null;
  if (timeline.length >= 2) {
    const targetGroup = [timeline[timeline.length - 1]];
    const baseGroup = timeline.slice(Math.max(0, timeline.length - 4), timeline.length - 1);
    latestVsAvgPrevious3 = computeWindow(
      targetGroup,
      baseGroup,
      "Último Simulado vs. Média dos 3 Anteriores",
    );
  }

  // 2. 3 Recentes vs 3 Anteriores (requer pelo menos 6 simulados)
  let recent3VsPrevious3: WindowComparisonWindow | null = null;
  if (timeline.length >= 6) {
    const targetGroup = timeline.slice(-3);
    const baseGroup = timeline.slice(-6, -3);
    recent3VsPrevious3 = computeWindow(
      targetGroup,
      baseGroup,
      "Últimos 3 Simulados vs. 3 Anteriores",
    );
  }

  // 3. 5 Recentes vs 5 Anteriores (requer pelo menos 10 simulados)
  let recent5VsPrevious5: WindowComparisonWindow | null = null;
  if (timeline.length >= 10) {
    const targetGroup = timeline.slice(-5);
    const baseGroup = timeline.slice(-10, -5);
    recent5VsPrevious5 = computeWindow(
      targetGroup,
      baseGroup,
      "Últimos 5 Simulados vs. 5 Anteriores",
    );
  }

  return {
    latestVsAvgPrevious3,
    recent3VsPrevious3,
    recent5VsPrevious5,
  };
}

/**
 * Avalia a matriz multidimensional de Precisão x Velocidade (Pacing vs Accuracy).
 */
export function evaluateAccuracySpeedMatrix(
  accuracyDeltaPp: number,
  speedDeltaSeconds: number,
): AccuracySpeedMatrix {
  let classification: AccuracySpeedClassification = "STABLE";
  let label = "Desempenho Equilibrado";
  let description =
    "A taxa de acertos e o tempo médio por questão mantêm-se dentro de parâmetros estáveis.";

  const isAccuracyUp = accuracyDeltaPp >= 3.0;
  const isAccuracyDown = accuracyDeltaPp <= -3.0;
  const isSpeedUp = speedDeltaSeconds <= -5.0; // Negativo significa menor tempo (mais rápido)
  const isSpeedDown = speedDeltaSeconds >= 5.0; // Positivo significa maior tempo (mais lento)

  if (isAccuracyUp && isSpeedUp) {
    classification = "CONSISTENT_GROWTH";
    label = "Evolução Consistente";
    description =
      "Ganho duplo: sua taxa de acertos aumentou enquanto o tempo médio por questão reduziu.";
  } else if (isAccuracyUp && isSpeedDown) {
    classification = "ACCURACY_UP_SPEED_DOWN";
    label = "Maior Precisão com Perda de Velocidade";
    description = "Sua taxa de acerto subiu, porém com investimento de tempo superior por questão.";
  } else if (isAccuracyDown && isSpeedUp) {
    classification = "SPEED_UP_ACCURACY_DOWN";
    label = "Ganho de Velocidade com Perda de Precisão";
    description =
      "Você respondeu mais rápido, porém com queda na taxa de acertos. Atenção ao ritmo.";
  } else if (isAccuracyDown && isSpeedDown) {
    classification = "DOUBLE_DETERIORATION";
    label = "Deterioração Dupla";
    description = "Queda simultânea na taxa de acertos e aumento no tempo médio gasto por questão.";
  }

  return {
    classification,
    label,
    description,
    accuracyDeltaPp,
    speedDeltaSeconds,
  };
}

/**
 * Classifica a consistência e estabilidade longitudinal do aluno.
 */
export function classifyConsistency(
  accuracies: number[],
  trend: SimulationTrend,
): ConsistencyClassification {
  if (!accuracies || accuracies.length < 2) return "INSUFFICIENT_DATA";
  if (trend === "VOLATILE") return "VOLATILE";

  const stdDev = calculateStandardDeviation(accuracies);
  const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

  if (mean >= 75.0 && stdDev <= 12.0) return "CONSISTENTLY_STRONG";
  if (mean < 60.0 && stdDev <= 12.0) return "CONSISTENTLY_WEAK";
  if (trend === "IMPROVING") return "IMPROVING";
  if (trend === "DECLINING") return "DECLINING";

  return "STABLE";
}

/**
 * Calcula o desempenho agregado do aluno por Banca Examinadora com suporte a INSUFFICIENT_DATA.
 */
export function computeBankComparisons(
  simulations: SimulationHistoricalInput["simulations"],
): BankPerformanceComparison[] {
  if (!Array.isArray(simulations) || simulations.length === 0) return [];

  const bankMap = new Map<
    string,
    {
      examBoard: string;
      questionCount: number;
      simulationIds: Set<string>;
      correctCount: number;
      wrongCount: number;
      totalTimeSeconds: number;
    }
  >();

  for (const sim of simulations) {
    if (!sim || !sim.set || !sim.set.isCompleted || !Array.isArray(sim.items)) continue;

    for (const item of sim.items) {
      if (!item.isAnswered) continue;

      // Tentar extrair nome da banca a partir dos campos do item/questão
      const rawBoard =
        (item as any).examBoard ||
        (item as any).exam_board ||
        (item as any).metadata?.exam_board ||
        (item as any).metadata?.banca ||
        null;

      if (!rawBoard || typeof rawBoard !== "string") continue;

      const normalizedBoard = rawBoard.trim().toUpperCase();
      if (
        !normalizedBoard ||
        normalizedBoard === "DESCONHECIDA" ||
        normalizedBoard === "DESCONHECIDO" ||
        normalizedBoard === "INDEFINIDA"
      ) {
        continue;
      }

      if (!bankMap.has(normalizedBoard)) {
        bankMap.set(normalizedBoard, {
          examBoard: normalizedBoard,
          questionCount: 0,
          simulationIds: new Set<string>(),
          correctCount: 0,
          wrongCount: 0,
          totalTimeSeconds: 0,
        });
      }

      const entry = bankMap.get(normalizedBoard)!;
      entry.questionCount++;
      entry.simulationIds.add(sim.set.setId);
      if (item.isCorrect) entry.correctCount++;
      else if (item.isCorrect === false) entry.wrongCount++;
      if (item.timeSpentSeconds) entry.totalTimeSeconds += item.timeSpentSeconds;
    }
  }

  const results: BankPerformanceComparison[] = [];
  for (const entry of bankMap.values()) {
    const accuracyPercentage =
      entry.questionCount > 0
        ? Number(((entry.correctCount / entry.questionCount) * 100).toFixed(1))
        : 0;

    const avgTimePerQuestionSeconds =
      entry.questionCount > 0
        ? Number((entry.totalTimeSeconds / entry.questionCount).toFixed(1))
        : 0;

    const status = entry.questionCount >= 5 ? "SUFFICIENT_DATA" : "INSUFFICIENT_DATA";

    results.push({
      examBoard: entry.examBoard,
      questionCount: entry.questionCount,
      simulationCount: entry.simulationIds.size,
      correctCount: entry.correctCount,
      wrongCount: entry.wrongCount,
      accuracyPercentage,
      avgTimePerQuestionSeconds,
      status,
    });
  }

  return results.sort((a, b) => b.questionCount - a.questionCount);
}

/**
 * Função principal agregadora de Análise Comparativa e Benchmarking de Performance (Etapa 8.2.6).
 */
export function analyzeSimulationComparison(
  input: SimulationHistoricalInput,
  currentSetId?: string,
): ComparativeAnalysis {
  const historicalAnalysis = analyzeSimulationHistory(input);
  const internalBenchmark = computeInternalBenchmarks(historicalAnalysis.timeline, currentSetId);
  const windowComparison = computeWindowComparisons(historicalAnalysis.timeline);
  const bankComparisons = computeBankComparisons(input?.simulations || []);

  let accuracySpeedMatrix: AccuracySpeedMatrix | null = null;
  if (historicalAnalysis.summary.totalSimulations >= 2) {
    accuracySpeedMatrix = evaluateAccuracySpeedMatrix(
      historicalAnalysis.summary.accuracyDeltaPercentage,
      historicalAnalysis.summary.speedDeltaSeconds,
    );
  }

  const consistency = classifyConsistency(
    historicalAnalysis.timeline.map((p) => p.accuracyPercentage),
    historicalAnalysis.summary.overallTrend,
  );

  return {
    historicalAnalysis,
    internalBenchmark,
    windowComparison,
    bankComparisons,
    accuracySpeedMatrix,
    consistency,
  };
}
