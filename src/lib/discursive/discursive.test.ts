import { beforeEach, describe, expect, it } from "vitest";

import {
  calculateSelfScore,
  clearDiscursiveSubmissionsInMemory,
  getDiscursivePerformanceSummary,
  getDiscursiveQuestionById,
  getDiscursiveQuestions,
  getDiscursiveSubmissions,
  saveDiscursiveSubmission,
  SEED_DISCURSIVE_QUESTIONS,
} from "./discursiveEngine";
import type { GradingCriterion } from "./types";

describe("Discursive Engine Unit Tests", () => {
  beforeEach(() => {
    clearDiscursiveSubmissionsInMemory();
  });

  it("deve listar os enunciados pré-cadastrados da área fiscal", () => {
    const questions = getDiscursiveQuestions();
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions[0].subject).toBe("Direito Tributário");
  });

  it("deve obter questão específica por ID", () => {
    const question = getDiscursiveQuestionById("disc-01");
    expect(question).toBeDefined();
    expect(question?.title).toContain("Lançamento por Homologação");
    expect(question?.banca).toBe("FGV");
  });

  it("deve calcular a pontuação obtida com base nas rubricas oficiais", () => {
    const criteria: GradingCriterion[] = [
      { id: "c1", description: "Critério 1", weight: 7.0 },
      { id: "c2", description: "Critério 2", weight: 6.0 },
      { id: "c3", description: "Critério 3", weight: 7.0 },
    ];

    const scores = {
      c1: 7.0, // Nota total no item 1
      c2: 3.0, // Nota parcial no item 2
      c3: 5.5, // Nota parcial no item 3
    };

    const calculated = calculateSelfScore(criteria, scores);
    expect(calculated).toBe(15.5);
  });

  it("não deve permitir pontuação superior ao peso do critério", () => {
    const criteria: GradingCriterion[] = [{ id: "c1", description: "Critério 1", weight: 5.0 }];

    const scores = { c1: 10.0 }; // Tentativa de nota maior que peso
    const calculated = calculateSelfScore(criteria, scores);
    expect(calculated).toBe(5.0);
  });

  it("deve salvar e recuperar submissões no localStorage", () => {
    const question = SEED_DISCURSIVE_QUESTIONS[0];
    const sub = saveDiscursiveSubmission({
      questionId: question.id,
      userResponse: "O ICMS é lançamento por homologação, operou-se a decadência em 5 anos.",
      selfScore: 18.0,
      criteriaScores: { "crit-1": 7.0, "crit-2": 6.0, "crit-3": 5.0 },
      feedbackNotes: "Preciso citar com mais clareza o Tema Repetitivo 104 do STJ.",
      timeSpentSeconds: 1800,
    });

    expect(sub.id).toBeDefined();
    expect(sub.submittedAt).toBeDefined();

    const allSubs = getDiscursiveSubmissions();
    expect(allSubs.length).toBe(1);
    expect(allSubs[0].selfScore).toBe(18.0);
  });

  it("deve gerar o resumo de desempenho em discursivas", () => {
    saveDiscursiveSubmission({
      questionId: "disc-01",
      userResponse: "Resposta 1",
      selfScore: 16.0,
      criteriaScores: {},
      feedbackNotes: "",
    });

    saveDiscursiveSubmission({
      questionId: "disc-02",
      userResponse: "Resposta 2",
      selfScore: 20.0,
      criteriaScores: {},
      feedbackNotes: "",
    });

    const summary = getDiscursivePerformanceSummary();
    expect(summary.totalSubmissions).toBe(2);
    expect(summary.totalQuestionsAttempted).toBe(2);
    expect(summary.averageScorePercentage).toBe(90);
  });
});
