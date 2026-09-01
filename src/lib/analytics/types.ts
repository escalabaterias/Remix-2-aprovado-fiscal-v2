import { ErrorCategory } from "../questions/types";

export interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  topicId?: string;
  topicName?: string;
  totalQuestions: number;
  correctQuestions: number;
  wrongQuestions: number;
  accuracy: number; // 0.0 a 1.0
  averageTimeSeconds: number;
}

export interface ErrorDistribution {
  category: ErrorCategory;
  count: number;
  percentage: number; // 0.0 a 100.0
}

export interface GapDiagnostic {
  id: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  accuracy: number;
  averageTimeSeconds: number;
  primaryErrorCategory: ErrorCategory;
  severity: "high" | "medium" | "low"; // Criticidade da lacuna
  recommendation: string; // Plano de ação específico
  suggestedLawTags?: string[]; // LawTags recomendadas para estudo preventivo
}

export interface MaturityIndex {
  examBoard: string;
  accuracy: number;
  maturityScore: number; // 0 a 100 baseada em acertos e tempo médio de resposta
  level: "Iniciante" | "Intermediário" | "Avançado" | "Alta Performance";
}

export interface StudentPerformanceReport {
  overallAccuracy: number;
  totalTimeSpentSeconds: number;
  totalQuestionsResolved: number;
  subjectPerformance: SubjectPerformance[];
  errorDistribution: ErrorDistribution[];
  gapDiagnostics: GapDiagnostic[];
  maturityIndexes: MaturityIndex[];
}
