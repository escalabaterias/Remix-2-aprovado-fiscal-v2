import { describe, expect, it, vi } from "vitest";
import { normalizeEvidence, normalizeRecallRatingToScore } from "./engine";
import { recordCognitiveEvidence } from "./service";
import type { CognitiveEvidenceInput } from "./types";
import { recordRecallKnowledge } from "@/lib/knowledge/service";

// Armazenamento em memória para simular o banco de dados Supabase
const mockKnowledgeStore = new Map<string, any>();

function getMockKnowledge(userId: string, topicId: string) {
  return mockKnowledgeStore.get(`${userId}:${topicId}`) ?? null;
}

function setMockKnowledge(userId: string, topicId: string, row: any) {
  mockKnowledgeStore.set(`${userId}:${topicId}`, row);
}

// Mock do cliente Supabase para isolamento da persistência de recall
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-recall-123" } },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table === "user_topic_knowledge") {
          return {
            select: () => ({
              eq: (_col1: string, val1: string) => {
                return {
                  maybeSingle: async () => {
                    const row = getMockKnowledge("user-recall-123", val1);
                    return { data: row ? { ...row } : null, error: null };
                  },
                  eq: (_col2: string, val2: string) => ({
                    maybeSingle: async () => {
                      const row = getMockKnowledge("user-recall-123", val2);
                      return { data: row ? { ...row } : null, error: null };
                    },
                  }),
                };
              },
            }),
            update: (payload: any) => ({
              eq: async (_col: string, val: string) => {
                for (const [k, v] of mockKnowledgeStore.entries()) {
                  if (v.id === val) {
                    mockKnowledgeStore.set(k, { ...v, ...payload });
                  }
                }
                return { data: null, error: null };
              },
            }),
            insert: async (payload: any) => {
              const key = `${payload.user_id}:${payload.topic_id}`;
              const row = { id: `utk-${Date.now()}`, ...payload };
              mockKnowledgeStore.set(key, row);
              return { data: row, error: null };
            },
          };
        }
        return {};
      },
    },
  };
});

