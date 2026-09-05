/**
 * SIMULATION ANALYTICS — Etapa 8, Fase 2.2
 *
 * Módulo puro de análise e agregação de performance de simulados.
 *
 * RESPONSABILIDADES:
 *   - Receber dados consolidados do simulado (set + itens + metadados de questões)
 *   - Calcular overview, performance por matéria, performance por tópico
 *   - Calcular métricas de pacing e distribuição por terços
 *   - Gerar sinais de performance simples, determinísticos e auditáveis
 *   - Gerar resumo descritivo de impacto cognitivo (sem tomar decisões autônomas)
 *   - Comparar com histórico de simulados (se fornecido)
 *
 * REGRAS DE ARQUITETURA:
 *   - 100% FUNÇÕES PURAS e determinísticas
 *   - Sem acesso ao banco / Supabase
 *   - Sem chamadas de IA
 *   - Sem efeitos colaterais ou mutação de inputs
 *   - NÃO altera Knowledge, Diagnostic, Evidence, Review, Planner ou Scheduler
 *   - NÃO prevê nota de aprovação, ranking, probabilidade ou score mágico
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS E CONTRATOS DE SAÍDA
// ─────────────────────────────────────────────────────────────────────────────

export type SimulationItemInput = {
  itemId: string;
  questionId: string;
  position?: number;
  isAnswered: boolean;
  isCorrect?: boolean | null;
  chosenAnswer?: string | null;
  timeSpentSeconds?: number | null;
  subjectId?: string | null;
  subjectName?: string | null;
  topicId?: string | null;
  topicName?: string | null;
  difficulty?: number | null;
};

export type QuestionMetadataMap = Record<
  string,
  {
    subjectId?: string | null;
    subjectName?: string | null;
    topicId?: string | null;
    topicName?: string | null;
    difficulty?: number | null;
  }
>;

export type AnalyzeSimulationInput = {
  set: {
    setId: string;
    name?: string | null;
    totalQuestions?: number;
    timeLimitMinutes?: number | null;
    startedAt?: string | null;
    completedAt?: string | null;
  };
  items: SimulationItemInput[];
  /** Dicionário de metadados de questões por questionId */
  questionsMap?: QuestionMetadataMap;
  /** Dicionário de nome das matérias por subjectId */
  subjectsMap?: Record<string, string>;
  /** Dicionário de tópicos por topicId */
  topicsMap?: Record<string, { name: string; subjectId?: string }>;
  /** Histórico de análises anteriores para tendência */
  history?: Array<{
    setId: string;
    completedAt?: string | null;
    accuracyPercentage: number;
    avgTimePerQuestionSeconds: number;
  }>;
};

export type SimulationOverview = {
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercentage: number; // 0..100
  responsePercentage: number; // 0..100
  totalTimeSpentSeconds: number;
  avgTimePerQuestionSeconds: number;
  avgTimePerAnsweredQuestionSeconds: number;
};

export type SubjectPerformanceSignal = "STRONG_PERFORMANCE" | "ATTENTION" | "HIGH_ATTENTION";

export type SubjectPerformance = {
  subjectId: string;
  subjectName: string;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercentage: number;
  responsePercentage: number;
  totalTimeSpentSeconds: number;
  avgTimePerQuestionSeconds: number;
  shareOfTotalQuestionsPercentage: number;
  signal: SubjectPerformanceSignal;
};

export type TopicPerformanceSignal = "STRONG" | "NEUTRAL" | "VULNERABLE";

export type TopicPerformance = {
  topicId: string;
  topicName: string;
  subjectId: string | null;
  subjectName: string | null;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercentage: number;
  avgTimePerQuestionSeconds: number;
  errorConcentrationPercentage: number;
  signal: TopicPerformanceSignal;
};

export type TercileMetrics = {
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercentage: number;
  avgTimeSeconds: number;
};

export type PacingRhythmSignal =
  "STABLE" | "RHYTHM_LOSS" | "EXCESSIVE_ACCELERATION" | "SLOWNESS" | "INSUFFICIENT_DATA";

export type SimulationPacing = {
  totalTimeSpentSeconds: number;
  avgTimePerQuestionSeconds: number;
  medianTimePerQuestionSeconds: number;
  minTimeSpentSeconds: number;
  maxTimeSpentSeconds: number;
  avgTimeInCorrectQuestionsSeconds: number;
  avgTimeInWrongQuestionsSeconds: number;
  terciles: {
    firstTercile: TercileMetrics;
    middleTercile: TercileMetrics;
    finalTercile: TercileMetrics;
  } | null;
  rhythmTrendSignal: PacingRhythmSignal;
};

