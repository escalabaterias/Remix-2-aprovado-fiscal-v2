import { describe, expect, it, vi, beforeEach } from "vitest";
import { recordCognitiveEvidence } from "./service";
import type { CognitiveEvidenceInput } from "./types";
import { submitAnswer } from "@/lib/questions/attempt-service";
import { buildSignals } from "@/lib/knowledge/signals";
import { diagnoseTopic } from "@/lib/diagnosis/engine";

// Armazenamento em memória para simular o banco Supabase nos testes de integração da prática
const mockKnowledgeStore = new Map<string, any>();
const mockHistoryStore = new Map<string, any>();
const mockStatsStore = new Map<string, any>();
const mockAttemptsStore = new Map<string, any>();

function getMockKnowledge(userId: string, topicId: string) {
  return mockKnowledgeStore.get(`${userId}:${topicId}`) ?? null;
}

// Mock do cliente Supabase
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-practice-123" } },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table === "questions") {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                maybeSingle: async () => ({
                  data: {
                    id: val,
                    difficulty: 3,
                    topic_id: "topic-proc-civil-01",
                    subject_id: "subj-direito-proc-civil",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "question_stats") {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                maybeSingle: async () => {
                  const data = mockStatsStore.get(val) ?? null;
                  return { data, error: null };
                },
              }),
            }),
            upsert: async (payload: any) => {
              mockStatsStore.set(payload.question_id, payload);
              return { data: null, error: null };
            },
          };
        }

        if (table === "question_attempts") {
          return {
            select: (_cols?: string, options?: any) => {
              if (options?.count) {
                return {
                  eq: (_c1: string, _v1: string) => ({
                    eq: (_c2: string, qId: string) => {
                      let count = 0;
                      for (const att of mockAttemptsStore.values()) {
                        if (att.question_id === qId) count++;
                      }
                      return { count, error: null };
                    },
                  }),
                };
              }
              return {};
            },
            insert: (payload: any) => ({
              select: () => ({
                single: async () => {
                  const id =
                    payload.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                  const row = { ...payload, id };
                  mockAttemptsStore.set(id, row);
                  return { data: row, error: null };
                },
              }),
            }),
          };
        }

        if (table === "user_topic_knowledge") {
          return {
            select: () => ({
              eq: (col1: string, val1: string) => {
                const getRow = () => getMockKnowledge("user-practice-123", val1);
                return {
                  maybeSingle: async () => {
                    const row = getRow();
                    return { data: row ? { ...row } : null, error: null };
                  },
                  eq: (_col2: string, val2: string) => ({
                    maybeSingle: async () => {
                      const row = getMockKnowledge("user-practice-123", val2);
                      return { data: row ? { ...row } : null, error: null };
                    },
                  }),
                };
              },
            }),
            upsert: async (payload: any) => {
              const key = `${payload.user_id}:${payload.topic_id}`;
              const existing = mockKnowledgeStore.get(key) || {};
              const updated = { ...existing, ...payload };
              mockKnowledgeStore.set(key, updated);
              return { data: null, error: null };
            },
          };
        }

        if (table === "knowledge_history") {
          return {
            select: (_cols?: string, options?: any) => {
              if (options?.count) {
                return {
                  eq: (_c: string, attemptId: string) => {
                    const hasIt = mockHistoryStore.has(attemptId);
                    return { count: hasIt ? 1 : 0, error: null };
                  },
                };
              }
              return {
                eq: (_c1: string, _v1: string) => ({
                  eq: (_c2: string, attemptId: string) => ({
                    maybeSingle: async () => {
                      const row = mockHistoryStore.get(attemptId) ?? null;
                      return { data: row, error: null };
                    },
                  }),
                }),
              };
            },
            insert: async (payload: any) => {
              if (payload.attempt_id) {
                mockHistoryStore.set(payload.attempt_id, payload);
              }
              return { data: null, error: null };
            },
          };
        }

        if (table === "error_entries") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: { id: `err-${Date.now()}` },
                  error: null,
                }),
              }),
            }),
          };
        }

        return {};
      },
    },
  };
});

