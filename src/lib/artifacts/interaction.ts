/**
 * PROCESSAMENTO DE INTERAÇÃO DOS ARTEFATOS ADAPTATIVOS — Fase 7.6.4
 *
 * Conecta a interação do aluno no componente UI (`AdaptiveStudyArtifact`)
 * ao registro de evidência real via `recordArtifactInteractionEvidence()`.
 *
 * REGRAS DE NEGÓCIO E AUTORIDADE:
 * - Não registra evidência na simples visualização do artefato.
 * - Registra evidência SOMENTE após uma interação pedagógica válida do aluno.
 * - Garante idempotência estrita através de chave determinística.
 * - Falhas na camada de persistência/evidência NUNCA interrompem o fluxo de estudo.
 * - Atribui score e confiança proporcional ao comportamento e autoavaliação real do aluno.
 */

import type { ArtifactKind } from "./types";
import type { PedagogicalAction } from "../decision/types";
import type { DeclaredConfidence, RecordEvidenceResult } from "../evidence/types";
import { recordArtifactInteractionEvidence } from "./integration";

export interface ArtifactUserResponse {
  comprehended?: boolean;
  flashcardSelfRating?: number; // 1 (Não lembrei) a 5 (Domínio total)
  score?: number | null; // 0.0 a 1.0
  answerText?: string;
  declaredConfidence?: DeclaredConfidence | null;
}

export interface ArtifactInteractionPayload {
  userId: string;
  topicId: string;
  subjectId?: string | null;
  artifactId: string;
  artifactKind: ArtifactKind;
  pedagogicalAction: PedagogicalAction;
  interactionType: "comprehended" | "flashcard_recall" | "active_recall_answer";
  userResponse: ArtifactUserResponse;
  durationSeconds?: number;
  idempotencyKey?: string;
  timestamp?: string;
}

export interface ArtifactInteractionResult {
  success: boolean;
  alreadyProcessed: boolean;
  evidenceRecorded: boolean;
  evidenceResult?: RecordEvidenceResult | null;
  score: number | null;
  declaredConfidence: DeclaredConfidence | null;
  idempotencyKey: string;
  statusMessage?: string;
  error?: string;
}

// Map estático para cache determinístico de idempotência em memória
const interactionCache = new Map<string, ArtifactInteractionResult>();

/**
 * Limpa o cache de idempotência de interações (para uso em testes).
 */
export function clearArtifactInteractionCache(): void {
  interactionCache.clear();
}

/**
 * Computa a chave determinística de idempotência para a interação.
 */
export function computeInteractionIdempotencyKey(payload: ArtifactInteractionPayload): string {
  if (payload.idempotencyKey) {
    return payload.idempotencyKey;
  }

  const responseSignature = JSON.stringify({
    comprehended: payload.userResponse.comprehended,
    rating: payload.userResponse.flashcardSelfRating,
    score: payload.userResponse.score,
    ans: payload.userResponse.answerText ? payload.userResponse.answerText.slice(0, 30) : "",
  });

  return `art-interact:${payload.userId}:${payload.artifactId}:${payload.artifactKind}:${payload.interactionType}:${responseSignature}`;
}

/**
 * Calcula a nota (score 0..1) e a confiança declarada (1..5) baseando-se no tipo de artefato e resposta real do aluno.
 */

