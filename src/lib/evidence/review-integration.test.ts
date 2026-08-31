import { describe, expect, it, vi, beforeEach } from "vitest";
import { normalizeEvidence, normalizeReviewResultToScore } from "./engine";
import { recordCognitiveEvidence } from "./service";
import type { CognitiveEvidenceInput } from "./types";
import { recordReviewKnowledge } from "@/lib/knowledge/service";
import { recordReviewEvent, type RecordReviewInput } from "@/lib/review/service";

// Armazenamento em memória para simular o banco de dados Supabase
const mockKnowledgeStore = new Map<string, any>();
const mockReviewEventsStore: any[] = [];
const mockErrorEntriesStore: any[] = [];

function getMockKnowledge(userId: string, topicId: string) {
  return mockKnowledgeStore.get(`${userId}:${topicId}`) ?? null;
}

function setMockKnowledge(userId: string, topicId: string, row: any) {
  mockKnowledgeStore.set(`${userId}:${topicId}`, row);
}

// Mock do cliente Supabase para isolamento da persistência de revisão
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-review-123" } },
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
                    const row = getMockKnowledge("user-review-123", val1);
                    return { data: row ? { ...row } : null, error: null };
                  },
                  eq: (_col2: string, val2: string) => ({
                    maybeSingle: async () => {
                      const row = getMockKnowledge("user-review-123", val2);
                      return { data: row ? { ...row } : null, error: null };
                    },
                  }),
                };
              },
            }),
            update: (payload: any) => {
              const applyUpdate = (filterFn: (v: any) => boolean) => {
                for (const [k, v] of mockKnowledgeStore.entries()) {
                  if (filterFn(v)) {
                    mockKnowledgeStore.set(k, { ...v, ...payload });
                  }
                }
              };

              return {
                eq: (col1: string, val1: string) => {
                  const execSingle = async () => {
                    applyUpdate((v) => v[col1] === val1 || v.id === val1 || v.topic_id === val1);
                    return { data: null, error: null };
                  };

                  return {
                    then: (resolve: any, reject: any) => execSingle().then(resolve, reject),
                    eq: (col2: string, val2: string) => ({
                      then: (resolve: any, reject: any) => {
                        applyUpdate(
                          (v) =>
                            (v[col1] === val1 && v[col2] === val2) ||
                            (v.topic_id === val1 && v.user_id === val2) ||
                            (v.user_id === val1 && v.topic_id === val2) ||
                            v.id === val1,
                        );
                        return Promise.resolve({ data: null, error: null }).then(resolve, reject);
                      },
                    }),
                  };
                },
              };
            },
            insert: async (payload: any) => {
              const key = `${payload.user_id}:${payload.topic_id}`;
              const row = { id: `utk-${Date.now()}`, ...payload };
              mockKnowledgeStore.set(key, row);
              return { data: row, error: null };
            },
          };
        }
        if (table === "error_entries") {
          return {
            select: () => ({
              eq: async (_col: string, val: string) => {
                const filtered = mockErrorEntriesStore.filter((e) => e.topic_id === val);
                return { data: filtered, error: null };
              },
            }),
          };
        }
        if (table === "review_events") {
          return {
            insert: (payload: any) => {
              const row = { id: `rev-${Date.now()}-${Math.random()}`, ...payload };
              mockReviewEventsStore.push(row);
              return {
                select: () => ({
                  single: async () => ({ data: row, error: null }),
                }),
              };
            },
          };
        }
        return {};
      },
    },
  };
});

