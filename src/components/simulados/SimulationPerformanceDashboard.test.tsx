// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SimulationPerformanceDashboard } from "./SimulationPerformanceDashboard";
import * as serviceModule from "@/lib/questions/service";
import { analyzeSimulationComparison } from "@/lib/questions/simulation-historical-analytics";

// Mock do service de histórico
vi.mock("@/lib/questions/service", async (importOriginal) => {
  const actual = await importOriginal<typeof serviceModule>();
  return {
    ...actual,
    getUserSimulationHistory: vi.fn(),
  };
});

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
    },
  });
}

describe("SimulationPerformanceDashboard (Etapa 8.2.7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Exibe estado vazio elegante quando não há simulados concluídos", async () => {
    vi.mocked(serviceModule.getUserSimulationHistory).mockResolvedValue([]);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <SimulationPerformanceDashboard />
      </QueryClientProvider>,
    );

    const emptyMsg = await screen.findByText(/Nenhum simulado concluído encontrado/i);
    expect(emptyMsg).toBeDefined();
  });

  it("2. Renderiza KPIs consolidados e seções quando há histórico de simulados", async () => {
    const mockData = [
      {
        set: {
          setId: "sim-1",
          userId: "user-1",
          name: "Simulado 1",
          type: "simulado" as const,
          timeLimitMinutes: 60,
          isCompleted: true,
          completedAt: "2026-09-01T10:00:00Z",
          createdAt: "2026-09-01T09:00:00Z",
          startedAt: "2026-09-01T09:00:00Z",
          isTimed: true,
          score: 60,
          totalQuestions: 2,
          correctCount: 1,
          wrongCount: 1,
          unansweredCount: 0,
          subjectId: null,
          contestId: null,
          topicId: null,
          tags: [],
          description: null,
        },
        items: [
          {
            itemId: "item-1",
            setId: "sim-1",
            questionId: "q-1",
            position: 1,
            chosenAnswer: "A",
            isCorrect: true,
            isAnswered: true,
            timeSpentSeconds: 60,
            subjectId: "sub-1",
            subjectName: "Direito Constitucional",
            topicId: "top-1",
            topicName: "Direitos Fundamentais",
            examBoard: "FGV",
            attemptId: null,
            notes: null,
          },
          {
            itemId: "item-2",
            setId: "sim-1",
            questionId: "q-2",
            position: 2,
            chosenAnswer: "B",
            isCorrect: false,
            isAnswered: true,
            timeSpentSeconds: 60,
            subjectId: "sub-1",
            subjectName: "Direito Constitucional",
            topicId: "top-1",
            topicName: "Direitos Fundamentais",
            examBoard: "FGV",
            attemptId: null,
            notes: null,
          },
        ],
      },
      {
        set: {
          setId: "sim-2",
          userId: "user-1",
          name: "Simulado 2",
          type: "simulado" as const,
          timeLimitMinutes: 60,
          isCompleted: true,
          completedAt: "2026-09-02T10:00:00Z",
          createdAt: "2026-09-02T09:00:00Z",
          startedAt: "2026-09-02T09:00:00Z",
          isTimed: true,
          score: 100,
          totalQuestions: 1,
          correctCount: 1,
          wrongCount: 0,
          unansweredCount: 0,
          subjectId: null,
          contestId: null,
          topicId: null,
          tags: [],
          description: null,
        },
        items: [
          {
            itemId: "item-3",
            setId: "sim-2",
            questionId: "q-3",
            position: 1,
            chosenAnswer: "A",
            isCorrect: true,
            isAnswered: true,
            timeSpentSeconds: 50,
            subjectId: "sub-1",
            subjectName: "Direito Constitucional",
            topicId: "top-1",
            topicName: "Direitos Fundamentais",
            examBoard: "FGV",
            attemptId: null,
            notes: null,
          },
        ],
      },
    ];

    vi.mocked(serviceModule.getUserSimulationHistory).mockResolvedValue(mockData);

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["user-simulation-history"], mockData);

    render(
      <QueryClientProvider client={queryClient}>
        <SimulationPerformanceDashboard />
      </QueryClientProvider>,
    );

    // KPI Cards e Títulos Principais
    await waitFor(() => {
      expect(screen.getByText(/Média de Desempenho/i)).toBeDefined();
    });

    expect(screen.getByText(/Melhor Marca/i)).toBeDefined();
    expect(screen.getByText(/Trajetória Longitudinal de Desempenho/i)).toBeDefined();
    expect(screen.getByText(/Benchmarking Intrausuário/i)).toBeDefined();
  });
});
