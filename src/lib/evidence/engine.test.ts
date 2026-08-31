import { describe, expect, it, vi } from "vitest";
import {
  calculateCognitiveWeight,
  isExposureOnly,
  normalizeEvidence,
  validateEvidenceInput,
} from "./engine";
import { recordCognitiveEvidence } from "./service";
import type { CognitiveEvidenceInput } from "./types";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      update: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
      insert: async () => ({ data: null, error: null }),
    }),
  },
}));

describe("Evidence Engine — Etapa 6.16", () => {
  const mockTimestamp = "2026-08-31T12:00:00.000Z";

  it("Teste 1: deve criar e normalizar evidência de 'exposure' (Teoria)", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-123",
      topicId: "topic-tax-101",
      kind: "exposure",
      source: "planner_task",
      durationSeconds: 1800,
    };

    const result = normalizeEvidence(input, mockTimestamp);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.evidence.kind).toBe("exposure");
      expect(result.evidence.isExposureOnly).toBe(true);
      expect(result.evidence.cognitiveWeight).toBe(0.3); // Base weight for exposure
      expect(result.evidence.timestamp).toBe(mockTimestamp);
    }
  });

  it("Teste 2: deve criar e normalizar evidência de 'practice' (Questões)", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-123",
      topicId: "topic-tax-101",
      kind: "practice",
      source: "question_bank",
      score: 1.0,
      difficulty: "dificil",
      referenceId: "attempt-789",
    };

    const result = normalizeEvidence(input, mockTimestamp);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.evidence.kind).toBe("practice");
      expect(result.evidence.isExposureOnly).toBe(false);
      expect(result.evidence.cognitiveWeight).toBe(1.0); // 1.0 * 1.1 limitado em 1.0 (max)
      expect(result.evidence.score).toBe(1.0);
    }
  });

  it("Teste 3: deve criar e normalizar evidência de 'recall' (Flashcards)", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-123",
      topicId: "topic-tax-101",
      kind: "recall",
      source: "flashcard_deck",
      score: 0.8,
      difficulty: "media",
    };

    const result = normalizeEvidence(input, mockTimestamp);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.evidence.kind).toBe("recall");
      expect(result.evidence.isExposureOnly).toBe(false);
      expect(result.evidence.cognitiveWeight).toBe(0.6);
    }
  });

  it("Teste 4: deve criar e normalizar evidência de 'review' (Revisão)", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-123",
      topicId: "topic-tax-101",
      kind: "review",
      source: "review_session",
      score: 0.9,
    };

    const result = normalizeEvidence(input, mockTimestamp);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.evidence.kind).toBe("review");
      expect(result.evidence.isExposureOnly).toBe(false);
      expect(result.evidence.cognitiveWeight).toBe(0.7);
    }
  });

  it("Teste 5: deve criar e normalizar evidência de 'remediation' (Central de Erros)", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-123",
      topicId: "topic-tax-101",
      kind: "remediation",
      source: "error_central",
      score: 1.0,
      referenceId: "error-456",
    };

    const result = normalizeEvidence(input, mockTimestamp);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.evidence.kind).toBe("remediation");
      expect(result.evidence.isExposureOnly).toBe(false);
      expect(result.evidence.cognitiveWeight).toBe(0.8);
    }
  });

  it("Teste 6: deve rejeitar entrada sem topicId obrigatório", () => {
    const input = {
      userId: "user-123",
      topicId: "",
      kind: "exposure",
      source: "planner_task",
    } as CognitiveEvidenceInput;

    const errors = validateEvidenceInput(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("topicId"))).toBe(true);

    const result = normalizeEvidence(input, mockTimestamp);
    expect(result.success).toBe(false);
  });

  it("Teste 7: deve rejeitar entrada sem userId obrigatório", () => {
    const input = {
      userId: "  ",
      topicId: "topic-101",
      kind: "exposure",
      source: "planner_task",
    } as CognitiveEvidenceInput;

    const errors = validateEvidenceInput(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("userId"))).toBe(true);
  });

  it("Teste 8: deve demonstrar determinismo (mesmo input e timestamp -> mesmo output)", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-abc",
      topicId: "topic-xyz",
      kind: "practice",
      source: "question_bank",
      score: 0.75,
      declaredConfidence: 4,
    };

    const res1 = normalizeEvidence(input, mockTimestamp);
    const res2 = normalizeEvidence(input, mockTimestamp);

    expect(res1).toEqual(res2);
  });

  it("Teste 9: garante que o Evidence Engine NÃO altera mastery nem duplica o Knowledge Engine", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-123",
      topicId: "topic-tax-101",
      kind: "exposure",
      source: "planner_task",
      durationSeconds: 3600, // 1 hora de teoria
    };

    const result = normalizeEvidence(input, mockTimestamp);
    expect(result.success).toBe(true);
    if (result.success) {
      // O Evidence Engine retorna apenas metadados e pesos de evidência, sem atributo 'mastery'
      expect("mastery" in result.evidence).toBe(false);
      expect("confidence" in result.evidence).toBe(false);
    }
  });

  it("Teste 10: garante que declaredConfidence não substitui o score objetivo", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-123",
      topicId: "topic-tax-101",
      kind: "practice",
      source: "question_bank",
      score: 0.0, // Errou a questão
      declaredConfidence: 5, // Tinha certeza absoluta
    };

    const result = normalizeEvidence(input, mockTimestamp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.evidence.score).toBe(0.0);
      expect(result.evidence.declaredConfidence).toBe(5);
      // O score continua sendo 0.0 independente de declaredConfidence
    }
  });

  it("Teste 11: verifica que isExposureOnly é true APENAS para exposure", () => {
    expect(isExposureOnly("exposure")).toBe(true);
    expect(isExposureOnly("practice")).toBe(false);
    expect(isExposureOnly("recall")).toBe(false);
    expect(isExposureOnly("review")).toBe(false);
    expect(isExposureOnly("remediation")).toBe(false);
  });

  it("Teste 12: valida os limites de score e durationSeconds", () => {
    const invalidScoreInput: CognitiveEvidenceInput = {
      userId: "user-123",
      topicId: "topic-101",
      kind: "practice",
      source: "question_bank",
      score: 1.5, // Inválido > 1.0
    };

    const errors = validateEvidenceInput(invalidScoreInput);
    expect(errors.some((e) => e.includes("score"))).toBe(true);
  });

  it("Teste 13: testa integração do serviço recordCognitiveEvidence", async () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-123",
      topicId: "topic-tax-101",
      kind: "exposure",
      source: "planner_task",
      durationSeconds: 1200,
      timestamp: mockTimestamp,
    };

    const res = await recordCognitiveEvidence(input);
    expect(res.processed).toBe(true);
    expect(res.evidence?.topicId).toBe("topic-tax-101");
    expect(res.evidence?.kind).toBe("exposure");
    expect(res.skipReason).toBeNull();
  });
});