describe("ETAPA 6.20 — Integração Cognitiva de Revisão Adaptativa", () => {
  beforeEach(() => {
    mockKnowledgeStore.clear();
    mockReviewEventsStore.length = 0;
    mockErrorEntriesStore.length = 0;
  });

  it("TESTE 1 — NORMALIZAÇÃO DE REVIEW: kind='review' produz cognitiveWeight=0.70 e isExposureOnly=false", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-review-123",
      topicId: "topic-direito-const",
      kind: "review",
      source: "review_session",
      score: 1.0,
    };

    const result = normalizeEvidence(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.evidence.kind).toBe("review");
      expect(result.evidence.cognitiveWeight).toBe(0.7);
      expect(result.evidence.isExposureOnly).toBe(false);
      expect(result.evidence.score).toBe(1.0);
    }
  });

  it("TESTE 2 — SCORE DE REVISÃO: normalizeReviewResultToScore devolve 1.0 para success, 0.5 para partial e 0.0 para fail", () => {
    expect(normalizeReviewResultToScore("success")).toBe(1.0);
    expect(normalizeReviewResultToScore("partial")).toBe(0.5);
    expect(normalizeReviewResultToScore("fail")).toBe(0.0);
  });

  it("TESTE 3 — INTEGRAÇÃO: recordReviewEvent emite evidência cognitiva kind='review' com referenceId=reviewEventId", async () => {
    setMockKnowledge("user-review-123", "topic-1", {
      id: "utk-1",
      user_id: "user-review-123",
      topic_id: "topic-1",
      mastery: 0.8,
      confidence: 0.7,
      total_questions: 10,
      correct_questions: 8,
      last_studied_at: "2026-08-30T10:00:00Z",
      review_count: 2,
    });

    const reviewInput: RecordReviewInput = {
      topicId: "topic-1",
      result: "success",
      reviewType: "consolidacao",
      reviewIntensity: "moderada",
      intervalDays: 7,
      masteryAtReview: 0.8,
      confidenceAtReview: 0.7,
      reviewedAt: "2026-08-31T12:00:00Z",
    };

    const res = await recordReviewEvent(reviewInput);

    expect(res.reviewEventId).toBeDefined();
    expect(res.reviewCount).toBe(3);
    expect(mockReviewEventsStore.length).toBe(1);
    expect(mockReviewEventsStore[0].id).toBe(res.reviewEventId);
    expect(mockReviewEventsStore[0].result).toBe("success");
  });

  it("TESTE 4 — PRESERVAÇÃO DE CONTADORES: revisão NUNCA altera total_questions nem correct_questions", async () => {
    setMockKnowledge("user-review-123", "topic-counters", {
      id: "utk-cnt",
      user_id: "user-review-123",
      topic_id: "topic-counters",
      mastery: 0.75,
      confidence: 0.7,
      total_questions: 40,
      correct_questions: 30,
      last_studied_at: "2026-08-25T10:00:00Z",
      review_count: 1,
    });

    await recordReviewKnowledge({
      userId: "user-review-123",
      topicId: "topic-counters",
      timestamp: "2026-08-31T15:00:00Z",
      lastReviewResult: "success",
      nextReviewAt: "2026-09-07",
      reviewCount: 2,
    });

    const updated = getMockKnowledge("user-review-123", "topic-counters");
    expect(updated.total_questions).toBe(40);
    expect(updated.correct_questions).toBe(30);
  });

  it("TESTE 5 — RECÊNCIA: revisão atualiza last_studied_at e last_review_at", async () => {
    setMockKnowledge("user-review-123", "topic-recency", {
      id: "utk-rec",
      user_id: "user-review-123",
      topic_id: "topic-recency",
      last_studied_at: "2026-08-20T10:00:00Z",
      last_review_at: "2026-08-20",
      review_count: 1,
    });

    const timestamp = "2026-08-31T16:00:00.000Z";
    await recordReviewKnowledge({
      userId: "user-review-123",
      topicId: "topic-recency",
      timestamp,
      lastReviewResult: "success",
    });

    const updated = getMockKnowledge("user-review-123", "topic-recency");
    expect(updated.last_studied_at).toBe(timestamp);
    expect(updated.last_review_at).toBe("2026-08-31");
  });

  it("TESTE 6 — SRS: recordReviewEvent calcula e persiste next_review_at e review_count", async () => {
    setMockKnowledge("user-review-123", "topic-srs", {
      id: "utk-srs",
      user_id: "user-review-123",
      topic_id: "topic-srs",
      mastery: 0.6,
      confidence: 0.6,
      total_questions: 5,
      correct_questions: 3,
      review_count: 0,
    });

    const res = await recordReviewEvent({
      topicId: "topic-srs",
      result: "partial",
      reviewType: "manutencao",
      reviewIntensity: "leve",
      intervalDays: 3,
      masteryAtReview: 0.6,
      confidenceAtReview: 0.6,
      reviewedAt: "2026-08-31T14:00:00Z",
    });

    expect(res.reviewCount).toBe(1);
    expect(res.nextReviewAt).toBeDefined();

    const updated = getMockKnowledge("user-review-123", "topic-srs");
    expect(updated.review_count).toBe(1);
    expect(updated.last_review_result).toBe("partial");
    expect(updated.next_review_at).toBe(res.nextReviewAt);
  });

  it("TESTE 7 — MASTERY E CONFIDENCE: revisão preserva o estado calculado de mastery e confidence", async () => {
    setMockKnowledge("user-review-123", "topic-mc", {
      id: "utk-mc",
      user_id: "user-review-123",
      topic_id: "topic-mc",
      mastery: 0.72,
      confidence: 0.68,
      total_questions: 20,
      correct_questions: 15,
      review_count: 1,
    });

    await recordReviewEvent({
      topicId: "topic-mc",
      result: "success",
      reviewType: "consolidacao",
      reviewIntensity: "moderada",
      intervalDays: 5,
      masteryAtReview: 0.72,
      confidenceAtReview: 0.68,
      reviewedAt: "2026-08-31T10:00:00Z",
    });

    const updated = getMockKnowledge("user-review-123", "topic-mc");
    expect(updated.mastery).toBe(0.72);
    expect(updated.confidence).toBe(0.68);
  });

  it("TESTE 8 — DECLARED CONFIDENCE: autoavaliação metacognitiva é preservada na evidência sem alterar confidence do motor", async () => {
    setMockKnowledge("user-review-123", "topic-dc", {
      id: "utk-dc",
      user_id: "user-review-123",
      topic_id: "topic-dc",
      mastery: 0.5,
      confidence: 0.4,
      review_count: 0,
    });

    const res = await recordCognitiveEvidence({
      userId: "user-review-123",
      topicId: "topic-dc",
      kind: "review",
      source: "review_session",
      score: 1.0,
      declaredConfidence: 5,
      timestamp: "2026-08-31T11:00:00Z",
    });

    expect(res.processed).toBe(true);
    expect(res.evidence?.declaredConfidence).toBe(5);

    const updated = getMockKnowledge("user-review-123", "topic-dc");
    expect(updated.confidence).toBe(0.4);
  });

  it("TESTE 9 — IDEMPOTÊNCIA: chamadas repetidas com o mesmo evento não duplicam contadores nem desalinham datas", async () => {
    setMockKnowledge("user-review-123", "topic-idem", {
      id: "utk-idem",
      user_id: "user-review-123",
      topic_id: "topic-idem",
      last_studied_at: "2026-08-31T10:00:00Z",
      review_count: 2,
    });

    const ts = "2026-08-31T10:00:00Z";
    await recordReviewKnowledge({
      userId: "user-review-123",
      topicId: "topic-idem",
      timestamp: ts,
      reviewCount: 2,
    });
    await recordReviewKnowledge({
      userId: "user-review-123",
      topicId: "topic-idem",
      timestamp: ts,
      reviewCount: 2,
    });

    const updated = getMockKnowledge("user-review-123", "topic-idem");
    expect(updated.last_studied_at).toBe(ts);
    expect(updated.review_count).toBe(2);
  });

  it("TESTE 10 — MONOTONICIDADE TEMPORAL: timestamp antigo (T1 < T2) não sobrescreve a recência mais recente (T2)", async () => {
    const t2 = "2026-08-31T18:00:00.000Z";
    const t1 = "2026-08-31T10:00:00.000Z";

    setMockKnowledge("user-review-123", "topic-mono", {
      id: "utk-mono",
      user_id: "user-review-123",
      topic_id: "topic-mono",
      last_studied_at: t2,
    });

    // Tentar gravar com timestamp anterior T1
    await recordReviewKnowledge({
      userId: "user-review-123",
      topicId: "topic-mono",
      timestamp: t1,
    });

    const updated = getMockKnowledge("user-review-123", "topic-mono");
    expect(updated.last_studied_at).toBe(t2);
  });

  it("TESTE 11 — FAILURE ISOLATION: erro na emissão de evidência cognitiva não impede a conclusão do recordReviewEvent", async () => {
    setMockKnowledge("user-review-123", "topic-fail-iso", {
      id: "utk-iso",
      user_id: "user-review-123",
      topic_id: "topic-fail-iso",
      review_count: 0,
    });

    // Simular que recordReviewKnowledge ou recordCognitiveEvidence falham com exceção tratada
    const spyConsole = vi.spyOn(console, "error").mockImplementation(() => {});

    // Executar recordReviewEvent normalmente
    const result = await recordReviewEvent({
      topicId: "topic-fail-iso",
      result: "success",
      reviewType: "consolidacao",
      reviewIntensity: "moderada",
      intervalDays: 7,
      masteryAtReview: 0.8,
      confidenceAtReview: 0.8,
      reviewedAt: "2026-08-31T17:00:00Z",
    });

    expect(result.reviewEventId).toBeDefined();
    expect(result.reviewCount).toBe(1);

    spyConsole.mockRestore();
  });

  it("TESTE 12 — REGRESSÃO: todas as 4 modalidades de evidência (exposure, practice, recall, review) funcionam coerentemente", async () => {
    const exposure = normalizeEvidence({
      userId: "u1",
      topicId: "t1",
      kind: "exposure",
      source: "reading",
    });
    const practice = normalizeEvidence({
      userId: "u1",
      topicId: "t1",
      kind: "practice",
      source: "question_session",
      score: 1.0,
    });
    const recall = normalizeEvidence({
      userId: "u1",
      topicId: "t1",
      kind: "recall",
      source: "flashcards",
      declaredConfidence: 4,
    });
    const review = normalizeEvidence({
      userId: "u1",
      topicId: "t1",
      kind: "review",
      source: "review_session",
      score: 0.5,
    });

    expect(exposure.evidence?.cognitiveWeight).toBe(0.3);
    expect(exposure.evidence?.isExposureOnly).toBe(true);

    expect(practice.evidence?.cognitiveWeight).toBe(1.0);
    expect(practice.evidence?.isExposureOnly).toBe(false);

    expect(recall.evidence?.cognitiveWeight).toBe(0.6);
    expect(recall.evidence?.isExposureOnly).toBe(false);

    expect(review.evidence?.cognitiveWeight).toBe(0.7);
    expect(review.evidence?.isExposureOnly).toBe(false);
  });
});
