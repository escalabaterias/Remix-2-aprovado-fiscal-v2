export interface GradingCriterion {
  id: string;
  description: string;
  weight: number; // Pontuação ou peso atribuído ao critério (ex: 2.5 pontos)
}

export interface DiscursiveQuestion {
  id: string;
  title: string;
  subject: string; // Ex: 'Direito Tributário', 'Legislação Tributária', 'Contabilidade Avançada'
  banca: string; // Ex: 'FGV', 'Cebraspe', 'Vunesp'
  contest?: string; // Ex: 'SEFAZ-SP', 'Receita Federal'
  statement: string; // Enunciado da questão dissertativa ou peça
  modelAnswer: string; // Padrão de resposta / Espelho oficial da banca
  maxScore: number; // Pontuação máxima da questão (ex: 20.0)
  gradingCriteria: GradingCriterion[]; // Rubrica de correção
  lawTags?: string[]; // IDs de LawTags associadas (Módulo 8)
  suggestedTimeMinutes?: number; // Tempo recomendado para resolução (ex: 45 min)
}

export interface DiscursiveSubmission {
  id: string;
  questionId: string;
  userResponse: string;
  selfScore: number;
  criteriaScores: Record<string, number>; // Mapeia id do critério -> pontuação obtida
  feedbackNotes: string;
  timeSpentSeconds?: number;
  submittedAt: string;
}

export interface DiscursivePerformanceSummary {
  totalSubmissions: number;
  averageScorePercentage: number;
  totalQuestionsAttempted: number;
  completedBySubject: Record<string, number>;
}
