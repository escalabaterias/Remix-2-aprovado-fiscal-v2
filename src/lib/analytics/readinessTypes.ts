export interface ReadinessScore {
  overallIndex: number; // 0 a 100%
  objectiveContribution: number; // Peso e nota em Questões Objetivas / Simulados
  discursiveContribution: number; // Nota média nas Discursivas e Peças
  memoryContribution: number; // Retenção em Flashcards / Repetição Espaçada
  syllabusContribution: number; // Cobertura Ponderada do Edital Verticalizado
  diagnosticLevel: "critical" | "moderate" | "solid" | "competitive";
}

export interface TargetExamCutoff {
  id: string;
  name: string; // Ex: 'SEFAZ-SP - Auditor Fiscal'
  banca: string;
  totalObjectivePoints: number; // Ex: 100
  totalDiscursivePoints: number; // Ex: 30
  historicalCutoffPercentage: number; // Ex: 84%
  historicalCutoffPoints: number; // Ex: 109.2
  totalVacancies: number; // Ex: 50
}

export interface CutoffSimulation {
  targetExamId: string;
  targetExamName: string;
  expectedObjectiveScore: number;
  expectedDiscursiveScore: number;
  totalSimulatedPoints: number;
  simulatedPercentage: number;
  historicalCutoffPoints: number;
  isWithinVacancies: boolean;
  estimatedRankingRange: string; // Ex: '15º - 28º lugar' ou 'Fora do corte por 4.5 pts'
}

export interface LastMinuteActionTopic {
  subject: string;
  topic: string;
  weight: number;
  reason: string; // Ex: 'Alto peso no edital e domínio atual abaixo de 70%'
  urgency: "high" | "medium";
  actionType: "flashcards" | "discursive" | "questions" | "lawtags";
}
