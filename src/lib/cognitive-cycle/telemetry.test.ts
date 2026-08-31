import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  orchestrateCognitiveCycleStep,
  processCognitiveCycleInteraction,
  clearCognitiveCycleCache,
} from "./engine";
import {
  recordCognitiveTelemetry,
  getCognitiveTelemetryEvents,
  getCognitiveTelemetrySummary,
  getCognitiveAuditTrail,
  exportTelemetryMetrics,
  clearCognitiveTelemetry,
} from "./telemetry";
import type { CognitiveCycleInteractionInput } from "./types";

// Mock do cliente Supabase para isolar banco de dados nos testes
vi.mock("@/integrations/supabase/client", () => {
  const store = new Map<string, any>();
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
          error: null,
        }),
      },
      from: (table: string) => {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: store.get(table) || null, error: null }),
              }),
              maybeSingle: async () => ({ data: store.get(table) || null, error: null }),
            }),
          }),
          insert: async (data: any) => {
            store.set(table, data);
            return { data, error: null };
          },
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      },
    },
  };
});

vi.mock("@/services/ai/gateway", () => ({
  runAiTask: vi.fn().mockResolvedValue({
    rawResponse: "Resposta simulada da IA para telemetria",
    cached: false,
    promptVersion: "7.1.0",
    executionTimeMs: 120,
  }),
}));

