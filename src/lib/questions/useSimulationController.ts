import { useState, useEffect, useCallback, useRef } from "react";
import type { QuestionSet, QuestionSetItem } from "./types";
import { getQuestionSet, startQuestionSet, completeQuestionSet } from "./service";
import {
  submitSimulationAnswer,
  submitSimulationBatch,
  type SubmitSimulationAnswerResult,
} from "./attempt-service";

export type SimulationStatus =
  "idle" | "starting" | "ready" | "submitting" | "completing" | "completed" | "timeout" | "error";

export type UseSimulationControllerOptions = {
  /** ID do question_set / simulado */
  setId: string;
  /** Se true, inicia automaticamente o simulado na montagem do hook (default: true) */
  autoStart?: boolean;
  /** Callback acionado ao concluir o simulado */
  onCompleted?: (result: { set: QuestionSet; items: QuestionSetItem[] }) => void;
  /** Callback acionado em caso de erro */
  onError?: (error: Error) => void;
};

export type UseSimulationControllerReturn = {
  // Estado
  status: SimulationStatus;
  set: QuestionSet | null;
  items: QuestionSetItem[];
  currentIndex: number;
  currentItem: QuestionSetItem | null;
  answers: Record<string, string>;
  flaggedItemIds: string[];
  remainingSeconds: number | null;
  deadlineMs: number | null;
  completedResult: { set: QuestionSet; items: QuestionSetItem[] } | null;
  errorMessage: string | null;
  isSubmittingItem: boolean;

  // Ações
  startSimulation: () => Promise<void>;
  selectAnswer: (setItemId: string, answer: string) => void;
  toggleFlag: (setItemId: string) => void;
  goToIndex: (index: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  submitAnswer: (
    setItemId: string,
    chosenAnswer?: string,
    timeSpentSeconds?: number | null,
  ) => Promise<SubmitSimulationAnswerResult | null>;
  submitBatch: () => Promise<{ results: SubmitSimulationAnswerResult[] }>;
  completeSimulation: () => Promise<{ set: QuestionSet; items: QuestionSetItem[] } | null>;
  resetError: () => void;
};

export function useSimulationController(
  options: UseSimulationControllerOptions,
): UseSimulationControllerReturn {
  const { setId, autoStart = true, onCompleted, onError } = options;

  const [status, setStatus] = useState<SimulationStatus>("idle");
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [items, setItems] = useState<QuestionSetItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedItemIds, setFlaggedItemIds] = useState<string[]>([]);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [completedResult, setCompletedResult] = useState<{
    set: QuestionSet;
    items: QuestionSetItem[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittingItem, setIsSubmittingItem] = useState<boolean>(false);

  // Trava contra execuções concorrentes de complete e start
  const isCompletingRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. INICIALIZAÇÃO
  // ─────────────────────────────────────────────────────────────────────────
  const startSimulation = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setStatus("starting");
    setErrorMessage(null);

    try {
      // 1. Iniciar atômica/idempotente server-side (gera started_at)
      const updatedSet = await startQuestionSet(setId);

      // 2. Carregar o set com seus itens
      const setData = await getQuestionSet(setId);
      if (!setData) {
        throw new Error("Não foi possível carregar os dados do simulado.");
      }

      const activeSet = updatedSet || setData.set;
      const loadedItems = setData.items || [];

      setSet(activeSet);
      setItems(loadedItems);

      // Carregar respostas pré-existentes
      const initialAnswers: Record<string, string> = {};
      loadedItems.forEach((item) => {
        if (item.chosenAnswer) {
          initialAnswers[item.itemId] = item.chosenAnswer;
        }
      });
      setAnswers(initialAnswers);

      // Calcular deadline autoritativo server-side
      let calculatedDeadline: number | null = null;
      if (activeSet.timeLimitMinutes && activeSet.timeLimitMinutes > 0 && activeSet.startedAt) {
        const startTime = new Date(activeSet.startedAt).getTime();
        calculatedDeadline = startTime + activeSet.timeLimitMinutes * 60 * 1000;
      }
      setDeadlineMs(calculatedDeadline);

      if (activeSet.isCompleted) {
        setStatus("completed");
        setCompletedResult({ set: activeSet, items: loadedItems });
      } else {
        setStatus("ready");
      }
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setErrorMessage(errorObj.message);
      setStatus("error");
      if (onError) {
        onError(errorObj);
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [setId, onError]);

  // Auto-start
  useEffect(() => {
    if (autoStart && status === "idle") {
      void startSimulation();
    }
  }, [autoStart, status, startSimulation]);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CRONÔMETRO AUTORITATIVO & TIMEOUT
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "ready" && status !== "submitting") return;
    if (!deadlineMs) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((deadlineMs - now) / 1000));
      setRemainingSeconds(diffSeconds);

      if (now >= deadlineMs && !isCompletingRef.current) {
        setStatus("timeout");
        // Auto-finalização por estouro de tempo
        void (async () => {
          if (isCompletingRef.current) return;
          isCompletingRef.current = true;
          try {
            const res = await completeQuestionSet(setId);
            setSet(res.set);
            setItems(res.items);
            setCompletedResult(res);
            setStatus("completed");
            if (onCompleted) {
              onCompleted(res);
            }
          } catch (err: unknown) {
            const errorObj = err instanceof Error ? err : new Error(String(err));
            setErrorMessage(errorObj.message);
            setStatus("error");
            if (onError) onError(errorObj);
          } finally {
            isCompletingRef.current = false;
          }
        })();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, deadlineMs, setId, onCompleted, onError]);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. SELEÇÃO LOCAL & NAVEGAÇÃO
  // ─────────────────────────────────────────────────────────────────────────
  const selectAnswer = useCallback(
    (setItemId: string, answer: string) => {
      if (status === "completed" || status === "timeout" || status === "completing") {
        return;
      }
      setAnswers((prev) => ({
        ...prev,
        [setItemId]: answer,
      }));
    },
    [status],
  );

  const toggleFlag = useCallback((setItemId: string) => {
    setFlaggedItemIds((prev) =>
      prev.includes(setItemId) ? prev.filter((id) => id !== setItemId) : [...prev, setItemId],
    );
  }, []);

  const goToIndex = useCallback(
    (index: number) => {
      if (items.length === 0) return;
      const boundedIndex = Math.max(0, Math.min(items.length - 1, index));
      setCurrentIndex(boundedIndex);
    },
    [items.length],
  );

  const nextQuestion = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

  const previousQuestion = useCallback(() => {
    goToIndex(currentIndex - 1);
  }, [currentIndex, goToIndex]);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. SUBMISSÃO DE RESPOSTAS (INDIVIDUAL E BATCH)
  // ─────────────────────────────────────────────────────────────────────────
  const submitAnswer = useCallback(
    async (
      setItemId: string,
      chosenAnswer?: string,
      timeSpentSeconds?: number | null,
    ): Promise<SubmitSimulationAnswerResult | null> => {
      if (status === "completed" || status === "completing" || status === "timeout") {
        return null;
      }

      const answerToSubmit = chosenAnswer ?? answers[setItemId];
      if (!answerToSubmit) {
        return null;
      }

      setIsSubmittingItem(true);
      const prevStatus = status;
      setStatus("submitting");

      try {
        const result = await submitSimulationAnswer({
          setItemId,
          chosenAnswer: answerToSubmit,
          ...(timeSpentSeconds !== undefined ? { timeSpentSeconds } : {}),
        });

        // Atualizar item localmente
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.itemId === setItemId
              ? {
                  ...item,
                  isAnswered: true,
                  chosenAnswer: answerToSubmit,
                  isCorrect: result.isCorrect,
                  attemptId: result.attemptId,
                }
              : item,
          ),
        );

        setStatus(prevStatus === "starting" ? "ready" : prevStatus);
        return result;
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setErrorMessage(errorObj.message);
        setStatus("error");
        if (onError) onError(errorObj);
        return null;
      } finally {
        setIsSubmittingItem(false);
      }
    },
    [status, answers, onError],
  );

  const submitBatch = useCallback(async (): Promise<{
    results: SubmitSimulationAnswerResult[];
  }> => {
    if (status === "completed" || status === "completing") {
      return { results: [] };
    }

    const unsubmittedAnswers = items
      .filter((item) => Boolean(answers[item.itemId]) && !item.isAnswered)
      .map((item) => ({
        setItemId: item.itemId,
        chosenAnswer: answers[item.itemId]!,
      }));

    if (unsubmittedAnswers.length === 0) {
      return { results: [] };
    }

    const prevStatus = status;
    setStatus("submitting");

    try {
      const response = await submitSimulationBatch({
        setId,
        answers: unsubmittedAnswers,
      });

      // Atualizar lista local de itens
      const resultMap = new Map(response.results.map((r) => [r.setItemId, r]));
      setItems((prevItems) =>
        prevItems.map((item) => {
          const res = resultMap.get(item.itemId);
          if (res) {
            return {
              ...item,
              isAnswered: true,
              chosenAnswer: answers[item.itemId] || item.chosenAnswer,
              isCorrect: res.isCorrect,
              attemptId: res.attemptId,
            };
          }
          return item;
        }),
      );

      setStatus(prevStatus);
      return response;
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setErrorMessage(errorObj.message);
      setStatus("error");
      if (onError) onError(errorObj);
      return { results: [] };
    }
  }, [status, items, answers, setId, onError]);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. FINALIZAÇÃO DO SIMULADO
  // ─────────────────────────────────────────────────────────────────────────
  const completeSimulation = useCallback(async (): Promise<{
    set: QuestionSet;
    items: QuestionSetItem[];
  } | null> => {
    if (isCompletingRef.current || status === "completed") {
      return completedResult;
    }

    isCompletingRef.current = true;
    setStatus("completing");

    try {
      // 1. Enviar primeiro pendências em lote se houver respostas locais não submetidas
      const unsubmitted = items.filter((item) => answers[item.itemId] && !item.isAnswered);

      if (unsubmitted.length > 0) {
        await submitSimulationBatch({
          setId,
          answers: unsubmitted.map((item) => ({
            setItemId: item.itemId,
            chosenAnswer: answers[item.itemId]!,
          })),
        });
      }

      // 2. Chamar consolidação server-side
      const result = await completeQuestionSet(setId);

      setSet(result.set);
      setItems(result.items);
      setCompletedResult(result);
      setStatus("completed");

      if (onCompleted) {
        onCompleted(result);
      }

      return result;
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setErrorMessage(errorObj.message);
      setStatus("error");
      if (onError) onError(errorObj);
      return null;
    } finally {
      isCompletingRef.current = false;
    }
  }, [status, completedResult, items, answers, setId, onCompleted, onError]);

  const resetError = useCallback(() => {
    setErrorMessage(null);
    if (status === "error") {
      setStatus(set?.isCompleted ? "completed" : "ready");
    }
  }, [status, set]);

  const currentItem = items[currentIndex] || null;

  return {
    status,
    set,
    items,
    currentIndex,
    currentItem,
    answers,
    flaggedItemIds,
    remainingSeconds,
    deadlineMs,
    completedResult,
    errorMessage,
    isSubmittingItem,

    startSimulation,
    selectAnswer,
    toggleFlag,
    goToIndex,
    nextQuestion,
    previousQuestion,
    submitAnswer,
    submitBatch,
    completeSimulation,
    resetError,
  };
}
