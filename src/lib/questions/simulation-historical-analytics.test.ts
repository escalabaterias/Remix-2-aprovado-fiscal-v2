import { describe, it, expect } from "vitest";
import {
  analyzeSimulationHistory,
  analyzeSimulationComparison,
  compareTwoSimulations,
  computeInternalBenchmarks,
  computeWindowComparisons,
  evaluateAccuracySpeedMatrix,
  classifyConsistency,
  computeBankComparisons,
  classifyTrend,
  type SimulationHistoricalInput,
} from "./simulation-historical-analytics";
import type { QuestionSet, QuestionSetItem } from "./types";

describe("Simulation Historical Analytics (Etapa 8.2.5)", () => {
  const createMockSim = (
    setId: string,
    setName: string,
    completedAt: string,
    isCompleted = true,
    correctCount = 5,
    wrongCount = 5,
    unansweredCount = 0,
    avgTime = 60,
    topicId = "top-1",
    subjectId = "sub-1",
  ): { set: QuestionSet; items: QuestionSetItem[] } => {
    const total = correctCount + wrongCount + unansweredCount;
    const set: QuestionSet = {
      setId,
      name: setName,
      description: "Simulado de teste",
      type: "simulado",
      contestId: null,
      subjectId: null,
      topicId: null,
      timeLimitMinutes: 60,
      isTimed: true,
      startedAt: "2026-09-01T10:00:00Z",
      isCompleted,
      completedAt: isCompleted ? completedAt : null,
      totalQuestions: total,
      correctCount,
      wrongCount,
      score: (correctCount / total) * 100,
      tags: [],
    };

    const items: QuestionSetItem[] = [];
    let pos = 1;

    for (let i = 0; i < correctCount; i++) {
      items.push({
        itemId: `${setId}-c-${i}`,
        setId,
        questionId: `q-c-${i}`,
        position: pos++,
        isAnswered: true,
        isCorrect: true,
        chosenAnswer: "A",
        timeSpentSeconds: avgTime,
        attemptId: `att-c-${i}`,
        notes: null,
      });
    }

    for (let i = 0; i < wrongCount; i++) {
      items.push({
        itemId: `${setId}-w-${i}`,
        setId,
        questionId: `q-w-${i}`,
        position: pos++,
        isAnswered: true,
        isCorrect: false,
        chosenAnswer: "B",
        timeSpentSeconds: avgTime,
        attemptId: `att-w-${i}`,
        notes: null,
      });
    }

    for (let i = 0; i < unansweredCount; i++) {
      items.push({
        itemId: `${setId}-u-${i}`,
        setId,
        questionId: `q-u-${i}`,
        position: pos++,
        isAnswered: false,
        isCorrect: null,
        chosenAnswer: null,
        timeSpentSeconds: null,
        attemptId: null,
        notes: null,
      });
    }

    return { set, items };
  };

  it("1. Retorna estrutura limpa de dados insuficientes com 0 simulados", () => {
    const input: SimulationHistoricalInput = { simulations: [] };
    const res = analyzeSimulationHistory(input);

    expect(res.hasSufficientData).toBe(false);
    expect(res.sampleSizeCategory).toBe("EMPTY");
    expect(res.summary.totalSimulations).toBe(0);
    expect(res.timeline).toHaveLength(0);
    expect(res.summary.overallTrend).toBe("INSUFFICIENT_DATA");
  });

  it("2. Trata 1 simulado como ponto inicial sem tendência precipitada", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 6, 4, 0);
    const res = analyzeSimulationHistory({ simulations: [sim1] });

    expect(res.hasSufficientData).toBe(true);
    expect(res.sampleSizeCategory).toBe("INITIAL_POINT");
    expect(res.summary.totalSimulations).toBe(1);
    expect(res.summary.overallTrend).toBe("INSUFFICIENT_DATA");
    expect(res.summary.firstPoint?.setId).toBe("sim-1");
    expect(res.summary.latestPoint?.setId).toBe("sim-1");
  });

  it("3. Ignora simulados incompletos na série histórica", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 6, 4, 0);
    const sim2Incomplete = createMockSim(
      "sim-2",
      "Simulado 2",
      "2026-09-02T10:00:00Z",
      false,
      1,
      9,
      0,
    );

    const res = analyzeSimulationHistory({ simulations: [sim1, sim2Incomplete] });

    expect(res.summary.totalSimulations).toBe(1);
    expect(res.timeline).toHaveLength(1);
    expect(res.timeline[0].setId).toBe("sim-1");
  });

  it("4. Ordena os simulados estritamente por ordem cronológica (completedAt)", () => {
    const sim1 = createMockSim("sim-1", "Simulado Antigo", "2026-09-01T10:00:00Z", true, 5, 5, 0);
    const sim2 = createMockSim("sim-2", "Simulado Novo", "2026-09-03T10:00:00Z", true, 8, 2, 0);
    const simInter = createMockSim(
      "sim-1.5",
      "Simulado Intermediário",
      "2026-09-02T10:00:00Z",
      true,
      6,
      4,
      0,
    );

    // Passados fora de ordem no input
    const res = analyzeSimulationHistory({ simulations: [sim2, sim1, simInter] });

    expect(res.timeline[0].setId).toBe("sim-1");
    expect(res.timeline[1].setId).toBe("sim-1.5");
    expect(res.timeline[2].setId).toBe("sim-2");
  });

  it("5. Detecta tendência de melhoria (IMPROVING) em 2 e 3+ simulados", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 5, 5, 0); // 50%
    const sim2 = createMockSim("sim-2", "Simulado 2", "2026-09-02T10:00:00Z", true, 7, 3, 0); // 70%
    const sim3 = createMockSim("sim-3", "Simulado 3", "2026-09-03T10:00:00Z", true, 8, 2, 0); // 80%

    const res = analyzeSimulationHistory({ simulations: [sim1, sim2, sim3] });

    expect(res.sampleSizeCategory).toBe("LONGITUDINAL_TREND");
    expect(res.summary.overallTrend).toBe("IMPROVING");
    expect(res.summary.accuracyDeltaPercentage).toBe(30.0);
    expect(res.signals.some((s) => s.type === "EVOLUTION")).toBe(true);
  });

  it("6. Detecta tendência de queda (DECLINING)", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 8, 2, 0); // 80%
    const sim2 = createMockSim("sim-2", "Simulado 2", "2026-09-02T10:00:00Z", true, 6, 4, 0); // 60%
    const sim3 = createMockSim("sim-3", "Simulado 3", "2026-09-03T10:00:00Z", true, 4, 6, 0); // 40%

    const res = analyzeSimulationHistory({ simulations: [sim1, sim2, sim3] });

    expect(res.summary.overallTrend).toBe("DECLINING");
    expect(res.summary.accuracyDeltaPercentage).toBe(-40.0);
    expect(res.signals.some((s) => s.type === "REGRESSION")).toBe(true);
  });

  it("7. Detecta estabilidade (STABLE)", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 7, 3, 0); // 70%
    const sim2 = createMockSim("sim-2", "Simulado 2", "2026-09-02T10:00:00Z", true, 7, 3, 0); // 70%
    const sim3 = createMockSim("sim-3", "Simulado 3", "2026-09-03T10:00:00Z", true, 7, 3, 0); // 70%

    const res = analyzeSimulationHistory({ simulations: [sim1, sim2, sim3] });

    expect(res.summary.overallTrend).toBe("STABLE");
    expect(res.summary.accuracyDeltaPercentage).toBe(0);
    expect(res.signals.some((s) => s.type === "STABLE")).toBe(true);
  });

  it("8. Detecta volatilidade (VOLATILE) em oscilações bruscas", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 9, 1, 0); // 90%
    const sim2 = createMockSim("sim-2", "Simulado 2", "2026-09-02T10:00:00Z", true, 2, 8, 0); // 20%
    const sim3 = createMockSim("sim-3", "Simulado 3", "2026-09-03T10:00:00Z", true, 9, 1, 0); // 90%

    const res = analyzeSimulationHistory({ simulations: [sim1, sim2, sim3] });

    expect(res.summary.isVolatile).toBe(true);
    expect(res.summary.overallTrend).toBe("VOLATILE");
    expect(res.signals.some((s) => s.type === "VOLATILE")).toBe(true);
  });

  it("9. Classifica velocidade e melhora de ritmo (FASTER) com precisão preservada", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 7, 3, 0, 100); // 100s por Q
    const sim2 = createMockSim("sim-2", "Simulado 2", "2026-09-02T10:00:00Z", true, 7, 3, 0, 70); // 70s por Q

    const res = analyzeSimulationHistory({ simulations: [sim1, sim2] });

    expect(res.summary.speedTrend).toBe("FASTER");
    expect(res.summary.speedDeltaSeconds).toBe(-30);
    expect(res.signals.some((s) => s.type === "SPEED_IMPROVEMENT")).toBe(true);
  });

  it("10. Detecta aumento de tempo por questão (SLOWER)", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 7, 3, 0, 60); // 60s por Q
    const sim2 = createMockSim("sim-2", "Simulado 2", "2026-09-02T10:00:00Z", true, 7, 3, 0, 90); // 90s por Q

    const res = analyzeSimulationHistory({ simulations: [sim1, sim2] });

    expect(res.summary.speedTrend).toBe("SLOWER");
    expect(res.summary.speedDeltaSeconds).toBe(30);
    expect(res.signals.some((s) => s.type === "SPEED_REGRESSION")).toBe(true);
  });

  it("11. Agrupa histórico por disciplina e mapeia trajetória", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 5, 5, 0);
    const sim2 = createMockSim("sim-2", "Simulado 2", "2026-09-02T10:00:00Z", true, 8, 2, 0);

    const res = analyzeSimulationHistory({ simulations: [sim1, sim2] });

    expect(res.subjects.length).toBeGreaterThan(0);
    const firstSubject = res.subjects[0];
    expect(firstSubject.simulationCount).toBe(2);
    expect(firstSubject.firstAccuracyPercentage).toBeDefined();
    expect(firstSubject.latestAccuracyPercentage).toBeDefined();
  });

  it("12. Agrupa histórico por tópico e identifica vulnerabilidade persistente", () => {
    // Tópico com acurácia média < 60% em 2 simulados
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 4, 6, 0); // 40%
    const sim2 = createMockSim("sim-2", "Simulado 2", "2026-09-02T10:00:00Z", true, 5, 5, 0); // 50%

    const res = analyzeSimulationHistory({ simulations: [sim1, sim2] });

    expect(res.topics.length).toBeGreaterThan(0);
    const firstTopic = res.topics[0];
    expect(firstTopic.isPersistentWeakness).toBe(true);
    expect(res.signals.some((s) => s.type === "PERSISTENT_WEAKNESS")).toBe(true);
  });

  it("13. Testa função auxiliar pura de classificação de tendência classifyTrend", () => {
    expect(classifyTrend([])).toBe("INSUFFICIENT_DATA");
    expect(classifyTrend([60])).toBe("INSUFFICIENT_DATA");
    expect(classifyTrend([50, 60])).toBe("IMPROVING");
    expect(classifyTrend([60, 50])).toBe("DECLINING");
    expect(classifyTrend([60, 62])).toBe("STABLE");
    expect(classifyTrend([90, 20, 90])).toBe("VOLATILE");
  });

  it("14. A análise histórica é 100% pura, determinística e sem mutação de entradas", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 6, 4, 0);
    const originalInput: SimulationHistoricalInput = { simulations: [sim1] };
    const originalJson = JSON.stringify(originalInput);

    const res1 = analyzeSimulationHistory(originalInput);
    const res2 = analyzeSimulationHistory(originalInput);

    expect(JSON.stringify(originalInput)).toBe(originalJson); // Sem mutação
    expect(res1).toEqual(res2); // Determinismo
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TESTES DA ETAPA 8.2.6 — ANÁLISE COMPARATIVA E BENCHMARKING
  // ─────────────────────────────────────────────────────────────────────────

  it("15. Compara dois simulados diretamente (compareTwoSimulations)", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 5, 5, 0); // 50%
    const sim2 = createMockSim("sim-2", "Simulado 2", "2026-09-02T10:00:00Z", true, 8, 2, 0); // 80%

    const hist = analyzeSimulationHistory({ simulations: [sim1, sim2] });
    const comp = compareTwoSimulations(hist.timeline[0], hist.timeline[1]);

    expect(comp.accuracyDeltaPp).toBe(30.0);
    expect(comp.direction).toBe("IMPROVED");
  });

  it("16. Calcula benchmarks internos do aluno contra ele mesmo (computeInternalBenchmarks)", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 6, 4, 0); // 60%
    const sim2 = createMockSim("sim-2", "Simulado 2", "2026-09-02T10:00:00Z", true, 8, 2, 0); // 80%
    const sim3 = createMockSim("sim-3", "Simulado 3", "2026-09-03T10:00:00Z", true, 7, 3, 0); // 70%

    const hist = analyzeSimulationHistory({ simulations: [sim1, sim2, sim3] });
    const bench = computeInternalBenchmarks(hist.timeline, "sim-3");

    expect(bench.hasSufficientData).toBe(true);
    expect(bench.bestScoreAccuracy).toBe(80);
    expect(bench.averageScoreAccuracy).toBe(70);
    expect(bench.medianScoreAccuracy).toBe(70);
    expect(bench.currentAccuracy).toBe(70);
    expect(bench.deltaVsAveragePp).toBe(0);
    expect(bench.gapToBestPp).toBe(-10);
  });

  it("17. Calcula comparações por janelas temporais (computeWindowComparisons)", () => {
    const sims = [
      createMockSim("s1", "S1", "2026-09-01T10:00:00Z", true, 5, 5, 0), // 50%
      createMockSim("s2", "S2", "2026-09-02T10:00:00Z", true, 6, 4, 0), // 60%
      createMockSim("s3", "S3", "2026-09-03T10:00:00Z", true, 7, 3, 0), // 70%
      createMockSim("s4", "S4", "2026-09-04T10:00:00Z", true, 8, 2, 0), // 80%
    ];

    const hist = analyzeSimulationHistory({ simulations: sims });
    const windows = computeWindowComparisons(hist.timeline);

    expect(windows.latestVsAvgPrevious3).not.toBeNull();
    expect(windows.latestVsAvgPrevious3?.targetAccuracy).toBe(80);
    expect(windows.latestVsAvgPrevious3?.baseAccuracy).toBe(60); // Média de 50, 60, 70
    expect(windows.latestVsAvgPrevious3?.accuracyDeltaPp).toBe(20);
  });

  it("18. Avalia a matriz multidimensional de Precisão x Velocidade (evaluateAccuracySpeedMatrix)", () => {
    // Aumento de acertos (+10 p.p.) e redução de tempo (-15s -> mais rápido)
    const m1 = evaluateAccuracySpeedMatrix(10.0, -15.0);
    expect(m1.classification).toBe("CONSISTENT_GROWTH");

    // Aumento de acertos (+5 p.p.) porém mais lento (+10s)
    const m2 = evaluateAccuracySpeedMatrix(5.0, 10.0);
    expect(m2.classification).toBe("ACCURACY_UP_SPEED_DOWN");

    // Queda de acertos (-10 p.p.) porém mais rápido (-10s)
    const m3 = evaluateAccuracySpeedMatrix(-10.0, -10.0);
    expect(m3.classification).toBe("SPEED_UP_ACCURACY_DOWN");

    // Queda de acertos (-10 p.p.) e mais lento (+10s)
    const m4 = evaluateAccuracySpeedMatrix(-10.0, 10.0);
    expect(m4.classification).toBe("DOUBLE_DETERIORATION");
  });

  it("19. Classifica consistência longitudinal do aluno (classifyConsistency)", () => {
    expect(classifyConsistency([], "STABLE")).toBe("INSUFFICIENT_DATA");
    expect(classifyConsistency([80, 82, 81], "STABLE")).toBe("CONSISTENTLY_STRONG");
    expect(classifyConsistency([40, 42, 41], "STABLE")).toBe("CONSISTENTLY_WEAK");
    expect(classifyConsistency([50, 80, 40], "VOLATILE")).toBe("VOLATILE");
  });

  it("20. Mapeia desempenho por banca examinadora com status de amostragem (computeBankComparisons)", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 5, 5, 0);
    // Adicionar marca de banca nos items
    sim1.items.forEach((it) => ((it as any).examBoard = "FGV"));

    const banks = computeBankComparisons([sim1]);
    expect(banks.length).toBe(1);
    expect(banks[0].examBoard).toBe("FGV");
    expect(banks[0].questionCount).toBe(10);
    expect(banks[0].status).toBe("SUFFICIENT_DATA");
    expect(banks[0].accuracyPercentage).toBe(50);
  });

  it("21. Executa a análise comparativa agregada completa (analyzeSimulationComparison)", () => {
    const sim1 = createMockSim("sim-1", "Simulado 1", "2026-09-01T10:00:00Z", true, 5, 5, 0);
    const sim2 = createMockSim("sim-2", "Simulado 2", "2026-09-02T10:00:00Z", true, 8, 2, 0);

    const compAnalysis = analyzeSimulationComparison({ simulations: [sim1, sim2] }, "sim-2");

    expect(compAnalysis.historicalAnalysis).toBeDefined();
    expect(compAnalysis.internalBenchmark.hasSufficientData).toBe(true);
    expect(compAnalysis.internalBenchmark.currentAccuracy).toBe(80);
    expect(compAnalysis.windowComparison.latestVsAvgPrevious3).not.toBeNull();
    expect(compAnalysis.accuracySpeedMatrix).not.toBeNull();
    expect(compAnalysis.consistency).toBeDefined();
  });
});
