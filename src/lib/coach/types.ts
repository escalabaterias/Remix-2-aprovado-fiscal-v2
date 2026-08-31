/**
 * TIPOS E CONTRATOS — MENTOR / COACH DE IA PROATIVO (Fase 7.2.1)
 *
 * Estruturas desacopladas para representação de contexto pedagógico multidimensional,
 * tarefas de orientação do Mentor e validação de saída.
 */

export type CriticalTopicSummary = {
  topicId: string;
  topicName: string;
  subjectName: string;
  state: string;
  priority: string;
  intervention: string;
  masteryPercent: number;
  confidencePercent: number;
  decayRiskPercent?: number;
  errorRecencyDays?: number | null;
  accuracyPercent?: number;
  unresolvedErrorsCount?: number;
  hasUnmetPrerequisites?: boolean;
  unmetPrerequisitesCount?: number;
  unmetPrerequisiteNames?: string[];
  contestWeight?: number | null;
  incidenceScore?: number | null;
  relevanceScore?: number | null;
  inEdital?: boolean;
};

export type UrgentReviewSummary = {
  topicId: string;
  topicName: string;
  subjectName: string;
  urgencyCategory: string;
  overdueDays: number;
  reviewType: "MANUTENÇÃO" | "CONSOLIDAÇÃO" | "RECUPERAÇÃO" | "REMEDIAÇÃO_POR_ERRO";
  reviewIntensity?: "leve" | "moderada" | "intensiva";
  masteryPercent?: number;
  confidencePercent?: number;
  decayRiskPercent?: number;
};

export type TopErrorCategorySummary = {
  category: string;
  topicName?: string;
  unresolvedCount: number;
  recentErrorDays?: number | null;
};

export type PrerequisiteDependencySummary = {
  topicId: string;
  topicName: string;
  prerequisiteTopicId: string;
  prerequisiteTopicName: string;
  prerequisiteMasteryPercent: number;
  isPrerequisiteMastered: boolean;
};

export type ScheduledTaskSummary = {
  title: string;
  activityType: string;
  plannedMinutes: number;
  status: string;
  topicName?: string;
};

export type ContestTopicWeightSummary = {
  topicId: string;
  topicName: string;
  subjectName: string;
  weight: number;
  incidenceScore: number;
  relevanceScore: number;
  inEdital: boolean;
};

export type CoachContext = {
  activeContest?: {
    name: string;
    daysUntilExam?: number | null;
    topWeightedTopics?: ContestTopicWeightSummary[];
  };
  diagnosesSummary: {
    totalTopics: number;
    criticalCount: number;
    alertCount: number;
    topCriticalTopics: CriticalTopicSummary[];
  };
  reviewsSummary: {
    totalPending: number;
    urgentCount: number;
    byTypeBreakdown?: {
      manutencaoCount: number;
      consolidacaoCount: number;
      recuperacaoCount: number;
      remediacaoErroCount: number;
    };
    topUrgentReviews: UrgentReviewSummary[];
  };
  errorsSummary: {
    totalUnresolved: number;
    topCategories: TopErrorCategorySummary[];
    taxonomyBreakdown?: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
  };
  prerequisitesSummary?: {
    totalDependenciesCount: number;
    unmetDependenciesCount: number;
    unmetPrerequisites: PrerequisiteDependencySummary[];
    blockedTopicNames: string[];
  };
  todaySchedule: {
    totalPlannedMinutes: number;
    completedMinutes: number;
    tasks: ScheduledTaskSummary[];
  };
  validTopicNames: string[];
  hasEnoughData: boolean;
};

export type CoachGuidance = {
  headline: string;
  situation: string;
  priorityTopic: string;
  reason: string;
  recommendedAction: string;
  secondaryAction?: string;
  avoid: string;
  nextStep: string;
  confidenceScore: number;
  generatedAt: string;
};

export type CoachGuidanceResult = {
  guidance: CoachGuidance | null;
  cached: boolean;
  status: "processado" | "erro" | "dados_insuficientes";
  errorMessage?: string;
  hasEnoughData: boolean;
  model?: string;
  durationMs?: number;
};
