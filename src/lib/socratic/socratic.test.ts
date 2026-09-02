/**
 * SUÍTE DE TESTES — FASE 7.3.1 (SOCRATIC ENGINE CORE — PROFESSOR FISCAL)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateSocraticCachePayload,
  compactSessionContext,
  computeNextStateAndAction,
  createInitialSessionContext,
  detectRepetition,
} from "./engine";
import { SOCRATIC_PROMPT_VERSION, SOCRATIC_SYSTEM_PROMPT } from "./prompts";
import { processSocraticTurn } from "./service";
import type { SocraticSessionContext, StudentResponseEvaluation } from "./types";
import { validateSocraticResponse } from "./validators";
import * as gatewayModule from "@/services/ai/gateway";

describe("Socratic Engine Core — Fase 7.3.1", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. State Machine & Deterministic Controller", () => {
    it("cria um contexto inicial com defaults corretos e lista de tópicos válidos", () => {
      const ctx = createInitialSessionContext({
        topicId: "top-101",
        topicName: "Lançamento Tributário",
        subjectName: "Direito Tributário",
        pedagogicalGoal: "Compreender as modalidades de lançamento",
        validTopicNames: ["Crédito Tributário"],
      });

      expect(ctx.sessionId).toBeDefined();
      expect(ctx.currentState).toBe("QUESTION");
      expect(ctx.hintLevel).toBe(0);
      expect(ctx.currentTurnNumber).toBe(1);
      expect(ctx.constraints.maxHints).toBe(3);
      expect(ctx.validTopicNames).toContain("Lançamento Tributário");
      expect(ctx.validTopicNames).toContain("Direito Tributário");
      expect(ctx.validTopicNames).toContain("Crédito Tributário");
    });

    it("prevê transição inicial para ASK quando em estado QUESTION", () => {
      const ctx = createInitialSessionContext({
        topicId: "top-101",
        topicName: "Lançamento Tributário",
        pedagogicalGoal: "Compreender as modalidades de lançamento",
      });

      const next = computeNextStateAndAction(ctx);
      expect(next.nextState).toBe("WAITING_FOR_ANSWER");
      expect(next.nextAction).toBe("ASK");
      expect(next.nextHintLevel).toBe(0);
      expect(next.shouldContinue).toBe(true);
    });

    it("avança para CONSOLIDATING quando a avaliação for CORRECT", () => {
      const ctx = createInitialSessionContext({
        topicId: "top-101",
        topicName: "Lançamento Tributário",
        pedagogicalGoal: "Compreender as modalidades de lançamento",
      });

      const evalCorrect: StudentResponseEvaluation = {
        classification: "CORRECT",
        confidence: 0.95,
        reasoningQuality: "excelente",
        needsHint: false,
        recommendedNextStep: "CONSOLIDATE",
      };

      const next = computeNextStateAndAction(ctx, evalCorrect);
      expect(next.nextState).toBe("CONSOLIDATING");
      expect(next.nextAction).toBe("CONSOLIDATE");
      expect(next.shouldContinue).toBe(false);
    });

    it("progride gradualmente os níveis de pistas para respostas INCORRECT", () => {
      let ctx = createInitialSessionContext({
        topicId: "top-101",
        topicName: "Lançamento Tributário",
        pedagogicalGoal: "Compreender as modalidades de lançamento",
      });

      const evalIncorrect: StudentResponseEvaluation = {
        classification: "INCORRECT",
        confidence: 0.8,
        reasoningQuality: "fragil",
        needsHint: true,
        recommendedNextStep: "HINT",
      };

      // Turno 1 -> Hint Level 1
      let next = computeNextStateAndAction(ctx, evalIncorrect);
      expect(next.nextState).toBe("HINT_1");
      expect(next.nextAction).toBe("HINT");
      expect(next.nextHintLevel).toBe(1);

      // Atualiza hintLevel para 1 e simula próximo erro
      ctx = { ...ctx, hintLevel: 1 };
      next = computeNextStateAndAction(ctx, evalIncorrect);
      expect(next.nextState).toBe("HINT_2");
      expect(next.nextAction).toBe("HINT");
      expect(next.nextHintLevel).toBe(2);

      // Atualiza hintLevel para 2 e simula próximo erro
      ctx = { ...ctx, hintLevel: 2 };
      next = computeNextStateAndAction(ctx, evalIncorrect);
      expect(next.nextState).toBe("HINT_3");
      expect(next.nextAction).toBe("HINT");
      expect(next.nextHintLevel).toBe(3);

      // Atualiza hintLevel para 3 (maxHints) -> passa para EXPLAIN
      ctx = { ...ctx, hintLevel: 3 };
      next = computeNextStateAndAction(ctx, evalIncorrect);
      expect(next.nextState).toBe("CORRECTING");
      expect(next.nextAction).toBe("EXPLAIN");
    });
  });

  describe("2. Detecção de Repetição e Compactação de Contexto", () => {
    it("detecta repetição de perguntas ou pistas parecidas no histórico", () => {
      const history = [
        {
          turnNumber: 1,
          state: "HINT_1" as const,
          action: "HINT" as const,
          questionOrHintText: "Qual a diferença entre lançamento por homologação e de ofício?",
          hintLevel: 1,
          timestamp: "2026-08-31T10:00:00Z",
        },
      ];

      expect(
        detectRepetition(history, "Qual a diferença entre lançamento por homologação e de ofício?"),
      ).toBe(true);

      expect(
        detectRepetition(history, "Como funciona a notificação do sujeito passivo no IPTU?"),
      ).toBe(false);
    });

    it("compacta o contexto enviando no máximo os últimos 3 turnos para a IA", () => {
      const ctx: SocraticSessionContext = {
        sessionId: "soc_123",
        topicId: "top-1",
        topicName: "Lançamento Tributário",
        pedagogicalGoal: "Compreender lançamento",
        pedagogicalMode: "ACTIVE_RECALL",
        currentState: "HINT_2",
        currentTurnNumber: 5,
        hintLevel: 2,
        turnHistory: Array.from({ length: 6 }).map((_, i) => ({
          turnNumber: i + 1,
          state: "HINT_1",
          action: "HINT",
          questionOrHintText: `Pergunta ${i + 1}`,
          hintLevel: 1,
          timestamp: "2026-08-31T10:00:00Z",
        })),
        constraints: { maxHints: 3, maxTurns: 6, allowDirectExplanationAfterMaxHints: true },
        validTopicNames: ["Lançamento Tributário"],
      };

      const compacted = compactSessionContext(ctx);
      const historyArr = compacted['history'] as unknown[];
      expect(historyArr.length).toBe(3);
    });

    it("calcula hash de cache que varia com a resposta do aluno e com o nível de pista", () => {
      const ctx = createInitialSessionContext({
        topicId: "top-1",
        topicName: "Lançamento Tributário",
        pedagogicalGoal: "Objetivo",
      });

      const payloadAnswerA = calculateSocraticCachePayload(
        ctx,
        "O lançamento de ofício é feito pelo fisco.",
      );
      const payloadAnswerB = calculateSocraticCachePayload(
        ctx,
        "É feito pelo próprio contribuinte.",
      );

      expect(payloadAnswerA['studentAnswerText']).not.toBe(payloadAnswerB['studentAnswerText']);

      const payloadHint0 = calculateSocraticCachePayload({ ...ctx, hintLevel: 0 });
      const payloadHint1 = calculateSocraticCachePayload({ ...ctx, hintLevel: 1 });

      expect(payloadHint0['hintLevel']).not.toBe(payloadHint1['hintLevel']);
    });
  });

  describe("3. Prompts e Guardrails de Validação", () => {
    it("versão do prompt socrático é '7.3.1'", () => {
      expect(SOCRATIC_PROMPT_VERSION).toBe("7.3.1");
      expect(SOCRATIC_SYSTEM_PROMPT).toContain("PROFESSOR FISCAL");
      expect(SOCRATIC_SYSTEM_PROMPT).toContain("REGRA DE NÃO-ENTREGA PREMATURA");
    });

    it("valida e aceita uma resposta socrática bem formatada", () => {
      const payload = {
        status: "active",
        pedagogicalMode: "ACTIVE_RECALL",
        action: "HINT",
        question: "Pense sobre quem tem o dever de calcular o imposto antes do pagamento.",
        hintLevel: 1,
        evaluation: {
          classification: "PARTIALLY_CORRECT",
          confidence: 0.85,
          identifiedGap: "Confundiu lançamento por homologação com declaração.",
          reasoningQuality: "fragil",
          needsHint: true,
          recommendedNextStep: "HINT",
        },
        confidenceScore: 0.9,
        shouldContinue: true,
      };

      const ctx = createInitialSessionContext({
        topicId: "top-1",
        topicName: "Lançamento Tributário",
        pedagogicalGoal: "Compreender lançamento",
      });

      const validated = validateSocraticResponse(payload, ctx);
      expect(validated.action).toBe("HINT");
      expect(validated.question).toContain("Pense sobre quem tem o dever");
      expect(validated.evaluation?.classification).toBe("PARTIALLY_CORRECT");
    });

    it("rejeita ação HINT que tente entregar uma explicação completa vazada", () => {
      const leakedPayload = {
        status: "active",
        pedagogicalMode: "ACTIVE_RECALL",
        action: "HINT",
        question: "Aqui está a pista.",
        explanation:
          "O artigo 150 do CTN estabelece que o lançamento por homologação ocorre quando a lei atribui ao sujeito passivo o dever de antecipar o pagamento.", // Explicação longa vazada
        hintLevel: 1,
      };

      const ctx = createInitialSessionContext({
        topicId: "top-1",
        topicName: "Lançamento Tributário",
        pedagogicalGoal: "Compreender lançamento",
      });

      expect(() => validateSocraticResponse(leakedPayload, ctx)).toThrow(
        /Violação do Guardrail Socrático: Ação 'HINT' forneceu uma explicação completa/,
      );
    });

    it("rejeita pista que contenha a resposta correta explícita da questão", () => {
      const leakedAnswerPayload = {
        status: "active",
        pedagogicalMode: "ACTIVE_RECALL",
        action: "HINT",
        question: "A resposta correta é homologação tácita.",
        hintLevel: 1,
      };

      const ctx = createInitialSessionContext({
        topicId: "top-1",
        topicName: "Lançamento Tributário",
        pedagogicalGoal: "Compreender lançamento",
        currentQuestion: {
          statement: "Como se chama a aprovação expressa ou tácita do pagamento?",
          correctAnswer: "Homologação tácita",
          targetConcept: "Lançamento por homologação",
        },
      });

      expect(() => validateSocraticResponse(leakedAnswerPayload, ctx)).toThrow(
        /Violação do Guardrail Socrático: A pista gerada contém a resposta correta explícita/,
      );
    });
  });

  describe("4. Processamento do Turno no Socratic Service e AI Gateway", () => {
    it("processa um turno completo interagindo com o AI Gateway", async () => {
      const ctx = createInitialSessionContext({
        topicId: "top-1",
        topicName: "Lançamento Tributário",
        pedagogicalGoal: "Compreender lançamento",
      });

      vi.spyOn(gatewayModule, "runAiTask").mockResolvedValue({
        output: {
          status: "active",
          pedagogicalMode: "ACTIVE_RECALL",
          action: "ASK",
          question:
            "Em qual modalidade de lançamento o contribuinte calcula e paga sem prévio exame do Fisco?",
          hintLevel: 0,
          confidenceScore: 0.95,
          shouldContinue: true,
        },
        cached: false,
        status: "processado",
        model: "gemini-3.6-flash",
        durationMs: 320,
      });

      const result = await processSocraticTurn(ctx);

      expect(result.status).toBe("processado");
      expect(result.response?.action).toBe("ASK");
      expect(result.response?.question).toContain("Em qual modalidade de lançamento");
      expect(result.updatedContext.currentTurnNumber).toBe(2);
      expect(result.updatedContext.turnHistory.length).toBe(1);
    });

    it("trata erros de infraestrutura no AI Gateway aplicando fallback gracioso determinístico", async () => {
      const ctx = createInitialSessionContext({
        topicId: "top-1",
        topicName: "Lançamento Tributário",
        pedagogicalGoal: "Compreender lançamento",
      });

      vi.spyOn(gatewayModule, "runAiTask").mockResolvedValue({
        output: null,
        cached: false,
        status: "erro",
        errorMessage: "Serviço temporariamente indisponível.",
      });

      const result = await processSocraticTurn(ctx, "O contribuinte antecipa o pagamento.");

      expect(result.status).toBe("erro");
      expect(result.response).toBeDefined();
      expect(result.response?.question).toContain("Lançamento Tributário");
      expect(result.updatedContext.turnHistory.length).toBe(1);
    });
  });
});
