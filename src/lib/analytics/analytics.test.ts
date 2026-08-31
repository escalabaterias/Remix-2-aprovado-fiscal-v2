import { describe, it, expect } from "vitest";
import {
  analyzeTopicAnalytics,
  analyzeUserTopicsAnalytics,
  calculateDecayRisk,
  calculateMasteryTrend,
  calculateConfidenceTrend,
  calculateErrorRecurrence,
  calculatePredictivePriority,
  classifyRetentionMatrix,
  reconstructCognitiveTrajectory,
  evaluateSingleInterventionEffectiveness,
} from "./index";
import type { AnalyticsContextInput, TopicEvidenceItem } from "./types";

describe("Fase 7.4 — Matriz de Retenção + Analytics Cognitivo Preditivo", () => {
  const baseTimestamp = new Date("2026-08-01T10:00:00Z");

  const buildTimestamp = (offsetDays: number): string => {
    const d = new Date(baseTimestamp.getTime() + offsetDays * 86400000);
    return d.toISOString();
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. DADOS INSUFICIENTES
  // ───────────────────────────────────────────────────────────────────────────
  describe("1. Tratamento de Dados Insuficientes", () => {
    it("classifica como DADOS_INSUFICIENTES quando não há evidências", () => {
      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-tributario-1",
        evidences: [],
        referenceDate: baseTimestamp,
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.retentionProfile.evidenceCount).toBe(0);
      expect(result.matrixEntry.category).toBe("DADOS_INSUFICIENTES");
      expect(result.trajectory.pattern).toBe("DADOS_INSUFICIENTES");
      expect(result.interventions.review.hasSufficientData).toBe(false);
      expect(result.interventions.review.successRate).toBeNull();
      expect(result.interventions.socratic.hasSufficientData).toBe(false);
    });

    it("classifica como DADOS_INSUFICIENTES com apenas 1 evidência isolada", () => {
      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-tributario-1",
        evidences: [
          {
            timestamp: buildTimestamp(0),
            kind: "exposure",
            source: "planner_task",
            score: null,
          },
        ],
        referenceDate: baseTimestamp,
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.matrixEntry.category).toBe("DADOS_INSUFICIENTES");
      expect(result.trajectory.pattern).toBe("DADOS_INSUFICIENTES");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. RETENÇÃO FORTE
  // ───────────────────────────────────────────────────────────────────────────
  describe("2. Retenção Forte e Domínio Consistente", () => {
    it("identifica RETENÇÃO_FORTE e DOMINIO_CONSISTENTE para notas altas contínuas", () => {
      const evidences: TopicEvidenceItem[] = [
        { timestamp: buildTimestamp(0), kind: "exposure", source: "planner_task" },
        {
          timestamp: buildTimestamp(1),
          kind: "practice",
          source: "question_bank",
          score: 0.9,
          declaredConfidence: 5,
        },
        {
          timestamp: buildTimestamp(2),
          kind: "practice",
          source: "question_bank",
          score: 0.95,
          declaredConfidence: 5,
        },
        {
          timestamp: buildTimestamp(3),
          kind: "review",
          source: "review_session",
          score: 0.92,
          declaredConfidence: 5,
        },
      ];

      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-tributario-art150",
        evidences,
        daysSinceStudy: 1,
        mastery: 0.92,
        confidence: 0.9,
        referenceDate: new Date(baseTimestamp.getTime() + 4 * 86400000),
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.retentionProfile.retentionScore).toBeGreaterThanOrEqual(0.76);
      expect(result.trajectory.pattern).toBe("DOMINIO_CONSISTENTE");
      expect(result.matrixEntry.category).toBe("RETENÇÃO_FORTE");
      expect(result.retentionProfile.decayRisk).toBeLessThan(0.3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. RETENÇÃO FRÁGIL E DOMÍNIO FALSO INSTÁVEL
  // ───────────────────────────────────────────────────────────────────────────
  describe("3. Retenção Frágil e Instabilidade", () => {
    it("detecta DOMINIO_FALSO_INSTAVEL quando há alta variabilidade nas notas", () => {
      const evidences: TopicEvidenceItem[] = [
        {
          timestamp: buildTimestamp(0),
          kind: "practice",
          source: "question_bank",
          score: 1.0,
          declaredConfidence: 2,
        },
        {
          timestamp: buildTimestamp(1),
          kind: "practice",
          source: "question_bank",
          score: 0.3,
          declaredConfidence: 1,
        },
        {
          timestamp: buildTimestamp(2),
          kind: "review",
          source: "review_session",
          score: 0.9,
          declaredConfidence: 4,
        },
        {
          timestamp: buildTimestamp(3),
          kind: "practice",
          source: "question_bank",
          score: 0.4,
          declaredConfidence: 2,
        },
      ];

      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-icms-substituicao",
        evidences,
        daysSinceStudy: 2,
        mastery: 0.65,
        confidence: 0.5,
        referenceDate: new Date(baseTimestamp.getTime() + 4 * 86400000),
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.trajectory.pattern).toBe("DOMINIO_FALSO_INSTAVEL");
      expect(result.matrixEntry.category).toBe("RETENÇÃO_FRÁGIL");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. DECAY ELEVADO / RISCO DE ESQUECIMENTO
  // ───────────────────────────────────────────────────────────────────────────
  describe("4. Risco de Esquecimento por Decaimento Temporal", () => {
    it("calcula decayRisk elevado para longo período de inatividade", () => {
      const risk30 = calculateDecayRisk(30);
      const risk60 = calculateDecayRisk(60);

      expect(risk30).toBeGreaterThan(0.7);
      expect(risk60).toBeGreaterThan(0.9);

      const evidences: TopicEvidenceItem[] = [
        { timestamp: buildTimestamp(-60), kind: "practice", source: "question_bank", score: 0.9 },
        { timestamp: buildTimestamp(-55), kind: "review", source: "review_session", score: 0.85 },
      ];

      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-contabilidade-depreciacao",
        evidences,
        daysSinceStudy: 55,
        mastery: 0.85,
        confidence: 0.8,
        referenceDate: baseTimestamp,
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.retentionProfile.decayRisk).toBeGreaterThanOrEqual(0.6);
      expect(result.matrixEntry.category).toBe("RISCO_DE_ESQUECIMENTO");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. REINCIDÊNCIA DE ERROS
  // ───────────────────────────────────────────────────────────────────────────
  describe("5. Reincidência de Erros", () => {
    it("classifica como REINCIDÊNCIA_DE_ERROS quando há erros frequentes ou recorrentes", () => {
      const evidences: TopicEvidenceItem[] = [
        { timestamp: buildTimestamp(0), kind: "practice", source: "question_bank", score: 0.2 },
        { timestamp: buildTimestamp(1), kind: "practice", source: "question_bank", score: 0.4 },
        { timestamp: buildTimestamp(2), kind: "practice", source: "question_bank", score: 0.3 },
      ];

      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-direito-administrativo-licitacoes",
        evidences,
        daysSinceStudy: 1,
        recurringErrors: 3,
        unresolvedErrors: 2,
        knowledgeState: "PONTO_CRITICO",
        referenceDate: new Date(baseTimestamp.getTime() + 3 * 86400000),
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.retentionProfile.errorRecurrence).toBeGreaterThanOrEqual(0.4);
      expect(result.matrixEntry.category).toBe("REINCIDÊNCIA_DE_ERROS");
      expect(result.predictivePriority.factors.errorRecurrenceSignal).toBeGreaterThan(0.4);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. RECUPERAÇÃO APÓS REMEDIAÇÃO / SOCRÁTICO
  // ───────────────────────────────────────────────────────────────────────────
  describe("6. Recuperação Pós-Remediação e Orientação Socrática", () => {
    it("reconhece RECUPERACAO_APOS_ERRO e RECUPERAÇÃO_EM_ANDAMENTO", () => {
      const evidences: TopicEvidenceItem[] = [
        { timestamp: buildTimestamp(0), kind: "practice", source: "question_bank", score: 0.3 },
        { timestamp: buildTimestamp(1), kind: "remediation", source: "socratic_tutor", score: 0.8 },
        { timestamp: buildTimestamp(2), kind: "practice", source: "question_bank", score: 0.85 },
        { timestamp: buildTimestamp(3), kind: "practice", source: "question_bank", score: 0.9 },
      ];

      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-simples-nacional",
        evidences,
        daysSinceStudy: 1,
        unresolvedErrors: 0,
        referenceDate: new Date(baseTimestamp.getTime() + 4 * 86400000),
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.trajectory.pattern).toBe("RECUPERACAO_APOS_ERRO");
      expect(result.matrixEntry.category).toBe("RECUPERAÇÃO_EM_ANDAMENTO");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. TRAJETÓRIAS: CRESCENTE, DECRESCENTE E ESTAGNADA
  // ───────────────────────────────────────────────────────────────────────────
  describe("7. Trajetórias Cognitivas de Evolução, Regressão e Estagnação", () => {
    it("identifica EVOLUCAO para tendência positiva consistente", () => {
      const evidences: TopicEvidenceItem[] = [
        { timestamp: buildTimestamp(0), kind: "practice", source: "question_bank", score: 0.4 },
        { timestamp: buildTimestamp(1), kind: "practice", source: "question_bank", score: 0.6 },
        { timestamp: buildTimestamp(2), kind: "practice", source: "question_bank", score: 0.8 },
        { timestamp: buildTimestamp(3), kind: "practice", source: "question_bank", score: 0.95 },
      ];

      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-auditoria-amostragem",
        evidences,
        daysSinceStudy: 1,
        referenceDate: new Date(baseTimestamp.getTime() + 4 * 86400000),
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.retentionProfile.masteryTrend).toBeGreaterThan(0.15);
      expect(result.trajectory.pattern).toBe("EVOLUCAO");
    });

    it("identifica REGRESSAO para queda de rendimento ao longo do tempo", () => {
      const evidences: TopicEvidenceItem[] = [
        { timestamp: buildTimestamp(0), kind: "practice", source: "question_bank", score: 0.9 },
        { timestamp: buildTimestamp(1), kind: "practice", source: "question_bank", score: 0.75 },
        { timestamp: buildTimestamp(2), kind: "practice", source: "question_bank", score: 0.5 },
        { timestamp: buildTimestamp(3), kind: "practice", source: "question_bank", score: 0.3 },
      ];

      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-auditoria-relatorios",
        evidences,
        daysSinceStudy: 1,
        referenceDate: new Date(baseTimestamp.getTime() + 4 * 86400000),
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.retentionProfile.masteryTrend).toBeLessThan(-0.15);
      expect(result.trajectory.pattern).toBe("REGRESSAO");
    });

    it("identifica ESTAGNACAO para desempenho constante em nível mediano", () => {
      const evidences: TopicEvidenceItem[] = [
        { timestamp: buildTimestamp(0), kind: "practice", source: "question_bank", score: 0.5 },
        { timestamp: buildTimestamp(1), kind: "practice", source: "question_bank", score: 0.52 },
        { timestamp: buildTimestamp(2), kind: "practice", source: "question_bank", score: 0.48 },
        { timestamp: buildTimestamp(3), kind: "practice", source: "question_bank", score: 0.51 },
      ];

      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-afp-balanco",
        evidences,
        daysSinceStudy: 1,
        referenceDate: new Date(baseTimestamp.getTime() + 4 * 86400000),
      };

      const result = analyzeTopicAnalytics(input);

      expect(Math.abs(result.retentionProfile.masteryTrend)).toBeLessThan(0.1);
      expect(result.trajectory.pattern).toBe("ESTAGNACAO");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. EFICÁCIA DE REVISÃO E PROFESSOR FISCAL SOCRÁTICO
  // ───────────────────────────────────────────────────────────────────────────
  describe("8. Medição de Eficácia de Intervenções", () => {
    it("calcula taxa de sucesso e ganho médio de revisão com amostra suficiente", () => {
      const evidences: TopicEvidenceItem[] = [
        { timestamp: buildTimestamp(0), kind: "review", source: "review_session" },
        { timestamp: buildTimestamp(1), kind: "practice", source: "question_bank", score: 0.8 },
        { timestamp: buildTimestamp(2), kind: "review", source: "review_session" },
        { timestamp: buildTimestamp(3), kind: "practice", source: "question_bank", score: 0.85 },
        { timestamp: buildTimestamp(4), kind: "review", source: "review_session" },
        { timestamp: buildTimestamp(5), kind: "practice", source: "question_bank", score: 0.9 },
      ];

      const eff = evaluateSingleInterventionEffectiveness(evidences, "review");

      expect(eff.hasSufficientData).toBe(true);
      expect(eff.sampleCount).toBe(3);
      expect(eff.successRate).toBe(1.0);
      expect(eff.averageScoreGain).toBeGreaterThan(0);
    });

    it("calcula eficácia socrática quando há 3+ pares de intervenção socrática e prática", () => {
      const evidences: TopicEvidenceItem[] = [
        { timestamp: buildTimestamp(0), kind: "socratic", source: "socratic_tutor" },
        { timestamp: buildTimestamp(1), kind: "practice", source: "question_bank", score: 0.8 },
        { timestamp: buildTimestamp(2), kind: "socratic", source: "socratic_tutor" },
        { timestamp: buildTimestamp(3), kind: "practice", source: "question_bank", score: 0.85 },
        { timestamp: buildTimestamp(4), kind: "socratic", source: "socratic_tutor" },
        { timestamp: buildTimestamp(5), kind: "practice", source: "question_bank", score: 0.9 },
      ];

      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-socratic-test",
        evidences,
        referenceDate: new Date(baseTimestamp.getTime() + 6 * 86400000),
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.interventions.socratic.hasSufficientData).toBe(true);
      expect(result.interventions.socratic.successRate).toBe(1.0);
      expect(result.retentionProfile.socraticEffectiveness).toBeGreaterThan(0.7);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. PRIORIDADE PREDITIVA E PRÉ-REQUISITOS
  // ───────────────────────────────────────────────────────────────────────────
  describe("9. Prioridade Preditiva e Sinais Ponderados", () => {
    it("pondera déficit de pré-requisitos e peso de concurso na prioridade preditiva", () => {
      const input: AnalyticsContextInput = {
        userId: "user-test-1",
        topicId: "top-tributario-base",
        evidences: [
          { timestamp: buildTimestamp(0), kind: "practice", source: "question_bank", score: 0.4 },
          { timestamp: buildTimestamp(1), kind: "practice", source: "question_bank", score: 0.5 },
        ],
        daysSinceStudy: 10,
        prerequisiteDeficit: 0.9,
        contestWeight: 1.0,
        reviewUrgency: 0.8,
        referenceDate: new Date(baseTimestamp.getTime() + 2 * 86400000),
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.predictivePriority.factors.prerequisiteSignal).toBe(0.9);
      expect(result.predictivePriority.factors.contestWeightSignal).toBe(1.0);
      expect(result.predictivePriority.predictivePriorityScore).toBeGreaterThan(0.4);
    });

    it("resolve conflitos entre sinais com precedência determinística na matriz", () => {
      const profile = {
        topicId: "top-conflict",
        retentionScore: 0.85, // Retenção alta aparentemente
        masteryTrend: 0.1,
        confidenceTrend: 0.2,
        decayRisk: 0.8, // Decay muito alto
        errorRecurrence: 0.5, // Reincidência de erros alta
        reviewEffectiveness: null,
        socraticEffectiveness: null,
        lastEvidenceAt: buildTimestamp(-40),
        evidenceCount: 10,
        currentKnowledgeState: "PONTO_CRITICO",
      };

      const trajectory = {
        topicId: "top-conflict",
        timeline: [],
        pattern: "DOMINIO_CONSISTENTE" as const,
        summary: "Teste",
      };

      const entry = classifyRetentionMatrix(profile, trajectory);

      // Reincidência de erro prevalece sobre retenção alta
      expect(entry.category).toBe("REINCIDÊNCIA_DE_ERROS");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. IDEMPOTÊNCIA, ISOLAMENTO E CASOS EXTREMOS
  // ───────────────────────────────────────────────────────────────────────────
  describe("10. Idempotência, Isolamento e Casos Extremos", () => {
    it("garante idempotência total: múltiplas execuções produzem o mesmo objeto exato", () => {
      const input: AnalyticsContextInput = {
        userId: "user-idempotent",
        topicId: "top-idempotent",
        evidences: [
          { timestamp: buildTimestamp(0), kind: "exposure", source: "planner_task" },
          { timestamp: buildTimestamp(1), kind: "practice", source: "question_bank", score: 0.8 },
        ],
        referenceDate: baseTimestamp,
      };

      const res1 = analyzeTopicAnalytics(input);
      const res2 = analyzeTopicAnalytics(input);
      const res3 = analyzeTopicAnalytics(input);

      expect(res1).toEqual(res2);
      expect(res2).toEqual(res3);
    });

    it("garante isolamento total por usuário", () => {
      const inputUserA: AnalyticsContextInput = {
        userId: "user-A",
        topicId: "top-common",
        evidences: [
          { timestamp: buildTimestamp(0), kind: "practice", source: "question_bank", score: 0.9 },
        ],
        referenceDate: baseTimestamp,
      };

      const inputUserB: AnalyticsContextInput = {
        userId: "user-B",
        topicId: "top-common",
        evidences: [
          { timestamp: buildTimestamp(0), kind: "practice", source: "question_bank", score: 0.2 },
        ],
        referenceDate: baseTimestamp,
      };

      const [resA, resB] = analyzeUserTopicsAnalytics([inputUserA, inputUserB]);

      expect(resA.userId).toBe("user-A");
      expect(resB.userId).toBe("user-B");
      expect(resA.retentionProfile.retentionScore).toBeGreaterThan(
        resB.retentionProfile.retentionScore,
      );
    });

    it("trata adequadamente campos nulos, vazios e dias negativos sem falhar", () => {
      const input: AnalyticsContextInput = {
        userId: "user-edge",
        topicId: "top-edge",
        evidences: [
          { timestamp: buildTimestamp(0), kind: "practice", source: "question_bank", score: null },
          {
            timestamp: buildTimestamp(1),
            kind: "practice",
            source: "question_bank",
            score: NaN as any,
          },
        ],
        daysSinceStudy: -5,
        mastery: undefined,
        confidence: undefined,
        referenceDate: baseTimestamp,
      };

      const result = analyzeTopicAnalytics(input);

      expect(result.retentionProfile.decayRisk).toBe(0.0);
      expect(isNaN(result.retentionProfile.retentionScore)).toBe(false);
      expect(result.predictivePriority.predictivePriorityScore).toBeGreaterThanOrEqual(0);
      expect(result.predictivePriority.predictivePriorityScore).toBeLessThanOrEqual(1.0);
    });
  });
});