describe("ETAPA 6.18 — Integração Cognitiva da Prática e Exercícios Objetivos", () => {
  beforeEach(() => {
    mockKnowledgeStore.clear();
    mockHistoryStore.clear();
    mockStatsStore.clear();
    mockAttemptsStore.clear();
  });

  it("TESTE 1 — ACERTO: Tentativa correta gera evidência de prática com score 1.0, cognitiveWeight 1.0 e isExposureOnly false", async () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-practice-123",
      topicId: "topic-proc-civil-01",
      subjectId: "subj-direito-proc-civil",
      kind: "practice",
      source: "question_bank",
      score: 1.0,
      difficulty: "media",
      referenceId: "attempt-101",
      timestamp: "2026-08-31T10:00:00.000Z",
    };

    const result = await recordCognitiveEvidence(input);
    expect(result.processed).toBe(true);
    expect(result.evidence).not.toBeNull();
    expect(result.evidence?.kind).toBe("practice");
    expect(result.evidence?.score).toBe(1.0);
    expect(result.evidence?.cognitiveWeight).toBe(1.0);
    expect(result.evidence?.isExposureOnly).toBe(false);
  });

  it("TESTE 2 — ERRO: Tentativa incorreta gera evidência de prática com score 0.0, cognitiveWeight 1.0 e isExposureOnly false", async () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-practice-123",
      topicId: "topic-proc-civil-01",
      subjectId: "subj-direito-proc-civil",
      kind: "practice",
      source: "question_bank",
      score: 0.0,
      difficulty: "media",
      referenceId: "attempt-102",
      timestamp: "2026-08-31T10:05:00.000Z",
    };

    const result = await recordCognitiveEvidence(input);
    expect(result.processed).toBe(true);
    expect(result.evidence?.kind).toBe("practice");
    expect(result.evidence?.score).toBe(0.0);
    expect(result.evidence?.cognitiveWeight).toBe(1.0);
    expect(result.evidence?.isExposureOnly).toBe(false);
  });

  it("TESTE 3 — REFERENCE ID: referenceId preserva exatamente o ID da tentativa (attemptId)", async () => {
    const attemptId = "att-unique-uuid-998877";
    const result = await recordCognitiveEvidence({
      userId: "user-practice-123",
      topicId: "topic-proc-civil-01",
      kind: "practice",
      source: "question_bank",
      score: 1.0,
      referenceId: attemptId,
    });

    expect(result.evidence?.referenceId).toBe(attemptId);
  });

  it("TESTE 4 — CONTADORES: submitAnswer atualiza total_questions e correct_questions no fluxo existente", async () => {
    const userId = "user-practice-123";
    const topicId = "topic-proc-civil-01";

    // 1. Primeira resposta (ACERTO)
    const result1 = await submitAnswer({
      questionId: "q-001",
      chosenAnswer: "A",
      isCorrect: true,
      timeSpentSeconds: 45,
      mode: "estudo",
    });

    expect(result1.attemptId).toBeDefined();

    let knowledgeRow = getMockKnowledge(userId, topicId);
    expect(knowledgeRow).not.toBeNull();
    expect(knowledgeRow.total_questions).toBe(1);
    expect(knowledgeRow.correct_questions).toBe(1);

    // 2. Segunda resposta (ERRO)
    await submitAnswer({
      questionId: "q-002",
      chosenAnswer: "B",
      isCorrect: false,
      timeSpentSeconds: 60,
      mode: "estudo",
    });

    knowledgeRow = getMockKnowledge(userId, topicId);
    expect(knowledgeRow.total_questions).toBe(2);
    expect(knowledgeRow.correct_questions).toBe(1);
  });

  it("TESTE 5 — MASTERY E CONFIDENCE: Resultado do Knowledge Engine continua sendo aplicado com precisão", async () => {
    const userId = "user-practice-123";
    const topicId = "topic-proc-civil-01";

    await submitAnswer({
      questionId: "q-010",
      chosenAnswer: "A",
      isCorrect: true,
      timeSpentSeconds: 30,
      mode: "estudo",
    });

    const knowledgeRow = getMockKnowledge(userId, topicId);
    expect(knowledgeRow).not.toBeNull();
    expect(knowledgeRow.mastery).toBeGreaterThan(0);
    expect(knowledgeRow.confidence).toBeGreaterThan(0);
  });

  it("TESTE 6 — DIAGNÓSTICO: Diagnosis Engine recebe estado atualizado e transiciona com base na prática real", async () => {
    const userId = "user-practice-123";
    const topicId = "topic-proc-civil-01";

    // Responder questões suficientes para acumular evidência e sair de SEM_EVIDENCIA
    await submitAnswer({
      questionId: "q-101",
      chosenAnswer: "A",
      isCorrect: true,
      timeSpentSeconds: 30,
      mode: "estudo",
    });
    await submitAnswer({
      questionId: "q-102",
      chosenAnswer: "A",
      isCorrect: true,
      timeSpentSeconds: 30,
      mode: "estudo",
    });
    await submitAnswer({
      questionId: "q-103",
      chosenAnswer: "A",
      isCorrect: true,
      timeSpentSeconds: 30,
      mode: "estudo",
    });
    await submitAnswer({
      questionId: "q-104",
      chosenAnswer: "A",
      isCorrect: true,
      timeSpentSeconds: 30,
      mode: "estudo",
    });
    await submitAnswer({
      questionId: "q-105",
      chosenAnswer: "B",
      isCorrect: false,
      timeSpentSeconds: 40,
      mode: "estudo",
    });

    const row = getMockKnowledge(userId, topicId);
    expect(row).not.toBeNull();
    expect(row.total_questions).toBe(5);

    const signals = buildSignals(
      {
        mastery: row.mastery,
        confidence: row.confidence,
        totalQuestions: row.total_questions,
        correctQuestions: row.correct_questions,
        lastStudiedAt: row.last_studied_at,
      },
      null,
      0,
      0,
      0,
    );

    const diagnosis = diagnoseTopic(signals, "2026-08-31");
    // Com totalQuestions >= 5 e confidence suficiente, o diagnóstico deixa de ser SEM_EVIDENCIA
    expect(diagnosis.knowledgeState).not.toBe("SEM_EVIDENCIA");
  });

  it("TESTE 7 — IDEMPOTÊNCIA: Reprocessamento de tentativa com mesmo attemptId não duplica contadores nem altera mastery/confidence", async () => {
    const userId = "user-practice-123";
    const topicId = "topic-proc-civil-01";

    // Simular resposta inicial
    const result = await submitAnswer({
      questionId: "q-idem-01",
      chosenAnswer: "A",
      isCorrect: true,
      timeSpentSeconds: 25,
      mode: "estudo",
    });

    const initialRow = { ...getMockKnowledge(userId, topicId) };
    expect(initialRow.total_questions).toBe(1);
    expect(initialRow.correct_questions).toBe(1);

    // Tentar executar novamente a atualização com o mesmo attemptId
    const { updateKnowledgeFromAttempt } = await import("@/lib/questions/knowledge-integration");
    const secondCall = await updateKnowledgeFromAttempt({
      attemptId: result.attemptId,
      feedback: result.feedback,
    });

    expect(secondCall.updated).toBe(false);
    expect(secondCall.skipReason).toBe("duplicidade_attempt_id");

    const finalRow = getMockKnowledge(userId, topicId);
    expect(finalRow.total_questions).toBe(initialRow.total_questions);
    expect(finalRow.correct_questions).toBe(initialRow.correct_questions);
    expect(finalRow.mastery).toBe(initialRow.mastery);
    expect(finalRow.confidence).toBe(initialRow.confidence);
  });

  it("TESTE 8 — DECLARED CONFIDENCE: Preserva o sinal metacognitivo informado sem adulterar a confidence calculada pelo Knowledge Engine", async () => {
    const userId = "user-practice-123";
    const topicId = "topic-proc-civil-01";

    const result = await submitAnswer({
      questionId: "q-conf-01",
      chosenAnswer: "A",
      isCorrect: true,
      timeSpentSeconds: 30,
      mode: "estudo",
      declaredConfidence: 5, // Confiança declarada máxima (1..5)
    });

    const knowledgeRow = getMockKnowledge(userId, topicId);
    expect(knowledgeRow).not.toBeNull();

    // A confidence calculada pelo Knowledge Engine é um float entre 0.0 e 1.0 (não 5)
    expect(knowledgeRow.confidence).toBeGreaterThan(0);
    expect(knowledgeRow.confidence).toBeLessThanOrEqual(1.0);
    expect(knowledgeRow.confidence).not.toBe(5);

    // Mas a evidência processada recebeu o declaredConfidence = 5
    const evidenceResult = await recordCognitiveEvidence({
      userId,
      topicId,
      kind: "practice",
      source: "question_bank",
      score: 1.0,
      declaredConfidence: 5,
      referenceId: result.attemptId,
    });

    expect(evidenceResult.evidence?.declaredConfidence).toBe(5);
  });
});
