import { describe, it, expect, vi } from "vitest";
import { createExamSession, processQuestionAttempt, getAdaptiveQuestions } from "./questionEngine";
import { Question, ExamSession } from "./types";

describe("Engine de Simulados e Questões Adaptativas (Etapa 5.1)", () => {
  it("deve criar uma sessão de simulado com filtro adaptativo correto", () => {
    const gaps = [{ subjectId: "RLM", topicId: "PROP-LOG", accuracy: 0.3 }];

    const session = createExamSession("targeted_review", gaps, 2);

    expect(session.questions.length).toBe(2);
    expect(session.mode).toBe("targeted_review");
    // Deve incluir a questão de RLM correspondente à lacuna crítica
    expect(session.questions.some((q) => q.subjectId === "RLM")).toBe(true);
  });

  it("deve validar corretamente as tentativas para múltipla escolha (FGV)", () => {
    const session = createExamSession("practice", [], 3);
    const firstQuestion =
      session.questions.find((q) => q.examBoard === "FGV") || session.questions[0];

    // Simula resposta correta
    const updatedCorrect = processQuestionAttempt(
      session,
      firstQuestion.id,
      firstQuestion.correctAnswer,
      45,
      undefined,
      undefined,
      false,
    );

    const attemptCorrect = updatedCorrect.attempts[firstQuestion.id];
    expect(attemptCorrect).toBeDefined();
    expect(attemptCorrect.isCorrect).toBe(true);
    expect(attemptCorrect.timeSpentSeconds).toBe(45);

    // Simula resposta incorreta
    const wrongAnswer = firstQuestion.correctAnswer === "A" ? "B" : "A";
    const updatedWrong = processQuestionAttempt(
      session,
      firstQuestion.id,
      wrongAnswer,
      130,
      "atencao",
      "Errei por pressa",
      false,
    );

    const attemptWrong = updatedWrong.attempts[firstQuestion.id];
    expect(attemptWrong).toBeDefined();
    expect(attemptWrong.isCorrect).toBe(false);
    expect(attemptWrong.errorCategory).toBe("atencao");
    expect(attemptWrong.timeSpentSeconds).toBe(130);
  });

  it("deve suportar o sistema de penalização do Cebraspe (1 errada anula 1 certa)", () => {
    // Pegamos uma sessão fictícia com 2 questões
    const session: ExamSession = {
      id: "TEST-SESSION",
      mode: "simulation",
      questions: [
        {
          id: "Q-CEBRASPE-1",
          subjectId: "DIR-TRIB",
          subjectName: "Direito Tributário",
          topicId: "OBRIG-TRIB",
          topicName: "Obrigação",
          examBoard: "Cebraspe",
          year: 2024,
          statement: "Enunciado 1",
          alternatives: ["C", "E"],
          correctAnswer: "C",
          explanation: "Gab",
        },
        {
          id: "Q-CEBRASPE-2",
          subjectId: "DIR-TRIB",
          subjectName: "Direito Tributário",
          topicId: "OBRIG-TRIB",
          topicName: "Obrigação",
          examBoard: "Cebraspe",
          year: 2024,
          statement: "Enunciado 2",
          alternatives: ["C", "E"],
          correctAnswer: "E",
          explanation: "Gab",
        },
      ],
      timeLimitSeconds: 1200,
      timeSpentSeconds: 0,
      isCompleted: false,
      accuracy: 0,
      score: 0,
      attempts: {},
    };

    // 1. Responde a primeira CERTA
    const step1 = processQuestionAttempt(
      session,
      "Q-CEBRASPE-1",
      "C",
      50,
      undefined,
      undefined,
      true,
    );
    expect(step1.score).toBe(50); // 1 ponto líquido de 2 totais = 50%

    // 2. Responde a segunda ERRADA (deve anular a primeira certa, score vai a 0)
    const step2 = processQuestionAttempt(
      step1,
      "Q-CEBRASPE-2",
      "C",
      40,
      "esquecimento",
      undefined,
      true,
    );
    expect(step2.score).toBe(0); // Certa e errada se anulam = 0% líquido
  });
});
