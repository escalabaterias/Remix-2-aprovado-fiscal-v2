/**
 * SERVIÇO DE EVIDÊNCIA COGNITIVA — Etapa 6.16
 *
 * Ponto de entrada unificado para recepção e registro de evidências cognitivas.
 *
 * RESPONSABILIDADES:
 * - Receber e validar entrada via Evidence Engine (puro)
 * - Garantir orquestração de registro sem duplicar matemática de motores
 * - Manter isolamento e compatibilidade total com o fluxo legado de questões
 * - Preparar a infraestrutura para as integrações das etapas 6.17+
 */

import { normalizeEvidence } from "./engine";
import type { CognitiveEvidenceInput, RecordEvidenceResult } from "./types";
import {
  recordExposureKnowledge,
  recordRecallKnowledge,
  recordRemediationKnowledge,
  recordReviewKnowledge,
} from "@/lib/knowledge/service";

/**
 * Registra uma evidência cognitiva no sistema.
 *
 * Etapa 6.16 (Fundação) + Etapa 6.17 (Teoria) + Etapa 6.18 (Prática) + Etapa 6.19 (Recall) + Etapa 6.20 (Revisão) + Etapa 6.23 (Remediação):
 * Valida e normaliza a evidência via Evidence Engine puro.
 * - Quando 'exposure': encaminha para a atualização de recência no Knowledge Service.
 * - Quando 'recall': encaminha para atualização de recência de recuperação ativa.
 * - Quando 'review': encaminha para atualização de recência de revisão adaptativa.
 * - Quando 'remediation': encaminha para atualização de recência de saneamento de erros.
 * - Quando 'practice': normaliza e valida a evidência de resolução de questão.
 */
export async function recordCognitiveEvidence(
  input: CognitiveEvidenceInput,
): Promise<RecordEvidenceResult> {
  // 1. Normalização e validação pura pelo Engine
  const normalization = normalizeEvidence(input);

  if (!normalization.success) {
    return {
      processed: false,
      evidence: null,
      skipReason: `validação_falhou: ${normalization.errors.join("; ")}`,
    };
  }

  const evidence = normalization.evidence;

  // 2. Encaminhar para a camada de conhecimento se for exposição, recall, revisão ou remediação
  if (evidence.kind === "exposure") {
    await recordExposureKnowledge({
      userId: evidence.userId,
      topicId: evidence.topicId,
      subjectId: evidence.subjectId,
      contestId: evidence.contestId,
      timestamp: evidence.timestamp,
      referenceId: evidence.referenceId,
    });
  } else if (evidence.kind === "recall") {
    await recordRecallKnowledge({
      userId: evidence.userId,
      topicId: evidence.topicId,
      subjectId: evidence.subjectId,
      contestId: evidence.contestId,
      timestamp: evidence.timestamp,
      referenceId: evidence.referenceId,
    });
  } else if (evidence.kind === "review") {
    await recordReviewKnowledge({
      userId: evidence.userId,
      topicId: evidence.topicId,
      subjectId: evidence.subjectId,
      contestId: evidence.contestId,
      timestamp: evidence.timestamp,
      referenceId: evidence.referenceId,
    });
  } else if (evidence.kind === "remediation") {
    await recordRemediationKnowledge({
      userId: evidence.userId,
      topicId: evidence.topicId,
      subjectId: evidence.subjectId,
      contestId: evidence.contestId,
      timestamp: evidence.timestamp,
      referenceId: evidence.referenceId,
    });
  }

  // 3. Retorno estruturado da evidência normalizada
  return {
    processed: true,
    evidence,
    skipReason: null,
  };
}
