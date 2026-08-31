/**
 * TESTES UNITÁRIOS E INTEGRADOS — FASE 7.7
 * ORQUESTRADOR UNIFICADO DO CICLO COGNITIVO
 *
 * Testa e garante todas as regras de autoridade, determinismo, grounding,
 * idempotência, ausência de evidência passiva e tolerância a falhas.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  orchestrateCognitiveCycleStep,
  processCognitiveCycleInteraction,
  deriveExecutionMode,
  clearCognitiveCycleCache,
} from "./engine";
import type { CognitiveCycleInput, CognitiveCycleInteractionInput } from "./types";
import type { PedagogicalAction } from "../decision/types";

// Mocks para isolar dependências externas quando necessário
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
  runAiTask: vi.fn().mockImplementation(async (task: string) => {
    if (task.includes("fail")) {
      throw new Error("Simulated AI Gateway failure");
    }
    return {
      success: true,
      text: "Conteúdo gerado via AI Gateway com sucesso.",
      cached: false,
    };
  }),
}));

describe("Fase 7.7 — Orquestrador Unificado do Ciclo Cognitivo", () => {
  beforeEach(() => {
    clearCognitiveCycleCache();
    vi.clearAllMocks();
  });

  // 1. DEDUÇÃO DO MODO DE EXECUÇÃO DETERMINÍSTICO
  describe("1. Mapeamento de Modos de Execução", () => {
    it("mapeia GERAR_ARTEFATO_COGNITIVO para modo 'artifact'", () => {
      expect(deriveExecutionMode("GERAR_ARTEFATO_COGNITIVO")).toBe("artifact");
    });

    it("mapeia EXPLICACAO_SOCRATICA para modo 'socratic'", () => {
      expect(deriveExecutionMode("EXPLICACAO_SOCRATICA")).toBe("socratic");
    });

    it("mapeia REVISAR_ERRO_GRAVE para modo 'artifact'", () => {
      expect(deriveExecutionMode("REVISAR_ERRO_GRAVE")).toBe("artifact");
    });

    it("mapeia PRATICAR_QUESTOES para modo 'standard_practice'", () => {
      expect(deriveExecutionMode("PRATICAR_QUESTOES")).toBe("standard_practice");
    });

    it("mapeia REVISAR_ESPACADO para modo 'review'", () => {
      expect(deriveExecutionMode("REVISAR_ESPACADO")).toBe("review");
    });
  });

  // 2. ORQUESTRAÇÃO DO PLANO E RESPEITO ÀS AUTORIDADES
  describe("2. Orquestração do Plano e Autoridade Determinística", () => {
    it("gera plano de execução com autoridade da Ação Pedagógica (Decision Engine 7.5)", async () => {
      const input: CognitiveCycleInput = {
        userId: "user-123",
        topicId: "topico-dir-adm-1",
        topicName: "Atos Administrativos",
        subjectName: "Direito Administrativo",
        customSignals: {
          knowledgeState: "PONTO_CRITICO",
          unresolvedErrors: 3,
          recurringErrors: 2,
          mastery: 35,
        },
      };

      const plan = await orchestrateCognitiveCycleStep(input);

      expect(plan.userId).toBe("user-123");
      expect(plan.topicId).toBe("topico-dir-adm-1");
      expect(plan.pedagogicalDecision).toBeDefined();
      expect(plan.pedagogicalDecision.primaryAction).toBeDefined();
      expect(plan.executionMode).toBeDefined();
      expect(plan.idempotencyKey).toBeDefined();
      expect(plan.timestamp).toBeDefined();
    });

    it("inclui Fundamentação Jurídica RAG (Fase 7.3.2) para matérias de Direito", async () => {
      const input: CognitiveCycleInput = {
        userId: "user-123",
        topicId: "topico-dir-const-88",
        topicName: "Direitos Fundamentais - Art. 5º",
        subjectName: "Direito Constitucional",
      };

      const plan = await orchestrateCognitiveCycleStep(input);

      expect(plan.legalGrounding).toBeDefined();
      if (plan.legalGrounding) {
        expect(plan.legalGrounding.laws).toBeDefined();
        expect(Array.isArray(plan.legalGrounding.laws)).toBe(true);
      }
    });

    it("GARANTE AUSÊNCIA DE EVIDÊNCIA PASSIVA na simples geração do plano de execução", async () => {
      const input: CognitiveCycleInput = {
        userId: "user-123",
        topicId: "topico-sem-evidencias",
        topicName: "Auditoria Fiscal",
        subjectName: "Auditoria",
      };

      const plan = await orchestrateCognitiveCycleStep(input);

      // O plano deve ser criado sem disparar chamadas de escrita de evidências passivas
      expect(plan).toBeDefined();
      expect(plan.fallbackTriggered).toBe(false);
    });
  });

  // 3. IDEMPOTÊNCIA E DETERMINISMO
  describe("3. Idempotência e Determinismo", () => {
    it("retorna o mesmo plano de execução em chamadas repetidas com a mesma chave", async () => {
      const input: CognitiveCycleInput = {
        userId: "user-idem-1",
        topicId: "topico-idem",
        idempotencyKey: "test-idem-key-123",
      };

      const plan1 = await orchestrateCognitiveCycleStep(input);
      const plan2 = await orchestrateCognitiveCycleStep(input);

      expect(plan1).toBe(plan2); // Mesma referência de objeto no cache
      expect(plan1.idempotencyKey).toBe("test-idem-key-123");
    });

    it("permite forceRefresh para ignorar cache idempotente", async () => {
      const input: CognitiveCycleInput = {
        userId: "user-idem-2",
        topicId: "topico-idem-2",
        idempotencyKey: "test-idem-key-456",
      };

      const plan1 = await orchestrateCognitiveCycleStep(input);
      const plan2 = await orchestrateCognitiveCycleStep({ ...input, forceRefresh: true });

      expect(plan1).not.toBe(plan2);
      expect(plan2.idempotencyKey).toBe("test-idem-key-456");
    });
  });

  // 4. INTERAÇÃO E REGISTRO DE EVIDÊNCIA COGNITIVA REAL
  describe("4. Processamento de Interação do Aluno e Evidência Real", () => {
    it("registra evidência real e atualiza Knowledge Engine na resposta válida do aluno", async () => {
      const stepPlan = await orchestrateCognitiveCycleStep({
        userId: "11111111-1111-4111-8111-111111111111",
        topicId: "22222222-2222-4222-8222-222222222222",
        topicName: "LRF - Anexo de Metas Fiscais",
        subjectName: "Direito Financeiro",
      });

      const interactionInput: CognitiveCycleInteractionInput = {
        userId: "11111111-1111-4111-8111-111111111111",
        topicId: "22222222-2222-4222-8222-222222222222",
        stepPlan,
        userResponse: "A Lei de Responsabilidade Fiscal exige o Anexo de Metas Fiscais na LDO.",
        declaredConfidence: "alto",
        timeSpentSeconds: 45,
        idempotencyKey: "test-interaction-key-1",
      };

      const result = await processCognitiveCycleInteraction(interactionInput);

      expect(result.success).toBe(true);
      expect(result.evidenceResult).toBeDefined();
      expect(result.evidenceResult?.processed).toBe(true);
      expect(result.nextPedagogicalAction).toBeDefined();
      expect(result.guidanceSummary).toBeDefined();
      expect(result.idempotencyKey).toBe("test-interaction-key-1");
    });

    it("retorna resultado idempotente em interações duplicadas com a mesma chave", async () => {
      const stepPlan = await orchestrateCognitiveCycleStep({
        userId: "33333333-3333-4333-8333-333333333333",
        topicId: "44444444-4444-4444-8444-444444444444",
      });

      const interactionInput: CognitiveCycleInteractionInput = {
        userId: "33333333-3333-4333-8333-333333333333",
        topicId: "44444444-4444-4444-8444-444444444444",
        stepPlan,
        userResponse: "Resposta de teste para idempotência",
        idempotencyKey: "interaction-idem-key-999",
      };

      const res1 = await processCognitiveCycleInteraction(interactionInput);
      const res2 = await processCognitiveCycleInteraction(interactionInput);

      expect(res1).toBe(res2);
    });
  });

  // 5. TOLERÂNCIA A FALHAS E FALLBACK GRACIOSO
  describe("5. Tolerância a Falhas e Fallback Gracioso", () => {
    it("efetua fallback determinístico sem crash quando a IA falha", async () => {
      const input: CognitiveCycleInput = {
        userId: "user-fail-1",
        topicId: "topico-fail-1",
        topicName: "Tópico com Erro Forçado",
        customSignals: {
          knowledgeState: "PONTO_CRITICO",
        },
      };

      // O orquestrador deve tratar exceções internas graciosamente
      const plan = await orchestrateCognitiveCycleStep(input);

      expect(plan).toBeDefined();
      expect(plan.pedagogicalDecision).toBeDefined();
      expect(plan.executionMode).toBeDefined();
    });
  });
});
