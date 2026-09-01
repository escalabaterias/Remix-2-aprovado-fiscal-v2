import { describe, expect, it } from "vitest";
import { ExamRunnerEngine } from "./runner";
import { ExamSession } from "./types";

// Auxiliar para criar uma sessão de simulado de teste limpa
const createMockSession = (overrides: Partial<ExamSession> = {}): ExamSession => {
  return {
    id: "session-123",
    user_id: "user-456",
    set_id: "set-789",
    status: "ready",
    time_limit_seconds: 3600, // 1 hora (3600s)
    accumulated_pause_seconds: 0,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

describe("ExamRunnerEngine — Suíte de Testes do Runner e Controle Temporal (Etapa 8.3)", () => {
  describe("Cálculo de Tempo Decorrido (Clock Drift Protected)", () => {
    it("deve retornar 0 segundos se o simulado ainda não foi iniciado", () => {
      const session = createMockSession();
      const elapsed = ExamRunnerEngine.calculateElapsedTime(session);
      expect(elapsed).toBe(0);
    });

    it("deve calcular o tempo decorrido correto para uma sessão ativa em progresso", () => {
      const started = new Date();
      started.setSeconds(started.getSeconds() - 150); // Iniciado há 150 segundos

      const session = createMockSession({
        status: "in_progress",
        started_at: started.toISOString(),
        accumulated_pause_seconds: 0,
      });

      const elapsed = ExamRunnerEngine.calculateElapsedTime(session, new Date());
      // Permitir pequena variação de ±1 segundo devido à execução
      expect(elapsed).toBeGreaterThanOrEqual(149);
      expect(elapsed).toBeLessThanOrEqual(151);
    });

    it("deve descontar corretamente as pausas acumuladas durante a sessão ativa", () => {
      const started = new Date();
      started.setSeconds(started.getSeconds() - 300); // Iniciado há 300 segundos

      const session = createMockSession({
        status: "in_progress",
        started_at: started.toISOString(),
        accumulated_pause_seconds: 60, // Teve uma pausa anterior concluída de 60 segundos
      });

      const elapsed = ExamRunnerEngine.calculateElapsedTime(session, new Date());
      // 300 - 60 = 240 segundos ativos decorridos
      expect(elapsed).toBeGreaterThanOrEqual(239);
      expect(elapsed).toBeLessThanOrEqual(241);
    });

    it("deve manter o tempo decorrido constante/congelado quando a sessão estiver pausada", () => {
      const started = new Date();
      started.setSeconds(started.getSeconds() - 400); // Iniciado há 400s

      const pausedAt = new Date();
      pausedAt.setSeconds(pausedAt.getSeconds() - 100); // Pausado há 100s (ficou ativo por 300s)

      const session = createMockSession({
        status: "paused",
        started_at: started.toISOString(),
        last_paused_at: pausedAt.toISOString(),
        accumulated_pause_seconds: 0,
      });

      // Passamos o momento de agora (mais 100 segundos no futuro).
      // O tempo deve permanecer rigorosamente congelado no momento em que foi pausado (300 segundos ativos).
      const elapsedNow = ExamRunnerEngine.calculateElapsedTime(session, new Date());
      expect(elapsedNow).toBe(300);
    });
  });

  describe("Cálculo de Tempo Restante", () => {
    it("deve calcular o tempo restante correto baseado no tempo limite", () => {
      const started = new Date();
      started.setSeconds(started.getSeconds() - 500); // Passados 500s de prova

      const session = createMockSession({
        status: "in_progress",
        started_at: started.toISOString(),
        time_limit_seconds: 1800, // Limite de 1800s (30 minutos)
        accumulated_pause_seconds: 0,
      });

      const remaining = ExamRunnerEngine.calculateRemainingTime(session, new Date());
      // 1800 - 500 = 1300 segundos restantes
      expect(remaining).toBeGreaterThanOrEqual(1299);
      expect(remaining).toBeLessThanOrEqual(1301);
    });

    it("nunca deve retornar tempo restante menor do que zero", () => {
      const started = new Date();
      started.setSeconds(started.getSeconds() - 4000); // Iniciou há mais de 1 hora

      const session = createMockSession({
        status: "in_progress",
        started_at: started.toISOString(),
        time_limit_seconds: 3600, // Limite de 1 hora (3600s)
      });

      const remaining = ExamRunnerEngine.calculateRemainingTime(session, new Date());
      expect(remaining).toBe(0);
    });
  });

  describe("Transições de Status de Sessão (FSM)", () => {
    it("deve lançar erro ao tentar efetuar transição inválida do status atual", () => {
      const session = createMockSession({ status: "submitted" });

      // Concluir um simulado já finalizado é proibido por máquina de estados
      expect(() => {
        ExamRunnerEngine.transitionStatus(session, "in_progress");
      }).toThrowError(/Transição de status inválida/);
    });

    it("deve configurar os timestamps corretamente ao iniciar o simulado", () => {
      const session = createMockSession();
      const now = new Date();

      const { updatedSession } = ExamRunnerEngine.transitionStatus(session, "in_progress", now);

      expect(updatedSession.status).toBe("in_progress");
      expect(updatedSession.started_at).toBe(now.toISOString());
      expect(updatedSession.last_resumed_at).toBe(now.toISOString());
      expect(updatedSession.accumulated_pause_seconds).toBe(0);
      expect(updatedSession.version).toBe(2);
    });

    it("deve computar e adicionar a pausa correspondente ao retomar um simulado pausado", () => {
      const now = new Date();
      const lastPaused = new Date(now.getTime() - 150000); // Pausou há 150 segundos (2.5 min)

      const session = createMockSession({
        status: "paused",
        accumulated_pause_seconds: 50, // Já tinha 50s de pausas anteriores
        last_paused_at: lastPaused.toISOString(),
      });

      const { updatedSession, pauseDurationToAdd } = ExamRunnerEngine.transitionStatus(
        session,
        "in_progress",
        now,
      );

      expect(updatedSession.status).toBe("in_progress");
      expect(pauseDurationToAdd).toBe(150);
      expect(updatedSession.accumulated_pause_seconds).toBe(200); // 50 + 150 = 200s
      expect(updatedSession.last_resumed_at).toBe(now.toISOString());
    });
  });

  describe("Eliminação Visual de Alternativas", () => {
    it("deve adicionar uma alternativa riscada se ela não existia", () => {
      const current = ["A"];
      const updated = ExamRunnerEngine.toggleEliminateAlternative(current, "C");
      expect(updated).toEqual(["A", "C"]);
    });

    it("deve ordenar em ordem alfabética ao adicionar nova alternativa eliminada", () => {
      const current = ["B"];
      const updated = ExamRunnerEngine.toggleEliminateAlternative(current, "A");
      expect(updated).toEqual(["A", "B"]);
    });

    it("deve remover uma alternativa da lista caso ela já estivesse marcada como riscada", () => {
      const current = ["A", "C", "D"];
      const updated = ExamRunnerEngine.toggleEliminateAlternative(current, "C");
      expect(updated).toEqual(["A", "D"]);
    });
  });
});