export type PerformanceSignalType =
  | "HIGH_ACCURACY"
  | "LOW_ACCURACY"
  | "HIGH_UNANSWERED_RATE"
  | "HIGH_TIME_PER_QUESTION"
  | "TIME_INEFFICIENCY"
  | "ERROR_CONCENTRATION"
  | "STRONG_SUBJECT"
  | "WEAK_SUBJECT"
  | "TOPIC_VULNERABILITY"
  | "LATE_FATIGUE_OR_RUSH";

export type PerformanceSignalIntensity = "low" | "medium" | "high";

export type PerformanceSignal = {
  type: PerformanceSignalType;
  entityType: "simulation" | "subject" | "topic" | "pacing";
  entityId?: string;
  entityName?: string;
  intensity: PerformanceSignalIntensity;
  reason: string;
  sourceMetric: string;
  value: number;
};

export type CognitiveImpactSummary = {
  keyFindings: string[];
  vulnerableTopicsCount: number;
  criticalErrorsCount: number;
  highestErrorSubjectName: string | null;
  pacingNote: string | null;
};

export type HistoricalComparison = {
  previousSimulationsCount: number;
  historicalAvgAccuracyPercentage: number;
  accuracyDeltaPercentage: number;
  trend: "IMPROVING" | "DECLINING" | "STABLE" | "INSUFFICIENT_HISTORY";
};

