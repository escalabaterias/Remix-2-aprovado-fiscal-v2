/**
 * Serviço de processamento de tentativas — Etapa 3.1
 *
 * Orquestra o ciclo completo:
 * tentativa → resultado → atualização do domínio → erro (se aplicável)
 * → snapshot histórico → estado atual atualizado
 *
 * Usa a RPC process_attempt_knowledge para garantir atomicidade no banco.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ErrorCategory = Database["public"]["Enums"]["error_category"];

import {
  updateKnowledge,
  INITIAL_STATE,
  type KnowledgeState,
  type AttemptInput,
  type Difficulty,
} from "./engine";

export type ProcessAttemptInput = {
  attemptId: string;
  topicId: string;
  subjectId: string;
  contestId: string | null;
  sessionId: string | null;
  isCorrect: boolean;
  difficulty: Difficulty;
  errorCategory: string | null;
  questionId: string | null;
  rootTopicId: string | null;
};

export type ProcessAttemptResult = {
  status: "processed" | "already_processed";
  historyId: string | null;
  errorId: string | null;
  masteryBefore: number;
  masteryAfter: number;
  confidence: number;
};

/**
 * Busca o estado atual de conhecimento de um tópico.
 */
export async function fetchCurrentKnowledge(topicId: string): Promise<KnowledgeState> {
  const { data, error } = await supabase
    .from("user_topic_knowledge")
    .select("mastery, confidence, total_questions, correct_questions, last_studied_at")
    .eq("topic_id", topicId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ...INITIAL_STATE };

  return {
    mastery: Number(data.mastery ?? 0),
    confidence: Number(data.confidence ?? 0),
    totalQuestions: data.total_questions ?? 0,
    correctQuestions: data.correct_questions ?? 0,
    lastStudiedAt: data.last_studied_at ?? null,
  };
}

/**
 * Processa uma tentativa de questão, atualizando domínio, histórico e erros.
 *
 * Idempotente: se a mesma tentativa (attemptId) já foi processada, retorna
 * sem duplicar.
 *
 * Usa RPC para atomicidade.
 */
export async function processAttempt(input: ProcessAttemptInput): Promise<ProcessAttemptResult> {
  // 1. Buscar estado atual
  const currentState = await fetchCurrentKnowledge(input.topicId);

  // 2. Calcular novo estado (determinístico)
  const attempt: AttemptInput = {
    isCorrect: input.isCorrect,
    difficulty: input.difficulty,
    errorCategory: input.errorCategory,
    attemptId: input.attemptId,
    timestamp: new Date().toISOString(),
  };

  const update = updateKnowledge(currentState, attempt);

  // 3. Chamar RPC para persistência atômica
  // Os parâmetros opcionais aceitam NULL no banco, mas os tipos gerados os
  // declaram como obrigatórios (não têm DEFAULT por serem posicionais).
  const rpcArgs = {
    p_user_id: (await supabase.auth.getUser()).data.user!.id,
    p_topic_id: input.topicId,
    p_subject_id: input.subjectId,
    p_contest_id: input.contestId,
    p_attempt_id: input.attemptId,
    p_session_id: input.sessionId,
    p_mastery_before: update.masteryBefore,
    p_mastery_after: update.masteryAfter,
    p_confidence: update.confidence,
    p_total_questions: update.newState.totalQuestions,
    p_correct_questions: update.newState.correctQuestions,
    p_review_count: 0,
    p_last_studied_at: update.newState.lastStudiedAt,
    p_reason: update.reason,
    p_error_category: input.isCorrect ? null : (input.errorCategory as ErrorCategory | null),
    p_error_question_id: input.isCorrect ? null : input.questionId,
    p_error_root_topic_id: input.isCorrect ? null : input.rootTopicId,
  } as unknown as Database["public"]["Functions"]["process_attempt_knowledge"]["Args"];

  const { data, error } = await supabase.rpc("process_attempt_knowledge", rpcArgs);

  if (error) throw error;

  const result = data as {
    status: string;
    history_id: string | null;
    error_id?: string | null;
  } | null;

  return {
    status: result?.status === "already_processed" ? "already_processed" : "processed",
    historyId: result?.history_id ?? null,
    errorId: result?.error_id ?? null,
    masteryBefore: update.masteryBefore,
    masteryAfter: update.masteryAfter,
    confidence: update.confidence,
  };
}

/**
 * Marca um erro como resolvido.
 */
export async function resolveError(errorId: string): Promise<void> {
  const { error } = await supabase
    .from("error_entries")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", errorId);

  if (error) throw error;
}

export type RecordExposureInput = {
  userId?: string;
  topicId: string;
  subjectId?: string | null;
  contestId?: string | null;
  timestamp: string;
  referenceId?: string | null;
};

/**
 * Registra a exposição (estudo de teoria/estudo guiado) em um tópico.
 * Atualiza last_studied_at sem alterar mastery, confidence ou contadores de questões.
 */
