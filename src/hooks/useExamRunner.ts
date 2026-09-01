import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ExamRunnerEngine } from "@/lib/simulados/runner";
import { ExamSession, ExamSessionAnswer, ExamStatus, ExamEventType } from "@/lib/simulados/types";

export interface ExamAnswerWithQuestion extends ExamSessionAnswer {
  question?: {
    id: string;
    statement: string;
    alternatives: any;
    correct_answer: string | null;
    exam_board: string | null;
    subject_id: string | null;
    topic_id: string | null;
  };
}

export interface ExamRunnerState {
  session: ExamSession | null;
  answers: ExamAnswerWithQuestion[];
  currentQuestionIndex: number;
  timeRemainingSeconds: number;
  isSyncing: boolean;
  isPaused: boolean;
  eliminatedAlternatives: Record<string, string[]>; // question_id -> alternative_letters[]
  error: string | null;
  isLoading: boolean;
}

export function useExamRunner(sessionId: string) {
  const { user } = useAuth();
  const [state, setState] = useState<ExamRunnerState>({
    session: null,
    answers: [],
    currentQuestionIndex: 0,
    timeRemainingSeconds: 0,
    isSyncing: false,
    isPaused: false,
    eliminatedAlternatives: {},
    error: null,
    isLoading: true,
  });

  const sessionRef = useRef<ExamSession | null>(null);
  const pendingSavesRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Helper para salvar eventos comportamentais append-only de auditoria
  const recordEvent = useCallback(
    async (
      eventType: ExamEventType,
      questionId: string | null,
      payload: Record<string, unknown>,
    ) => {
      if (!user) return;
      const eventId = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);

      await supabase.from("exam_session_events").insert({
        id: eventId,
        session_id: sessionId,
        user_id: user.id,
        question_id: questionId,
        event_type: eventType,
        payload: payload,
      });
    },
    [sessionId, user],
  );

  // Transição: Pronto -> Em Progresso
  const startSession = useCallback(
    async (currentSession: ExamSession) => {
      if (!user) return;
      const now = new Date();
      const nowIso = now.toISOString();

      const { data, error } = await supabase
        .from("exam_sessions")
        .update({
          status: "in_progress",
          started_at: nowIso,
          last_resumed_at: nowIso,
          accumulated_pause_seconds: 0,
          version: currentSession.version + 1,
        })
        .eq("id", sessionId)
        .eq("version", currentSession.version)
        .select()
        .single();

      if (error || !data) {
        throw new Error(
          `Falha ao iniciar o simulado devido a concorrência: ${error?.message || "Lock falhou"}`,
        );
      }

      const updated = data as unknown as ExamSession;
      sessionRef.current = updated;
      setState((s) => ({
        ...s,
        session: updated,
        timeRemainingSeconds: updated.time_limit_seconds,
      }));

      await recordEvent("session_resumed", null, {
        triggered_by: "start",
        started_at: nowIso,
      });
    },
    [sessionId, user, recordEvent],
  );

  // Carregar dados iniciais da sessão
  const loadSession = useCallback(async () => {
    if (!user) return;

    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      // Obter a sessão
      const { data: sessionData, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        throw new Error(sessionError?.message || "Sessão de simulado não encontrada.");
      }

      const session = sessionData as unknown as ExamSession;
      sessionRef.current = session;

      // Obter as respostas e as questões vinculadas
      const { data: answersData, error: answersError } = await supabase
        .from("exam_session_answers")
        .select(
          `
          *,
          questions (
            id,
            statement,
            alternatives,
            correct_answer,
            exam_board,
            subject_id,
            topic_id
          )
        `,
        )
        .eq("session_id", sessionId)
        .order("position", { ascending: true });

      if (answersError) {
        throw new Error(answersError.message);
      }

      const answers: ExamAnswerWithQuestion[] = (answersData || []).map((row: any) => ({
        id: row.id,
        session_id: row.session_id,
        question_id: row.question_id,
        user_id: row.user_id,
        position: row.position,
        subject_id: row.subject_id,
        topic_id: row.topic_id,
        weight: row.weight,
        chosen_answer: row.chosen_answer,
        is_correct: row.is_correct,
        is_flagged_for_review: row.is_flagged_for_review,
        answer_change_count: row.answer_change_count,
        first_chosen_answer: row.first_chosen_answer,
        time_spent_seconds: row.time_spent_seconds,
        order_of_interaction: row.order_of_interaction,
        attempt_id: row.attempt_id,
        updated_at: row.updated_at,
        question: row.questions
          ? {
              id: row.questions.id,
              statement: row.questions.statement,
              alternatives: row.questions.alternatives,
              correct_answer: row.questions.correct_answer,
              exam_board: row.questions.exam_board,
              subject_id: row.questions.subject_id,
              topic_id: row.questions.topic_id,
            }
          : undefined,
      }));

      const initialRemaining = ExamRunnerEngine.calculateRemainingTime(session, new Date());

      setState((s) => ({
        ...s,
        session,
        answers,
        timeRemainingSeconds: initialRemaining,
        isPaused: session.status === "paused",
        isLoading: false,
      }));

      // Inicia automaticamente o simulado se estiver pronto
      if (session.status === "ready") {
        await startSession(session);
      }
    } catch (err: any) {
      setState((s) => ({ ...s, isLoading: false, error: err.message }));
    }
  }, [sessionId, user, startSession]);

  // Pausar Simulado
  const pauseSession = async () => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.status !== "in_progress") return;

    try {
      setState((s) => ({ ...s, isSyncing: true }));
      const now = new Date();
      const nowIso = now.toISOString();

      const { data, error } = await supabase
        .from("exam_sessions")
        .update({
          status: "paused",
          last_paused_at: nowIso,
          version: currentSession.version + 1,
        })
        .eq("id", sessionId)
        .eq("version", currentSession.version)
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Erro ao pausar: ${error?.message || "Falha no lock otimista"}`);
      }

      const updated = data as unknown as ExamSession;
      sessionRef.current = updated;

      setState((s) => ({
        ...s,
        session: updated,
        isPaused: true,
        isSyncing: false,
      }));

      await recordEvent("session_paused", null, { paused_at: nowIso });
    } catch (err: any) {
      setState((s) => ({ ...s, isSyncing: false, error: err.message }));
    }
  };

  // Retomar Simulado
  const resumeSession = async () => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.status !== "paused") return;

    try {
      setState((s) => ({ ...s, isSyncing: true }));
      const now = new Date();
      const nowIso = now.toISOString();

      const lastPausedStr = currentSession.last_paused_at || currentSession.started_at || nowIso;
      const pauseDurationToAdd = Math.max(
        0,
        Math.round((now.getTime() - new Date(lastPausedStr).getTime()) / 1000),
      );
      const newAccumulated = (currentSession.accumulated_pause_seconds || 0) + pauseDurationToAdd;

      const { data, error } = await supabase
        .from("exam_sessions")
        .update({
          status: "in_progress",
          accumulated_pause_seconds: newAccumulated,
          last_resumed_at: nowIso,
          version: currentSession.version + 1,
        })
        .eq("id", sessionId)
        .eq("version", currentSession.version)
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Erro ao retomar simulado: ${error?.message || "Falha no lock otimista"}`);
      }

      const updated = data as unknown as ExamSession;
      sessionRef.current = updated;

      setState((s) => ({
        ...s,
        session: updated,
        isPaused: false,
        timeRemainingSeconds: ExamRunnerEngine.calculateRemainingTime(updated, now),
        isSyncing: false,
      }));

      await recordEvent("session_resumed", null, {
        resumed_at: nowIso,
        accumulated_pause: newAccumulated,
      });
    } catch (err: any) {
      setState((s) => ({ ...s, isSyncing: false, error: err.message }));
    }
  };

  // Enviar / Concluir Simulado
  const finishSession = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (
      !currentSession ||
      (currentSession.status !== "in_progress" && currentSession.status !== "paused")
    )
      return;

    try {
      setState((s) => ({ ...s, isSyncing: true }));
      const now = new Date();
      const nowIso = now.toISOString();

      const elapsedSeconds = ExamRunnerEngine.calculateElapsedTime(currentSession, now);

      const { data, error } = await supabase
        .from("exam_sessions")
        .update({
          status: "submitted",
          ended_at: nowIso,
          total_time_seconds: elapsedSeconds,
          version: currentSession.version + 1,
        })
        .eq("id", sessionId)
        .eq("version", currentSession.version)
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Erro ao encerrar simulado: ${error?.message || "Falha no lock otimista"}`);
      }

      const updated = data as unknown as ExamSession;
      sessionRef.current = updated;

      setState((s) => ({
        ...s,
        session: updated,
        isSyncing: false,
      }));

      await recordEvent("session_submitted", null, {
        ended_at: nowIso,
        total_time_seconds: elapsedSeconds,
      });
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setState((s) => ({ ...s, isSyncing: false, error: err.message }));
    }
  }, [sessionId, recordEvent]);

  // Selecionar Resposta para uma Questão
  const selectAnswer = async (questionId: string, choice: string | null) => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.status !== "in_progress") return;

    // Atualiza imediatamente o estado reativo local da UI
    setState((s) => {
      const updatedAnswers = s.answers.map((ans) => {
        if (ans.question_id === questionId) {
          const isChange = ans.chosen_answer !== null && ans.chosen_answer !== choice;
          return {
            ...ans,
            chosen_answer: choice,
            answer_change_count: ans.answer_change_count + (isChange ? 1 : 0),
            first_chosen_answer: ans.first_chosen_answer || choice,
          };
        }
        return ans;
      });
      return { ...s, answers: updatedAnswers };
    });

    setHasUnsavedChanges(true);

    // Debouncing/autosave assíncrono para gravar no banco sem travar a digitação do aluno
    if (pendingSavesRef.current[questionId]) {
      clearTimeout(pendingSavesRef.current[questionId]);
    }

    pendingSavesRef.current[questionId] = setTimeout(async () => {
      try {
        setState((s) => ({ ...s, isSyncing: true }));
        const targetAnswer = state.answers.find((a) => a.question_id === questionId);
        if (!targetAnswer) return;

        const isChange =
          targetAnswer.chosen_answer !== null && targetAnswer.chosen_answer !== choice;
        const newChangeCount = targetAnswer.answer_change_count + (isChange ? 1 : 0);
        const firstChoice = targetAnswer.first_chosen_answer || choice;

        await supabase
          .from("exam_session_answers")
          .update({
            chosen_answer: choice,
            answer_change_count: newChangeCount,
            first_chosen_answer: firstChoice,
            updated_at: new Date().toISOString(),
          })
          .eq("session_id", sessionId)
          .eq("question_id", questionId);

        await recordEvent(
          choice ? (isChange ? "answer_changed" : "answer_selected") : "answer_selected",
          questionId,
          {
            choice: choice,
            change_count: newChangeCount,
          },
        );

        delete pendingSavesRef.current[questionId];
        if (Object.keys(pendingSavesRef.current).length === 0) {
          setHasUnsavedChanges(false);
        }
        setState((s) => ({ ...s, isSyncing: false }));
      } catch (err: any) {
        setState((s) => ({
          ...s,
          isSyncing: false,
          error: "Erro ao salvar resposta no servidor.",
        }));
      }
    }, 500);
  };

  // Alternar Sinalização / Flag para Revisão
  const toggleFlagReview = async (questionId: string) => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.status !== "in_progress") return;

    let targetFlag = false;

    setState((s) => {
      const updatedAnswers = s.answers.map((ans) => {
        if (ans.question_id === questionId) {
          targetFlag = !ans.is_flagged_for_review;
          return { ...ans, is_flagged_for_review: targetFlag };
        }
        return ans;
      });
      return { ...s, answers: updatedAnswers };
    });

    try {
      await supabase
        .from("exam_session_answers")
        .update({
          is_flagged_for_review: targetFlag,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .eq("question_id", questionId);

      await recordEvent("flag_toggled", questionId, { is_flagged_for_review: targetFlag });
    } catch (err) {
      setState((s) => ({ ...s, error: "Falha ao registrar flag de revisão." }));
    }
  };

  // Alternar eliminação visual de uma alternativa localmente
  const toggleEliminateAlternative = (questionId: string, letter: string) => {
    setState((s) => {
      const current = s.eliminatedAlternatives[questionId] || [];
      const updated = ExamRunnerEngine.toggleEliminateAlternative(current, letter);
      return {
        ...s,
        eliminatedAlternatives: {
          ...s.eliminatedAlternatives,
          [questionId]: updated,
        },
      };
    });
  };

  const setCurrentQuestionIndex = (index: number) => {
    setState((s) => ({ ...s, currentQuestionIndex: index }));
  };

  // Efeito do Timer Absoluto - Protegido contra Clock Drift
  useEffect(() => {
    const currentSession = state.session;
    if (!currentSession || currentSession.status !== "in_progress" || state.isPaused) return;

    const interval = setInterval(() => {
      const remaining = ExamRunnerEngine.calculateRemainingTime(currentSession, new Date());
      setState((s) => ({ ...s, timeRemainingSeconds: remaining }));

      // Autocommit quando o tempo esgota
      if (remaining <= 0) {
        clearInterval(interval);
        finishSession();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.session, state.isPaused, finishSession]);

  // Efeito Anti-Perda de dados: beforeunload listener
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || state.isSyncing) {
        e.preventDefault();
        e.returnValue =
          "Existem respostas pendentes de sincronização com o servidor. Deseja sair mesmo assim?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, state.isSyncing]);

  // Carregar dados na montagem
  useEffect(() => {
    if (user) {
      loadSession();
    }
  }, [user, loadSession]);

  const getAnswerForQuestion = (questionId: string) => {
    return state.answers.find((a) => a.question_id === questionId);
  };

  return {
    state,
    setCurrentQuestionIndex,
    selectAnswer,
    toggleFlagReview,
    toggleEliminateAlternative,
    pauseSession,
    resumeSession,
    finishSession,
    getAnswerForQuestion,
    reload: loadSession,
  };
}