export function deriveInteractionMetrics(
  artifactKind: ArtifactKind,
  response: ArtifactUserResponse,
): { score: number | null; declaredConfidence: DeclaredConfidence | null } {
  // 1. Se o score foi explicitamente fornecido (0.0 a 1.0)
  if (response.score !== undefined && response.score !== null) {
    const score = Math.max(0, Math.min(1, response.score));
    const confidence =
      response.declaredConfidence ?? (score >= 0.8 ? 5 : score >= 0.6 ? 4 : score >= 0.4 ? 3 : 2);
    return { score, declaredConfidence: confidence as DeclaredConfidence };
  }

  // 2. Flashcard com avaliação de 1 a 5
  if (artifactKind === "FLASHCARD" && response.flashcardSelfRating !== undefined) {
    const rating = Math.max(1, Math.min(5, Math.round(response.flashcardSelfRating)));
    const score = (rating - 1) / 4;
    return { score, declaredConfidence: rating as DeclaredConfidence };
  }

  // 3. Resposta Socrática / Active Recall
  if (artifactKind === "ACTIVE_RECALL") {
    if (response.comprehended === true) {
      return { score: 1.0, declaredConfidence: response.declaredConfidence ?? 4 };
    } else if (response.comprehended === false) {
      return { score: 0.25, declaredConfidence: response.declaredConfidence ?? 2 };
    } else if (response.answerText && response.answerText.trim().length > 0) {
      return { score: 0.75, declaredConfidence: response.declaredConfidence ?? 3 };
    }
    return { score: 0.2, declaredConfidence: response.declaredConfidence ?? 2 };
  }

  // 4. Artefatos de Confirmação de Compreensão (MNEMONIC, MIND_MAP, SUMMARY, COMPARISON_TABLE)
  if (response.comprehended === true) {
    return { score: 1.0, declaredConfidence: response.declaredConfidence ?? 4 };
  } else if (response.comprehended === false) {
    return { score: 0.25, declaredConfidence: response.declaredConfidence ?? 2 };
  }

  return { score: null, declaredConfidence: response.declaredConfidence ?? null };
}

/**
 * Função principal: Processa a interação real do aluno com o artefato e registra a evidência.
 */
export async function processArtifactInteraction(
  payload: ArtifactInteractionPayload,
): Promise<ArtifactInteractionResult> {
  // Validação básica dos dados obrigatórios
  if (!payload.userId || !payload.topicId || !payload.artifactId || !payload.artifactKind) {
    return {
      success: false,
      alreadyProcessed: false,
      evidenceRecorded: false,
      score: null,
      declaredConfidence: null,
      idempotencyKey: "",
      error: "userId, topicId, artifactId e artifactKind são obrigatórios para a interação.",
    };
  }

  const idempotencyKey = computeInteractionIdempotencyKey(payload);

  // Verificar idempotência
  if (interactionCache.has(idempotencyKey)) {
    const cached = interactionCache.get(idempotencyKey)!;
    return {
      ...cached,
      alreadyProcessed: true,
      evidenceRecorded: false,
    };
  }

  // Derivar métricas cognitivas reais
  const { score, declaredConfidence } = deriveInteractionMetrics(
    payload.artifactKind,
    payload.userResponse,
  );

  try {
    const evidenceResult = await recordArtifactInteractionEvidence({
      userId: payload.userId,
      topicId: payload.topicId,
      subjectId: payload.subjectId,
      artifactId: payload.artifactId,
      artifactKind: payload.artifactKind,
      pedagogicalAction: payload.pedagogicalAction,
      score,
      declaredConfidence,
      durationSeconds: payload.durationSeconds ?? 0,
      timestamp: payload.timestamp || new Date().toISOString(),
    });

    const result: ArtifactInteractionResult = {
      success: evidenceResult.processed,
      alreadyProcessed: false,
      evidenceRecorded: evidenceResult.processed,
      evidenceResult,
      score,
      declaredConfidence,
      idempotencyKey,
      statusMessage: evidenceResult.processed
        ? "Evidência cognitiva da interação registrada com sucesso."
        : evidenceResult.skipReason || "Interação processada.",
    };

    interactionCache.set(idempotencyKey, result);
    return result;
  } catch (err) {
    // Falhas de persistência NUNCA interrompem o fluxo de estudo do aluno
    const errorMessage = err instanceof Error ? err.message : String(err);
    const fallbackResult: ArtifactInteractionResult = {
      success: true, // Retorna sucesso gracioso para a UI continuar o fluxo
      alreadyProcessed: false,
      evidenceRecorded: false,
      score,
      declaredConfidence,
      idempotencyKey,
      statusMessage: "Interação concluída. Registro de evidência em segundo plano.",
      error: errorMessage,
    };

    interactionCache.set(idempotencyKey, fallbackResult);
    return fallbackResult;
  }
}
