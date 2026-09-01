import { describe, it, expect } from "vitest";
import { generatePerformanceReport } from "./performanceEngine";
import { QuestionAttempt, Question } from "../questions/types";

describe("Motor de Analytics e Diagnóstico de Lacunas (Etapa 4.1)", () => {
  const mockQuestions: Question[] = [
    {
      id: "Q-1",
      subjectId: "DIR-TRIB",
      subjectName: "Direito Tributário",
      topicId: "LIMIT",
      topicName: "Limitações Tributárias",
      examBoard: "FGV",
      year: 2025,
      statement: "S",
      alternatives: ["A", "B"],
      correctAnswer: "B",
      associatedLaws: ["CF/88 - Art. 150"],
    },
    {
      id: "Q-2",
      subjectId: "DIR-TRIB",
      subjectName: "Direito Tributário",
      topicId: "LIMIT",
      topicName: "Limitações Tributárias",
      examBoard: "FGV",
      year: 2025,
      statement: "S",
      alternatives: ["A", "B"],
      correctAnswer: "B",
      associatedLaws: ["CF/88 - Art. 150"],
    },
    {
      id: "Q-3",
      subjectId: "DIR-TRIB",
      subjectName: "Direito Tributário",
      topicId: "OBRIG",
      topicName: "Obrigação Tributária",
      examBoard: "FCC",
      year: 2025,
      statement: "S",
      alternatives: ["A", "B"],
      correctAnswer: "A",
    },
  ];

  it("deve tratar corretamente um cenário sem nenhuma tentativa de questão resolvida", () => {
    const report = generatePerformanceReport([], mockQuestions);

    expect(report.totalQuestionsResolved).toBe(0);
    expect(report.overallAccuracy).toBe(0);
    expect(report.gapDiagnostics.length).toBe(0);
    expect(report.maturityIndexes.length).toBe(0);
  });

  it("deve agrupar métricas por tópico e assunto com exatidão", () => {
    const attempts: QuestionAttempt[] = [
      {
        id: "a-1",
        userId: "u",
        questionId: "Q-1",
        selectedAlternative: "B",
        isCorrect: true,
        timeSpentSeconds: 60,
        occurredAt: "",
      },
      {
        id: "a-2",
        userId: "u",
        questionId: "Q-2",
        selectedAlternative: "A",
        isCorrect: false,
        timeSpentSeconds: 120,
        errorCategory: "atencao",
        occurredAt: "",
      },
      {
        id: "a-3",
        userId: "u",
        questionId: "Q-3",
        selectedAlternative: "A",
        isCorrect: true,
        timeSpentSeconds: 30,
        occurredAt: "",
      },
    ];

    const report = generatePerformanceReport(attempts, mockQuestions);

    expect(report.totalQuestionsResolved).toBe(3);
    expect(report.overallAccuracy).toBeCloseTo(0.666, 2);
    expect(report.totalTimeSpentSeconds).toBe(210);

    // Desempenho do tópico LIMIT (Limitações Tributárias): 1 acerto e 1 erro = 50%
    const limitPerf = report.subjectPerformance.find((s) => s.topicId === "LIMIT");
    expect(limitPerf).toBeDefined();
    expect(limitPerf?.totalQuestions).toBe(2);
    expect(limitPerf?.correctQuestions).toBe(1);
    expect(limitPerf?.accuracy).toBe(0.5);
    expect(limitPerf?.averageTimeSeconds).toBe(90);
  });

  it("deve apontar lacunas clínicas de conhecimento quando o aproveitamento for menor que 75%", () => {
    const attempts: QuestionAttempt[] = [
      {
        id: "a-1",
        userId: "u",
        questionId: "Q-1",
        selectedAlternative: "A",
        isCorrect: false,
        timeSpentSeconds: 90,
        errorCategory: "conhecimento",
        occurredAt: "",
      },
      {
        id: "a-2",
        userId: "u",
        questionId: "Q-2",
        selectedAlternative: "A",
        isCorrect: false,
        timeSpentSeconds: 110,
        errorCategory: "conhecimento",
        occurredAt: "",
      },
    ];

    const report = generatePerformanceReport(attempts, mockQuestions);

    // LIMIT possui 0% de acerto (0/2), logo é uma lacuna crítica (<50%)
    expect(report.gapDiagnostics.length).toBe(1);
    const gap = report.gapDiagnostics[0];
    expect(gap.topicId).toBe("LIMIT");
    expect(gap.severity).toBe("high");
    expect(gap.primaryErrorCategory).toBe("conhecimento");
    expect(gap.suggestedLawTags).toContain("CF/88 - Art. 150");
    expect(gap.recommendation).toContain("Estude a fundo");
  });

  it("deve calcular o índice de maturidade da banca incorporando penalidade de tempo excessivo", () => {
    const attempts: QuestionAttempt[] = [
      {
        id: "a-1",
        userId: "u",
        questionId: "Q-1",
        selectedAlternative: "A",
        isCorrect: false,
        timeSpentSeconds: 200,
        errorCategory: "velocidade",
        occurredAt: "",
      },
    ];

    const report = generatePerformanceReport(attempts, mockQuestions);

    expect(report.maturityIndexes.length).toBe(1);
    const mFGV = report.maturityIndexes[0];
    expect(mFGV.examBoard).toBe("FGV");
    expect(mFGV.accuracy).toBe(0.0);
    // Pontuação deve sofrer penalidade pelo tempo de 200s (excede 120s)
    expect(mFGV.maturityScore).toBeLessThan(20); // Severamente penalizado
    expect(mFGV.level).toBe("Iniciante");
  });
});