describe("ETAPA 6.19 — Integração Cognitiva de Recall / Recuperação Ativa", () => {
  const mockTimestamp = "2026-08-31T16:00:00.000Z";

  it("TESTE 1 — NORMALIZAÇÃO DE RECALL: kind='recall' produz cognitiveWeight=0.60 e isExposureOnly=false", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-recall-123",
      topicId: "topic-dir-adm-01",
      kind: "recall",
      source: "flashcard_deck",
      score: 0.75,
      referenceId: "card-review-001",
      timestamp: mockTimestamp,
    };

    const norm = normalizeEvidence(input, mockTimestamp);
    expect(norm.success).toBe(true);

    if (norm.success) {
      expect(norm.evidence.kind).toBe("recall");
      expect(norm.evidence.cognitiveWeight).toBe(0.6);
      expect(norm.evidence.isExposureOnly).toBe(false);
      expect(norm.evidence.score).toBe(0.75);
    }
  });

  it("TESTE 2 — CONVERSÃO 1..5: normalizeRecallRatingToScore mapeia deterministicamente ratings 1..5 em scores [0, 1]", () => {
    expect(normalizeRecallRatingToScore(1)).toBe(0.0);
    expect(normalizeRecallRatingToScore(2)).toBe(0.25);
    expect(normalizeRecallRatingToScore(3)).toBe(0.5);
    expect(normalizeRecallRatingToScore(4)).toBe(0.75);
    expect(normalizeRecallRatingToScore(5)).toBe(1.0);

    // Validação de limites inválidos
    expect(() => normalizeRecallRatingToScore(0)).toThrow();
    expect(() => normalizeRecallRatingToScore(6)).toThrow();
  });

  it("TESTE 3 — RECALL COM SCORE BAIXO: garante que o score derivado permaneça no intervalo [0, 1]", () => {
    const inputRating1: CognitiveEvidenceInput = {
      userId: "user-recall-123",
      topicId: "topic-dir-adm-02",
      kind: "recall",
      source: "flashcard_deck",
      declaredConfidence: 1, // Rating 1
    };

    const norm1 = normalizeEvidence(inputRating1, mockTimestamp);
    expect(norm1.success).toBe(true);
    if (norm1.success) {
      expect(norm1.evidence.score).toBe(0.0);
      expect(norm1.evidence.score).toBeGreaterThanOrEqual(0.0);
      expect(norm1.evidence.score).toBeLessThanOrEqual(1.0);
    }
  });

  it("TESTE 4 — ATUALIZAÇÃO DE RECÊNCIA: recordCognitiveEvidence com recall persiste last_studied_at no banco", async () => {
    const userId = "user-recall-123";
    const topicId = "topic-dir-adm-03";
    const ts = "2026-08-31T17:00:00.000Z";

    const result = await recordCognitiveEvidence({
      userId,
      topicId,
      kind: "recall",
      source: "flashcard_deck",
      score: 1.0,
      declaredConfidence: 5,
      referenceId: "recall-event-004",
      timestamp: ts,
    });

    expect(result.processed).toBe(true);

    const storedRow = getMockKnowledge(userId, topicId);
    expect(storedRow).not.toBeNull();
    expect(storedRow.last_studied_at).toBe(ts);
    expect(storedRow.mastery).toBe(0);
    expect(storedRow.confidence).toBe(0);
  });

  it("TESTE 5 — PRESERVAÇÃO DOS CONTADORES: Recall não altera total_questions, correct_questions, mastery ou confidence em registro existente", async () => {
    const userId = "user-recall-123";
    const topicId = "topic-dir-adm-04";
    const oldTimestamp = "2026-08-30T10:00:00.000Z";

    setMockKnowledge(userId, topicId, {
      id: "utk-recall-pre",
      user_id: userId,
      topic_id: topicId,
      subject_id: "subj-adm-01",
      contest_id: null,
      mastery: 0.72,
      confidence: 0.68,
      total_questions: 40,
      correct_questions: 30,
      last_studied_at: oldTimestamp,
    });

    const newTimestamp = "2026-08-31T18:00:00.000Z";

    await recordRecallKnowledge({
      userId,
      topicId,
      timestamp: newTimestamp,
      referenceId: "recall-event-005",
    });

    const storedRow = getMockKnowledge(userId, topicId);
    expect(storedRow).not.toBeNull();
    expect(storedRow.mastery).toBe(0.72);
    expect(storedRow.confidence).toBe(0.68);
    expect(storedRow.total_questions).toBe(40);
    expect(storedRow.correct_questions).toBe(30);
    expect(storedRow.last_studied_at).toBe(newTimestamp);
  });

  it("TESTE 6 — PRESERVAÇÃO DA MAESTRIA: Recall não executa updateKnowledgeFromAttempt nem altera o cálculo do Knowledge Engine", async () => {
    const userId = "user-recall-123";
    const topicId = "topic-dir-adm-05";

    // Criar um tópico com 0 interações
    await recordRecallKnowledge({
      userId,
      topicId,
      timestamp: mockTimestamp,
      referenceId: "recall-event-006",
    });

    const storedRow = getMockKnowledge(userId, topicId);
    expect(storedRow.mastery).toBe(0.0);
    expect(storedRow.confidence).toBe(0.0);
    expect(storedRow.total_questions).toBe(0);
    expect(storedRow.correct_questions).toBe(0);
  });

  it("TESTE 7 — IDEMPOTÊNCIA: Reenviar a mesma evidência com o mesmo referenceId/timestamp é idempotente, e timestamp antigo é ignorado", async () => {
    const userId = "user-recall-123";
    const topicId = "topic-dir-adm-06";
    const tsNew = "2026-08-31T20:00:00.000Z";
    const tsOld = "2026-08-31T19:00:00.000Z";

    await recordRecallKnowledge({
      userId,
      topicId,
      timestamp: tsNew,
      referenceId: "recall-event-007",
    });

    let storedRow = getMockKnowledge(userId, topicId);
    expect(storedRow.last_studied_at).toBe(tsNew);

    // Tentativa de reprocessamento com timestamp mais antigo
    await recordRecallKnowledge({
      userId,
      topicId,
      timestamp: tsOld,
      referenceId: "recall-event-007",
    });

    storedRow = getMockKnowledge(userId, topicId);
    // Garante que o timestamp recente foi preservado
    expect(storedRow.last_studied_at).toBe(tsNew);
  });

  it("TESTE 8 — DECLARED CONFIDENCE: Preserva a autoavaliação declarada (1..5) sem adulterar a confidence calculada pelo Knowledge Engine", async () => {
    const userId = "user-recall-123";
    const topicId = "topic-dir-adm-08";

    setMockKnowledge(userId, topicId, {
      id: "utk-confidence-test",
      user_id: userId,
      topic_id: topicId,
      mastery: 0.5,
      confidence: 0.45,
      total_questions: 10,
      correct_questions: 5,
      last_studied_at: mockTimestamp,
    });

    const res = await recordCognitiveEvidence({
      userId,
      topicId,
      kind: "recall",
      source: "flashcard_deck",
      declaredConfidence: 5, // Metacognição máxima
      referenceId: "recall-event-008",
      timestamp: mockTimestamp,
    });

    expect(res.processed).toBe(true);
    expect(res.evidence?.declaredConfidence).toBe(5);

    const storedRow = getMockKnowledge(userId, topicId);
    // user_topic_knowledge.confidence permanece exatamente 0.45 (calculado)
    expect(storedRow.confidence).toBe(0.45);
  });
});
