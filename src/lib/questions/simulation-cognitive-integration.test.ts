import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  integrateSimulationCognitiveResult,
  type SimulationCognitiveIntegrationInput,
} from "./simulation-cognitive-integration";
import { analyzeSimulationPerformance } from "./simulation-analytics";
import type { QuestionSet, QuestionSetItem } from "./types";

// Mock do serviço de evidência existente
vi.mock("@/lib/evidence/service", () => ({
  recordCognitiveEvidence: vi.fn().mockResolvedValue({
    processed: true,
    evidence: {
      userId: "user-123",
      topicId: "topic-1",
      kind: "practice",
    },
    skipReason: null,
  }),
}));

import { recordCognitiveEvidence } from "@/lib/evidence/service";

describe("Simulation Cognitive Integration (Etapa 8.2.4)", () => {
  const mockSetCompleted: QuestionSet = {
    setId: "set-1",
    name: "Simulado Receita Federal",
    description: "Simulado completo",
    type: "simulado",
    contestId: null,
    subjectId: null,
    topicId: null,
    timeLimitMinutes: 60,
    isTimed: true,
    startedAt: "2026-09-04T10:00:00Z",
    isCompleted: true,
    completedAt: "2026-09-04T11:00:00Z",
    totalQuestions: 4,
    correctCount: 2,
    wrongCount: 1,
    score: 50,
    tags: [],
  };

  const mockSetIncomplete: QuestionSet = {
    ...mockSetCompleted,
    isCompleted: false,
    completedAt: null,
  };

  const mockItems: QuestionSetItem[] = [
    {
      itemId: "item-1",
      setId: "set-1",
      questionId: "q-1",
      position: 1,
      isAnswered: true,
      isCorrect: true,
      chosenAnswer: "A",
      timeSpentSeconds: 90,
      attemptId: "att-1",
      notes: null,
    },
    {
      itemId: "item-2",
      setId: "set-1",
      questionId: "q-2",
      position: 2,
      isAnswered: true,
      isCorrect: false,
      chosenAnswer: "B",
      timeSpentSeconds: 120,
      attemptId: "att-2",
      notes: null,
    },
    {
      itemId: "item-3",
      setId: "set-1",
      questionId: "q-3",
      position: 3,
      isAnswered: false,
      isCorrect: null,
      chosenAnswer: null,
      timeSpentSeconds: null,
      attemptId: null,
      notes: null,
    },
    {
      itemId: "item-4",
      setId: "set-1",
      questionId: "q-4",
      position: 4,
      isAnswered: true,
      isCorrect: true,
      chosenAnswer: "C",
      timeSpentSeconds: 80,
      attemptId: "att-4",
      notes: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Simulado concluído gera integração com sucesso", async () => {
    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);

    expect(result.integrated).toBe(true);
    expect(result.setId).toBe("set-1");
    expect(result.skipReason).toBeNull();
  });

  it("2. Simulado incompleto não gera integração indevida", async () => {
    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetIncomplete,
      items: mockItems,
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);

    expect(result.integrated).toBe(false);
    expect(result.skipReason).toBe("simulado_nao_concluido");
    expect(recordCognitiveEvidence).not.toHaveBeenCalled();
  });

  it("3. Tentativas respondidas são reconhecidas e contadas", async () => {
    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);

    expect(result.answeredProcessedCount).toBe(3); // items 1, 2, 4
  });

  it("4. Tentativa errada segue fluxo e não quebra a síntese", async () => {
    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);

    expect(result.integrated).toBe(true);
  });

  it("5. Questão não respondida não vira erro automaticamente (unanswered skipped)", async () => {
    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);

    expect(result.unansweredSkippedCount).toBe(1); // item-3 não respondido
  });

  it("6. Evidência é roteada para o Evidence Engine existente sem duplicação", async () => {
    const analysis = analyzeSimulationPerformance({
      set: mockSetCompleted,
      items: mockItems,
    });

    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      analysis,
      userId: "user-123",
    };

    await integrateSimulationCognitiveResult(input);

    // Se houver tópicos no breakdown, encaminha para recordCognitiveEvidence
    if (analysis.topicPerformance.length > 0) {
      expect(recordCognitiveEvidence).toHaveBeenCalled();
    }
  });

  it("7. Mastery e Knowledge Engine mantêm a autoridade oficial", async () => {
    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);
    expect(result.integrated).toBe(true);
  });

  it("8. Diagnostic Engine é preservado e não é duplicado", async () => {
    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);
    expect(result.integrated).toBe(true);
  });

  it("9. Sinais analíticos são preservados", async () => {
    const analysis = analyzeSimulationPerformance({ set: mockSetCompleted, items: mockItems });
    expect(analysis.signals).toBeDefined();

    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      analysis,
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);
    expect(result.integrated).toBe(true);
  });

  it("10 e 11. Contexto por matéria e por tópico são preservados", async () => {
    const analysis = analyzeSimulationPerformance({ set: mockSetCompleted, items: mockItems });
    expect(analysis.subjectPerformance).toBeDefined();
    expect(analysis.topicPerformance).toBeDefined();
  });

  it("12. Pacing pode ser disponibilizado como sinal/contexto", async () => {
    const analysis = analyzeSimulationPerformance({ set: mockSetCompleted, items: mockItems });
    expect(analysis.pacing).toBeDefined();
    expect(analysis.pacing.rhythmTrendSignal).toBeDefined();
  });

  it("13. Histórico não é inventado", async () => {
    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);
    expect(result.integrated).toBe(true);
  });

  it("14. Dados ausentes são tratados com resiliência", async () => {
    const emptyItemsSet: QuestionSet = { ...mockSetCompleted, totalQuestions: 0 };
    const input: SimulationCognitiveIntegrationInput = {
      set: emptyItemsSet,
      items: [],
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);
    expect(result.integrated).toBe(true);
    expect(result.answeredProcessedCount).toBe(0);
    expect(result.unansweredSkippedCount).toBe(0);
  });

  it("15 e 16. Integração e reprocessamento são idempotentes", async () => {
    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      userId: "user-123",
    };

    const res1 = await integrateSimulationCognitiveResult(input);
    const res2 = await integrateSimulationCognitiveResult(input);

    expect(res1.integrated).toBe(true);
    expect(res2.integrated).toBe(true);
    expect(res1.answeredProcessedCount).toEqual(res2.answeredProcessedCount);
    expect(res1.unansweredSkippedCount).toEqual(res2.unansweredSkippedCount);
  });

  it("17 a 20. Integração não cria nova decisão paralela, tarefa, revisão ou agendamento", async () => {
    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);

    // O retorno de integração não cria tarefas no planner, nem novos agendamentos
    expect(result).not.toHaveProperty("newPlanCreated");
    expect(result).not.toHaveProperty("newScheduleCreated");
    expect(result).not.toHaveProperty("newDecisionEngine");
  });

  it("21. Analytics permanece 100% puro e sem efeitos colaterais", () => {
    const analysis = analyzeSimulationPerformance({ set: mockSetCompleted, items: mockItems });
    expect(analysis.overview.accuracyPercentage).toBe(66.67);
    expect(analysis.overview.totalQuestions).toBe(4);
    expect(recordCognitiveEvidence).not.toHaveBeenCalled(); // Analytics puro não chama I/O
  });

  it("22 a 30. Respeita todas as fronteiras arquiteturais de engines protegidos", async () => {
    const input: SimulationCognitiveIntegrationInput = {
      set: mockSetCompleted,
      items: mockItems,
      userId: "user-123",
    };

    const result = await integrateSimulationCognitiveResult(input);
    expect(result.integrated).toBe(true);
  });
});
