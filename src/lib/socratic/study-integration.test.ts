/**
 * SUÍTE DE TESTES DE INTEGRAÇÃO — FASE 7.3.3
 * (INTEGRAÇÃO DO PROFESSOR FISCAL AO FLUXO REAL DE ESTUDO)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  startStudySocraticSession,
  executeStudySocraticTurn,
  submitAnswerWithSocraticFeedback,
} from "./study-integration";
import * as legalModule from "@/lib/legal/service";
import * as attemptServiceModule from "@/lib/questions/attempt-service";
import * as evidenceServiceModule from "@/lib/evidence/service";
import * as errorCentralModule from "@/lib/error-central/service";
import { supabase } from "@/integrations/supabase/client";

describe("Integração do Professor Fiscal ao Fluxo Real de Estudo — Fase 7.3.3", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Inicialização da Sessão Socrática no Estudo", () => {
    it("inicializa uma sessão socrática para análise de questão de Direito Tributário", () => {
      const ctx = startStudySocraticSession({
        topicId: "top-icms-01",
        topicName: "Imunidades Tributárias",
        subjectName: "Direito Tributário",
        questionContext: {
          questionId: "q-100",
          statement: "A imunidade de livros, jornais e periódicos abrange os leitores e-books?",
          options: ["Sim", "Não"],
          correctAnswer: "Sim",
          targetConcept: "Imunidade Cultural - Art. 150, VI, d da CF",
        },
      });

      expect(ctx.sessionId).toMatch(/^socratic_/);
      expect(ctx.topicId).toBe("top-icms-01");
      expect(ctx.pedagogicalMode).toBe("QUESTION_ANALYSIS");
      expect(ctx.currentState).toBe("QUESTION");
      expect(ctx.currentQuestion?.questionId).toBe("q-100");
      expect(ctx.pedagogicalGoal).toContain("Imunidade Cultural");
    });

    it("inicializa sessão socrática com modo ERROR_REMEDIATION quando atrelado a um erro", () => {
      const ctx = startStudySocraticSession({
        topicId: "top-ctn-111",
        topicName: "Interpretação da Legislação Tributária",
        errorContext: {
          errorEntryId: "err-999",
          errorCategory: "excecao_normativa",
          isRecurring: true,
        },
      });

      expect(ctx.pedagogicalMode).toBe("ERROR_REMEDIATION");
      expect(ctx.contextMetadata?.errorContext).toEqual({
        errorEntryId: "err-999",
        errorCategory: "excecao_normativa",
        isRecurring: true,
      });
    });
  });

  describe("2. Execução do Turno Socrático com Grounding Jurídico e Evidências", () => {
    it("processa um turno socrático completo com RAG jurídico e registra evidência em caso de consolidação", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "user-test-733" } as any },
        error: null,
      });

      const mockProcessTurn = vi.spyOn(legalModule, "processLegalSocraticTurn").mockResolvedValue({
        status: "processado",
        cached: false,
        updatedContext: {
          sessionId: "soc-123",
          topicId: "top-150",
          topicName: "Princípio da Anterioridade",
          pedagogicalGoal: "Anterioridade tributária",
          pedagogicalMode: "QUESTION_ANALYSIS",
          currentState: "CONSOLIDATING",
          currentTurnNumber: 2,
          hintLevel: 1,
          turnHistory: [
            {
              turnNumber: 1,
              state: "CONSOLIDATING",
              action: "CONSOLIDATE",
              questionOrHintText:
                "Exatamente! A anterioridade nonagesimal exige o decurso de 90 dias.",
              evaluationClassification: "CORRECT",
              hintLevel: 1,
              timestamp: "2026-08-31T12:00:00Z",
            },
          ],
          constraints: { maxHints: 3, maxTurns: 6, allowDirectExplanationAfterMaxHints: true },
          validTopicNames: ["Princípio da Anterioridade"],
        },
        response: {
          status: "completed",
          pedagogicalMode: "QUESTION_ANALYSIS",
          action: "CONSOLIDATE",
          explanation: "Excelente raciocínio. O Art. 150, III, c da CF exige noventena.",
          hintLevel: 1,
          confidenceScore: 0.95,
          shouldContinue: false,
        },
        legalEvidenceMetadata: {
          legalSourceUsed: ["CF88_ART150"],
          legalGrounded: true,
          sourceCount: 1,
          targetConcept: "Anterioridade Nonagesimal",
          retrievalMethod: "topic_match",
        },
      });

      const recordEvSpy = vi
        .spyOn(evidenceServiceModule, "recordCognitiveEvidence")
        .mockResolvedValue({
          processed: true,
          evidence: {} as any,
          skipReason: null,
        });

      const ctx = startStudySocraticSession({
        topicId: "top-150",
        topicName: "Princípio da Anterioridade",
      });

      const result = await executeStudySocraticTurn({
        socraticContext: ctx,
        studentAnswerText:
          "A anterioridade nonagesimal requer 90 dias entre a publicação e a cobrança.",
      });

      expect(mockProcessTurn).toHaveBeenCalled();
      expect(recordEvSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-test-733",
          topicId: "top-150",
          kind: "practice",
          source: "socratic_tutor",
          score: expect.any(Number),
        }),
      );
      expect(result.consolidated).toBe(true);
      expect(result.evidenceProcessed).toBe(true);
    });
  });

  describe("3. Submissão de Resposta com Orientação do Professor Fiscal", () => {
    it("submete resposta via attempt-service e gera orientação socrática fundamentada quando habilitada", async () => {
      const mockSubmitAnswer = vi.spyOn(attemptServiceModule, "submitAnswer").mockResolvedValue({
        attemptId: "att-733",
        attemptNumber: 1,
        feedback: {
          attemptId: "att-733",
          questionId: "q-200",
          isCorrect: false,
          isFirstAttempt: true,
          currentStreak: -1,
          difficulty: 3,
          topicId: "top-ctn-111",
          subjectId: "sub-dir-trib",
          shouldCreateError: true,
          suggestedErrorCategory: "interpretação_normativa",
          knowledgeUpdateReason: "Erro na primeira tentativa",
        },
        updatedStats: {} as any,
        errorCreated: true,
        errorEntryId: "err-555",
        knowledgeUpdated: true,
      });

      vi.spyOn(legalModule, "processLegalSocraticTurn").mockResolvedValue({
        status: "processado",
        cached: false,
        updatedContext: {
          sessionId: "soc-999",
          topicId: "top-ctn-111",
          topicName: "Interpretação da Legislação Tributária",
          pedagogicalGoal: "Entender exegese do Art. 111 do CTN",
          pedagogicalMode: "ERROR_REMEDIATION",
          currentState: "HINT_1",
          currentTurnNumber: 1,
          hintLevel: 1,
          turnHistory: [],
          constraints: { maxHints: 3, maxTurns: 6, allowDirectExplanationAfterMaxHints: true },
          validTopicNames: ["Interpretação da Legislação Tributária"],
        },
        response: {
          status: "active",
          pedagogicalMode: "ERROR_REMEDIATION",
          action: "HINT",
          question:
            "Lembre-se do Art. 111 do CTN: a outorga de isenção interpreta-se de qual forma?",
          hintLevel: 1,
          confidenceScore: 0.9,
          shouldContinue: true,
        },
        legalEvidenceMetadata: {
          legalSourceUsed: ["CTN_ART111"],
          legalGrounded: true,
          sourceCount: 1,
          targetConcept: "Interpretação Literal",
          retrievalMethod: "topic_match",
        },
      });

      const res = await submitAnswerWithSocraticFeedback({
        questionId: "q-200",
        chosenAnswer: "A",
        isCorrect: false,
        timeSpentSeconds: 45,
        mode: "estudo",
        enableSocraticTutor: true,
        topicName: "Interpretação da Legislação Tributária",
        questionStatement: "Como se interpreta a legislação tributária que outorga isenção?",
        correctAnswer: "Literalmente",
      });

      expect(mockSubmitAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          questionId: "q-200",
          chosenAnswer: "A",
          isCorrect: false,
        }),
      );

      expect(res.attemptId).toBe("att-733");
      expect(res.socraticContext).toBeDefined();
      expect(res.socraticResponse?.action).toBe("HINT");
      expect(res.socraticResponse?.question).toContain("Art. 111 do CTN");
      expect(res.legalEvidenceMetadata?.legalGrounded).toBe(true);
    });
  });
});
