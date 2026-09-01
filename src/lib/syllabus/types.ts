export type SyllabusStatus = "not_started" | "studying" | "reviewed" | "mastered";

export type LawTagImportance = "high" | "medium" | "low";

export interface LawTag {
  id: string;
  lawName: string; // Ex: 'CTN', 'CF/88', 'Lei 14.133/21', 'LC 87/96'
  articleNumber: string; // Ex: 'Art. 150, I', 'Art. 156'
  description: string;
  importanceLevel: LawTagImportance;
  subject?: string;
}

export interface SyllabusItem {
  id: string;
  subject: string; // Ex: 'Direito Tributário', 'Contabilidade Geral'
  topic: string;
  subtopic?: string;
  weight: number; // 1 a 5 (importância no edital fiscal)
  status: SyllabusStatus;
  lawTags: string[]; // Lista de IDs de LawTags associadas
  notes?: string;
  lastStudiedAt?: string;
  historicalIncidencePercent?: number; // Incidência estatística em provas fiscais (ex: 22.5%)
}

export interface SyllabusProgress {
  totalItems: number;
  completedItems: number; // status === 'reviewed' || status === 'mastered'
  masteredItems: number;
  studyingItems: number;
  notStartedItems: number;
  percentage: number;
  weightedPercentage: number;
  statusCounts: Record<SyllabusStatus, number>;
}

export interface SubjectSyllabusSummary {
  subject: string;
  totalTopics: number;
  completedTopics: number;
  percentage: number;
  weightedProgress: number;
  lawTagsCount: number;
}
