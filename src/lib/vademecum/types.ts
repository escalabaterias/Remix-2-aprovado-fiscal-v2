export type RelevanceLevel = "high" | "medium" | "low";

export interface BankStyle {
  bank: "FGV" | "Cebraspe" | "FCC" | "RFB";
  styleDescription: string; // Ex: "Adora trocar 'taxa' por 'tarifa' e exigir jurisprudência do STF sobre imunidade."
  typicalQuestionConcept: string; // Ex: "Cobrança de taxa de lixo domiciliar (Súmula Vinculante 19)."
}

export interface LawTrap {
  title: string;
  trapText: string; // Ex: "A banca troca 'obrigação tributária' por 'obrigação acessória'."
  keyTermsToWatch: string[]; // Palavras-chave perigosas (ex: "sempre", "exclusivamente", "independentemente")
  tipToAvoid: string; // Como o aluno acerta
}

export interface JurisprudenceInfo {
  court: "STF" | "STJ" | "CARF";
  reference: string; // Ex: "Súmula Vinculante 19" ou "RE 601.314"
  summary: string; // Resumo didático da tese tributária vinculada ao artigo
  year?: number;
}

export interface ArticleIntelligence {
  recurrenceCount: number; // Quantidade de vezes que apareceu em provas da Área Fiscal
  relevanceLevel: RelevanceLevel;
  bankStyles: BankStyle[];
  commonTraps: LawTrap[];
  jurisprudences: JurisprudenceInfo[];
}

export interface LawArticle {
  id: string; // Ex: "CF88-ART150"
  diploma: "CF/88" | "CTN" | "Lei 8.112" | "Lei 4.320"; // Diploma legal
  section?: string; // Ex: "Das Limitações do Poder de Tributar"
  articleNumber: string; // Ex: "Art. 150"
  title?: string;
  text: string; // Texto principal do artigo caput
  paragraphs?: string[]; // Parágrafos
  incises?: string[]; // Incisos (I, II, III, etc.)
  alineas?: string[]; // Alíneas (a, b, c, etc.)
  intelligence?: ArticleIntelligence; // Metadados ricos de cobrança cruzada
}

export interface VadeMecumSearchFilters {
  query?: string;
  diploma?: string;
  relevance?: RelevanceLevel;
  minRecurrence?: number;
}
