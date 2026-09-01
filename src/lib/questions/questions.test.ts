import { describe, it, expect, beforeEach } from "vitest";
import {
  registerAttempt,
  calculatePerformanceMetrics,
  getErrorNotebook,
  clearLocalAttempts,
  FISCAL_QUESTIONS,
} from "./errorTracker";

describe("Módulo de Exercícios e Caderno de Desvio de Erros (Etapa 3.4)", () => {
  beforeEach(() => {
    // Garantir ambiente limpo de tentativas para cada teste individual
    clearLocalAttempts();
  });

  it("deve carregar com sucesso o banco de dados de questões fiscais pré-cadastradas", () => {
    expect(FISCAL_QUESTIONS.length).toBeGreaterThan(0);
    const q1 = FISCAL_QUESTIONS.find((q) => q.id === "Q-01");
    expect(q1).toBeDefined();
    expect(q1?.examBoard).toBe("FGV");
    expect(q1?.correctAnswer).toBe("B");
  });

  it("deve registrar corretamente uma tentativa de acerto do aluno", () => {
    const { attempt, wasCorrect } = registerAttempt("aluno-99", "Q-01", "B", 45);

    expect(wasCorrect).toBe(true);
    expect(attempt.isCorrect).toBe(true);
    expect(attempt.timeSpentSeconds).toBe(45);
    expect(attempt.selectedAlternative).toBe("B");
    expect(attempt.errorCategory).toBeUndefined();
  });

  it("deve registrar e classificar corretamente uma tentativa de erro do aluno com categoria designada", () => {
    const { attempt, wasCorrect } = registerAttempt(
      "aluno-99",
      "Q-01",
      "A", // Resposta incorreta (correta é B)
      90,
      "atencao",
      "Li muito rápido e não vi que pedia lei específica",
    );

    expect(wasCorrect).toBe(false);
    expect(attempt.isCorrect).toBe(false);
    expect(attempt.errorCategory).toBe("atencao");
    expect(attempt.notes).toBe("Li muito rápido e não vi que pedia lei específica");
  });

  it("deve calcular métricas de desempenho e taxas de acerto por banca com exatidão matemática", () => {
    // 3 tentativas: 2 acertos e 1 erro
    registerAttempt("aluno-99", "Q-01", "B", 30); // Acerto (FGV)
    registerAttempt("aluno-99", "Q-02", "C", 40); // Acerto (FCC)
    registerAttempt("aluno-99", "Q-03", "A", 50, "conhecimento"); // Erro (Cebraspe)

    const metrics = calculatePerformanceMetrics([
      {
        id: "1",
        userId: "u",
        questionId: "Q-01",
        selectedAlternative: "B",
        isCorrect: true,
        timeSpentSeconds: 30,
        occurredAt: "",
      },
      {
        id: "2",
        userId: "u",
        questionId: "Q-02",
        selectedAlternative: "C",
        isCorrect: true,
        timeSpentSeconds: 40,
        occurredAt: "",
      },
      {
        id: "3",
        userId: "u",
        questionId: "Q-03",
        selectedAlternative: "A",
        isCorrect: false,
        timeSpentSeconds: 50,
        errorCategory: "conhecimento",
        occurredAt: "",
      },
    ]);

    expect(metrics.total).toBe(3);
    expect(metrics.correct).toBe(2);
    expect(metrics.wrong).toBe(1);
    expect(metrics.globalAccuracy).toBeCloseTo(0.666, 2);

    expect(metrics.byBoard["FGV"].accuracy).toBe(1.0);
    expect(metrics.byBoard["Cebraspe"].accuracy).toBe(0.0);
    expect(metrics.errorDistribution["conhecimento"]).toBe(1);
  });

  it("deve alimentar e agrupar as falhas de forma agregada no Caderno de Desvio de Erros", () => {
    const attempts = [
      {
        id: "att-1",
        userId: "u",
        questionId: "Q-01",
        selectedAlternative: "A",
        isCorrect: false,
        timeSpentSeconds: 60,
        errorCategory: "atencao" as const,
        notes: "Falta de foco",
        occurredAt: new Date().toISOString(),
      },
      {
        id: "att-2",
        userId: "u",
        questionId: "Q-04",
        selectedAlternative: "B",
        isCorrect: false,
        timeSpentSeconds: 45,
        errorCategory: "interpretacao" as const,
        notes: "Pegadinha de prazo",
        occurredAt: new Date().toISOString(),
      },
    ];

    const errorNotebooks = getErrorNotebook(attempts, FISCAL_QUESTIONS);

    // Q-01 (Direito Tributário) e Q-04 (Direito Constitucional)
    expect(errorNotebooks.length).toBe(2);

    const tribNotebook = errorNotebooks.find((n) => n.subjectId === "DIR-TRIB");
    expect(tribNotebook).toBeDefined();
    expect(tribNotebook?.entries.length).toBe(1);
    expect(tribNotebook?.errorDistribution["atencao"]).toBe(1);

    const constNotebook = errorNotebooks.find((n) => n.subjectId === "DIR-CONST");
    expect(constNotebook).toBeDefined();
    expect(constNotebook?.entries.length).toBe(1);
    expect(constNotebook?.errorDistribution["interpretacao"]).toBe(1);
  });
});
