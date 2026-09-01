import { describe, it, expect } from "vitest";
import { buildCustomSimulation, evaluateSimulation } from "./simulationEngine";
import { SimulationConfig } from "./types";

describe("Motor do Gerador de Simulados & Caderno de Erros (Etapa 5.2)", () => {
  it("deve montar proporcionalmente a quantidade de questões do edital respeitando os pesos", () => {
    const config: SimulationConfig = {
      targetExam: "SEFAZ",
      board: "FGV",
      totalQuestions: 10,
      durationMinutes: 45,
      weightsBySubject: {
        "DIR-TRIB": 60, // 60% = 6 questões
        CONTAB: 40, // 40% = 4 questões
      },
    };

    const questions = buildCustomSimulation(config);

    expect(questions.length).toBe(10);

    const tributeCount = questions.filter((q) => q.subjectId === "DIR-TRIB").length;
    const contabCount = questions.filter((q) => q.subjectId === "CONTAB").length;

    expect(tributeCount).toBe(6);
    expect(contabCount).toBe(4);
  });

  it("deve processar corretamente os resultados calculando nota líquida tradicional (FGV)", () => {
    const config: SimulationConfig = {
      targetExam: "SEFAZ",
      board: "FGV",
      totalQuestions: 10,
      durationMinutes: 45,
      weightsBySubject: {
        "DIR-TRIB": 50,
        CONTAB: 50,
      },
    };

    // 8 acertos e 2 erros
    const mockAttempts: Record<string, any> = {
      Q1: { questionId: "Q1", selectedOption: "A", isCorrect: true, timeSpentSeconds: 30 },
      Q2: { questionId: "Q2", selectedOption: "B", isCorrect: true, timeSpentSeconds: 30 },
      Q3: { questionId: "Q3", selectedOption: "C", isCorrect: true, timeSpentSeconds: 30 },
      Q4: { questionId: "Q4", selectedOption: "D", isCorrect: true, timeSpentSeconds: 30 },
      Q5: { questionId: "Q5", selectedOption: "E", isCorrect: true, timeSpentSeconds: 30 },
      Q6: { questionId: "Q6", selectedOption: "A", isCorrect: true, timeSpentSeconds: 30 },
      Q7: { questionId: "Q7", selectedOption: "B", isCorrect: true, timeSpentSeconds: 30 },
      Q8: { questionId: "Q8", selectedOption: "C", isCorrect: true, timeSpentSeconds: 30 },
      Q9: {
        questionId: "Q9",
        selectedOption: "D",
        isCorrect: false,
        timeSpentSeconds: 30,
        errorCategory: "atencao",
      },
      Q10: {
        questionId: "Q10",
        selectedOption: "E",
        isCorrect: false,
        timeSpentSeconds: 30,
        errorCategory: "esquecimento",
      },
    };

    const results = evaluateSimulation(
      "SIM-TEST-FGV",
      config,
      mockAttempts,
      300,
      new Date().toISOString(),
    );

    expect(results.score).toBe(80); // 80% bruto
    expect(results.netScore).toBe(80); // FGV não desconta erradas, mantém 80% líquido
    expect(results.errorBreakdown["atencao"].count).toBe(1);
    expect(results.errorBreakdown["esquecimento"].count).toBe(1);
  });

  it("deve processar corretamente os resultados com penalização ativa do Cebraspe (1 errada anula 1 certa)", () => {
    const config: SimulationConfig = {
      targetExam: "RECEITA",
      board: "CEBRASPE",
      totalQuestions: 10,
      durationMinutes: 45,
      weightsBySubject: {
        "DIR-TRIB": 50,
        CONTAB: 50,
      },
    };

    // 8 acertos e 2 erros
    const mockAttempts: Record<string, any> = {
      Q1: { questionId: "Q1", selectedOption: "C", isCorrect: true, timeSpentSeconds: 30 },
      Q2: { questionId: "Q2", selectedOption: "C", isCorrect: true, timeSpentSeconds: 30 },
      Q3: { questionId: "Q3", selectedOption: "C", isCorrect: true, timeSpentSeconds: 30 },
      Q4: { questionId: "Q4", selectedOption: "C", isCorrect: true, timeSpentSeconds: 30 },
      Q5: { questionId: "Q5", selectedOption: "C", isCorrect: true, timeSpentSeconds: 30 },
      Q6: { questionId: "Q6", selectedOption: "C", isCorrect: true, timeSpentSeconds: 30 },
      Q7: { questionId: "Q7", selectedOption: "C", isCorrect: true, timeSpentSeconds: 30 },
      Q8: { questionId: "Q8", selectedOption: "C", isCorrect: true, timeSpentSeconds: 30 },
      Q9: {
        questionId: "Q9",
        selectedOption: "E",
        isCorrect: false,
        timeSpentSeconds: 30,
        errorCategory: "conhecimento",
      },
      Q10: {
        questionId: "Q10",
        selectedOption: "E",
        isCorrect: false,
        timeSpentSeconds: 30,
        errorCategory: "conhecimento",
      },
    };

    const results = evaluateSimulation(
      "SIM-TEST-CEBRASPE",
      config,
      mockAttempts,
      300,
      new Date().toISOString(),
    );

    expect(results.score).toBe(80); // 80% bruto
    expect(results.netScore).toBe(60); // 8 certas - 2 erradas = 6 pontos líquidos = 60% líquido
  });
});
