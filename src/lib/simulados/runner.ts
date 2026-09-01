import { ExamSession, isValidExamStatusTransition, ExamStatus } from "./types";

export class ExamRunnerEngine {
  /**
   * Calcula o tempo decorrido total em segundos de forma absoluta e resiliente a clock drift.
   * Se o simulado estiver em progresso: (now - started_at) - accumulated_pause_seconds
   * Se o simulado estiver pausado: (last_paused_at - started_at) - accumulated_pause_seconds
   */
  static calculateElapsedTime(session: ExamSession, now: Date = new Date()): number {
    if (!session.started_at) return 0;

    const startedAt = new Date(session.started_at);
    const accumulatedPause = session.accumulated_pause_seconds || 0;

    if (session.status === "paused") {
      if (!session.last_paused_at) return 0;
      const lastPausedAt = new Date(session.last_paused_at);
      const elapsed =
        Math.round((lastPausedAt.getTime() - startedAt.getTime()) / 1000) - accumulatedPause;
      return Math.max(0, elapsed);
    }

    // Se já finalizado ou abandonado, usa o tempo total salvo
    if (
      session.status === "submitted" ||
      session.status === "processing" ||
      session.status === "analyzed" ||
      session.status === "abandoned"
    ) {
      if (session.total_time_seconds !== undefined && session.total_time_seconds !== null) {
        return session.total_time_seconds;
      }
      if (session.ended_at) {
        const endedAt = new Date(session.ended_at);
        const elapsed =
          Math.round((endedAt.getTime() - startedAt.getTime()) / 1000) - accumulatedPause;
        return Math.max(0, elapsed);
      }
    }

    // Para "in_progress" ou outros estados ativos:
    const elapsed = Math.round((now.getTime() - startedAt.getTime()) / 1000) - accumulatedPause;
    return Math.max(0, elapsed);
  }

  /**
   * Calcula o tempo restante absoluto em segundos.
   */
  static calculateRemainingTime(session: ExamSession, now: Date = new Date()): number {
    const elapsed = this.calculateElapsedTime(session, now);
    const remaining = session.time_limit_seconds - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Executa a transição de status de forma pura e retorna o objeto da sessão atualizado e o tempo acumulado calculado.
   */
  static transitionStatus(
    session: ExamSession,
    targetStatus: ExamStatus,
    now: Date = new Date(),
  ): { updatedSession: ExamSession; pauseDurationToAdd: number } {
    if (!isValidExamStatusTransition(session.status, targetStatus)) {
      throw new Error(`Transição de status inválida: ${session.status} -> ${targetStatus}`);
    }

    const updated = { ...session, status: targetStatus, version: session.version + 1 };
    const nowIso = now.toISOString();
    let pauseDurationToAdd = 0;

    if (session.status === "ready" && targetStatus === "in_progress") {
      updated.started_at = nowIso;
      updated.last_resumed_at = nowIso;
      updated.accumulated_pause_seconds = 0;
    } else if (session.status === "in_progress" && targetStatus === "paused") {
      updated.last_paused_at = nowIso;
    } else if (session.status === "paused" && targetStatus === "in_progress") {
      if (session.last_paused_at) {
        const lastPaused = new Date(session.last_paused_at);
        pauseDurationToAdd = Math.max(0, Math.round((now.getTime() - lastPaused.getTime()) / 1000));
        updated.accumulated_pause_seconds =
          (session.accumulated_pause_seconds || 0) + pauseDurationToAdd;
      }
      updated.last_resumed_at = nowIso;
    } else if (targetStatus === "submitted" || targetStatus === "abandoned") {
      updated.ended_at = nowIso;
      updated.total_time_seconds = this.calculateElapsedTime(session, now);
    }

    return { updatedSession: updated, pauseDurationToAdd };
  }

  /**
   * Helper para alternar a eliminação visual de uma alternativa em uma determinada questão.
   */
  static toggleEliminateAlternative(eliminated: string[] = [], letter: string): string[] {
    const upperLetter = letter.toUpperCase();
    if (eliminated.includes(upperLetter)) {
      return eliminated.filter((l) => l !== upperLetter);
    } else {
      return [...eliminated, upperLetter].sort();
    }
  }
}
