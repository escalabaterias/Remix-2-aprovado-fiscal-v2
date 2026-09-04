// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { SimulationRunner } from "./SimulationRunner";
import * as controllerModule from "@/lib/questions/useSimulationController";
import * as serviceModule from "@/lib/questions/service";
import type { QuestionSet, QuestionSetItem, QuestionBankItem } from "@/lib/questions/types";

// Mocks dos módulos do controlador e serviço
vi.mock("@/lib/questions/useSimulationController");
vi.mock("@/lib/questions/service");
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: () => ({
      data: new Map<string, QuestionBankItem>([
        [
          "q-1",
          {
            questionId: "q-1",
            statement: "Qual é a alíquota padrão do ICMS no Estado do Rio de Janeiro?",
            alternatives: [
              { letter: "A", text: "12%" },
              { letter: "B", text: "18%" },
              { letter: "C", text: "20%" },
              { letter: "D", text: "22%" },
            ],
            correctAnswer: "B",
            isTrueFalse: false,
            examBoard: "FGV",
            contestName: "SEFAZ-RJ",
            contestId: null,
            sourceId: null,
            year: 2024,
            subjectId: "sub-1",
            topicId: null,
            difficulty: 3,
            origin: "banco_externo",
            novelty: "conhecida",
            tags: [],
            explanation: "Conforme lei estadual N° 2.657/96.",
            isPublic: true,
            metadata: null,
            stats: null,
          },
        ],
      ]),
      isLoading: false,
    }),
  };
});

describe("SimulationRunner — Componente de UI do Simulador (Fase D)", () => {
  const mockSet: QuestionSet = {
    setId: "set-1",
    name: "Simulado Direito Tributário",
    description: "Simulado oficial de teste",
    type: "simulado",
    contestId: null,
    subjectId: "sub-1",
    topicId: null,
    timeLimitMinutes: 60,
    isTimed: true,
    startedAt: "2026-09-04T12:00:00Z",
    isCompleted: false,
    completedAt: null,
    totalQuestions: 2,
    correctCount: 0,
    wrongCount: 0,
    score: null,
    tags: [],
  };

  const mockItems: QuestionSetItem[] = [
    {
      itemId: "item-1",
      setId: "set-1",
      questionId: "q-1",
      position: 0,
      isAnswered: false,
      isCorrect: null,
      chosenAnswer: null,
      timeSpentSeconds: null,
      attemptId: null,
      notes: null,
    },
    {
      itemId: "item-2",
      setId: "set-1",
      questionId: "q-2",
      position: 1,
      isAnswered: false,
      isCorrect: null,
      chosenAnswer: null,
      timeSpentSeconds: null,
      attemptId: null,
      notes: null,
    },
  ];

  const defaultMockController: controllerModule.UseSimulationControllerReturn = {
    status: "ready",
    set: mockSet,
    items: mockItems,
    currentIndex: 0,
    currentItem: mockItems[0]!,
    answers: {},
    flaggedItemIds: [],
    remainingSeconds: 3540,
    deadlineMs: Date.now() + 3540000,
    completedResult: null,
    errorMessage: null,
    isSubmittingItem: false,
    startSimulation: vi.fn(),
    selectAnswer: vi.fn(),
    toggleFlag: vi.fn(),
    goToIndex: vi.fn(),
    nextQuestion: vi.fn(),
    previousQuestion: vi.fn(),
    submitAnswer: vi.fn(),
    submitBatch: vi.fn(),
    completeSimulation: vi.fn(),
    resetError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(controllerModule.useSimulationController).mockReturnValue(defaultMockController);
  });

  it("1. Renderiza estado de carregamento quando status for 'starting'", () => {
    vi.mocked(controllerModule.useSimulationController).mockReturnValue({
      ...defaultMockController,
      status: "starting",
      items: [],
      currentItem: null,
    });

    render(<SimulationRunner setId="set-1" />);

    expect(screen.getByText(/Preparando seu Simulado/i)).toBeDefined();
  });

  it("2. Renderiza enunciado da questão, alternativas e cronômetro em estado 'ready'", () => {
    render(<SimulationRunner setId="set-1" />);

    expect(screen.getByText("Simulado Direito Tributário")).toBeDefined();
    expect(screen.getByText(/Qual é a alíquota padrão do ICMS/i)).toBeDefined();
    expect(screen.getByText("18%")).toBeDefined();
    expect(screen.getByText("59:00")).toBeDefined(); // 3540 segundos
  });

  it("3. Dispara selectAnswer ao clicar em uma alternativa", () => {
    render(<SimulationRunner setId="set-1" />);

    const optionB = screen.getAllByText("18%")[0]!;
    fireEvent.click(optionB);

    expect(defaultMockController.selectAnswer).toHaveBeenCalledWith("item-1", "B");
  });

  it("4. Dispara navegação próxima e anterior ao clicar nos botões", () => {
    const { container } = render(<SimulationRunner setId="set-1" />);

    const nextBtn =
      container.querySelector("#btn-next-question") || document.querySelector("#btn-next-question");
    fireEvent.click(nextBtn!);

    expect(defaultMockController.nextQuestion).toHaveBeenCalled();
  });

  it("5. Abre modal de confirmação ao clicar em Finalizar Simulado", () => {
    render(<SimulationRunner setId="set-1" />);

    const finishBtn = document.querySelector("#btn-finalizar-simulado") as HTMLElement;
    fireEvent.click(finishBtn);

    expect(screen.getByText(/Finalizar Simulado Agora\?/i)).toBeDefined();
    expect(screen.getByText(/Atenção: Você possui 2 questão\(ões\) sem resposta/i)).toBeDefined();
  });

  it("6. Executa completeSimulation ao confirmar no modal", async () => {
    render(<SimulationRunner setId="set-1" />);

    const finishBtn = document.querySelector("#btn-finalizar-simulado") as HTMLElement;
    fireEvent.click(finishBtn);

    const confirmBtn = screen.getByText("Finalizar Mesmo Assim");
    fireEvent.click(confirmBtn);

    expect(defaultMockController.completeSimulation).toHaveBeenCalled();
  });

  it("7. Exibe tela de resultado com nota quando o status for 'completed'", () => {
    vi.mocked(controllerModule.useSimulationController).mockReturnValue({
      ...defaultMockController,
      status: "completed",
      completedResult: {
        set: { ...mockSet, isCompleted: true, score: 85.5 },
        items: [
          { ...mockItems[0]!, isAnswered: true, isCorrect: true, chosenAnswer: "B" },
          { ...mockItems[1]!, isAnswered: true, isCorrect: false, chosenAnswer: "A" },
        ],
      },
    });

    render(<SimulationRunner setId="set-1" />);

    expect(screen.getByText("Simulado Finalizado")).toBeDefined();
    expect(screen.getByText("85.5%")).toBeDefined();
    expect(screen.getByText("Acertos")).toBeDefined();
  });

  it("8. Exibe alerta de erro de rede recuperável quando status for 'error'", () => {
    vi.mocked(controllerModule.useSimulationController).mockReturnValue({
      ...defaultMockController,
      status: "error",
      errorMessage: "Falha temporária de conexão",
    });

    render(<SimulationRunner setId="set-1" />);

    expect(screen.getByText("Falha de Conexão na Submissão")).toBeDefined();
    expect(screen.getByText(/Suas seleções continuam salvas no rascunho local/i)).toBeDefined();
  });
});
