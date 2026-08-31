/**
 * TIPOS E CONTRATOS DO MOTOR CENTRAL DE DECISÃO PEDAGÓGICA (DECISION ENGINE) — Fase 7.5
 */

import type {
  RetentionProfile,
  CognitiveTrajectory,
  RetentionMatrixEntry,
  PredictivePriority,
} from "../analytics/types";

export type PedagogicalAction =
  | "NEW_CONTENT"
  | "REVIEW"
  | "ACTIVE_RECALL"
  | "REMEDIATION"
  | "PRACTICE"
  | "SOCRATIC"
  | "CONSOLIDATION";

export type DecisionPriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface DecisionReason {
  code: string;
  description: string;
  weight: number;
}

export interface DecisionSignals {
  knowledgeState?: string;
  mastery?: number;
  confidence?: number;
  decayRisk?: number;
  reviewUrgency?: number;
  unresolvedErrors?: number;
  recurringErrors?: number;
  prerequisiteDeficit?: number;
  contestWeight?: number;
  retentionScore?: number;
  predictivePriorityScore?: number;
  daysSinceStudy?: number | null;
}

export interface DecisionContext {
  userId: string;
  topicId: string;
  signals: DecisionSignals;
  analyticsProfile?: RetentionProfile;
  analyticsTrajectory?: CognitiveTrajectory;
  analyticsMatrix?: RetentionMatrixEntry;
  predictivePriority?: PredictivePriority;
  availableMinutes?: number;
  allowNewContent?: boolean;
}

export interface DecisionResult {
  userId: string;
  topicId: string;
  primaryAction: PedagogicalAction;
  alternativeAction: PedagogicalAction;
  priorityLevel: DecisionPriorityLevel;
  decisionScore: number;
  reasons: DecisionReason[];
  signalsUsed: DecisionSignals;
  dataConfidence: number;
  timestamp: string;
}
