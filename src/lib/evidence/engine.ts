/**
 * ENGINE PURO DE EVIDÊNCIA COGNITIVA — Etapa 6.16
 *
 * Responsabilidades:
 * - Validação de entradas de evidência cognitiva
 * - Normalização determinística de dados
 * - Atribuição de pesos pedagógicos por tipo de evidência
 * - Garantia da regra fundamental: EXPOSIÇÃO ≠ DOMÍNIO
 *
 * PROPRIEDADES:
 * - Puro e determinístico (mesmo input → mesmo output)
 * - Sem efeitos colaterais
 * - Sem dependência de React, UI ou Supabase
 * - Não duplica nem altera as fórmulas do Knowledge Engine
 */

import type {
  CognitiveEvidenceInput,
  CognitiveEvidenceKind,
  EvidenceNormalizationResult,
  NormalizedCognitiveEvidence,
  PerceivedDifficulty,
} from "./types";

/**
 * Pesos pedagógicos base por tipo de evidência cognitiva.
 *
 * - practice: 1.0 (Avaliação objetiva com maior valor probatório de domínio)
 * - remediation: 0.8 (Superação e saneamento de erros)
 * - review: 0.7 (Sessões de revisão adaptativa)
 * - recall: 0.6 (Recuperação ativa via flashcards)
 * - exposure: 0.3 (Exposição ao conteúdo / leitura teórica sem prova objetiva)
 */
const BASE_WEIGHT_BY_KIND: Record<CognitiveEvidenceKind, number> = {
  practice: 1.0,
  remediation: 0.8,
  review: 0.7,
  recall: 0.6,
  exposure: 0.3,
};

/**
 * Multiplicador de peso por dificuldade percebida.
 */
const DIFFICULTY_WEIGHT_MULTIPLIER: Record<PerceivedDifficulty, number> = {
  facil: 0.9,
  media: 1.0,
  dificil: 1.1,
};

/**
 * Valida os dados de entrada de uma evidência cognitiva.
 * Retorna uma lista de erros encontrados (vazia se válido).
 */
export function validateEvidenceInput(input: CognitiveEvidenceInput): string[] {
  const errors: string[] = [];

  if (!input.userId || typeof input.userId !== "string" || input.userId.trim() === "") {
    errors.push("userId é obrigatório e deve ser uma string não vazia.");
  }

  if (!input.topicId || typeof input.topicId !== "string" || input.topicId.trim() === "") {
    errors.push("topicId é obrigatório e deve ser uma string não vazia.");
  }

  const validKinds: CognitiveEvidenceKind[] = [
    "exposure",
    "practice",
    "recall",
    "review",
    "remediation",
  ];
  if (!input.kind || !validKinds.includes(input.kind)) {
    errors.push(`kind deve ser um dos seguintes valores: ${validKinds.join(", ")}.`);
  }

  if (input.score !== undefined && input.score !== null) {
    if (
      typeof input.score !== "number" ||
      isNaN(input.score) ||
      input.score < 0 ||
      input.score > 1
    ) {
      errors.push("score, quando informado, deve ser um número entre 0.0 e 1.0.");
    }
  }

  if (input.declaredConfidence !== undefined && input.declaredConfidence !== null) {
    if (
      typeof input.declaredConfidence !== "number" ||
      ![1, 2, 3, 4, 5].includes(input.declaredConfidence)
    ) {
      errors.push("declaredConfidence, quando informado, deve ser um número inteiro de 1 a 5.");
    }
  }

  if (input.durationSeconds !== undefined && input.durationSeconds !== null) {
    if (typeof input.durationSeconds !== "number" || input.durationSeconds < 0) {
      errors.push("durationSeconds deve ser um número maior ou igual a zero.");
    }
  }

  return errors;
}

/**
 * Determina o peso cognitivo de uma evidência pedagógica.
 * Determinístico.
 */
