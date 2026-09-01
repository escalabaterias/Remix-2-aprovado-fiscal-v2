import { describe, expect, it } from "vitest";
import { ExamGeneratorEngine } from "./engine";
import { DistributionConfig, QuestionCandidate } from "./types";

// IDs estáticos de mock para garantir determinismo
const SUBJECT_FISCAL = "11111111-1111-1111-1111-111111111111";
const SUBJECT_CONSTITUCIONAL = "22222222-2222-2222-2222-222222222222";

const TOPIC_TRIBUTARIO = "a1111111-1111-1111-1111-111111111111";
const TOPIC_SIMPLES = "a2222222-2222-2222-2222-222222222222";
const TOPIC_PODERES = "b1111111-1111-1111-1111-111111111111";

// Mock de banco de questões candidatas
const mockCandidates: QuestionCandidate[] = [
  // Direito Tributário (Fiscal) - FCC
  {
    id: "q1",
    subject_id: SUBJECT_FISCAL,
    topic_id: TOPIC_TRIBUTARIO,
    banca: "FCC",
    difficulty: "easy",
  },
  {
    id: "q2",
    subject_id: SUBJECT_FISCAL,
    topic_id: TOPIC_TRIBUTARIO,
    banca: "FCC",
    difficulty: "medium",
  },
  {
    id: "q3",
    subject_id: SUBJECT_FISCAL,
    topic_id: TOPIC_TRIBUTARIO,
    banca: "FCC",
    difficulty: "hard",
  },
  // Simples Nacional (Fiscal) - FGV
  {
    id: "q4",
    subject_id: SUBJECT_FISCAL,
    topic_id: TOPIC_SIMPLES,
    banca: "FGV",
    difficulty: "easy",
  },
  {
    id: "q5",
    subject_id: SUBJECT_FISCAL,
    topic_id: TOPIC_SIMPLES,
    banca: "FGV",
    difficulty: "medium",
  },
  {
    id: "q6",
    subject_id: SUBJECT_FISCAL,
    topic_id: TOPIC_SIMPLES,
    banca: "FGV",
    difficulty: "hard",
  },
  // Direito Constitucional - Cebraspe
  {
    id: "q7",
    subject_id: SUBJECT_CONSTITUCIONAL,
    topic_id: TOPIC_PODERES,
    banca: "Cebraspe",
    difficulty: "easy",
  },
  {
    id: "q8",
    subject_id: SUBJECT_CONSTITUCIONAL,
    topic_id: TOPIC_PODERES,
    banca: "Cebraspe",
    difficulty: "medium",
  },
  {
    id: "q9",
    subject_id: SUBJECT_CONSTITUCIONAL,
    topic_id: TOPIC_PODERES,
    banca: "Cebraspe",
    difficulty: "hard",
  },
  {
    id: "q10",
    subject_id: SUBJECT_CONSTITUCIONAL,
    topic_id: TOPIC_PODERES,
    banca: "Cebraspe",
    difficulty: "hard",
  },
];

