import { describe, it, expect } from "vitest";
import { isValidExamStatusTransition, ExamStatus } from "./types";
import {
  DistributionConfigSchema,
  CreateExamTemplateSchema,
  SaveExamAnswerSchema,
  ScoringRuleSchema,
  ExamStatusSchema,
} from "./schemas";

describe("Domínio de Simulados — Contratos e Transições de Estado (Etapa 8.1)", () => {
  const validUUID1 = "123e4567-e89b-12d3-a456-426614174000";
  const validUUID2 = "98765432-e89b-12d3-a456-426614174000";

  describe("Máquina de Estados de ExamSession", () => {
    it("deve permitir transições válidas no ciclo de vida", () => {
      expect(isValidExamStatusTransition("ready", "in_progress")).toBe(true);
      expect(isValidExamStatusTransition("in_progress", "paused")).toBe(true);
      expect(isValidExamStatusTransition("paused", "in_progress")).toBe(true);
      expect(isValidExamStatusTransition("in_progress", "submitted")).toBe(true);
      expect(isValidExamStatusTransition("paused", "submitted")).toBe(true);
      expect(isValidExamStatusTransition("submitted", "processing")).toBe(true);
      expect(isValidExamStatusTransition("processing", "analyzed")).toBe(true);
      expect(isValidExamStatusTransition("ready", "abandoned")).toBe(true);
      expect(isValidExamStatusTransition("in_progress", "abandoned")).toBe(true);
      expect(isValidExamStatusTransition("in_progress", "in_progress")).toBe(true);
    });

    it("deve rejeitar transições de estado inválidas ou regressivas", () => {
      expect(isValidExamStatusTransition("submitted", "in_progress")).toBe(false);
      expect(isValidExamStatusTransition("analyzed", "in_progress")).toBe(false);
      expect(isValidExamStatusTransition("abandoned", "in_progress")).toBe(false);
      expect(isValidExamStatusTransition("processing", "submitted")).toBe(false);
      expect(isValidExamStatusTransition("analyzed", "submitted")).toBe(false);
    });
  });

  describe("Validação Zod de ScoringRule e Status", () => {
    it("deve aceitar regras de pontuação válidas", () => {
      expect(ScoringRuleSchema.parse("standard")).toBe("standard");
      expect(ScoringRuleSchema.parse("cebraspe_1_for_1")).toBe("cebraspe_1_for_1");
      expect(ScoringRuleSchema.parse("cebraspe_half")).toBe("cebraspe_half");
      expect(ScoringRuleSchema.parse("custom")).toBe("custom");
    });

    it("deve rejeitar regra de pontuação desconhecida", () => {
      expect(() => ScoringRuleSchema.parse("invalida")).toThrow();
    });

    it("deve validar todos os estados previstos", () => {
      const validStatuses: ExamStatus[] = [
        "ready",
        "in_progress",
        "paused",
        "submitted",
        "processing",
        "analyzed",
        "abandoned",
      ];

      validStatuses.forEach((status) => {
        expect(ExamStatusSchema.parse(status)).toBe(status);
      });
    });
  });

  describe("Validação de DistributionConfigSchema", () => {
    it("deve aprovar uma distribuição válida com disciplinas e pesos", () => {
      const payload = {
        subjects: [
          { subject_id: validUUID1, count: 10, weight: 1.0 },
          { subject_id: validUUID2, count: 20, weight: 2.0 },
        ],
        bancas: ["FCC", "Cebraspe"],
        allow_already_answered: false,
      };

      const parsed = DistributionConfigSchema.parse(payload);
      expect(parsed.subjects).toHaveLength(2);
      expect(parsed.subjects[1].weight).toBe(2.0);
    });

    it("deve rejeitar distribuição sem disciplinas", () => {
      const payload = { subjects: [] };
      expect(() => DistributionConfigSchema.parse(payload)).toThrow();
    });

    it("deve rejeitar quantidade de questões zero ou negativa", () => {
      const payload = {
        subjects: [{ subject_id: validUUID1, count: 0, weight: 1.0 }],
      };
      expect(() => DistributionConfigSchema.parse(payload)).toThrow();
    });

    it("deve rejeitar peso zero ou negativo", () => {
      const payload = {
        subjects: [{ subject_id: validUUID1, count: 5, weight: -1.0 }],
      };
      expect(() => DistributionConfigSchema.parse(payload)).toThrow();
    });

    it("deve rejeitar subject_id que não seja UUID", () => {
      const payload = {
        subjects: [{ subject_id: "invalido-id", count: 5, weight: 1.0 }],
      };
      expect(() => DistributionConfigSchema.parse(payload)).toThrow();
    });
  });

  describe("Validação de CreateExamTemplateSchema", () => {
    it("deve aprovar a criação de um template válido de simulado", () => {
      const payload = {
        title: "Simulado Geral SEFAZ-SP",
        description: "Simulado completo com foco em Direito Tributário e Contabilidade",
        scoring_rule: "cebraspe_1_for_1",
        negative_marking_penalty: 1.0,
        time_limit_minutes: 270,
        allow_pauses: true,
        distribution_config: {
          subjects: [{ subject_id: validUUID1, count: 30, weight: 2.0 }],
        },
      };

      const parsed = CreateExamTemplateSchema.parse(payload);
      expect(parsed.title).toBe("Simulado Geral SEFAZ-SP");
      expect(parsed.scoring_rule).toBe("cebraspe_1_for_1");
      expect(parsed.negative_marking_penalty).toBe(1.0);
    });

    it("deve rejeitar título curto demais", () => {
      const payload = {
        title: "AB",
        scoring_rule: "standard",
        time_limit_minutes: 60,
        distribution_config: {
          subjects: [{ subject_id: validUUID1, count: 10, weight: 1.0 }],
        },
      };

      expect(() => CreateExamTemplateSchema.parse(payload)).toThrow();
    });

    it("deve rejeitar penalidade negativa", () => {
      const payload = {
        title: "Simulado Cebraspe",
        scoring_rule: "cebraspe_1_for_1",
        negative_marking_penalty: -0.5,
        time_limit_minutes: 60,
        distribution_config: {
          subjects: [{ subject_id: validUUID1, count: 10, weight: 1.0 }],
        },
      };

      expect(() => CreateExamTemplateSchema.parse(payload)).toThrow();
    });

    it("deve rejeitar tempo limite zero ou negativo", () => {
      const payload = {
        title: "Simulado Curto",
        scoring_rule: "standard",
        time_limit_minutes: 0,
        distribution_config: {
          subjects: [{ subject_id: validUUID1, count: 10, weight: 1.0 }],
        },
      };

      expect(() => CreateExamTemplateSchema.parse(payload)).toThrow();
    });
  });

  describe("Validação de SaveExamAnswerSchema", () => {
    it("deve aceitar payload válido para salvamento de resposta", () => {
      const payload = {
        session_id: validUUID1,
        question_id: validUUID2,
        position: 1,
        chosen_answer: "B",
        is_flagged_for_review: true,
        time_spent_seconds: 45,
      };

      const parsed = SaveExamAnswerSchema.parse(payload);
      expect(parsed.chosen_answer).toBe("B");
      expect(parsed.is_flagged_for_review).toBe(true);
      expect(parsed.time_spent_seconds).toBe(45);
    });

    it("deve aceitar resposta em branco (chosen_answer null)", () => {
      const payload = {
        session_id: validUUID1,
        question_id: validUUID2,
        position: 2,
        chosen_answer: null,
      };

      const parsed = SaveExamAnswerSchema.parse(payload);
      expect(parsed.chosen_answer).toBeNull();
    });

    it("deve rejeitar tempo gasto negativo", () => {
      const payload = {
        session_id: validUUID1,
        question_id: validUUID2,
        position: 1,
        time_spent_seconds: -10,
      };

      expect(() => SaveExamAnswerSchema.parse(payload)).toThrow();
    });
  });
});
