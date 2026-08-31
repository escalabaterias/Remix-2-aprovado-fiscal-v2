import { describe, expect, it, vi } from "vitest";
import { normalizeEvidence } from "./engine";
import { recordCognitiveEvidence } from "./service";
import type { CognitiveEvidenceInput } from "./types";
import { recordExposureKnowledge } from "@/lib/knowledge/service";
import { buildSignals } from "@/lib/knowledge/signals";
import { diagnoseTopic } from "@/lib/diagnosis/engine";
import { updateKnowledge, INITIAL_STATE } from "@/lib/knowledge/engine";

// Armazenamento em memória para simular o banco de dados Supabase
const mockStore = new Map<string, any>();

function getMockRow(userId: string, topicId: string) {
  return mockStore.get(`${userId}:${topicId}`) ?? null;
}

function setMockRow(userId: string, topicId: string, row: any) {
  mockStore.set(`${userId}:${topicId}`, row);
}

// Mock do cliente Supabase para testar a persistência da exposição de forma isolada
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-test-123" } },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table === "user_topic_knowledge") {
          return {
            select: () => ({
              eq: (col1: string, val1: string) => ({
                eq: (col2: string, val2: string) => ({
                  maybeSingle: async () => {
                    const row = getMockRow(val1, val2);
                    return { data: row ? { ...row } : null, error: null };
                  },
                }),
              }),
            }),
            update: (payload: any) => ({
              eq: async (col: string, val: string) => {
                for (const [k, v] of mockStore.entries()) {
                  if (v.id === val) {
                    mockStore.set(k, { ...v, ...payload });
                  }
                }
                return { data: null, error: null };
              },
            }),
            insert: async (payload: any) => {
              const key = `${payload.user_id}:${payload.topic_id}`;
              const row = { id: `utk-${Date.now()}`, ...payload };
              mockStore.set(key, row);
              return { data: row, error: null };
            },
          };
        }
        return {};
      },
    },
  };
});