export function calculateCognitiveWeight(
  kind: CognitiveEvidenceKind,
  difficulty?: PerceivedDifficulty | null,
): number {
  const baseWeight = BASE_WEIGHT_BY_KIND[kind] ?? 0.3;
  const mult = difficulty ? (DIFFICULTY_WEIGHT_MULTIPLIER[difficulty] ?? 1.0) : 1.0;
  return Math.max(0.1, Math.min(1.0, baseWeight * mult));
}

/**
 * Identifica se a evidência é estritamente de exposição (Ex: Teoria/Aulas).
 * Regra pedagógica: EXPOSIÇÃO ≠ DOMÍNIO.
 */
export function isExposureOnly(kind: CognitiveEvidenceKind): boolean {
  return kind === "exposure";
}

/**
 * Converte a nota de autoavaliação de recall (rating 1..5) em um score probatório de 0.00 a 1.00.
 *
 * Fórmula determinística: score = (rating - 1) / 4
 * - 1 -> 0.00
 * - 2 -> 0.25
 * - 3 -> 0.50
 * - 4 -> 0.75
 * - 5 -> 1.00
 */
export function normalizeRecallRatingToScore(rating: number): number {
  if (
    typeof rating !== "number" ||
    isNaN(rating) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new Error("Rating de recall deve ser um número inteiro de 1 a 5.");
  }
  return (rating - 1) / 4;
}

/**
 * Converte o resultado de uma sessão de revisão adaptativa ("success" | "partial" | "fail")
 * em um score probatório de 0.00 a 1.00.
 *
 * Mapeamento determinístico:
 * - success -> 1.0
 * - partial -> 0.5
 * - fail    -> 0.0
 */
export function normalizeReviewResultToScore(result: "success" | "partial" | "fail"): number {
  switch (result) {
    case "success":
      return 1.0;
    case "partial":
      return 0.5;
    case "fail":
      return 0.0;
    default:
      throw new Error(`Resultado de revisão inválido: ${result}`);
  }
}

/**
 * Converte o resultado de um saneamento de erro ("success" | "partial" | "fail")
 * em um score probatório de 0.00 a 1.00.
 *
 * Mapeamento determinístico:
 * - success -> 1.0
 * - partial -> 0.5
 * - fail    -> 0.0
 */
export function normalizeRemediationResultToScore(result: "success" | "partial" | "fail"): number {
  switch (result) {
    case "success":
      return 1.0;
    case "partial":
      return 0.5;
    case "fail":
      return 0.0;
    default:
      throw new Error(`Resultado de remediação inválido: ${result}`);
  }
}

/**
 * Normaliza uma evidência cognitiva em uma estrutura limpa e imutável.
 *
 * Determinístico: se fallbackTimestamp for omitido, deve ser fornecido
 * explicitamente em testes para garantir reprodutibilidade.
 */
export function normalizeEvidence(
  input: CognitiveEvidenceInput,
  fallbackTimestamp?: string,
): EvidenceNormalizationResult {
  const errors = validateEvidenceInput(input);
  if (errors.length > 0) {
    return { success: false, errors };
  }

  const difficulty: PerceivedDifficulty = input.difficulty ?? "media";
  const cognitiveWeight = calculateCognitiveWeight(input.kind, difficulty);
  const exposureOnly = isExposureOnly(input.kind);

  const timestamp = input.timestamp || fallbackTimestamp || new Date().toISOString();

  let score = input.score ?? null;
  if (score === null && input.kind === "recall" && input.declaredConfidence) {
    score = normalizeRecallRatingToScore(input.declaredConfidence);
  }

  const normalized: NormalizedCognitiveEvidence = {
    userId: input.userId.trim(),
    topicId: input.topicId.trim(),
    subjectId: input.subjectId ?? null,
    contestId: input.contestId ?? null,
    kind: input.kind,
    source: input.source,
    timestamp,
    durationSeconds: input.durationSeconds ?? 0,
    score,
    difficulty,
    declaredConfidence: input.declaredConfidence ?? null,
    referenceId: input.referenceId ?? null,
    cognitiveWeight,
    isExposureOnly: exposureOnly,
  };

  return { success: true, evidence: normalized };
}
