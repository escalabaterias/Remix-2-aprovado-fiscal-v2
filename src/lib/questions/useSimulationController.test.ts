// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSimulationController } from "./useSimulationController";
import * as service from "./service";
import * as attemptService from "./attempt-service";
import type { QuestionSet, QuestionSetItem } from "./types";
import type { Difficulty } from "../knowledge/engine";

vi.mock("./service", () => ({
  startQuestionSet: vi.fn(),
  getQuestionSet: vi.fn(),
  completeQuestionSet: vi.fn(),
}));

vi.mock("./attempt-service", () => ({
  submitSimulationAnswer: vi.fn(),
  submitSimulationBatch: vi.fn(),
}));

describe("useSimulationController — Unit Tests", () => {
  const mockSetId = "set-123";
  const baseTimeStr = "2026-09-04T10:00:00.000Z";
  const baseTimeMs = new Date(baseTimeStr).getTime();

  let mockSet: QuestionSet;
  let mockItems: QuestionSetItem[];

  beforeEach(() => {
    vi.resetAllMocks();

    mockSet = {
      setId: mockSetId,
      name: "Simulado Direito Constitucional",
      description: "Simulado de teste",
      type: "simulado",
      contestId: null,
      subjectId: "sub-1",
      topicId: null,
      timeLimitMinutes: 60,
      isTimed: true,
      startedAt: baseTimeStr,
      isCompleted: false,
      completedAt: null,
      totalQuestions: 2,
      correctCount: 0,
      wrongCount: 0,
      score: null,
      tags: ["constitucional"],
    };

    mockItems = [
      {
        itemId: "item-1",
        setId: mockSetId,
        questionId: "q-1",
        position: 1,
        isAnswered: false,
        isCorrect: null,
        chosenAnswer: null,
        timeSpentSeconds: null,
        attemptId: null,
        notes: null,
      },
      {
        itemId: "item-2",
        setId: mockSetId,
        questionId: "q-2",
        position: 2,
        isAnswered: false,
        isCorrect: null,
        chosenAnswer: null,
        timeSpentSeconds: null,
        attemptId: null,
        notes: null,
      },
    ];

    vi.mocked(service.startQuestionSet).mockResolvedValue(mockSet);
    vi.mocked(service.getQuestionSet).mockImplementation(async () => ({
      set: mockSet,
      items: mockItems,
    }));
    vi.mocked(service.completeQuestionSet).mockImplementation(async () => ({
      set: { ...mockSet, isCompleted: true, score: 100 },
      items: mockItems,
    }));
    vi.mocked(attemptService.submitSimulationAnswer).mockResolvedValue({
      attemptId: "att-1",
      setItemId: "item-1",
      isCorrect: true,
      correctAnswer: "A",
      isIdempotentRetry: false,
      feedback: {
        questionId: "q-1",
        isCorrect: true,
        knowledgeDifficulty: "media",
        shouldCreateError: false,
        suggestedErrorCategory: null,
        isFirstAttempt: true,
        currentStreak: 1,
        masteryImpactEstimate: 0.1,
        topicId: "top-1",
        subjectId: "subj-1",
        timestamp: baseTimeStr,
      },
      updatedStats: {
        totalAttempts: 1,
        correctCount: 1,
        wrongCount: 0,
        streakCorrect: 1,
        streakWrong: 0,
        bestTimeSeconds: 30,
        avgTimeSeconds: 30,
        lastAttemptedAt: baseTimeStr,
        lastCorrectAt: baseTimeStr,
        lastWrongAt: null,
        accuracy: 1.0,
      },
    });
    vi.mocked(attemptService.submitSimulationBatch).mockResolvedValue({
      results: [],
    });
  });

  // Teste 1 — Inicialização
  it("Teste 1: deve chamar startQuestionSet e carregar os itens ao inicializar", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(
      () => {
        if (result.current.status === "error") {
          console.error("Hook error:", result.current.errorMessage);
        }
        expect(result.current.status).toBe("ready");
      },
      { timeout: 2000 },
    );

    expect(service.startQuestionSet).toHaveBeenCalledWith(mockSetId);
    expect(service.getQuestionSet).toHaveBeenCalledWith(mockSetId);
    expect(result.current.set).toEqual(mockSet);
    expect(result.current.items).toHaveLength(2);
  });

  // Teste 2 — Estado Inicial
  it("Teste 2: armazena timestamp autoritativo e configura os dados da sessão", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.set?.startedAt).toBe(baseTimeStr);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentItem?.itemId).toBe("item-1");
  });

  // Teste 3 — Deadline
  it("Teste 3: calcula o deadline autoritativo com base em startedAt + timeLimitMinutes", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    const expectedDeadline = baseTimeMs + 60 * 60 * 1000;
    expect(result.current.deadlineMs).toBe(expectedDeadline);
  });

  // Teste 4 — Navegação
  it("Teste 4: permite navegação entre questões (próxima, anterior, direta)", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.currentIndex).toBe(0);

    act(() => {
      result.current.nextQuestion();
    });
    expect(result.current.currentIndex).toBe(1);

    act(() => {
      result.current.previousQuestion();
    });
    expect(result.current.currentIndex).toBe(0);

    act(() => {
      result.current.goToIndex(1);
    });
    expect(result.current.currentIndex).toBe(1);
  });

  // Teste 5 — Resposta Local
  it("Teste 5: atualiza resposta local (rascunho) imediatamente", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => {
      result.current.selectAnswer("item-1", "B");
    });

    expect(result.current.answers["item-1"]).toBe("B");
  });

  // Teste 6 — Submissão Individual
  it("Teste 6: executa submissão individual chamando submitSimulationAnswer", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => {
      result.current.selectAnswer("item-1", "A");
    });

    await act(async () => {
      await result.current.submitAnswer("item-1");
    });

    expect(attemptService.submitSimulationAnswer).toHaveBeenCalledWith({
      setItemId: "item-1",
      chosenAnswer: "A",
    });

    expect(result.current.items[0]!.isAnswered).toBe(true);
    expect(result.current.items[0]!.chosenAnswer).toBe("A");
  });

  // Teste 7 — Batch
  it("Teste 7: envia respostas pendentes em lote chamando submitSimulationBatch", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => {
      result.current.selectAnswer("item-1", "A");
    });

    await act(async () => {
      await result.current.submitBatch();
    });

    expect(attemptService.submitSimulationBatch).toHaveBeenCalledWith({
      setId: mockSetId,
      answers: [{ setItemId: "item-1", chosenAnswer: "A" }],
    });
  });

  // Teste 8 — Timeout (Impedimento de submissão)
  it("Teste 8: não permite novas submissões no estado completed ou timeout", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.completeSimulation();
    });

    expect(result.current.status).toBe("completed");

    const res = await result.current.submitAnswer("item-1", "A");
    expect(res).toBeNull();
  });

  // Teste 9 — Auto-finalização por estouro do cronômetro
  it("Teste 9: aciona auto-finalização ao atingir o deadline do simulado", async () => {
    const expiredSet: QuestionSet = {
      ...mockSet,
      timeLimitMinutes: 1,
      startedAt: new Date(Date.now() - 120 * 1000).toISOString(), // Iniciado há 2 min (deadline estourado)
    };

    vi.mocked(service.startQuestionSet).mockResolvedValue(expiredSet);
    vi.mocked(service.getQuestionSet).mockResolvedValue({
      set: expiredSet,
      items: mockItems,
    });

    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("completed"), {
      timeout: 2500,
    });

    expect(service.completeQuestionSet).toHaveBeenCalledWith(mockSetId);
  });

  // Teste 10 — Conclusão Manual
  it("Teste 10: chama completeQuestionSet ao executar completeSimulation", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.completeSimulation();
    });

    expect(service.completeQuestionSet).toHaveBeenCalledWith(mockSetId);
    expect(result.current.status).toBe("completed");
    expect(result.current.completedResult?.set.isCompleted).toBe(true);
  });

  // Teste 11 — Tratamento de UNANSWERED
  it("Teste 11: preserva questões sem resposta (UNANSWERED) sem criar tentativas fictícias", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => {
      result.current.selectAnswer("item-1", "C");
    });

    await act(async () => {
      await result.current.completeSimulation();
    });

    expect(attemptService.submitSimulationBatch).toHaveBeenCalledWith({
      setId: mockSetId,
      answers: [{ setItemId: "item-1", chosenAnswer: "C" }],
    });
  });

  // Teste 12 — Dupla Finalização
  it("Teste 12: previne múltiplas chamadas concorrentes de conclusão", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      const p1 = result.current.completeSimulation();
      const p2 = result.current.completeSimulation();
      await Promise.all([p1, p2]);
    });

    expect(service.completeQuestionSet).toHaveBeenCalledTimes(1);
  });

  // Teste 13 — Tratamento de Erro de Rede
  it("Teste 13: captura falhas de rede e transiciona para o estado de erro", async () => {
    vi.mocked(service.startQuestionSet).mockRejectedValue(new Error("Erro de conexão com o banco"));

    const onErrorMock = vi.fn();

    const { result } = renderHook(() =>
      useSimulationController({
        setId: mockSetId,
        autoStart: true,
        onError: onErrorMock,
      }),
    );

    await waitFor(() => expect(result.current.status).toBe("error"));

    expect(result.current.errorMessage).toBe("Erro de conexão com o banco");
    expect(onErrorMock).toHaveBeenCalled();
  });

  // Teste 14 — Estado Já Concluído
  it("Teste 14: carrega estado completed diretamente se o simulado já estiver concluído", async () => {
    const completedSet: QuestionSet = {
      ...mockSet,
      isCompleted: true,
      score: 80,
    };

    vi.mocked(service.startQuestionSet).mockResolvedValue(completedSet);
    vi.mocked(service.getQuestionSet).mockResolvedValue({
      set: completedSet,
      items: mockItems,
    });

    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("completed"));

    expect(result.current.completedResult?.set.score).toBe(80);
  });

  // Teste 15 — Race Condition entre Submissão e Finalização
  it("Teste 15: lida com concorrência entre submissão e finalização sem corromper estado", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: true }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => {
      result.current.selectAnswer("item-1", "D");
    });

    await act(async () => {
      const submitPromise = result.current.submitAnswer("item-1");
      const completePromise = result.current.completeSimulation();
      await Promise.all([submitPromise, completePromise]);
    });

    expect(result.current.status).toBe("completed");
  });

  // Teste 16 — Reinicialização
  it("Teste 16: permite reiniciar a sessão do controller via startSimulation", async () => {
    const { result } = renderHook(() =>
      useSimulationController({ setId: mockSetId, autoStart: false }),
    );

    expect(result.current.status).toBe("idle");

    await act(async () => {
      await result.current.startSimulation();
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(service.startQuestionSet).toHaveBeenCalledWith(mockSetId);
  });
});
