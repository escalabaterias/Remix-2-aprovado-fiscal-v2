/**
 * CAMADA DETERMINÍSTICA DE RECUPERAÇÃO JURÍDICA — RAG JURÍDICO (Fase 7.3.2.2)
 *
 * Realiza buscas determinísticas na base de legislação e jurisprudência,
 * ordenando por relevância conceitual, tópica, por artigo e padrão de erro.
 */

import { getAllVerifiedLegalSources } from "./repository";
import type { LegalRetrievalContext, LegalSearchQuery, LegalSource } from "./types";

/**
 * Normaliza strings para comparação insensível a acentos, caixa e pontuação.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calcula a pontuação de relevância determinística de uma fonte jurídica para um contexto.
 */
function calculateRelevanceScore(source: LegalSource, context: LegalRetrievalContext): number {
  let score = 0;

  const normTopicName = context.topicName ? normalizeText(context.topicName) : "";
  const normTopicId = context.topicId ? normalizeText(context.topicId) : "";
  const normConcept = context.targetConcept ? normalizeText(context.targetConcept) : "";
  const normArticle = context.articleSearch ? normalizeText(context.articleSearch) : "";
  const normSubject = context.subjectName ? normalizeText(context.subjectName) : "";

  // 1. Correspondência direta por Tópico (Peso alto)
  if (context.topicId && source.topicIds.includes(context.topicId)) {
    score += 10;
  }
  if (normTopicName && source.topicIds.some((tid) => normalizeText(tid).includes(normTopicName))) {
    score += 8;
  }

  // 2. Correspondência por Artigo / Dispositivo Legal (Peso muito alto)
  if (normArticle && source.article) {
    const normSourceArt = normalizeText(source.article);
    if (normSourceArt.includes(normArticle) || normArticle.includes(normSourceArt)) {
      score += 12;
    }
  }

  // 3. Correspondência por Matéria/Subject
  if (normSubject && source.subjectName) {
    if (normalizeText(source.subjectName).includes(normSubject)) {
      score += 4;
    }
  }

  // 4. Correspondência por Palavras-Chave e Conceito-Alvo
  if (source.keywords && source.keywords.length > 0) {
    for (const kw of source.keywords) {
      const normKw = normalizeText(kw);
      if (normConcept && normConcept.includes(normKw)) {
        score += 3;
      }
      if (normTopicName && normTopicName.includes(normKw)) {
        score += 2;
      }
    }
  }

  // 5. Verificação no texto literal e identificador do documento
  const normDocId = normalizeText(source.documentIdentifier);
  const normText = normalizeText(source.text);

  if (normConcept && normText.includes(normConcept)) {
    score += 5;
  }
  if (normConcept && normDocId.includes(normConcept)) {
    score += 6;
  }

  // 6. Reforço baseado no Padrão de Erro (Central de Erros)
  if (context.errorContext) {
    const { errorCategory, errorPattern } = context.errorContext;
    if (errorCategory === "memorizacao_artigo" && source.article) {
      score += 3;
    }
    if (errorCategory === "interpretação_normativa" && source.text) {
      score += 3;
    }
    if (
      errorCategory === "excecao_normativa" &&
      (source.paragraph ||
        source.inciso ||
        source.text.includes("exceção") ||
        source.text.includes("vedado"))
    ) {
      score += 4;
    }
    if (errorPattern && normText.includes(normalizeText(errorPattern))) {
      score += 5;
    }
  }

  // 7. Reforço baseado no Tipo de Revisão Ativa
  if (context.reviewType) {
    if (context.reviewType === "erro_direcionado" || context.reviewType === "REMEDIAÇÃO_POR_ERRO") {
      score += 2;
    }
  }

  return score;
}

/**
 * Recupera fontes jurídicas válidas e fundamentadas para um determinado contexto de estudo.
 */
export function retrieveLegalSources(
  context: LegalRetrievalContext,
  availableSources?: LegalSource[],
): LegalSource[] {
  const sourcesToQuery =
    availableSources && availableSources.length > 0
      ? availableSources
      : getAllVerifiedLegalSources();

  const validityFilter = context.validityStatusFilter || "VIGENTE";
  const limit = context.limit || 3;

  // Filtrar por validade e jurisdição se aplicável
  let filtered = sourcesToQuery.filter((s) => s.validityStatus === validityFilter);

  if (context.jurisdictionFilter) {
    const normJur = normalizeText(context.jurisdictionFilter);
    filtered = filtered.filter(
      (s) => s.jurisdiction && normalizeText(s.jurisdiction).includes(normJur),
    );
  }

  // Calcular score de cada fonte
  const scoredSources = filtered.map((source) => ({
    source,
    score: calculateRelevanceScore(source, context),
  }));

  // Filtrar fontes com relevância mínima (> 0)
  const validScored = scoredSources.filter((item) => item.score > 0);

  // Ordenar por score decrescente
  validScored.sort((a, b) => b.score - a.score);

  return validScored.slice(0, limit).map((item) => item.source);
}

/**
 * Executa uma busca direta por parâmetros simples em forma de query.
 */
export function queryLegalSources(
  query: LegalSearchQuery,
  availableSources?: LegalSource[],
): LegalSource[] {
  const ctx: LegalRetrievalContext = {
    ...(query.topicId ? { topicId: query.topicId } : {}),
    ...(query.topicName ? { topicName: query.topicName } : {}),
    ...(query.subjectName ? { subjectName: query.subjectName } : {}),
    ...(query.concept ? { targetConcept: query.concept } : {}),
    ...(query.article ? { articleSearch: query.article } : {}),
    ...(query.keywords ? { keywords: query.keywords } : {}),
    ...(query.validityStatus ? { validityStatusFilter: query.validityStatus } : {}),
    ...(query.jurisdiction ? { jurisdictionFilter: query.jurisdiction } : {}),
    ...(query.limit !== undefined ? { limit: query.limit } : {}),
  };
  return retrieveLegalSources(ctx, availableSources);
}