export async function recordExposureKnowledge(
  input: RecordExposureInput,
): Promise<{ updated: boolean }> {
  const userId = input.userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  // 1. Verificar se já existe registro para esse usuário e tópico
  const { data: existing, error: selectError } = await supabase
    .from("user_topic_knowledge")
    .select("id, last_studied_at")
    .eq("user_id", userId)
    .eq("topic_id", input.topicId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    // Atualizar apenas se a nova data for posterior (ou se last_studied_at for nulo)
    const currentLast = existing.last_studied_at ? new Date(existing.last_studied_at).getTime() : 0;
    const newLast = new Date(input.timestamp).getTime();

    if (newLast >= currentLast) {
      const builder = supabase.from("user_topic_knowledge");
      if (typeof builder?.update === "function") {
        const { error: updateError } = await builder
          .update({
            last_studied_at: input.timestamp,
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      }
    }
  } else {
    // Inserir registro inicial zerado com recência atual
    const builder = supabase.from("user_topic_knowledge");
    if (typeof builder?.insert === "function") {
      const { error: insertError } = await builder.insert({
        user_id: userId,
        topic_id: input.topicId,
        subject_id: input.subjectId ?? null,
        contest_id: input.contestId ?? null,
        mastery: 0,
        confidence: 0,
        total_questions: 0,
        correct_questions: 0,
        last_studied_at: input.timestamp,
      });

      if (insertError) throw insertError;
    }
  }

  return { updated: true };
}

export type RecordRecallInput = RecordExposureInput;

/**
 * Registra a recuperação ativa (recall / flashcards) em um tópico.
 * Atualiza last_studied_at sem alterar mastery, confidence ou contadores de questões.
 * Garante que Recall NUNCA incrementa total_questions nem chama o Knowledge Engine.
 */
export async function recordRecallKnowledge(
  input: RecordRecallInput,
): Promise<{ updated: boolean }> {
  return recordExposureKnowledge(input);
}

export type RecordRemediationKnowledgeInput = RecordExposureInput & {
  result?: "success" | "partial" | "fail" | null;
};

/**
 * Registra o saneamento de erro (remediation) em um tópico.
 * Atualiza last_studied_at sem alterar mastery, confidence ou contadores de questões.
 * Garante que Remediation NUNCA incrementa total_questions/correct_questions nem chama o Knowledge Engine.
 */
export async function recordRemediationKnowledge(
  input: RecordRemediationKnowledgeInput,
): Promise<{ updated: boolean }> {
  return recordExposureKnowledge(input);
}

export type RecordReviewKnowledgeInput = RecordExposureInput & {
  lastReviewResult?: string | null;
  nextReviewAt?: string | null;
  reviewCount?: number | null;
};

/**
 * Registra a conclusão de uma sessão de revisão adaptativa em um tópico.
 * Atualiza last_studied_at, last_review_at, last_review_result, next_review_at e review_count (se aplicável)
 * sem alterar mastery, confidence ou contadores de questões objetivas (total_questions / correct_questions).
 * Garante que a revisão NUNCA incrementa contadores de questões nem chama o Knowledge Engine.
 */
export async function recordReviewKnowledge(
  input: RecordReviewKnowledgeInput,
): Promise<{ updated: boolean }> {
  const userId = input.userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: existing, error: selectError } = await supabase
    .from("user_topic_knowledge")
    .select("id, last_studied_at, review_count")
    .eq("user_id", userId)
    .eq("topic_id", input.topicId)
    .maybeSingle();

  if (selectError) throw selectError;

  const reviewDate = input.timestamp.slice(0, 10);

  if (existing) {
    const currentLast = existing.last_studied_at ? new Date(existing.last_studied_at).getTime() : 0;
    const newLast = new Date(input.timestamp).getTime();

    if (newLast >= currentLast) {
      const updateData: Record<string, any> = {
        last_studied_at: input.timestamp,
        last_review_at: reviewDate,
      };

      if (input.lastReviewResult !== undefined && input.lastReviewResult !== null) {
        updateData["last_review_result"] = input.lastReviewResult;
      }
      if (input.nextReviewAt !== undefined && input.nextReviewAt !== null) {
        updateData["next_review_at"] = input.nextReviewAt;
      }
      if (input.reviewCount !== undefined && input.reviewCount !== null) {
        updateData["review_count"] = input.reviewCount;
      }

      const builder = supabase.from("user_topic_knowledge");
      if (typeof builder?.update === "function") {
        const { error: updateError } = await builder
          .update(updateData as any)
          .eq("id", existing.id);

        if (updateError) throw updateError;
      }
    }
  } else {
    const insertData: Record<string, any> = {
      user_id: userId,
      topic_id: input.topicId,
      subject_id: input.subjectId ?? null,
      contest_id: input.contestId ?? null,
      mastery: 0,
      confidence: 0,
      total_questions: 0,
      correct_questions: 0,
      last_studied_at: input.timestamp,
      last_review_at: reviewDate,
    };

    if (input.lastReviewResult !== undefined && input.lastReviewResult !== null) {
      insertData["last_review_result"] = input.lastReviewResult;
    }
    if (input.nextReviewAt !== undefined && input.nextReviewAt !== null) {
      insertData["next_review_at"] = input.nextReviewAt;
    }
    if (input.reviewCount !== undefined && input.reviewCount !== null) {
      insertData["review_count"] = input.reviewCount;
    }

    const builder = supabase.from("user_topic_knowledge");
    if (typeof builder?.insert === "function") {
      const { error: insertError } = await builder.insert(insertData as any);
      if (insertError) throw insertError;
    }
  }

  return { updated: true };
}