describe("ExamGeneratorEngine — Suíte de Testes do Motor de Seleção (Etapa 8.2)", () => {
  it("deve selecionar e distribuir questões respeitando contagem e pesos das matérias", () => {
    const distribution: DistributionConfig = {
      subjects: [
        { subject_id: SUBJECT_FISCAL, count: 2, weight: 1.5 },
        { subject_id: SUBJECT_CONSTITUCIONAL, count: 1, weight: 1.0 },
      ],
      allow_already_answered: true,
    };

    const result = ExamGeneratorEngine.selectQuestions({
      candidates: mockCandidates,
      distribution,
      options: { shuffle_questions: false }, // Desliga para facilitar testes determinísticos
    });

    // Validações
    expect(result.selected_questions.length).toBe(3);

    const fiscalQuestions = result.selected_questions.filter(
      (q) => q.question.subject_id === SUBJECT_FISCAL,
    );
    expect(fiscalQuestions.length).toBe(2);
    expect(fiscalQuestions[0].weight).toBe(1.5);

    const constQuestions = result.selected_questions.filter(
      (q) => q.question.subject_id === SUBJECT_CONSTITUCIONAL,
    );
    expect(constQuestions.length).toBe(1);
    expect(constQuestions[0].weight).toBe(1.0);

    // Score máximo: (2 * 1.5) + (1 * 1.0) = 4.0
    expect(result.session_payload.max_possible_score).toBe(4.0);
    expect(result.warnings.length).toBe(0);
  });

  it("deve aplicar filtros de banca rigorosamente", () => {
    const distribution: DistributionConfig = {
      subjects: [{ subject_id: SUBJECT_FISCAL, count: 2, weight: 1.0 }],
      bancas: ["FGV"],
      allow_already_answered: true,
    };

    const result = ExamGeneratorEngine.selectQuestions({
      candidates: mockCandidates,
      distribution,
      options: { shuffle_questions: false },
    });

    // Deve vir apenas questões da FGV (q4, q5, q6)
    expect(result.selected_questions.length).toBe(2);
    result.selected_questions.forEach((sq) => {
      expect(sq.question.banca).toBe("FGV");
    });
    expect(result.warnings.length).toBe(0);
  });

  it("deve emitir warning e relaxar filtro se uma matéria possuir estoque zero para determinada banca", () => {
    const distribution: DistributionConfig = {
      subjects: [{ subject_id: SUBJECT_CONSTITUCIONAL, count: 2, weight: 1.0 }],
      bancas: ["FGV"], // Não existe questão de Constitucional da FGV no mock
      allow_already_answered: true,
    };

    const result = ExamGeneratorEngine.selectQuestions({
      candidates: mockCandidates,
      distribution,
      options: { shuffle_questions: false },
    });

    // Deve relaxar o filtro e selecionar de Constitucional geral (Cebraspe)
    expect(result.selected_questions.length).toBe(2);
    const hasRelaxBancaWarning = result.warnings.some((w) => w.code === "banca_filter_relaxed");
    expect(hasRelaxBancaWarning).toBe(true);
  });

  it("deve priorizar questões inéditas quando allow_already_answered for falso", () => {
    const distribution: DistributionConfig = {
      subjects: [{ subject_id: SUBJECT_CONSTITUCIONAL, count: 2, weight: 1.0 }],
      allow_already_answered: false,
    };

    // Usuário já respondeu q7 e q8
    const userAnsweredQuestionIds = new Set<string>(["q7", "q8"]);

    const result = ExamGeneratorEngine.selectQuestions({
      candidates: mockCandidates,
      distribution,
      options: { shuffle_questions: false },
      userAnsweredQuestionIds,
    });

    // Deve selecionar q9 e q10 (as inéditas restantes)
    expect(result.selected_questions.length).toBe(2);
    const selectedIds = result.selected_questions.map((q) => q.question.id);
    expect(selectedIds).toContain("q9");
    expect(selectedIds).toContain("q10");
    expect(selectedIds).not.toContain("q7");
    expect(selectedIds).not.toContain("q8");
    expect(result.warnings.length).toBe(0);
  });

  it("deve emitir warning de estoque insuficiente e usar resolvidas se faltarem inéditas", () => {
    const distribution: DistributionConfig = {
      subjects: [{ subject_id: SUBJECT_CONSTITUCIONAL, count: 3, weight: 1.0 }],
      allow_already_answered: false,
    };

    // Usuário já respondeu todas de Constitucional do mock
    const userAnsweredQuestionIds = new Set<string>(["q7", "q8", "q9", "q10"]);

    const result = ExamGeneratorEngine.selectQuestions({
      candidates: mockCandidates,
      distribution,
      options: { shuffle_questions: false },
      userAnsweredQuestionIds,
    });

    // Selecionou 3 questões mesmo sem inéditas devido ao fallback
    expect(result.selected_questions.length).toBe(3);
    const hasInsufficientWarning = result.warnings.some((w) => w.code === "insufficient_questions");
    expect(hasInsufficientWarning).toBe(true);
  });

  it("deve distribuir questões proporcionalmente por dificuldade", () => {
    const distribution: DistributionConfig = {
      subjects: [{ subject_id: SUBJECT_CONSTITUCIONAL, count: 4, weight: 1.0 }],
      difficulty_distribution: {
        easy: 25, // 25% fáceis = 1 questão
        medium: 25, // 25% médias = 1 questão
        hard: 50, // 50% difíceis = 2 questões
      },
      allow_already_answered: true,
    };

    const result = ExamGeneratorEngine.selectQuestions({
      candidates: mockCandidates,
      distribution,
      options: { shuffle_questions: false },
    });

    expect(result.selected_questions.length).toBe(4);

    const easyCount = result.selected_questions.filter(
      (q) => q.question.difficulty === "easy",
    ).length;
    const mediumCount = result.selected_questions.filter(
      (q) => q.question.difficulty === "medium",
    ).length;
    const hardCount = result.selected_questions.filter(
      (q) => q.question.difficulty === "hard",
    ).length;

    expect(easyCount).toBe(1);
    expect(mediumCount).toBe(1);
    expect(hardCount).toBe(2);
  });

  it("deve ordenar as questões sequencialmente (1..N) e aplicar posição correta", () => {
    const distribution: DistributionConfig = {
      subjects: [{ subject_id: SUBJECT_FISCAL, count: 3, weight: 1.0 }],
      allow_already_answered: true,
    };

    const result = ExamGeneratorEngine.selectQuestions({
      candidates: mockCandidates,
      distribution,
      options: { shuffle_questions: false },
    });

    expect(result.selected_questions.length).toBe(3);
    expect(result.selected_questions[0].position).toBe(1);
    expect(result.selected_questions[1].position).toBe(2);
    expect(result.selected_questions[2].position).toBe(3);
  });
});
