/**
 * TIPOS E CONTRATOS — BANCO DE LEGISLAÇÃO + RAG JURÍDICO (Fase 7.3.2)
 *
 * Define as estruturas tipadas para representação de fontes jurídicas,
 * contextos de recuperação determinística, grounding anti-alucinação
 * e metadados de evidência.
 */

export type LegalSourceType =
  | "CONSTITUICAO"
  | "LEI"
  | "LEI_COMPLEMENTAR"
  | "DECRETO"
  | "CTN"
  | "SUMULA"
  | "SUMULA_VINCULANTE"
  | "JURISPRUDENCIA"
  | "REGULAMENTO"
  | "OUTRA_FONTE_OFICIAL";

export type LegalValidityStatus =
  "VIGENTE" | "REVOGADO_PARCIALMENTE" | "REVOGADO" | "SUSPENSO" | "EM_TRAMITACAO";

export type LegalSource = {
  sourceId: string;
  sourceType: LegalSourceType;
  title: string;
  jurisdiction?: string;
  authority?: string;
  documentIdentifier: string; // Ex: "Lei 5.172/1966", "CF/88", "Súmula Vinculante 50"
  article?: string; // Ex: "Art. 150"
  paragraph?: string; // Ex: "§ 1º"
  inciso?: string; // Ex: "III"
  alinea?: string; // Ex: "a"
  text: string; // Texto literal do dispositivo legal ou súmula
  effectiveDate?: string;
  lastUpdatedAt?: string;
  sourceUrl?: string;
  version?: string;
  validityStatus: LegalValidityStatus;
  topicIds: string[];
  subjectName?: string;
  keywords?: string[];
  reliability?: number; // 0..1
};

export type LegalRetrievalContext = {
  topicId?: string;
  topicName?: string;
  subjectName?: string;
  targetConcept?: string;
  articleSearch?: string;
  keywords?: string[];
  questionContext?: {
    questionId?: string;
    statement?: string;
    correctAnswer?: string;
    explanation?: string;
  };
  errorContext?: {
    errorCategory?: string; // Ex: "interpretação_normativa", "memorizacao_artigo", "excecao_normativa"
    errorPattern?: string;
    recurrenceCount?: number;
    isRecurring?: boolean;
  };
  reviewType?: "manutencao" | "consolidacao" | "recuperacao" | "erro_direcionado" | string;
  contestContext?: {
    contestId?: string;
    title?: string;
    jurisdiction?: string;
  };
  validityStatusFilter?: LegalValidityStatus;
  jurisdictionFilter?: string;
  limit?: number;
};

export type LegalSearchQuery = {
  topicId?: string;
  topicName?: string;
  subjectName?: string;
  concept?: string;
  article?: string;
  keywords?: string[];
  jurisdiction?: string;
  validityStatus?: LegalValidityStatus;
  limit?: number;
};

export type LegalGroundingResult = {
  isGrounded: boolean;
  sourcesUsed: LegalSource[];
  groundingScore: number; // 0..1
  citationMap: Record<string, string>;
  unfoundCitations: string[];
  hasHallucination: boolean;
  hallucinationReason?: string;
  sanitizedText?: string;
};

export type SocraticLegalContext = {
  relevantLegalSources: LegalSource[];
  targetLegalConcept?: string;
  legalGrounding?: LegalGroundingResult;
  reviewType?: string;
  errorCategory?: string;
  legalRetrievalMethod?:
    "topic_match" | "concept_match" | "keyword_match" | "error_directed" | "fallback";
};

export type LegalEvidenceMetadata = {
  legalSourceUsed: string[];
  legalGrounded: boolean;
  sourceCount: number;
  targetConcept?: string;
  retrievalMethod: string;
};
