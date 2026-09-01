import { describe, expect, it } from "vitest";
import { ExamConsolidationEngine } from "./consolidation";
import { ExamSession } from "./types";
import { ExamAnswerWithQuestion } from "@/hooks/useExamRunner";

const createMockSession = (overrides: Partial<ExamSession> = {}): ExamSession => {
  return {
    id: "session-123",
    user_id: "user-456",
    set_id: "set-789",
    status: "ready",
    time_limit_seconds: 3600,
    accumulated_pause_seconds: 0,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

const createMockAnswers = (
  items: {
    chosen: string | null;
    correct: string;
    weight?: number;
    time?: number;
    topic?: string;
  }[],
): ExamAnswerWithQuestion[] => {
  return items.map((item, idx) => ({
    id: `ans-${idx}`,
    session_id: "session-123",
    question_id: `q-${idx}`,
    chosen_answer: item.chosen,
    is_flagged: false,
    weight: item.weight ?? 1.0,
    time_spent_seconds: item.time ?? 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    question: {
      id: `q-${idx}`,
      statement: `Questão ${idx}`,
      alternatives: [],
      correct_answer: item.correct,
      exam_board: "FCC",
      subject_id: "sub-101",
      topic_id: item.topic ?? "top-01",
    },
  }));
};

describe("ExamConsolidationEngine — Suíte de Testes de Correção e Mapeamento Analítico (Etapa 8.4)", () => {
  it("deve calcular a pontuação correta no modo padrão (Standard) sem penalidades", () => {
    const session = createMockSession();
    // 5 questões, peso 2.0 cada. 3 acertos, 1 erro, 1 em branco.
    const answers = createMockAnswers([
      { chosen: "A", correct: "A", weight: 2.0 }, // Certo (2.0)
      { chosen: "B", correct: "B", weight: 2.0 }, // Certo (2.0)
      { chosen: "C", correct: "C", weight: 2.0 }, // Certo (2.0)
      { chosen: "D", correct: "E", weight: 2.0 }, // Errado (0.0)
      { chosen: null, correct: "A", weight: 2.0 }, // Em Branco (0.0)
    ]);

    const result = ExamConsolidationEngine.consolidate(session, answers, "standard");

    expect(result.stats.total_questions).toBe(5);
    expect(result.stats.answered_count).toBe(4);
    expect(result.stats.unanswered_count).toBe(1);
    expect(result.stats.correct_count).toBe(3);
    expect(result.stats.incorrect_count).toBe(1);

    // Pontuações
    expect(result.stats.max_possible_score).toBe(10.0);
    expect(result.stats.raw_score).toBe(6.0);
    expect(result.stats.penalty_score).toBe(0.0);
    expect(result.stats.final_score_net).toBe(6.0);
    expect(result.stats.accuracy_percentage).toBe(60.0);
  });

  it("deve aplicar a penalidade de estilo CEBRASPE (1 para 1) corretamente", () => {
    const session = createMockSession();
    // 5 questões, peso 1.0 cada. 3 acertos, 2 erros.
    // 3 acertos = 3.0. 2 erros = -2.0 penalidade. Líquida = 1.0.
    const answers = createMockAnswers([
      { chosen: "A", correct: "A" }, // Certo
      { chosen: "B", correct: "B" }, // Certo
      { chosen: "C", correct: "C" }, // Certo
      { chosen: "D", correct: "E" }, // Errado
      { chosen: "A", correct: "B" }, // Errado
    ]);

    const result = ExamConsolidationEngine.consolidate(session, answers, "cebraspe_1_for_1");

    expect(result.stats.correct_count).toBe(3);
    expect(result.stats.incorrect_count).toBe(2);
    expect(result.stats.raw_score).toBe(3.0);
    expect(result.stats.penalty_score).toBe(2.0);
    expect(result.stats.final_score_net).toBe(1.0);
    expect(result.stats.accuracy_percentage).toBe(20.0); // 1.0 / 5.0 * 100
  });

  it("deve impor a trava de Piso Zero na Nota Líquida", () => {
    const session = createMockSession();
    // 5 questões. 1 acerto (1.0), 4 erros (-4.0).
    // Pontuação líquida seria -3.0, mas a trava de piso zero deve mantê-la em 0.0.
    const answers = createMockAnswers([
      { chosen: "A", correct: "A" }, // Certo
      { chosen: "D", correct: "E" }, // Errado
      { chosen: "A", correct: "B" }, // Errado
      { chosen: "B", correct: "C" }, // Errado
      { chosen: "C", correct: "D" }, // Errado
    ]);

    const result = ExamConsolidationEngine.consolidate(session, answers, "cebraspe_1_for_1");

    expect(result.stats.correct_count).toBe(1);
    expect(result.stats.incorrect_count).toBe(4);
    expect(result.stats.raw_score).toBe(1.0);
    expect(result.stats.penalty_score).toBe(4.0);
    expect(result.stats.final_score_net).toBe(0.0); // Travado no piso zero!
    expect(result.stats.accuracy_percentage).toBe(0.0);
  });

  it("deve aplicar a penalidade parcial de estilo CEBRASPE Metade (0.5)", () => {
    const session = createMockSession();
    // 4 questões, peso 1.0 cada. 2 acertos, 2 erros.
    // 2 acertos = 2.0. 2 erros = -1.0 penalidade. Líquida = 1.0.
    const answers = createMockAnswers([
      { chosen: "A", correct: "A" }, // Certo
      { chosen: "B", correct: "B" }, // Certo
      { chosen: "D", correct: "E" }, // Errado
      { chosen: "A", correct: "B" }, // Errado
    ]);

    const result = ExamConsolidationEngine.consolidate(session, answers, "cebraspe_half");

    expect(result.stats.correct_count).toBe(2);
    expect(result.stats.incorrect_count).toBe(2);
    expect(result.stats.raw_score).toBe(2.0);
    expect(result.stats.penalty_score).toBe(1.0);
    expect(result.stats.final_score_net).toBe(1.0);
    expect(result.stats.accuracy_percentage).toBe(25.0); // 1.0 / 4.0 * 100
  });

  it("deve computar tempos totais e médias por questão de forma exata", () => {
    const session = createMockSession();
    const answers = createMockAnswers([
      { chosen: "A", correct: "A", time: 45 },
      { chosen: "B", correct: "B", time: 15 },
      { chosen: "C", correct: "C", time: 120 },
    ]);

    const result = ExamConsolidationEngine.consolidate(session, answers, "standard");

    // Tempo total = 45 + 15 + 120 = 180s. Ritmo médio = 180s / 3q = 60s/q.
    expect(result.stats.total_time_spent_seconds).toBe(180);
    expect(result.stats.average_time_per_question_seconds).toBe(60);
  });

  it("deve identificar lacunas cognitivas críticas para tópicos abaixo do piso de 60% de aproveitamento", () => {
    const session = createMockSession();
    // Criar respostas misturadas para dois tópicos diferentes
    const answers = createMockAnswers([
      // Tópico A (Aproveitamento: 1/3 = 33% -> Crítico)
      { chosen: "A", correct: "A", topic: "top-A" },
      { chosen: "D", correct: "E", topic: "top-A" },
      { chosen: null, correct: "A", topic: "top-A" },

      // Tópico B (Aproveitamento: 2/2 = 100% -> Forte)
      { chosen: "B", correct: "B", topic: "top-B" },
      { chosen: "C", correct: "C", topic: "top-B" },
    ]);

    const result = ExamConsolidationEngine.consolidate(session, answers, "standard");

    expect(result.topic_performances["top-A"]).toBeDefined();
    expect(result.topic_performances["top-A"]!.accuracy_rate).toBeCloseTo(0.333, 2);

    expect(result.topic_performances["top-B"]).toBeDefined();
    expect(result.topic_performances["top-B"]!.accuracy_rate).toBe(1.0);

    // Deve incluir o top-A como lacuna crítica e manter top-B fora
    expect(result.critical_gaps).toContain("top-A");
    expect(result.critical_gaps).not.toContain("top-B");
  });
});
