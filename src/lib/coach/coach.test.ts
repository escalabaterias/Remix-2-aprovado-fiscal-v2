/**
 * SUÍTE DE TESTES — FASE 7.2.1 (MENTOR INTELLIGENCE UPGRADE)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCoachContext } from "./context-builder";
import { COACH_PROMPT_VERSION, COACH_SYSTEM_PROMPT, validateCoachGuidance } from "./prompts";
import { getDailyCoachGuidance } from "./service";
import { buildStudentProfileContext, generateCoachPrompt, processCoachChat } from "./coachEngine";
import * as gatewayModule from "@/services/ai/gateway";

vi.mock("@/integrations/supabase/client", () => {
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-123" } },
      error: null,
    }),
  };

  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  return {
    supabase: {
      auth: mockAuth,
      from: mockFrom,
    },
  };
});

describe("Coach de IA Proativo — Fase 7.2.1 Mentor Intelligence Upgrade", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Multidimensional Context Builder", () => {
    it("agrupa diagnósticos críticos, sinais multidimensionais e pré-requisitos não cumpridos", () => {
      const context = buildCoachContext({
        diagnoses: [
          {
            topicId: "top-1",
            topicName: "Crédito Tributário",
            subjectId: "subj-1",
            subjectName: "Direito Tributário",
            state: "CRITICO",
            priority: "URGENCIA_MAXIMA",
            riskLevel: "ELEVADO",
            recommendedIntervention: "REVISAO_IMEDIATA",
            scores: { mastery: 0.3, confidence: 0.4, decayRisk: 0.8, errorRecency: 0.9 },
            recommendedQuestions: 15,
            urgencyScore: 9,
            knowledgeState: "FRAGIL",
            interventionScore: 0.9,
            signals: {
              daysSinceStudy: 14,
              unresolvedErrors: 5,
              recurringErrors: 2,
              accuracy: 0.35,
              attemptCount: 20,
              recentAccuracy: 0.2,
            },
          },
        ],
        reviewQueue: [
          {
            topicId: "top-1",
            reviewUrgency: 0.9,
            needsReview: true,
            suggestedReviewDate: "2026-08-31",
            reviewInterval: 1,
            reviewReason: "Risco elevado",
            reviewIntensity: "intensiva",
            reviewType: "recuperacao",
            urgencyCategory: "CRITICA",
            input: {
              topicId: "Crédito Tributário",
              mastery: 0.3,
              confidence: 0.4,
              accuracy: 0.35,
              knowledgeState: "FRAGIL",
              interventionScore: 0.9,
              daysSinceStudy: 14,
              unresolvedErrors: 5,
              recurringErrors: 2,
              lastReviewDate: "2026-08-15",
              reviewCount: 3,
              lastReviewResult: "fail",
              referenceDate: "2026-08-31",
            },
          },
        ],
        errorSummaries: [
          {
            topicId: "top-1",
            topicName: "Crédito Tributário",
            subjectId: "subj-1",
            subjectName: "Direito Tributário",
            unresolvedCount: 5,
            totalCount: 5,
          },
        ],
        prerequisites: [
          {
            topic_id: "top-1",
            prerequisite_topic_id: "top-prereq-1",
            topic_name: "Crédito Tributário",
            prerequisite_topic_name: "Obrigação Tributária",
            prerequisite_mastery: 0.2,
          },
        ],
        contestTopics: [
          {
            topic_id: "top-1",
            topic_name: "Crédito Tributário",
            subject_name: "Direito Tributário",
            weight: 3.5,
            incidence_score: 0.95,
            relevance_score: 0.98,
            in_edital: true,
          },
        ],
        todayTasks: [],
        activeContest: { name: "Auditor Fiscal Receita Federal" },
      });

      expect(context.hasEnoughData).toBe(true);
      expect(context.diagnosesSummary.criticalCount).toBe(1);

      const topCrit = context.diagnosesSummary.topCriticalTopics[0];
      expect(topCrit.topicName).toBe("Crédito Tributário");
      expect(topCrit.masteryPercent).toBe(30);
      expect(topCrit.decayRiskPercent).toBe(80);
      expect(topCrit.accuracyPercent).toBe(35);
      expect(topCrit.hasUnmetPrerequisites).toBe(true);
      expect(topCrit.unmetPrerequisiteNames).toContain("Obrigação Tributária");
      expect(topCrit.contestWeight).toBe(3.5);

      expect(context.reviewsSummary.topUrgentReviews[0].reviewType).toBe("RECUPERAÇÃO");
      expect(context.prerequisitesSummary?.unmetDependenciesCount).toBe(1);
      expect(context.prerequisitesSummary?.blockedTopicNames).toContain("Crédito Tributário");

      expect(context.validTopicNames).toContain("Crédito Tributário");
      expect(context.validTopicNames).toContain("Obrigação Tributária");
      expect(context.validTopicNames).toContain("Direito Tributário");
    });

    it("identifica corretamente a ausência de dados (hasEnoughData: false)", () => {
      const context = buildCoachContext({
        diagnoses: [],
        reviewQueue: [],
        errorSummaries: [],
        prerequisites: [],
        contestTopics: [],
        todayTasks: [],
        activeContest: null,
      });

      expect(context.hasEnoughData).toBe(false);
      expect(context.diagnosesSummary.totalTopics).toBe(0);
      expect(context.validTopicNames.length).toBe(0);
    });
  });

  describe("2. Prompts, Versão & Guardrails Socráticos", () => {
    it("utiliza a versão '7.2.1' para o prompt do Coach", () => {
      expect(COACH_PROMPT_VERSION).toBe("7.2.1");
    });

    it("o prompt do sistema exige respeito estrito às prioridades determinísticas e pré-requisitos", () => {
      expect(COACH_SYSTEM_PROMPT).toContain("REGRA ARQUITETURAL ABSOLUTA");
      expect(COACH_SYSTEM_PROMPT).toContain(
        "NÃO altera nem contradiz as prioridades determinísticas",
      );
      expect(COACH_SYSTEM_PROMPT).toContain("RESPEITO A PRÉ-REQUISITOS");
      expect(COACH_SYSTEM_PROMPT).toContain("TIPOS DE REVISÃO");
    });
  });

  describe("3. Validação Programática do Output e Grounding do Tópico", () => {
    it("valida e normaliza um JSON de resposta correto e grounded no contexto", () => {
      const validPayload = {
        headline: "Foco prioritário em Crédito Tributário",
        situation: "Atraso no estudo e taxa de acertos em queda.",
        priorityTopic: "Crédito Tributário",
        reason: "O tópico está em estado CRITICO e exige resolução de pré-requisitos.",
        recommendedAction: "Resolver 15 questões de Obrigação Tributária e Crédito Tributário.",
        avoid: "Iniciar matérias secundárias antes de sanar o atraso.",
        nextStep: "Revisar os erros cometidos.",
        confidenceScore: 0.95,
      };

      const context = buildCoachContext({
        diagnoses: [
          {
            topicId: "top-1",
            topicName: "Crédito Tributário",
            subjectId: "subj-1",
            subjectName: "Direito Tributário",
            state: "CRITICO",
            priority: "URGENCIA_MAXIMA",
            riskLevel: "ELEVADO",
            recommendedIntervention: "REVISAO_IMEDIATA",
            scores: { mastery: 0.3, confidence: 0.4 },
            recommendedQuestions: 15,
            urgencyScore: 9,
            knowledgeState: "FRAGIL",
            interventionScore: 0.9,
          },
        ],
      });

      const result = validateCoachGuidance(validPayload, context);

      expect(result.headline).toBe(validPayload.headline);
      expect(result.priorityTopic).toBe("Crédito Tributário");
      expect(result.confidenceScore).toBe(0.95);
      expect(result.generatedAt).toBeDefined();
    });

    it("rejeita e lança erro se priorityTopic for um tópico inventado/fora do contexto", () => {
      const ungroundedPayload = {
        headline: "Estudar Mecânica Quântica",
        situation: "Situação fictícia.",
        priorityTopic: "Física Quântica Avançada", // Tópico inventado
        reason: "Motivo fictício.",
        recommendedAction: "Resolver questões.",
        avoid: "Nada.",
        nextStep: "Proximo.",
        confidenceScore: 0.99,
      };

      const context = buildCoachContext({
        diagnoses: [
          {
            topicId: "top-1",
            topicName: "Crédito Tributário",
            subjectId: "subj-1",
            subjectName: "Direito Tributário",
            state: "CRITICO",
            priority: "URGENCIA_MAXIMA",
            riskLevel: "ELEVADO",
            recommendedIntervention: "REVISAO_IMEDIATA",
            scores: { mastery: 0.3, confidence: 0.4 },
            recommendedQuestions: 15,
            urgencyScore: 9,
            knowledgeState: "FRAGIL",
            interventionScore: 0.9,
          },
        ],
      });

      expect(() => validateCoachGuidance(ungroundedPayload, context)).toThrow(
        /não corresponde a nenhum tópico presente no contexto pedagógico/,
      );
    });

    it("lança erro se faltar campo obrigatório no JSON", () => {
      const invalidPayload = {
        headline: "Apenas o título",
      };

      expect(() => validateCoachGuidance(invalidPayload)).toThrow(
        /Incompleto: campos obrigatórios ausentes/,
      );
    });
  });

  describe("4. Coach Service & AI Gateway Integration", () => {
    it("retorna resposta processada quando o AI Gateway devolve orientação válida", async () => {
      const diagnosisServiceModule = await import("@/lib/diagnosis/service");
      vi.spyOn(diagnosisServiceModule, "getUserDiagnoses").mockResolvedValue([
        {
          topicId: "top-1",
          topicName: "Crédito Tributário",
          subjectId: "subj-1",
          subjectName: "Direito Tributário",
          state: "CRITICO",
          priority: "URGENCIA_MAXIMA",
          riskLevel: "ELEVADO",
          recommendedIntervention: "REVISAO_IMEDIATA",
          scores: { mastery: 0.3, confidence: 0.4, decayRisk: 0.8, errorRecency: 0.9 },
          recommendedQuestions: 15,
          urgencyScore: 9,
          knowledgeState: "FRAGIL",
          interventionScore: 0.9,
        },
      ]);

      vi.spyOn(gatewayModule, "runAiTask").mockResolvedValue({
        output: {
          headline: "Resolver questões de Direito Tributário",
          situation: "Identificado risco em Crédito Tributário.",
          priorityTopic: "Crédito Tributário",
          reason: "Prioridade determinística URGENCIA_MAXIMA.",
          recommendedAction: "Resolver 15 questões.",
          avoid: "Avançar para Legislação sem revisar.",
          nextStep: "Fazer 10 cards de revisão.",
          confidenceScore: 0.98,
        },
        cached: false,
        status: "processado",
        model: "gemini-3.6-flash",
        durationMs: 250,
      });

      const res = await getDailyCoachGuidance();

      expect(res.status).toBe("processado");
      expect(res.hasEnoughData).toBe(true);
      expect(res.guidance?.priorityTopic).toBe("Crédito Tributário");
    });

    it("retorna dados_insuficientes se não houver dados no perfil do aluno", async () => {
      const res = await getDailyCoachGuidance();

      expect(res.status).toBe("dados_insuficientes");
      expect(res.guidance).toBeNull();
      expect(res.hasEnoughData).toBe(false);
    });
  });

  describe("5. Coach Engine Context Consolidation & Interactive Chat", () => {
    it("consolida o perfil do aluno com taxa global, matérias fracas e flashcards", () => {
      const profile = buildStudentProfileContext({
        globalScore: 82,
        targetExam: "SEFAZ SP — Auditor Fiscal",
      });

      expect(profile.globalScore).toBe(82);
      expect(profile.targetExam).toBe("SEFAZ SP — Auditor Fiscal");
      expect(profile.weakSubjects.length).toBeGreaterThan(0);
      expect(typeof profile.dueFlashcardsCount).toBe("number");
    });

    it("gera o prompt socrático injetando as variáveis do perfil de desempenho", () => {
      const profile = buildStudentProfileContext({
        globalScore: 78.5,
        targetExam: "SEFAZ MG",
        weakSubjects: ["Auditoria Fiscal"],
      });

      const prompt = generateCoachPrompt(profile, "Como estudar auditoria?");

      expect(prompt).toContain("SEFAZ MG");
      expect(prompt).toContain("78.5%");
      expect(prompt).toContain("Auditoria Fiscal");
      expect(prompt).toContain("Como estudar auditoria?");
    });

    it("processa atalho rápido 'Explicar exatas passo a passo' e retorna resposta estruturada", async () => {
      const message = await processCoachChat("Explicar exatas passo a passo");

      expect(message.sender).toBe("coach");
      expect(message.content).toContain("Exatas");
      expect(message.suggestedActions).toBeDefined();
      expect(message.suggestedActions?.length).toBeGreaterThan(0);
    });

    it("processa atalho rápido 'Analisar meu Caderno de Erros'", async () => {
      const message = await processCoachChat("Analisar meu Caderno de Erros");

      expect(message.sender).toBe("coach");
      expect(message.content).toContain("Caderno de Erros");
      expect(message.suggestedActions).toContain("Ir para a Central de Erros");
    });

    it("processa atalho rápido 'Direcionamento para reta final da SEFAZ'", async () => {
      const message = await processCoachChat("Direcionamento para reta final da SEFAZ");

      expect(message.sender).toBe("coach");
      expect(message.content).toContain("SEFAZ");
      expect(message.suggestedActions).toContain("Ver Plano de Estudos da SEFAZ");
    });
  });
});
