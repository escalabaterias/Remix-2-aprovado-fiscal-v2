// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import React from "react";

import { SimulationReport } from "./SimulationReport";
import type {
  SimulationPerformanceAnalysis,
  QuestionSetItem,
  QuestionBankItem,
} from "@/lib/questions/types";

// Mock do Query Client do TanStack React Query
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: () => ({
      data: null,
      isLoading: false,
      isError: false,
    }),
  };
});

describe("SimulationReport — Interface de Relatório do Simulado (Etapa 8.2.3)", () => {
  const mockAnalysis: SimulationPerformanceAnalysis = {
    setId: "set-100",
    overview: {
      totalQuestions: 10,
      answeredCount: 9,
      unansweredCount: 1,
      correctCount: 7,
      wrongCount: 2,
      accuracyPercentage: 77.8,
      responsePercentage: 90,
      totalTimeSpentSeconds: 1200,
      avgTimePerQuestionSeconds: 120,
      avgTimePerAnsweredQuestionSeconds: 133.3,
    },
    subjectPerformance: [
      {
        subjectId: "sub-1",
        subjectName: "Direito Tributário",
        totalQuestions: 6,
        answeredCount: 6,
        unansweredCount: 0,
        correctCount: 5,
        wrongCount: 1,
        accuracyPercentage: 83.3,
        responsePercentage: 100,
        totalTimeSpentSeconds: 700,
        avgTimePerQuestionSeconds: 116.7,
        shareOfTotalQuestionsPercentage: 60,
        signal: "STRONG_PERFORMANCE",
      },
      {
        subjectId: "sub-2",
        subjectName: "Legislação Tributária",
        totalQuestions: 4,
        answeredCount: 3,
        unansweredCount: 1,
        correctCount: 2,
        wrongCount: 1,
        accuracyPercentage: 66.7,
        responsePercentage: 75,
        totalTimeSpentSeconds: 500,
        avgTimePerQuestionSeconds: 125,
        shareOfTotalQuestionsPercentage: 40,
        signal: "ATTENTION",
      },
    ],
    topicPerformance: [
      {
        topicId: "top-1",
        topicName: "Impostos Estaduais (ICMS/IPVA)",
        subjectId: "sub-1",
        subjectName: "Direito Tributário",
        totalQuestions: 4,
        answeredCount: 4,
        unansweredCount: 0,
        correctCount: 4,
        wrongCount: 0,
        accuracyPercentage: 100,
        avgTimePerQuestionSeconds: 110,
        errorConcentrationPercentage: 0,
        signal: "STRONG",
      },
      {
        topicId: "top-2",
        topicName: "Processo Administrativo Fiscal",
        subjectId: "sub-2",
        subjectName: "Legislação Tributária",
        totalQuestions: 3,
        answeredCount: 2,
        unansweredCount: 1,
        correctCount: 1,
        wrongCount: 1,
        accuracyPercentage: 50,
        avgTimePerQuestionSeconds: 140,
        errorConcentrationPercentage: 50,
        signal: "VULNERABLE",
      },
    ],
    pacing: {
      totalTimeSpentSeconds: 1200,
      avgTimePerQuestionSeconds: 120,
      medianTimePerQuestionSeconds: 115,
      minTimeSpentSeconds: 45,
      maxTimeSpentSeconds: 210,
      avgTimeInCorrectQuestionsSeconds: 105,
      avgTimeInWrongQuestionsSeconds: 180,
      terciles: {
        firstTercile: {
          questionCount: 3,
          answeredCount: 3,
          correctCount: 3,
          wrongCount: 0,
          accuracyPercentage: 100,
          avgTimeSeconds: 100,
        },
        middleTercile: {
          questionCount: 3,
          answeredCount: 3,
          correctCount: 2,
          wrongCount: 1,
          accuracyPercentage: 66.7,
          avgTimeSeconds: 120,
        },
        finalTercile: {
          questionCount: 4,
          answeredCount: 3,
          correctCount: 2,
          wrongCount: 1,
          accuracyPercentage: 66.7,
          avgTimeSeconds: 135,
        },
      },
      rhythmTrendSignal: "STABLE",
    },
    signals: [
      {
        type: "HIGH_ACCURACY",
        entityType: "simulation",
        intensity: "low",
        reason: "Aproveitamento global excelente de respostas corretas.",
        sourceMetric: "overview.accuracyPercentage",
        value: 77.8,
      },
      {
        type: "TOPIC_VULNERABILITY",
        entityType: "topic",
        entityId: "top-2",
        entityName: "Processo Administrativo Fiscal",
        intensity: "high",
        reason: "Vulnerabilidade acentuada no tópico Processo Administrativo Fiscal.",
        sourceMetric: "topic.accuracyPercentage",
        value: 50,
      },
    ],
    cognitiveImpactSummary: {
      keyFindings: [
        "Aproveitamento geral de 77.8% (7 acerto(s) de 9 respondida(s)).",
        "A matéria com maior quantidade de erros foi Legislação Tributária.",
      ],
      vulnerableTopicsCount: 1,
      criticalErrorsCount: 2,
      highestErrorSubjectName: "Legislação Tributária",
      pacingNote: "Ritmo e gestão de tempo estáveis ao longo de toda a prova.",
    },
    historicalComparison: {
      previousSimulationsCount: 3,
      historicalAvgAccuracyPercentage: 70,
      accuracyDeltaPercentage: 7.8,
      trend: "IMPROVING",
    },
    analyzedAt: "2026-09-04T12:00:00Z",
  };

  const mockItems: QuestionSetItem[] = [
    {
      itemId: "item-1",
      setId: "set-100",
      questionId: "q-1",
      position: 0,
      isAnswered: true,
      isCorrect: true,
      chosenAnswer: "A",
      timeSpentSeconds: 90,
      attemptId: null,
      notes: null,
    },
    {
      itemId: "item-2",
      setId: "set-100",
      questionId: "q-2",
      position: 1,
      isAnswered: true,
      isCorrect: false,
      chosenAnswer: "C",
      timeSpentSeconds: 180,
      attemptId: null,
      notes: null,
    },
    {
      itemId: "item-3",
      setId: "set-100",
      questionId: "q-3",
      position: 2,
      isAnswered: false,
      isCorrect: null,
      chosenAnswer: null,
      timeSpentSeconds: 10,
      attemptId: null,
      notes: null,
    },
  ];

  const mockQuestionsMap = new Map<string, QuestionBankItem>([
    [
      "q-1",
      {
        questionId: "q-1",
        statement: "O fato gerador do IPVA ocorre em 1º de janeiro de cada ano.",
        alternatives: [
          { letter: "A", text: "Verdadeiro" },
          { letter: "B", text: "Falso" },
        ],
        correctAnswer: "A",
        isTrueFalse: true,
        examBoard: "FGV",
        contestName: "SEFAZ-SP",
        contestId: null,
        sourceId: null,
        year: 2024,
        subjectId: "sub-1",
        topicId: "top-1",
        difficulty: 2,
        origin: "banco_externo",
        novelty: "conhecida",
        tags: [],
        explanation: "Regra geral dos impostos sobre propriedade de veículos.",
        isPublic: true,
        metadata: null,
        stats: null,
      },
    ],
    [
      "q-2",
      {
        questionId: "q-2",
        statement: "Qual o prazo do recurso no Processo Administrativo Fiscal?",
        alternatives: [
          { letter: "A", text: "15 dias" },
          { letter: "C", text: "30 dias" },
        ],
        correctAnswer: "A",
        isTrueFalse: false,
        examBoard: "FCC",
        contestName: "SEFAZ-RJ",
        contestId: null,
        sourceId: null,
        year: 2024,
        subjectId: "sub-2",
        topicId: "top-2",
        difficulty: 4,
        origin: "banco_externo",
        novelty: "conhecida",
        tags: [],
        explanation: "O prazo regimental é de 15 dias corridos.",
        isPublic: true,
        metadata: null,
        stats: null,
      },
    ],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Renderiza o estado de carregamento corretamente", () => {
    render(<SimulationReport isLoading={true} />);
    expect(screen.getByText(/Processando Análise do Simulado/i)).toBeDefined();
  });

  it("2. Renderiza o estado de erro corretamente", () => {
    render(<SimulationReport isError={true} errorMessage="Erro ao carregar simulado de teste" />);
    expect(screen.getByText(/Falha no Carregamento do Relatório/i)).toBeDefined();
    expect(screen.getByText("Erro ao carregar simulado de teste")).toBeDefined();
  });

  it("3. Renderiza o estado de simulado sem questões (vazio)", () => {
    const emptyAnalysis = {
      ...mockAnalysis,
      overview: { ...mockAnalysis.overview, totalQuestions: 0 },
    };
    render(<SimulationReport analysis={emptyAnalysis} />);
    expect(screen.getByText(/Simulado Sem Registros/i)).toBeDefined();
  });

  it("4. Renderiza os 7 blocos da interface quando recebe uma análise válida", () => {
    const { container } = render(
      <SimulationReport
        analysis={mockAnalysis}
        items={mockItems}
        questionsMap={mockQuestionsMap}
      />,
    );

    // Bloco 1 — Hero / Resumo Global
    expect(container.querySelector("#simulation-report-hero")).not.toBeNull();
    expect(screen.getByText("77.8%")).toBeDefined();
    expect(screen.getByText("Acertos")).toBeDefined();

    // Bloco 2 — Desempenho por Matéria
    expect(container.querySelector("#simulation-report-subjects")).not.toBeNull();
    expect(screen.getAllByText("Direito Tributário").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Legislação Tributária").length).toBeGreaterThan(0);

    // Bloco 3 — Desempenho por Tópico
    expect(container.querySelector("#simulation-report-topics")).not.toBeNull();
    expect(screen.getByText("Impostos Estaduais (ICMS/IPVA)")).toBeDefined();
    expect(screen.getAllByText("Processo Administrativo Fiscal").length).toBeGreaterThan(0);

    // Bloco 4 — Ritmo e Gestão de Tempo
    expect(container.querySelector("#simulation-report-pacing")).not.toBeNull();
    expect(screen.getByText("Ritmo Estável")).toBeDefined();

    // Bloco 5 — Sinais Analíticos e Alertas
    expect(container.querySelector("#simulation-report-signals")).not.toBeNull();
    expect(
      screen.getByText("Aproveitamento global excelente de respostas corretas."),
    ).toBeDefined();

    // Bloco 6 — Impacto Cognitivo
    expect(container.querySelector("#simulation-report-cognitive")).not.toBeNull();
    expect(
      screen.getByText(/Aproveitamento geral de 77.8% \(7 acerto\(s\) de 9 respondida\(s\)\)\./i),
    ).toBeDefined();

    // Bloco 7 — Gabarito e Detalhamento das Questões
    expect(container.querySelector("#simulation-report-questions")).not.toBeNull();
    expect(
      screen.getByText("O fato gerador do IPVA ocorre em 1º de janeiro de cada ano."),
    ).toBeDefined();
  });

  it("5. Filtra questões do gabarito ao clicar nos botões de filtro", () => {
    const { container } = render(
      <SimulationReport
        analysis={mockAnalysis}
        items={mockItems}
        questionsMap={mockQuestionsMap}
      />,
    );

    const questionsSection = container.querySelector("#simulation-report-questions")!;
    expect(questionsSection).not.toBeNull();

    // Clica no filtro "Acertos"
    const correctFilterBtn = within(questionsSection).getByRole("button", {
      name: /Acertos \(7\)/i,
    });
    fireEvent.click(correctFilterBtn);

    // Deve exibir a questão #1 (Acertou) e não a #2 (Errou) nem #3 (Em branco)
    expect(
      within(questionsSection).getByText(
        "O fato gerador do IPVA ocorre em 1º de janeiro de cada ano.",
      ),
    ).toBeDefined();
    expect(
      within(questionsSection).queryByText(
        "Qual o prazo do recurso no Processo Administrativo Fiscal?",
      ),
    ).toBeNull();

    // Clica no filtro "Erros"
    const wrongFilterBtn = within(questionsSection).getByRole("button", {
      name: /Erros \(2\)/i,
    });
    fireEvent.click(wrongFilterBtn);

    expect(
      within(questionsSection).getByText(
        "Qual o prazo do recurso no Processo Administrativo Fiscal?",
      ),
    ).toBeDefined();
    expect(
      within(questionsSection).queryByText(
        "O fato gerador do IPVA ocorre em 1º de janeiro de cada ano.",
      ),
    ).toBeNull();
  });

  it("6. Chama a propriedade onClose quando o botão voltar é acionado", () => {
    const handleClose = vi.fn();
    render(<SimulationReport analysis={mockAnalysis} onClose={handleClose} />);

    const backBtn = screen.getByText("Voltar aos Simulados");
    fireEvent.click(backBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