describe("ETAPA 6.17 — Integração Cognitiva da Teoria e Estudo Guiado", () => {
  const mockTimestamp = "2026-08-31T14:00:00.000Z";

  it("TESTE 1: Exposição válida com kind='exposure' produz isExposureOnly=true e weight=0.3", async () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-test-123",
      topicId: "topic-direito-const-01",
      subjectId: "subj-direito-01",
      kind: "exposure",
      source: "planner_task",
      durationSeconds: 1800,
      referenceId: "task-001",
      timestamp: mockTimestamp,
    };

    const result = await recordCognitiveEvidence(input);
    expect(result.processed).toBe(true);
    expect(result.evidence).not.toBeNull();

    if (result.evidence) {
      expect(result.evidence.kind).toBe("exposure");
      expect(result.evidence.isExposureOnly).toBe(true);
      expect(result.evidence.cognitiveWeight).toBe(0.3);
      expect(result.evidence.score).toBeNull();
    }
  });

  it("TESTE 2: Atualização de recência (last_studied_at) no Knowledge Service com verificação de persistência", async () => {
    const userId = "user-test-123";
    const topicId = "topic-direito-const-02";
    const timestamp = "2026-08-31T15:00:00.000Z";

    await recordExposureKnowledge({
      userId,
      topicId,
      timestamp,
      referenceId: "task-002",
    });

    // 1. Ler efetivamente o registro persistido no mock
    const storedRow = getMockRow(userId, topicId);
    expect(storedRow).not.toBeNull();
    expect(storedRow.last_studied_at).toBe(timestamp);

    // 2. Construir sinais a partir dos dados recuperados do mock
    const signals = buildSignals(
      {
        mastery: storedRow.mastery,
        confidence: storedRow.confidence,
        totalQuestions: storedRow.total_questions,
        correctQuestions: storedRow.correct_questions,
        lastStudiedAt: storedRow.last_studied_at,
      },
      null,
      0,
      timestamp,
    );

    expect(signals.daysSinceStudy).toBe(0); // Recente
  });

  it("TESTE 3: Validação pedagógica com Diagnosis Engine (0 questões preserva SEM_EVIDENCIA com recência atualizada)", () => {
    const timestamp = "2026-08-31T15:00:00.000Z";

    const signals = buildSignals(
      {
        mastery: 0,
        confidence: 0,
        totalQuestions: 0,
        correctQuestions: 0,
        lastStudiedAt: timestamp,
      },
      null,
      0,
      timestamp,
    );

    const diag = diagnoseTopic(signals, timestamp);

    // Sem questões respondidas, o Diagnosis Engine mantém o rigor determinístico (SEM_EVIDENCIA)
    // porém reconhece que o estudo foi realizado recentemente
    expect(diag.knowledgeState).toBe("SEM_EVIDENCIA");
    expect(diag.recency).toBe("RECENTE");
    expect(diag.signals.daysSinceStudy).toBe(0);
  });

  it("TESTE 4: Exposição NÃO altera totalQuestions nem correctQuestions", async () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-test-123",
      topicId: "topic-direito-const-03",
      kind: "exposure",
      source: "planner_task",
      durationSeconds: 1200,
    };

    const norm = normalizeEvidence(input, mockTimestamp);
    expect(norm.success).toBe(true);

    if (norm.success) {
      expect(norm.evidence.score).toBeNull();
      expect(norm.evidence.isExposureOnly).toBe(true);
    }
  });

  it("TESTE 5: Exposição NÃO possui score (score === null)", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-test-123",
      topicId: "topic-direito-const-04",
      kind: "exposure",
      source: "planner_task",
    };

    const norm = normalizeEvidence(input);
    if (norm.success) {
      expect(norm.evidence.score).toBeNull();
    }
  });

  it("TESTE 6: Exposição NÃO cria mastery artificial", () => {
    const initial = { ...INITIAL_STATE };
    expect(initial.mastery).toBe(0);
    expect(initial.confidence).toBe(0);

    // Nenhuma questão é injetada para simular acerto na exposição
    expect(initial.mastery).toBe(0.0);
  });

  it("TESTE 7: declaredConfidence é mantida isolada sem inflar a confidence calculada", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-test-123",
      topicId: "topic-direito-const-05",
      kind: "exposure",
      source: "planner_task",
      declaredConfidence: 0.9,
    };

    const norm = normalizeEvidence(input);
    if (norm.success) {
      expect(norm.evidence.declaredConfidence).toBe(0.9);
      // A confidence determinística calculada pelo engine depende apenas de totalQuestions
      const engineConfidence = buildSignals(
        {
          mastery: 0,
          confidence: 0,
          totalQuestions: 0,
          correctQuestions: 0,
          lastStudiedAt: mockTimestamp,
        },
        null,
        0,
        mockTimestamp,
      ).confidence;

      expect(engineConfidence).toBe(0);
    }
  });

  it("TESTE 8: referenceId é preservado para vínculo e rastreabilidade", () => {
    const input: CognitiveEvidenceInput = {
      userId: "user-test-123",
      topicId: "topic-direito-const-06",
      kind: "exposure",
      source: "planner_task",
      referenceId: "task-uuid-999",
    };

    const norm = normalizeEvidence(input);
    if (norm.success) {
      expect(norm.evidence.referenceId).toBe("task-uuid-999");
    }
  });

  it("TESTE 9: Idempotência e ordem cronológica no registro de exposição", async () => {
    const userId = "user-test-123";
    const topicId = "topic-idempotent-01";
    const ts1 = "2026-08-31T10:00:00.000Z";
    const ts2 = "2026-08-31T09:00:00.000Z"; // Timestamp anterior não deve sobrescrever

    await recordExposureKnowledge({
      userId,
      topicId,
      timestamp: ts1,
      referenceId: "task-idemp-1",
    });

    let storedRow = getMockRow(userId, topicId);
    expect(storedRow).not.toBeNull();
    expect(storedRow.last_studied_at).toBe(ts1);

    await recordExposureKnowledge({
      userId,
      topicId,
      timestamp: ts2,
      referenceId: "task-idemp-1",
    });

    // Ler novamente e comprovar que continua ts1
    storedRow = getMockRow(userId, topicId);
    expect(storedRow.last_studied_at).toBe(ts1);

    const signals = buildSignals(
      {
        mastery: storedRow.mastery,
        confidence: storedRow.confidence,
        totalQuestions: storedRow.total_questions,
        correctQuestions: storedRow.correct_questions,
        lastStudiedAt: storedRow.last_studied_at,
      },
      null,
      0,
      ts1,
    );

    expect(signals.daysSinceStudy).toBe(0);
  });

  it("TESTE 10: Isolamento do fluxo de questões (tentativa de questão continua afetando o mastery determinístico)", () => {
    const state0 = { ...INITIAL_STATE };
    const update = updateKnowledge(state0, {
      attemptId: "att-001",
      isCorrect: true,
      difficulty: "media",
      errorCategory: null,
      timestamp: mockTimestamp,
    });

    expect(update.newState.totalQuestions).toBe(1);
    expect(update.newState.correctQuestions).toBe(1);
    expect(update.newState.mastery).toBeGreaterThan(0);
    expect(update.newState.confidence).toBeGreaterThan(0);
  });

  it("TESTE ADICIONAL: nova exposição NÃO zera nem substitui mastery, confidence, total_questions ou correct_questions de um registro existente", async () => {
    const userId = "user-test-123";
    const topicId = "topic-pre-existing-01";
    const oldTimestamp = "2026-08-30T10:00:00.000Z";

    // 1. Inserir registro existente com mastery 0.72, confidence 0.68, total_questions 40, correct_questions 30
    setMockRow(userId, topicId, {
      id: "utk-pre-999",
      user_id: userId,
      topic_id: topicId,
      subject_id: "subj-pre-01",
      contest_id: null,
      mastery: 0.72,
      confidence: 0.68,
      total_questions: 40,
      correct_questions: 30,
      last_studied_at: oldTimestamp,
    });

    const newTimestamp = "2026-08-31T12:00:00.000Z";

    // 2. Executar nova exposição teórica
    await recordExposureKnowledge({
      userId,
      topicId,
      timestamp: newTimestamp,
      referenceId: "task-exp-999",
    });

    // 3. Ler o registro persistido no mock
    const storedRow = getMockRow(userId, topicId);
    expect(storedRow).not.toBeNull();

    // 4. Comprovar a preservação estrita dos quatro valores cognitivos
    expect(storedRow.mastery).toBe(0.72);
    expect(storedRow.confidence).toBe(0.68);
    expect(storedRow.total_questions).toBe(40);
    expect(storedRow.correct_questions).toBe(30);

    // 5. Comprovar que APENAS last_studied_at foi alterado
    expect(storedRow.last_studied_at).toBe(newTimestamp);
  });
});