export type SimulationPerformanceAnalysis = {
  setId: string;
  overview: SimulationOverview;
  subjectPerformance: SubjectPerformance[];
  topicPerformance: TopicPerformance[];
  pacing: SimulationPacing;
  signals: PerformanceSignal[];
  cognitiveImpactSummary: CognitiveImpactSummary;
  historicalComparison: HistoricalComparison | null;
  analyzedAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS MATEMÁTICOS DE SEGURANÇA (SEM NaN/INFINITY)
// ─────────────────────────────────────────────────────────────────────────────

function roundTwoDecimals(num: number): number {
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
}

function safePercentage(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return roundTwoDecimals((numerator / denominator) * 100);
}

function safeAverage(sum: number, count: number): number {
  if (!Number.isFinite(sum) || !Number.isFinite(count) || count <= 0) {
    return 0;
  }
  return roundTwoDecimals(sum / count);
}

function calculateMedian(numbers: number[]): number {
  const validNumbers = numbers.filter((n) => typeof n === "number" && Number.isFinite(n) && n >= 0);
  if (validNumbers.length === 0) return 0;

  const sorted = [...validNumbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return roundTwoDecimals((sorted[middle - 1] + sorted[middle]) / 2);
  }
  return roundTwoDecimals(sorted[middle]);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES DE CÁLCULO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza os metadados dos itens mesclando fontes de informação.
 */
function normalizeItemData(
  item: SimulationItemInput,
  questionsMap?: QuestionMetadataMap,
  subjectsMap?: Record<string, string>,
  topicsMap?: Record<string, { name: string; subjectId?: string }>,
) {
  const qMeta = questionsMap?.[item.questionId];

  const subjectId = item.subjectId || qMeta?.subjectId || null;
  const subjectName =
    item.subjectName ||
    qMeta?.subjectName ||
    (subjectId && subjectsMap?.[subjectId]) ||
    (subjectId ? `Matéria ${subjectId}` : "Sem matéria identificada");

  const topicId = item.topicId || qMeta?.topicId || null;
  const topicName =
    item.topicName ||
    qMeta?.topicName ||
    (topicId && topicsMap?.[topicId]?.name) ||
    (topicId ? `Tópico ${topicId}` : "Sem tópico identificado");

  const timeSpentSeconds =
    typeof item.timeSpentSeconds === "number" &&
    Number.isFinite(item.timeSpentSeconds) &&
    item.timeSpentSeconds >= 0
      ? item.timeSpentSeconds
      : 0;

  const isAnswered = Boolean(
    item.isAnswered || (item.chosenAnswer && item.chosenAnswer.trim() !== ""),
  );
  const isCorrect = isAnswered && Boolean(item.isCorrect);

  return {
    ...item,
    subjectId: subjectId || "sem_materia_identificada",
    subjectName,
    topicId: topicId || "sem_topico_identificado",
    topicName,
    timeSpentSeconds,
    isAnswered,
    isCorrect,
  };
}

/**
 * Calcula o overview do simulado.
 */
function calculateOverview(
  normalizedItems: ReturnType<typeof normalizeItemData>[],
): SimulationOverview {
  const totalQuestions = normalizedItems.length;
  let answeredCount = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let totalTimeSpentSeconds = 0;
  let answeredTimeSpentSeconds = 0;

  for (const item of normalizedItems) {
    totalTimeSpentSeconds += item.timeSpentSeconds;
    if (item.isAnswered) {
      answeredCount++;
      answeredTimeSpentSeconds += item.timeSpentSeconds;
      if (item.isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }
    }
  }

  const unansweredCount = totalQuestions - answeredCount;
  const accuracyPercentage = safePercentage(correctCount, answeredCount);
  const responsePercentage = safePercentage(answeredCount, totalQuestions);
  const avgTimePerQuestionSeconds = safeAverage(totalTimeSpentSeconds, totalQuestions);
  const avgTimePerAnsweredQuestionSeconds = safeAverage(answeredTimeSpentSeconds, answeredCount);

  return {
    totalQuestions,
    answeredCount,
    unansweredCount,
    correctCount,
    wrongCount,
    accuracyPercentage,
    responsePercentage,
    totalTimeSpentSeconds: roundTwoDecimals(totalTimeSpentSeconds),
    avgTimePerQuestionSeconds,
    avgTimePerAnsweredQuestionSeconds,
  };
}

/**
 * Agrupa e calcula performance por matéria.
 */
function calculateSubjectPerformance(
  normalizedItems: ReturnType<typeof normalizeItemData>[],
): SubjectPerformance[] {
  const groups = new Map<
    string,
    {
      subjectId: string;
      subjectName: string;
      totalQuestions: number;
      answeredCount: number;
      unansweredCount: number;
      correctCount: number;
      wrongCount: number;
      totalTimeSpentSeconds: number;
    }
  >();

  for (const item of normalizedItems) {
    const key = item.subjectId;
    let group = groups.get(key);
    if (!group) {
      group = {
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        totalQuestions: 0,
        answeredCount: 0,
        unansweredCount: 0,
        correctCount: 0,
        wrongCount: 0,
        totalTimeSpentSeconds: 0,
      };
      groups.set(key, group);
    }

    group.totalQuestions++;
    group.totalTimeSpentSeconds += item.timeSpentSeconds;
    if (item.isAnswered) {
      group.answeredCount++;
      if (item.isCorrect) {
        group.correctCount++;
      } else {
        group.wrongCount++;
      }
    } else {
      group.unansweredCount++;
    }
  }

  const globalTotalQuestions = normalizedItems.length;

  const result: SubjectPerformance[] = [];
  for (const group of groups.values()) {
    const accuracyPercentage = safePercentage(group.correctCount, group.answeredCount);
    const responsePercentage = safePercentage(group.answeredCount, group.totalQuestions);
    const avgTimePerQuestionSeconds = safeAverage(
      group.totalTimeSpentSeconds,
      group.totalQuestions,
    );
    const shareOfTotalQuestionsPercentage = safePercentage(
      group.totalQuestions,
      globalTotalQuestions,
    );

    let signal: SubjectPerformanceSignal = "ATTENTION";
    if (group.answeredCount > 0) {
      if (accuracyPercentage >= 80) {
        signal = "STRONG_PERFORMANCE";
      } else if (accuracyPercentage < 60) {
        signal = "HIGH_ATTENTION";
      }
    }

    result.push({
      subjectId: group.subjectId,
      subjectName: group.subjectName,
      totalQuestions: group.totalQuestions,
      answeredCount: group.answeredCount,
      unansweredCount: group.unansweredCount,
      correctCount: group.correctCount,
      wrongCount: group.wrongCount,
      accuracyPercentage,
      responsePercentage,
      totalTimeSpentSeconds: roundTwoDecimals(group.totalTimeSpentSeconds),
      avgTimePerQuestionSeconds,
      shareOfTotalQuestionsPercentage,
      signal,
    });
  }

  // Ordenar por total de questões decrescente
  return result.sort((a, b) => b.totalQuestions - a.totalQuestions);
}

/**
 * Agrupa e calcula performance por tópico.
 */
function calculateTopicPerformance(
  normalizedItems: ReturnType<typeof normalizeItemData>[],
  globalTotalWrongCount: number,
): TopicPerformance[] {
  const groups = new Map<
    string,
    {
      topicId: string;
      topicName: string;
      subjectId: string | null;
      subjectName: string | null;
      totalQuestions: number;
      answeredCount: number;
      unansweredCount: number;
      correctCount: number;
      wrongCount: number;
      totalTimeSpentSeconds: number;
    }
  >();

  for (const item of normalizedItems) {
    const key = item.topicId;
    let group = groups.get(key);
    if (!group) {
      group = {
        topicId: item.topicId,
        topicName: item.topicName,
        subjectId: item.subjectId !== "sem_materia_identificada" ? item.subjectId : null,
        subjectName: item.subjectName !== "Sem matéria identificada" ? item.subjectName : null,
        totalQuestions: 0,
        answeredCount: 0,
        unansweredCount: 0,
        correctCount: 0,
        wrongCount: 0,
        totalTimeSpentSeconds: 0,
      };
      groups.set(key, group);
    }

    group.totalQuestions++;
    group.totalTimeSpentSeconds += item.timeSpentSeconds;
    if (item.isAnswered) {
      group.answeredCount++;
      if (item.isCorrect) {
        group.correctCount++;
      } else {
        group.wrongCount++;
      }
    } else {
      group.unansweredCount++;
    }
  }

  const result: TopicPerformance[] = [];
  for (const group of groups.values()) {
    const accuracyPercentage = safePercentage(group.correctCount, group.answeredCount);
    const avgTimePerQuestionSeconds = safeAverage(
      group.totalTimeSpentSeconds,
      group.totalQuestions,
    );
    const errorConcentrationPercentage = safePercentage(group.wrongCount, globalTotalWrongCount);

    let signal: TopicPerformanceSignal = "NEUTRAL";
    if (group.answeredCount > 0) {
      if (accuracyPercentage >= 75) {
        signal = "STRONG";
      } else if (accuracyPercentage < 50) {
        signal = "VULNERABLE";
      }
    }

    result.push({
      topicId: group.topicId,
      topicName: group.topicName,
      subjectId: group.subjectId,
      subjectName: group.subjectName,
      totalQuestions: group.totalQuestions,
      answeredCount: group.answeredCount,
      unansweredCount: group.unansweredCount,
      correctCount: group.correctCount,
      wrongCount: group.wrongCount,
      accuracyPercentage,
      avgTimePerQuestionSeconds,
      errorConcentrationPercentage,
      signal,
    });
  }

  return result.sort((a, b) => b.wrongCount - a.wrongCount || b.totalQuestions - a.totalQuestions);
}

/**
 * Calcula métricas de um terço de questões.
 */
function calculateTercileMetrics(items: ReturnType<typeof normalizeItemData>[]): TercileMetrics {
  const questionCount = items.length;
  let answeredCount = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let totalTimeSpentSeconds = 0;

  for (const item of items) {
    totalTimeSpentSeconds += item.timeSpentSeconds;
    if (item.isAnswered) {
      answeredCount++;
      if (item.isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }
    }
  }

  return {
    questionCount,
    answeredCount,
    correctCount,
    wrongCount,
    accuracyPercentage: safePercentage(correctCount, answeredCount),
    avgTimeSeconds: safeAverage(totalTimeSpentSeconds, questionCount),
  };
}

/**
 * Analisa tempo e ritmo de prova (pacing).
 */
function calculatePacing(
  normalizedItems: ReturnType<typeof normalizeItemData>[],
  overview: SimulationOverview,
): SimulationPacing {
  const times = normalizedItems.map((i) => i.timeSpentSeconds);
  const correctTimes = normalizedItems
    .filter((i) => i.isAnswered && i.isCorrect)
    .map((i) => i.timeSpentSeconds);
  const wrongTimes = normalizedItems
    .filter((i) => i.isAnswered && !i.isCorrect)
    .map((i) => i.timeSpentSeconds);

  const medianTimePerQuestionSeconds = calculateMedian(times);
  const minTimeSpentSeconds = times.length > 0 ? Math.min(...times) : 0;
  const maxTimeSpentSeconds = times.length > 0 ? Math.max(...times) : 0;

  const avgTimeInCorrectQuestionsSeconds = safeAverage(
    correctTimes.reduce((a, b) => a + b, 0),
    correctTimes.length,
  );
  const avgTimeInWrongQuestionsSeconds = safeAverage(
    wrongTimes.reduce((a, b) => a + b, 0),
    wrongTimes.length,
  );

  let terciles: SimulationPacing["terciles"] = null;
  let rhythmTrendSignal: PacingRhythmSignal = "INSUFFICIENT_DATA";

  if (normalizedItems.length >= 3) {
    const sortedItems = [...normalizedItems].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const tercileSize = Math.floor(sortedItems.length / 3);

    const firstChunk = sortedItems.slice(0, tercileSize);
    const middleChunk = sortedItems.slice(tercileSize, 2 * tercileSize);
    const finalChunk = sortedItems.slice(2 * tercileSize);

    const firstTercile = calculateTercileMetrics(firstChunk);
    const middleTercile = calculateTercileMetrics(middleChunk);
    const finalTercile = calculateTercileMetrics(finalChunk);

    terciles = {
      firstTercile,
      middleTercile,
      finalTercile,
    };

    // Análise da tendência de ritmo
    if (firstTercile.avgTimeSeconds > 0) {
      const timeRatioFinalToFirst = finalTercile.avgTimeSeconds / firstTercile.avgTimeSeconds;
      const accuracyDrop = firstTercile.accuracyPercentage - finalTercile.accuracyPercentage;

      if (timeRatioFinalToFirst < 0.65 && accuracyDrop > 15) {
        rhythmTrendSignal = "EXCESSIVE_ACCELERATION";
      } else if (timeRatioFinalToFirst > 1.45) {
        rhythmTrendSignal = "SLOWNESS";
      } else if (accuracyDrop > 25) {
        rhythmTrendSignal = "RHYTHM_LOSS";
      } else {
        rhythmTrendSignal = "STABLE";
      }
    } else {
      rhythmTrendSignal = "STABLE";
    }
  }

  return {
    totalTimeSpentSeconds: overview.totalTimeSpentSeconds,
    avgTimePerQuestionSeconds: overview.avgTimePerQuestionSeconds,
    medianTimePerQuestionSeconds,
    minTimeSpentSeconds: roundTwoDecimals(minTimeSpentSeconds),
    maxTimeSpentSeconds: roundTwoDecimals(maxTimeSpentSeconds),
    avgTimeInCorrectQuestionsSeconds,
    avgTimeInWrongQuestionsSeconds,
    terciles,
    rhythmTrendSignal,
  };
}

/**
 * Gera sinais de performance determinísticos e explicáveis.
 */
function generatePerformanceSignals(
  overview: SimulationOverview,
  subjects: SubjectPerformance[],
  topics: TopicPerformance[],
  pacing: SimulationPacing,
): PerformanceSignal[] {
  const signals: PerformanceSignal[] = [];

  // 1. Precisão Geral
  if (overview.answeredCount >= 3) {
    if (overview.accuracyPercentage >= 80) {
      signals.push({
        type: "HIGH_ACCURACY",
        entityType: "simulation",
        intensity: "low",
        reason: "Aproveitamento global excelente de respostas corretas.",
        sourceMetric: "overview.accuracyPercentage",
        value: overview.accuracyPercentage,
      });
    } else if (overview.accuracyPercentage < 50) {
      signals.push({
        type: "LOW_ACCURACY",
        entityType: "simulation",
        intensity: "high",
        reason:
          "Aproveitamento geral abaixo de 50%, indicando necessidade de consolidação teórica.",
        sourceMetric: "overview.accuracyPercentage",
        value: overview.accuracyPercentage,
      });
    }
  }

  // 2. Taxa de questões em branco
  if (overview.totalQuestions >= 5 && overview.unansweredCount / overview.totalQuestions > 0.15) {
    const unansweredRate = safePercentage(overview.unansweredCount, overview.totalQuestions);
    signals.push({
      type: "HIGH_UNANSWERED_RATE",
      entityType: "simulation",
      intensity: "medium",
      reason: `Taxa expressiva de questões não respondidas (${unansweredRate}%).`,
      sourceMetric: "overview.unansweredCount",
      value: unansweredRate,
    });
  }

  // 3. Ineficiência de tempo (gastar muito tempo nas que errou)
  if (
    overview.wrongCount >= 2 &&
    pacing.avgTimeInWrongQuestionsSeconds > 0 &&
    pacing.avgTimeInCorrectQuestionsSeconds > 0 &&
    pacing.avgTimeInWrongQuestionsSeconds > pacing.avgTimeInCorrectQuestionsSeconds * 1.5
  ) {
    signals.push({
      type: "TIME_INEFFICIENCY",
      entityType: "pacing",
      intensity: "medium",
      reason:
        "O tempo médio gasto em questões incorretas foi mais de 50% superior ao tempo em acertos.",
      sourceMetric: "pacing.avgTimeInWrongQuestionsSeconds",
      value: pacing.avgTimeInWrongQuestionsSeconds,
    });
  }

  // 4. Sinais por Matéria
  for (const subj of subjects) {
    if (subj.answeredCount >= 2) {
      if (subj.accuracyPercentage >= 80) {
        signals.push({
          type: "STRONG_SUBJECT",
          entityType: "subject",
          entityId: subj.subjectId,
          entityName: subj.subjectName,
          intensity: "low",
          reason: `Desempenho consistente em ${subj.subjectName} (${subj.accuracyPercentage}% de acerto).`,
          sourceMetric: "subject.accuracyPercentage",
          value: subj.accuracyPercentage,
        });
      } else if (subj.accuracyPercentage < 50) {
        signals.push({
          type: "WEAK_SUBJECT",
          entityType: "subject",
          entityId: subj.subjectId,
          entityName: subj.subjectName,
          intensity: "high",
          reason: `Rendimento crítico em ${subj.subjectName} (${subj.accuracyPercentage}% de acerto).`,
          sourceMetric: "subject.accuracyPercentage",
          value: subj.accuracyPercentage,
        });
      }
    }
  }

  // 5. Vulnerabilidade por Tópico e Concentração de Erros
  for (const top of topics) {
    if (top.answeredCount >= 2 && top.accuracyPercentage < 40) {
      signals.push({
        type: "TOPIC_VULNERABILITY",
        entityType: "topic",
        entityId: top.topicId,
        entityName: top.topicName,
        intensity: "high",
        reason: `Vulnerabilidade acentuada no tópico ${top.topicName} (${top.accuracyPercentage}% de acerto).`,
        sourceMetric: "topic.accuracyPercentage",
        value: top.accuracyPercentage,
      });
    }

    if (overview.wrongCount >= 3 && top.errorConcentrationPercentage >= 30) {
      signals.push({
        type: "ERROR_CONCENTRATION",
        entityType: "topic",
        entityId: top.topicId,
        entityName: top.topicName,
        intensity: "high",
        reason: `O tópico ${top.topicName} concentrou ${top.errorConcentrationPercentage}% de todos os erros do simulado.`,
        sourceMetric: "topic.errorConcentrationPercentage",
        value: top.errorConcentrationPercentage,
      });
    }
  }

  // 6. Fadiga / Aceleração no Final da Prova
  if (
    pacing.rhythmTrendSignal === "EXCESSIVE_ACCELERATION" ||
    pacing.rhythmTrendSignal === "RHYTHM_LOSS"
  ) {
    signals.push({
      type: "LATE_FATIGUE_OR_RUSH",
      entityType: "pacing",
      intensity: "medium",
      reason:
        pacing.rhythmTrendSignal === "EXCESSIVE_ACCELERATION"
          ? "Aceleração excessiva no terço final da prova acompanhada de queda na precisão."
          : "Queda acentuada no rendimento de acertos no terço final da prova.",
      sourceMetric: "pacing.rhythmTrendSignal",
      value: 1,
    });
  }

  return signals;
}

/**
 * Cria um resumo descritivo sem autoridade decisória.
 */
function createCognitiveImpactSummary(
  overview: SimulationOverview,
  subjects: SubjectPerformance[],
  topics: TopicPerformance[],
  pacing: SimulationPacing,
  signals: PerformanceSignal[],
): CognitiveImpactSummary {
  const keyFindings: string[] = [];

  keyFindings.push(
    `Aproveitamento geral de ${overview.accuracyPercentage}% (${overview.correctCount} acerto(s) de ${overview.answeredCount} respondida(s)).`,
  );

  const highestErrorSubject = [...subjects].sort((a, b) => b.wrongCount - a.wrongCount)[0];
  if (highestErrorSubject && highestErrorSubject.wrongCount > 0) {
    keyFindings.push(
      `A matéria com maior quantidade de erros foi ${highestErrorSubject.subjectName} (${highestErrorSubject.wrongCount} erro(s)).`,
    );
  }

  const vulnerableTopics = topics.filter((t) => t.signal === "VULNERABLE");
  if (vulnerableTopics.length > 0) {
    keyFindings.push(
      `Identificado(s) ${vulnerableTopics.length} tópico(s) em estado de vulnerabilidade neste simulado.`,
    );
  }

  let pacingNote: string | null = null;
  if (pacing.rhythmTrendSignal === "EXCESSIVE_ACCELERATION") {
    pacingNote =
      "Sinal de aceleração no terço final: redução significativa do tempo médio por questão.";
  } else if (pacing.rhythmTrendSignal === "SLOWNESS") {
    pacingNote = "Sinal de lentidão no terço final: tempo por questão aumentou significativamente.";
  } else if (pacing.rhythmTrendSignal === "RHYTHM_LOSS") {
    pacingNote = "Sinal de perda de ritmo: queda na taxa de acertos na etapa final da prova.";
  } else if (pacing.rhythmTrendSignal === "STABLE") {
    pacingNote = "Ritmo e gestão de tempo estáveis ao longo de toda a prova.";
  }

  return {
    keyFindings,
    vulnerableTopicsCount: vulnerableTopics.length,
    criticalErrorsCount: overview.wrongCount,
    highestErrorSubjectName:
      highestErrorSubject && highestErrorSubject.wrongCount > 0
        ? highestErrorSubject.subjectName
        : null,
    pacingNote,
  };
}

/**
 * Compara os resultados com o histórico fornecido.
 */
function calculateHistoricalComparison(
  overview: SimulationOverview,
  history?: AnalyzeSimulationInput["history"],
): HistoricalComparison | null {
  if (!history || history.length === 0) return null;

  const validHistory = history.filter((h) => Number.isFinite(h.accuracyPercentage));
  if (validHistory.length === 0) return null;

  const sumAccuracy = validHistory.reduce((acc, curr) => acc + curr.accuracyPercentage, 0);
  const historicalAvgAccuracyPercentage = roundTwoDecimals(sumAccuracy / validHistory.length);
  const accuracyDeltaPercentage = roundTwoDecimals(
    overview.accuracyPercentage - historicalAvgAccuracyPercentage,
  );

  let trend: HistoricalComparison["trend"] = "STABLE";
  if (validHistory.length < 2) {
    trend = "INSUFFICIENT_HISTORY";
  } else if (accuracyDeltaPercentage >= 5) {
    trend = "IMPROVING";
  } else if (accuracyDeltaPercentage <= -5) {
    trend = "DECLINING";
  }

  return {
    previousSimulationsCount: validHistory.length,
    historicalAvgAccuracyPercentage,
    accuracyDeltaPercentage,
    trend,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA PRINCIPAL (FUNÇÃO PURA)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Função principal que transforma dados do simulado em análise e sinais estruturados.
 *
 * É 100% pura, determinística, sem I/O ou efeitos colaterais.
 */
export function analyzeSimulationPerformance(
  input: AnalyzeSimulationInput,
): SimulationPerformanceAnalysis {
  const { set, items, questionsMap, subjectsMap, topicsMap, history } = input;

  // 1. Normalizar itens com metadados mesclados
  const normalizedItems = (items || []).map((item) =>
    normalizeItemData(item, questionsMap, subjectsMap, topicsMap),
  );

  // 2. Calcular Overview
  const overview = calculateOverview(normalizedItems);

  // 3. Performance por Matéria
  const subjectPerformance = calculateSubjectPerformance(normalizedItems);

  // 4. Performance por Tópico
  const topicPerformance = calculateTopicPerformance(normalizedItems, overview.wrongCount);

  // 5. Pacing / Ritmo
  const pacing = calculatePacing(normalizedItems, overview);

  // 6. Sinais de Performance
  const signals = generatePerformanceSignals(
    overview,
    subjectPerformance,
    topicPerformance,
    pacing,
  );

  // 7. Resumo do Impacto Cognitivo
  const cognitiveImpactSummary = createCognitiveImpactSummary(
    overview,
    subjectPerformance,
    topicPerformance,
    pacing,
    signals,
  );

  // 8. Comparação Histórica
  const historicalComparison = calculateHistoricalComparison(overview, history);

  return {
    setId: set.setId,
    overview,
    subjectPerformance,
    topicPerformance,
    pacing,
    signals,
    cognitiveImpactSummary,
    historicalComparison,
    analyzedAt: set.completedAt || new Date().toISOString(),
  };
}
