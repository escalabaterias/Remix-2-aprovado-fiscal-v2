import { describe, it, expect } from "vitest";
import {
  analyzeSimulationPerformance,
  type AnalyzeSimulationInput,
  type SimulationItemInput,
  type SimulationPerformanceAnalysis,
} from "./simulation-analytics";

describe("Simulation Analytics Engine (Etapa 8.2.2)", () => {
  const mockSet = {
    setId: "sim-123",
    name: "SimuladoSEFAZ",
    totalQuestions: 10,
    timeLimitMinutes: 120,
    startedAt: "2026-09-04T10:00:00Z",
    completedAt: "2026-09-04T11:30:00Z",
  };

  const createMockItem = (
    id: number,
    overrides?: Partial<SimulationItemInput>,
  ): SimulationItemInput => ({
    itemId: `item-${id}`,
    questionId: `q-${id}`,
    position: id,
    isAnswered: true,
    isCorrect: true,
    chosenAnswer: "A",
    timeSpentSeconds: 120,
    subjectId: "subj-direitoadm",
    subjectName: "Direito Administrativo",
    topicId: "top-licitacoes",
    topicName: "Licitações e Contratos",
    ...overrides,
  });

  // 1. 100% de acerto
  it("1. Calcula corretamente simulado com 100% de acerto", () => {
    const items = Array.from({ length: 5 }, (_, i) => createMockItem(i + 1, { isCorrect: true }));
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.overview.totalQuestions).toBe(5);
    expect(result.overview.answeredCount).toBe(5);
    expect(result.overview.correctCount).toBe(5);
    expect(result.overview.wrongCount).toBe(0);
    expect(result.overview.accuracyPercentage).toBe(100);
    expect(result.signals.some((s) => s.type === "HIGH_ACCURACY")).toBe(true);
  });

  // 2. 0% de acerto
  it("2. Calcula corretamente simulado com 0% de acerto", () => {
    const items = Array.from({ length: 5 }, (_, i) => createMockItem(i + 1, { isCorrect: false }));
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.overview.correctCount).toBe(0);
    expect(result.overview.wrongCount).toBe(5);
    expect(result.overview.accuracyPercentage).toBe(0);
    expect(result.signals.some((s) => s.type === "LOW_ACCURACY")).toBe(true);
  });

  // 3. Desempenho misto
  it("3. Calcula corretamente simulado com desempenho misto", () => {
    const items = [
      createMockItem(1, { isCorrect: true }),
      createMockItem(2, { isCorrect: true }),
      createMockItem(3, { isCorrect: false }),
      createMockItem(4, { isCorrect: false }),
    ];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.overview.correctCount).toBe(2);
    expect(result.overview.wrongCount).toBe(2);
    expect(result.overview.accuracyPercentage).toBe(50);
  });

  // 4. Todas respondidas
  it("4. Calcula corretamente quando todas as questões são respondidas", () => {
    const items = Array.from({ length: 4 }, (_, i) => createMockItem(i + 1, { isAnswered: true }));
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.overview.answeredCount).toBe(4);
    expect(result.overview.unansweredCount).toBe(0);
    expect(result.overview.responsePercentage).toBe(100);
  });

  // 5. Nenhuma respondida
  it("5. Trata corretamente simulado em que nenhuma questão foi respondida", () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      createMockItem(i + 1, { isAnswered: false, isCorrect: null, chosenAnswer: null }),
    );
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.overview.answeredCount).toBe(0);
    expect(result.overview.unansweredCount).toBe(5);
    expect(result.overview.accuracyPercentage).toBe(0);
    expect(result.overview.responsePercentage).toBe(0);
  });

  // 6. Questões em branco (parcial)
  it("6. Trata questões em branco misturadas com respondidas", () => {
    const items = [
      createMockItem(1, { isAnswered: true, isCorrect: true }),
      createMockItem(2, { isAnswered: false, chosenAnswer: null, isCorrect: null }),
      createMockItem(3, { isAnswered: true, isCorrect: false }),
      createMockItem(4, { isAnswered: false, chosenAnswer: null, isCorrect: null }),
      createMockItem(5, { isAnswered: false, chosenAnswer: null, isCorrect: null }),
      createMockItem(6, { isAnswered: false, chosenAnswer: null, isCorrect: null }),
    ];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.overview.totalQuestions).toBe(6);
    expect(result.overview.answeredCount).toBe(2);
    expect(result.overview.unansweredCount).toBe(4);
    expect(result.overview.accuracyPercentage).toBe(50);
    expect(result.signals.some((s) => s.type === "HIGH_UNANSWERED_RATE")).toBe(true);
  });

  // 7. Uma matéria
  it("7. Agrupa corretamente quando há apenas uma matéria", () => {
    const items = [
      createMockItem(1, { subjectId: "s1", subjectName: "Direito Constitucional" }),
      createMockItem(2, { subjectId: "s1", subjectName: "Direito Constitucional" }),
    ];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.subjectPerformance).toHaveLength(1);
    expect(result.subjectPerformance[0].subjectName).toBe("Direito Constitucional");
    expect(result.subjectPerformance[0].shareOfTotalQuestionsPercentage).toBe(100);
  });

  // 8. Múltiplas matérias
  it("8. Agrupa e calcula métricas para múltiplas matérias", () => {
    const items = [
      createMockItem(1, { subjectId: "s1", subjectName: "Português", isCorrect: true }),
      createMockItem(2, { subjectId: "s1", subjectName: "Português", isCorrect: true }),
      createMockItem(3, { subjectId: "s2", subjectName: "Raciocínio Lógico", isCorrect: false }),
    ];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.subjectPerformance).toHaveLength(2);
    const portugues = result.subjectPerformance.find((s) => s.subjectId === "s1");
    const rlm = result.subjectPerformance.find((s) => s.subjectId === "s2");

    expect(portugues?.accuracyPercentage).toBe(100);
    expect(rlm?.accuracyPercentage).toBe(0);
    expect(rlm?.signal).toBe("HIGH_ATTENTION");
  });

  // 9. Um tópico
  it("9. Agrupa corretamente por um único tópico", () => {
    const items = [
      createMockItem(1, { topicId: "t1", topicName: "Atos Administrativos" }),
      createMockItem(2, { topicId: "t1", topicName: "Atos Administrativos" }),
    ];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.topicPerformance).toHaveLength(1);
    expect(result.topicPerformance[0].topicName).toBe("Atos Administrativos");
  });

  // 10. Múltiplos tópicos
  it("10. Agrupa corretamente por múltiplos tópicos", () => {
    const items = [
      createMockItem(1, { topicId: "t1", topicName: "Atos", isCorrect: true }),
      createMockItem(2, { topicId: "t2", topicName: "Licitações", isCorrect: false }),
    ];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.topicPerformance).toHaveLength(2);
  });

  // 11. Questão sem topic_id
  it("11. Classifica questão sem topic_id como sem tópico identificado sem falhar", () => {
    const items = [createMockItem(1, { topicId: null, topicName: null })];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.topicPerformance[0].topicId).toBe("sem_topico_identificado");
    expect(result.topicPerformance[0].topicName).toBe("Sem tópico identificado");
  });

  // 12. Questão sem subject_id
  it("12. Classifica questão sem subject_id como sem matéria identificada sem falhar", () => {
    const items = [createMockItem(1, { subjectId: null, subjectName: null })];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.subjectPerformance[0].subjectId).toBe("sem_materia_identificada");
    expect(result.subjectPerformance[0].subjectName).toBe("Sem matéria identificada");
  });

  // 13, 14, 15. Tempo normal, alto, baixo
  it("13-15. Calcula tempos médios, mínimos, máximos e mediano de pacing", () => {
    const items = [
      createMockItem(1, { timeSpentSeconds: 30 }),
      createMockItem(2, { timeSpentSeconds: 120 }),
      createMockItem(3, { timeSpentSeconds: 300 }),
    ];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.pacing.minTimeSpentSeconds).toBe(30);
    expect(result.pacing.maxTimeSpentSeconds).toBe(300);
    expect(result.pacing.medianTimePerQuestionSeconds).toBe(120);
    expect(result.pacing.avgTimePerQuestionSeconds).toBe(150);
  });

  // 16. Tempos diferentes entre acertos e erros
  it("16. Identifica ineficiência de tempo quando acertos e erros possuem tempos discrepantes", () => {
    const items = [
      createMockItem(1, { isCorrect: true, timeSpentSeconds: 60 }),
      createMockItem(2, { isCorrect: true, timeSpentSeconds: 60 }),
      createMockItem(3, { isCorrect: false, timeSpentSeconds: 300 }),
      createMockItem(4, { isCorrect: false, timeSpentSeconds: 300 }),
    ];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.pacing.avgTimeInCorrectQuestionsSeconds).toBe(60);
    expect(result.pacing.avgTimeInWrongQuestionsSeconds).toBe(300);
    expect(result.signals.some((s) => s.type === "TIME_INEFFICIENCY")).toBe(true);
  });

  // 17. Concentração de erros
  it("17. Gera sinal de ERROR_CONCENTRATION quando um tópico concentra a maioria dos erros", () => {
    const items = [
      createMockItem(1, { topicId: "t1", topicName: "Tópico A", isCorrect: false }),
      createMockItem(2, { topicId: "t1", topicName: "Tópico A", isCorrect: false }),
      createMockItem(3, { topicId: "t1", topicName: "Tópico A", isCorrect: false }),
      createMockItem(4, { topicId: "t2", topicName: "Tópico B", isCorrect: true }),
    ];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.signals.some((s) => s.type === "ERROR_CONCENTRATION")).toBe(true);
  });

  // 18. Distribuição temporal (terços)
  it("18. Calcula terços da prova e identifica sinal de ritmo", () => {
    const items = [
      createMockItem(1, { position: 1, timeSpentSeconds: 120, isCorrect: true }),
      createMockItem(2, { position: 2, timeSpentSeconds: 120, isCorrect: true }),
      createMockItem(3, { position: 3, timeSpentSeconds: 30, isCorrect: false }),
    ];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(result.pacing.terciles).not.toBeNull();
    expect(result.pacing.terciles?.firstTercile.questionCount).toBe(1);
    expect(result.pacing.terciles?.middleTercile.questionCount).toBe(1);
    expect(result.pacing.terciles?.finalTercile.questionCount).toBe(1);
  });

  // 19. Ausência de dados opcionais
  it("19. Funciona normalmente com ausência de mapas e histórico", () => {
    const items = [createMockItem(1)];
    const result = analyzeSimulationPerformance({ set: { setId: "sim-1" }, items });

    expect(result.setId).toBe("sim-1");
    expect(result.historicalComparison).toBeNull();
  });

  // 20. Dados vazios
  it("20. Trata simulado vazio sem gerar exceção ou NaN", () => {
    const result = analyzeSimulationPerformance({ set: { setId: "sim-empty" }, items: [] });

    expect(result.overview.totalQuestions).toBe(0);
    expect(result.overview.accuracyPercentage).toBe(0);
    expect(result.overview.avgTimePerQuestionSeconds).toBe(0);
    expect(result.subjectPerformance).toEqual([]);
    expect(result.topicPerformance).toEqual([]);
    expect(result.pacing.terciles).toBeNull();
  });

  // 21 & 22. Valores zero / Prevenção de NaN e Infinity
  it("21-22. Previne divisão por zero e geração de NaN ou Infinity", () => {
    const items = [
      createMockItem(1, { timeSpentSeconds: 0, isAnswered: false, isCorrect: null }),
      createMockItem(2, { timeSpentSeconds: -10, isAnswered: true, isCorrect: true }),
    ];
    const result = analyzeSimulationPerformance({ set: mockSet, items });

    expect(Number.isNaN(result.overview.accuracyPercentage)).toBe(false);
    expect(Number.isNaN(result.overview.avgTimePerQuestionSeconds)).toBe(false);
    expect(Number.isFinite(result.overview.accuracyPercentage)).toBe(true);
  });

  // 23. Histórico insuficiente
  it("23. Sinaliza histórico insuficiente se houver apenas 1 simulado anterior", () => {
    const items = [createMockItem(1, { isCorrect: true })];
    const result = analyzeSimulationPerformance({
      set: mockSet,
      items,
      history: [{ setId: "sim-prev", accuracyPercentage: 70, avgTimePerQuestionSeconds: 100 }],
    });

    expect(result.historicalComparison?.trend).toBe("INSUFFICIENT_HISTORY");
  });

  // 24. Histórico com múltiplos simulados
  it("24. Compara corretamente com histórico de múltiplos simulados", () => {
    const items = [createMockItem(1, { isCorrect: true })];
    const result = analyzeSimulationPerformance({
      set: mockSet,
      items,
      history: [
        { setId: "sim-1", accuracyPercentage: 50, avgTimePerQuestionSeconds: 100 },
        { setId: "sim-2", accuracyPercentage: 60, avgTimePerQuestionSeconds: 100 },
      ],
    });

    expect(result.historicalComparison?.historicalAvgAccuracyPercentage).toBe(55);
    expect(result.historicalComparison?.accuracyDeltaPercentage).toBe(45);
    expect(result.historicalComparison?.trend).toBe("IMPROVING");
  });

  // 25. Determinismo
  it("25. É 100% determinístico para os mesmos inputs", () => {
    const items = [createMockItem(1), createMockItem(2)];
    const input: AnalyzeSimulationInput = { set: mockSet, items };

    const res1 = analyzeSimulationPerformance(input);
    const res2 = analyzeSimulationPerformance(input);

    expect(res1).toEqual(res2);
  });

  // 26. Nenhuma mutação dos inputs
  it("26. Não altera nem muta os objetos passados na entrada", () => {
    const item1 = createMockItem(1);
    const item2 = createMockItem(2);
    const items = [item1, item2];
    const itemsCopy = JSON.parse(JSON.stringify(items));

    analyzeSimulationPerformance({ set: mockSet, items });

    expect(items).toEqual(itemsCopy);
  });

  // 27. Compatibilidade de tipos
  it("27. Mantém compatibilidade total com os contratos e tipos exportados", () => {
    const items = [createMockItem(1)];
    const analysis: SimulationPerformanceAnalysis = analyzeSimulationPerformance({
      set: mockSet,
      items,
    });

    expect(analysis.setId).toBe(mockSet.setId);
    expect(analysis.cognitiveImpactSummary.keyFindings.length).toBeGreaterThan(0);
  });
});
