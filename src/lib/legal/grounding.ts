/**
 * GROUNDING JURÍDICO E GUARDRAILS ANTI-ALUCINAÇÃO — (Fase 7.3.2.3 & 7.3.2.8)
 *
 * Valida programmaticamente as citações legais, números de artigos, leis, súmulas e
 * jurisprudências produzidas pelo Professor Fiscal contra o conjunto de fontes
 * efetivamente recuperadas e fornecidas no contexto.
 */

import type { LegalGroundingResult, LegalSource } from "./types";

/**
 * Padrões de Expressão Regular para extração de citações jurídicas no texto gerado.
 */
const CITATION_PATTERNS = [
  /art(?:igo|\.)?\s*(\d+[a-z-]*)/gi,
  /(?:lei\s*complementar|lc)\s*([\d/]+)/gi,
  /lei\s*(?:nº?\s*)?([\d/]+)/gi,
  /súmula\s*(?:vinculante\s*)?(\d+)/gi,
  /(?:ctn|código tributário nacional)/gi,
  /(?:cf\/88|constituição federal)/gi,
  /decreto\s*(?:nº?\s*)?([\d/]+)/gi,
];

/**
 * Normaliza referências jurídicas para comparação simples.
 */
function normalizeCitation(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\d]/gi, "")
    .trim();
}

/**
 * Extrai todas as menções a artigos, leis, códigos e súmulas de um texto.
 */
export function extractLegalCitations(text: string): string[] {
  const citations = new Set<string>();

  for (const pattern of CITATION_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match[0]) {
        citations.add(match[0].trim());
      }
    }
  }

  return Array.from(citations);
}

/**
 * Valida se uma citação extraída do texto da IA possui suporte nas fontes recuperadas.
 */
function citationIsSupported(citation: string, sources: LegalSource[]): boolean {
  const normCit = normalizeCitation(citation);

  for (const src of sources) {
    const normDoc = normalizeCitation(src.documentIdentifier);
    const normTitle = normalizeCitation(src.title);
    const normSourceId = normalizeCitation(src.sourceId);
    const normArt = src.article ? normalizeCitation(src.article) : "";
    const normText = normalizeCitation(src.text);

    // Verificação de suporte direto
    if (
      normDoc.includes(normCit) ||
      normCit.includes(normDoc) ||
      normTitle.includes(normCit) ||
      normSourceId.includes(normCit) ||
      (normArt && (normArt.includes(normCit) || normCit.includes(normArt))) ||
      normText.includes(normCit)
    ) {
      return true;
    }

    // Padrões de número de artigo (ex: "art 150" vs "art. 150")
    const artNumMatch = citation.match(/\d+/);
    if (artNumMatch && src.article) {
      const num = artNumMatch[0];
      if (src.article.includes(num)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Avalia o grounding jurídico de um texto produzido pela IA contra o conjunto de fontes recuperadas.
 */
export function validateLegalGrounding(
  responseContent: string,
  retrievedSources: LegalSource[],
): LegalGroundingResult {
  const extractedCitations = extractLegalCitations(responseContent);
  const citationMap: Record<string, string> = {};
  const unfoundCitations: string[] = [];
  const sourcesUsed: LegalSource[] = [];

  if (retrievedSources.length === 0) {
    // Se não há nenhuma fonte recuperada mas o texto contém citações explícitas de artigos/leis
    if (extractedCitations.length > 0) {
      return {
        isGrounded: false,
        sourcesUsed: [],
        groundingScore: 0,
        citationMap: {},
        unfoundCitations: extractedCitations,
        hasHallucination: true,
        hallucinationReason: `Violação de Grounding Jurídico: A IA citou os dispositivos [${extractedCitations.join(", ")}], porém nenhuma fonte jurídica foi fornecida no contexto.`,
        sanitizedText: `Não foi localizada fonte jurídica suficiente no sistema para confirmar a fundamentação sobre ${extractedCitations.join(", ")}.`,
      };
    }

    return {
      isGrounded: true, // Nenhuma citação feita sem fonte
      sourcesUsed: [],
      groundingScore: 1.0,
      citationMap: {},
      unfoundCitations: [],
      hasHallucination: false,
    };
  }

  // Compara cada citação contra as fontes fornecidas
  for (const cit of extractedCitations) {
    let matchedSource: LegalSource | null = null;
    for (const src of retrievedSources) {
      if (citationIsSupported(cit, [src])) {
        matchedSource = src;
        break;
      }
    }

    if (matchedSource) {
      citationMap[cit] =
        matchedSource.documentIdentifier +
        (matchedSource.article ? ` ${matchedSource.article}` : "");
      if (!sourcesUsed.some((s) => s.sourceId === matchedSource!.sourceId)) {
        sourcesUsed.push(matchedSource);
      }
    } else {
      unfoundCitations.push(cit);
    }
  }

  const hasHallucination = unfoundCitations.length > 0;
  const groundingScore =
    extractedCitations.length > 0
      ? (extractedCitations.length - unfoundCitations.length) / extractedCitations.length
      : 1.0;

  let hallucinationReason: string | undefined;
  let sanitizedText: string | undefined;

  if (hasHallucination) {
    hallucinationReason = `Violação de Guardrail Jurídico: A IA citou os dispositivos não fornecidos no contexto: [${unfoundCitations.join(", ")}].`;
    sanitizedText = `Atenção: Não há fonte jurídica validada no contexto para o dispositivo [${unfoundCitations.join(", ")}]. A orientação deve continuar no campo conceitual.`;
  }

  return {
    isGrounded: !hasHallucination,
    sourcesUsed,
    groundingScore,
    citationMap,
    unfoundCitations,
    hasHallucination,
    hallucinationReason,
    sanitizedText,
  };
}

/**
 * Valida estritamente a presença de alucinações jurídicas no objeto de resposta do Professor Fiscal.
 * Lança erro explícito se houver alucinação de artigos ou leis.
 */
export function assertLegalGrounding(
  responseContent: string,
  retrievedSources: LegalSource[],
): LegalGroundingResult {
  const result = validateLegalGrounding(responseContent, retrievedSources);
  if (result.hasHallucination) {
    throw new Error(result.hallucinationReason || "Erro de grounding jurídico.");
  }
  return result;
}
