/**
 * SUÍTE DE TESTES DE PERSISTÊNCIA COGNITIVA E IDEMPOTÊNCIA — FASE 7.3.4
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sanitizeSocraticMetadata,
  generateSocraticIdempotencyKey,
  isSocraticEvidenceRecorded,
  markSocraticEvidenceRecorded,
  saveSocraticSession,
  loadSocraticSession,
  calculateSocraticCognitiveScore,
  emitSocraticCognitiveEvidence,
} from "./socratic-persistence";
import { SOCRATIC_EVIDENCE_KINDS } from "./types";
import type { SocraticSessionContext, SocraticTurnSummary } from "./types";
import * as evidenceServiceModule from "@/lib/evidence/service";
import * as errorCentralModule from "@/lib/error-central/service";
import * as knowledgeServiceModule from "@/lib/knowledge/service";
import { supabase } from "@/integrations/supabase/client";

describe("Persistência Cognitiva do Professor Fiscal — Fase 7.3.4", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Sanitização de Metadados e Segurança", () => {
    it("remove dados sensíveis como API keys, bearer tokens, passwords e prompts privados", () => {
      const rawMeta = {
        topicId: "top-101",
        apiKey: "sk-proj-secret-12345",
        bearerToken: "Bearer eyJhbGci...",
        password: "supersecretpass",
        privatePrompt: "Instruções confidenciais do sistema...",
        legalMetadata: {
          legalSourceUsed: ["CF88_ART150"],
          legalGrounded: true,
          systemPrompt: "Você é um tutor...",
        },
        userCredentials: {
          jwt: "abc.def.ghi",
          role: "student",
        },
      };

      const sanitized = sanitizeSocraticMetadata(rawMeta);

      expect(sanitized['topicId']).toBe("top-101");
      expect(sanitized['apiKey']).toBeUndefined();
      expect(sanitized['bearerToken']).toBeUndefined();
      expect(sanitized['password']).toBeUndefined();
      expect(sanitized['privatePrompt']).toBeUndefined();

      const nestedLegal = sanitized['legalMetadata'] as any;
      expect(nestedLegal.legalSourceUsed).toEqual(["CF88_ART150"]);
      expect(nestedLegal.legalGrounded).toBe(true);
      expect(nestedLegal.systemPrompt).toBeUndefined();

      const nestedCreds = sanitized['userCredentials'] as any;
      expect(nestedCreds.role).toBe("student");
      expect(nestedCreds.jwt).toBeUndefined();
    });
  });

  describe("2. Idempotência e Prevenção de Duplicatas", () => {
    it("gera chave de idempotência determinística no formato esperado", () => {
      const key = generateSocraticIdempotencyKey({
        userId: "user-734",
        sessionId: "soc-999",
        turnNumber: 2,
        socraticEvidenceKind: SOCRATIC_EVIDENCE_KINDS.HINT,
      });

      expect(key).toBe("user-734:soc-999:2:SOCRATIC_HINT");
    });

    it("evita emissão duplicada de evidência quando a mesma chave já foi registrada", async () => {
      const key = "user-734:soc-999:1:SOCRATIC_ATTEMPT";

      expect(await isSocraticEvidenceRecorded(key)).toBe(false);

      await markSocraticEvidenceRecorded(key, "user-734");

      expect(await isSocraticEvidenceRecorded(key)).toBe(true);
    });
  });

  describe("3. Persistência de Sessão Socrática", () => {
    it("persiste e recarrega o contexto de sessão socrática", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "user-test-734" } as any },
        error: null,
      });

      const mockSession: SocraticSessionContext = {
        sessionId: "soc-persist-001",
        topicId: "top-ctn-111",
        topicName: "Interpretação da Legislação Tributária",
        pedagogicalGoal: "Dominar Art. 111 do CTN",
        pedagogicalMode: "QUESTION_ANALYSIS",
        currentState: "QUESTION",
        currentTurnNumber: 1,
        hintLevel: 0,
        turnHistory: [],
        constraints: { maxHints: 3, maxTurns: 6, allowDirectExplanationAfterMaxHints: true },
        validTopicNames: ["Interpretação da Legislação Tributária"],
      };

      const saved = await saveSocraticSession(mockSession, "user-test-734");
      expect(saved).toBe(true);

      const loaded = await loadSocraticSession("soc-persist-001");
      expect(loaded).toBeDefined();
      expect(loaded?.sessionId).toBe("soc-persist-001");
      expect(loaded?.topicId).toBe("top-ctn-111");
    });
  });

  describe("4. Cálculo de Pontuação Cognitiva Socrática", () => {
    it("calcula score 1.0 para acerto direto sem pistas", () => {
      const score = calculateSocraticCognitiveScore({
        classification: "CORRECT",
        hintLevel: 0,
        currentState: "CONSOLIDATING",
        pedagogicalMode: "QUESTION_ANALYSIS",
      });
      expect(score).toBe(1.0);
    });

    it("pondera o score de acordo com o nível de pista utilizado", () => {
      expect(
        calculateSocraticCognitiveScore({
          classification: "CORRECT",
          hintLevel: 1,
          currentState: "CONSOLIDATING",
          pedagogicalMode: "QUESTION_ANALYSIS",
        }),
      ).toBe(0.8);

      expect(
        calculateSocraticCognitiveScore({
          classification: "CORRECT",
          hintLevel: 2,
          currentState: "CONSOLIDATING",
          pedagogicalMode: "QUESTION_ANALYSIS",
        }),
      ).toBe(0.6);

      expect(
        calculateSocraticCognitiveScore({
          classification: "CORRECT",
          hintLevel: 3,
          currentState: "CONSOLIDATING",
          pedagogicalMode: "QUESTION_ANALYSIS",
        }),
      ).toBe(0.4);
    });

    it("retorna 0.0 para respostas incorretas", () => {
      expect(
        calculateSocraticCognitiveScore({
          classification: "INCORRECT",
          hintLevel: 1,
          currentState: "CORRECTING",
          pedagogicalMode: "QUESTION_ANALYSIS",
        }),
      ).toBe(0.0);
    });
  });

  describe("5. Emissão e Propagação de Evidências Cognitivas Socráticas", () => {
    it("emite evidência e propaga para Central de Erros e Review Engine no momento do sucesso", async () => {
      const recordEvSpy = vi
        .spyOn(evidenceServiceModule, "recordCognitiveEvidence")
        .mockResolvedValue({
          processed: true,
          evidence: {} as any,
          skipReason: null,
        });

      const remediateSpy = vi
        .spyOn(errorCentralModule, "remediateErrorEntry")
        .mockResolvedValue({} as any);

      const reviewSpy = vi
        .spyOn(knowledgeServiceModule, "recordReviewKnowledge")
        .mockResolvedValue({} as any);

      const socraticContext: SocraticSessionContext = {
        sessionId: "soc-flow-999",
        topicId: "top-ctn-111",
        topicName: "Interpretação da Legislação Tributária",
        pedagogicalGoal: "Interpretação do Art. 111",
        pedagogicalMode: "ERROR_REMEDIATION",
        currentState: "CONSOLIDATING",
        currentTurnNumber: 2,
        hintLevel: 1,
        turnHistory: [
          {
            turnNumber: 2,
            state: "CONSOLIDATING",
            action: "CONSOLIDATE",
            studentAnswerText: "A outorga de isenção interpreta-se literalmente.",
            evaluationClassification: "CORRECT",
            hintLevel: 1,
            timestamp: new Date().toISOString(),
          },
        ],
        constraints: { maxHints: 3, maxTurns: 6, allowDirectExplanationAfterMaxHints: true },
        validTopicNames: ["Interpretação da Legislação Tributária"],
        contextMetadata: {
          errorContext: {
            errorEntryId: "err-entry-734",
          },
        },
      };

      const result = await emitSocraticCognitiveEvidence({
        socraticContext,
        lastTurn: socraticContext.turnHistory[0] as SocraticTurnSummary,
        userId: "user-test-734",
        socraticResponse: {
          status: "completed",
          pedagogicalMode: "ERROR_REMEDIATION",
          action: "CONSOLIDATE",
          hintLevel: 1,
          confidenceScore: 0.9,
          shouldContinue: false,
          evaluation: {
            classification: "CORRECT",
            confidence: 0.9,
            reasoningQuality: "solido",
            needsHint: false,
            recommendedNextStep: "CONSOLIDATE",
          },
        } as any,
      });

      expect(recordEvSpy).toHaveBeenCalled();
      expect(remediateSpy).toHaveBeenCalledWith({
        errorEntryId: "err-entry-734",
        result: "success",
        timestamp: expect.any(String),
      });
      expect(result.emittedKinds).toContain(SOCRATIC_EVIDENCE_KINDS.SUCCESS);
      expect(result.errorRemediated).toBe(true);

      // Testar chamada subsequente com os mesmos parâmetros para garantir idempotência
      const duplicateResult = await emitSocraticCognitiveEvidence({
        socraticContext,
        lastTurn: socraticContext.turnHistory[0] as SocraticTurnSummary,
        userId: "user-test-734",
      });

      expect(duplicateResult.emittedKinds).toHaveLength(0);
      expect(duplicateResult.skippedKeys.length).toBeGreaterThan(0);
    });
  });
});
