import { Question, ErrorCategory } from "../questions/types";

export interface SimulationConfig {
  targetExam: "SEFAZ" | "RECEITA" | "ISS";
  board: "FGV" | "CEBRASPE" | "FCC";
  totalQuestions: number;
  durationMinutes: number;
  weightsBySubject: Record<string, number>; // Ex: { "DIR-TRIB": 40, "CONTAB": 30, "RLM": 30 }
}

export interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number; // 0 to 1
}

export interface ErrorBreakdown {
  category: ErrorCategory;
  count: number;
  percentage: number;
}

export interface SimulationResult {
  id: string;
  config: SimulationConfig;
  score: number; // Acertos simples % (ex: 80)
  netScore: number; // Nota líquida (ex: penalização Cebraspe ou tradicional, ex: 60)
  timeSpentSeconds: number;
  startedAt: string;
  completedAt: string;
  subjectPerformance: Record<string, SubjectPerformance>;
  errorBreakdown: Record<string, ErrorBreakdown>;
  attempts: Record<
    string,
    {
      questionId: string;
      selectedOption: string;
      isCorrect: boolean;
      timeSpentSeconds: number;
      errorCategory?: ErrorCategory;
      notes?: string;
    }
  >;
}

export interface ErrorNotebookFilter {
  errorCategory?: ErrorCategory | "all";
  subjectId?: string | "all";
  board?: string | "all";
}