describe("Fase 7.8 — Telemetria, Observabilidade e Auditoria do Ciclo Cognitivo", () => {
  beforeEach(() => {
    clearCognitiveCycleCache();
    clearCognitiveTelemetry();
  });

  describe("1. Coleta e Registro Automático de Telemetria", () => {
    it("registra evento PLAN_ORCHESTRATED ao orquestrar um plano cognitivo", async () => {
      const plan = await orchestrateCognitiveCycleStep({
        userId: "user-tel-1",
        topicId: "topic-tel-1",
        topicName: "Direito Tributário - CTN",
        subjectName: "Direito Tributário",
      });

      expect(plan).toBeDefined();

      const events = getCognitiveTelemetryEvents({ userId: "user-tel-1" });
      expect(events.length).toBeGreaterThanOrEqual(1);

      const planEvent = events.find((e) => e.eventType === "PLAN_ORCHESTRATED");
      expect(planEvent).toBeDefined();
      expect(planEvent?.userId).toBe("user-tel-1");
      expect(planEvent?.topicId).toBe("topic-tel-1");
      expect(planEvent?.executionMode).toBe(plan.executionMode);
      expect(planEvent?.pedagogicalAction).toBe(plan.pedagogicalDecision.primaryAction);
    });

    it("registra evento INTERACTION_PROCESSED ao processar resposta do aluno", async () => {
      const stepPlan = await orchestrateCognitiveCycleStep({
        userId: "11111111-1111-4111-8111-111111111111",
        topicId: "22222222-2222-4222-8222-222222222222",
        topicName: "LRF - Limites de Despesa",
        subjectName: "Direito Financeiro",
      });

      const interactionInput: CognitiveCycleInteractionInput = {
        userId: "11111111-1111-4111-8111-111111111111",
        topicId: "22222222-2222-4222-8222-222222222222",
        stepPlan,
        userResponse: "Resposta válida de teste para telemetria de interação",
        declaredConfidence: "alto",
        timeSpentSeconds: 45,
      };

      const result = await processCognitiveCycleInteraction(interactionInput);
      expect(result.success).toBe(true);

      const events = getCognitiveTelemetryEvents({
        userId: "11111111-1111-4111-8111-111111111111",
      });
      const intEvent = events.find((e) => e.eventType === "INTERACTION_PROCESSED");
      expect(intEvent).toBeDefined();
      expect(intEvent?.evidenceRecorded).toBe(true);
    });

    it("registra evento IDEMPOTENCY_HIT ao reutilizar plano em cache", async () => {
      const input = {
        userId: "user-idem-tel",
        topicId: "topic-idem-tel",
        idempotencyKey: "idem-telemetry-key-123",
      };

      // Chamada 1
      await orchestrateCognitiveCycleStep(input);
      clearCognitiveTelemetry(); // Limpa eventos da 1ª chamada para validar isoladamente a 2ª

      // Chamada 2 (idempotente)
      await orchestrateCognitiveCycleStep(input);

      const events = getCognitiveTelemetryEvents({ userId: "user-idem-tel" });
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe("IDEMPOTENCY_HIT");
      expect(events[0]?.isCacheHit).toBe(true);
    });
  });

  describe("2. Consolidação de Métricas e Resumo Executivo", () => {
    it("calcula estatísticas consolidadas de telemetria corretamente", async () => {
      recordCognitiveTelemetry({
        eventType: "PLAN_ORCHESTRATED",
        userId: "u-metric",
        topicId: "t-1",
        executionMode: "artifact",
        pedagogicalAction: "REMEDIATION",
        durationMs: 100,
      });

      recordCognitiveTelemetry({
        eventType: "INTERACTION_PROCESSED",
        userId: "u-metric",
        topicId: "t-1",
        executionMode: "artifact",
        pedagogicalAction: "REMEDIATION",
        score: 0.9,
        durationMs: 50,
      });

      recordCognitiveTelemetry({
        eventType: "IDEMPOTENCY_HIT",
        userId: "u-metric",
        topicId: "t-1",
        isCacheHit: true,
      });

      const summary = getCognitiveTelemetrySummary({ userId: "u-metric" });

      expect(summary.totalEvents).toBe(3);
      expect(summary.orchestrationsCount).toBe(1);
      expect(summary.interactionsCount).toBe(1);
      expect(summary.cacheHitCount).toBe(1);
      expect(summary.cacheHitRate).toBeCloseTo(0.333, 2);
      expect(summary.modeDistribution.artifact).toBe(2);
      expect(summary.averageScore).toBe(0.9);
      expect(summary.averageLatencyMs).toBe(75);
    });

    it("exporta métricas sintéticas sem efeitos colaterais", () => {
      recordCognitiveTelemetry({
        eventType: "PLAN_ORCHESTRATED",
        userId: "u-exp",
        topicId: "t-exp",
        executionMode: "socratic",
        pedagogicalAction: "SOCRATIC",
        durationMs: 200,
      });

      const exported = exportTelemetryMetrics();
      expect(exported.totalEvents).toBe(1);
      expect(exported.averageLatencyMs).toBe(200);
      expect(exported.modeDistribution.socratic).toBe(1);
    });
  });

  describe("3. Trilha de Auditoria Auditável (Audit Trail)", () => {
    it("gera registros legíveis de auditoria para conformidade pedagógica", () => {
      recordCognitiveTelemetry({
        eventType: "PLAN_ORCHESTRATED",
        userId: "user-audit-1",
        topicId: "topic-audit-1",
        pedagogicalAction: "GERAR_ARTEFATO_COGNITIVO",
        executionMode: "artifact",
        idempotencyKey: "audit-key-777",
        legalGroundingApplied: true,
      });

      const auditTrail = getCognitiveAuditTrail({ userId: "user-audit-1" });
      expect(auditTrail).toHaveLength(1);

      const record = auditTrail[0]!;
      expect(record.userId).toBe("user-audit-1");
      expect(record.topicId).toBe("topic-audit-1");
      expect(record.eventType).toBe("PLAN_ORCHESTRATED");
      expect(record.pedagogicalAction).toBe("GERAR_ARTEFATO_COGNITIVO");
      expect(record.executionMode).toBe("artifact");
      expect(record.legalGroundingAttached).toBe(true);
      expect(record.details).toContain("Key: audit-key-777");
    });
  });

  describe("4. Preservação de Princípios e Invariantes do Sistema", () => {
    it("NÃO gera evidências passivas durante o registro de telemetria", () => {
      const beforeEvents = getCognitiveTelemetryEvents();

      // Chamada de telemetria isolada
      recordCognitiveTelemetry({
        eventType: "PLAN_ORCHESTRATED",
        userId: "user-passive-check",
        topicId: "topic-passive-check",
        executionMode: "review",
        pedagogicalAction: "REVIEW",
      });

      const afterEvents = getCognitiveTelemetryEvents();
      expect(afterEvents.length).toBe(beforeEvents.length + 1);

      // Garante que o evento apenas registrou observabilidade e não alterou o estado
      const lastEvent = afterEvents[afterEvents.length - 1]!;
      expect(lastEvent.eventType).toBe("PLAN_ORCHESTRATED");
      expect(lastEvent.evidenceRecorded).toBeUndefined();
    });
  });
});
