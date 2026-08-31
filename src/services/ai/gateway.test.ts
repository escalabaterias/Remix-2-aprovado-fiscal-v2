/**
 * SUÍTE DE TESTES — FASE 7.1 (AI GATEWAY REAL & CACHE PERSISTIDO)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAiTask, hashInput, DEFAULT_PROMPT_VERSION, type AiTask } from "./gateway";
import * as gatewayServerFnModule from "./gateway-server-fn";

describe("AI Gateway — Phase 7.1", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Hash Determinístico e Versionamento de Prompt", () => {
    it("mesmo payload produz exatamente o mesmo hash", async () => {
      const payload1 = {
        type: "coach.recommendation",
        tier: "inteligente",
        promptVersion: "7.1.0",
        inputRef: { topicId: "123", score: 0.8 },
      };

      const payload2 = {
        type: "coach.recommendation",
        tier: "inteligente",
        promptVersion: "7.1.0",
        inputRef: { topicId: "123", score: 0.8 },
      };

      const hash1 = await hashInput(payload1);
      const hash2 = await hashInput(payload2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it("alterar a versão do prompt altera o hash, invalidando o cache", async () => {
      const payloadV1 = {
        type: "coach.recommendation",
        tier: "inteligente",
        promptVersion: "7.1.0",
        inputRef: { topicId: "123" },
      };

      const payloadV2 = {
        type: "coach.recommendation",
        tier: "inteligente",
        promptVersion: "7.2.0",
        inputRef: { topicId: "123" },
      };

      const hashV1 = await hashInput(payloadV1);
      const hashV2 = await hashInput(payloadV2);

      expect(hashV1).not.toBe(hashV2);
    });

    it("diferentes inputRef geram hashes distintos", async () => {
      const payloadA = { type: "task", tier: "rapida", inputRef: { id: "A" } };
      const payloadB = { type: "task", tier: "rapida", inputRef: { id: "B" } };

      const hashA = await hashInput(payloadA);
      const hashB = await hashInput(payloadB);

      expect(hashA).not.toBe(hashB);
    });
  });

  describe("2. Suporte aos Níveis (Tiers)", () => {
    it("aceita tarefas do tipo 'rapida', 'inteligente' e 'profunda'", async () => {
      const spy = vi.spyOn(gatewayServerFnModule, "serverExecuteAiTask").mockResolvedValue({
        output: { result: "ok" },
        cached: false,
        status: "processado",
        model: "gemini-3.6-flash",
        durationMs: 120,
      });

      const tiers: Array<"rapida" | "inteligente" | "profunda"> = [
        "rapida",
        "inteligente",
        "profunda",
      ];

      for (const tier of tiers) {
        const task: AiTask = {
          type: `test.${tier}`,
          tier,
          inputRef: { sample: true },
        };

        const res = await runAiTask(task);
        expect(res.status).toBe("processado");
        expect(res.output).toEqual({ result: "ok" });
      }

      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  describe("3. Comportamento de Cache Hit / Miss", () => {
    it("retorna cached=true quando o servidor responde a partir do ai_results", async () => {
      vi.spyOn(gatewayServerFnModule, "serverExecuteAiTask").mockResolvedValue({
        output: { recommendation: "Estudar Direito Constitucional" },
        cached: true,
        status: "processado",
        model: "gemini-3.6-flash",
        durationMs: 5,
      });

      const task: AiTask = {
        type: "coach.recommendation",
        tier: "inteligente",
        inputRef: { userId: "user-1" },
      };

      const res = await runAiTask<{ recommendation: string }>(task);

      expect(res.cached).toBe(true);
      expect(res.status).toBe("processado");
      expect(res.output?.recommendation).toBe("Estudar Direito Constitucional");
    });

    it("retorna cached=false quando a tarefa precisa ser processada pelo modelo", async () => {
      vi.spyOn(gatewayServerFnModule, "serverExecuteAiTask").mockResolvedValue({
        output: { recommendation: "Nova recomendação" },
        cached: false,
        status: "processado",
        model: "gemini-3.6-flash",
        durationMs: 340,
      });

      const task: AiTask = {
        type: "coach.recommendation",
        tier: "inteligente",
        inputRef: { userId: "user-2" },
      };

      const res = await runAiTask<{ recommendation: string }>(task);

      expect(res.cached).toBe(false);
      expect(res.status).toBe("processado");
      expect(res.output?.recommendation).toBe("Nova recomendação");
    });
  });

  describe("4. Resiliência e Tratameno Semântico de Erros (Fallback)", () => {
    it("trata erro no servidor sem lançar exceção não capturada", async () => {
      vi.spyOn(gatewayServerFnModule, "serverExecuteAiTask").mockRejectedValue(
        new Error("Erro de rede / timeout na server function"),
      );

      const task: AiTask = {
        type: "coach.recommendation",
        tier: "inteligente",
        inputRef: { userId: "user-3" },
      };

      const res = await runAiTask(task);

      expect(res.status).toBe("erro");
      expect(res.output).toBeNull();
      expect(res.errorMessage).toContain("Erro de rede");
    });

    it("retorna resposta com status erro quando chave GEMINI_API_KEY está ausente", async () => {
      vi.spyOn(gatewayServerFnModule, "serverExecuteAiTask").mockResolvedValue({
        output: null,
        cached: false,
        status: "erro",
        errorMessage: "Chave de API Gemini não configurada no servidor (GEMINI_API_KEY).",
        durationMs: 0,
      });

      const task: AiTask = {
        type: "coach.recommendation",
        tier: "inteligente",
        inputRef: { userId: "user-4" },
      };

      const res = await runAiTask(task);

      expect(res.status).toBe("erro");
      expect(res.output).toBeNull();
      expect(res.errorMessage).toContain("GEMINI_API_KEY");
    });
  });

  describe("5. Segurança & Secrets", () => {
    it("não expõe chaves privadas ou tokens no objeto retornado", async () => {
      vi.spyOn(gatewayServerFnModule, "serverExecuteAiTask").mockResolvedValue({
        output: { summary: "Análise realizada" },
        cached: false,
        status: "processado",
        model: "gemini-3.6-flash",
        durationMs: 200,
      });

      const task: AiTask = {
        type: "coach.summary",
        tier: "rapida",
        inputRef: { id: "secret-check" },
      };

      const res = await runAiTask(task);

      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain("GEMINI_API_KEY");
      expect(serialized).not.toContain("AI_SECRET");
    });
  });
});
