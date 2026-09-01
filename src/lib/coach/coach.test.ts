/**
 * SUÍTE DE TESTES — FASE 7.2.1 (MENTOR INTELLIGENCE UPGRADE)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCoachContext } from "./context-builder";
import { COACH_PROMPT_VERSION, COACH_SYSTEM_PROMPT, validateCoachGuidance } from "./prompts";
import { getDailyCoachGuidance } from "./service";
import {
  determineCoachPersona,
  generateAdaptiveExplanation,
  getRecommendedMethod,
} from "./coachEngine";
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
});

describe("Coach Fiscal Socrático e Explicações Adaptativas (Etapa 4.3)", () => {
  const mockGaps: any[] = [
    {
      id: "GAP-1",
      subjectId: "DIR-TRIB",
      subjectName: "Direito Tributário",
      topicId: "LIMIT",
      topicName: "Limitações",
      accuracy: 0.35,
      severity: "high",
      primaryErrorCategory: "conhecimento",
    },
  ];

  it("deve adotar tom encorajador para alunos com falhas severas ou repetidas", () => {
    // 5 erros recentes ou mais ativa tom encorajador
    const persona = determineCoachPersona(mockGaps, 6);
    expect(persona.tone).toBe("encouraging");
    expect(persona.empathyScore).toBeGreaterThanOrEqual(90);
  });

  it("deve adotar tom socrático-desafiador se o aluno tem erros de atenção", () => {
    const attentionGaps = [
      {
        id: "GAP-2",
        subjectId: "DIR-TRIB",
        topicId: "LIMIT",
        topicName: "Limitações",
        accuracy: 0.7,
        severity: "medium",
        primaryErrorCategory: "atencao",
      },
    ];

    const persona = determineCoachPersona(attentionGaps, 2);
    expect(persona.tone).toBe("socratic");
  });

  it("deve gerar esquema passo a passo visual e tabela para matérias de Exatas", () => {
    const persona = determineCoachPersona([], 0);
    const explanation = generateAdaptiveExplanation("RLM", "Equivalências Lógicas", persona);

    expect(explanation.type).toBe("visual_step_by_step");
    expect(explanation.content).toContain("📊 Resolução Visual Passo a Passo");
    expect(explanation.content).toContain("| Passo | Operação Lógica |");
  });

  it("deve gerar narrativa de caso prático para matérias de Direito Tributário", () => {
    const persona = determineCoachPersona([], 0);
    const explanation = generateAdaptiveExplanation("DIR-TRIB", "Substituição Tributária", persona);

    expect(explanation.type).toBe("practical_case");
    expect(explanation.content).toContain("💼 Caso Prático do Auditor Fiscal");
    expect(explanation.content).toContain("ICMS");
  });
});
