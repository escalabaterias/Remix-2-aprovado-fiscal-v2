/**
 * TIPOS E CONTRATOS DO ADAPTIVE MEMORY & STUDY ARTIFACTS ENGINE — Fase 7.6.1
 */

import type { DecisionResult, PedagogicalAction } from "../decision/types";
import type { RetentionProfile, RetentionMatrixEntry } from "../analytics/types";

export type ArtifactKind =
  "MNEMONIC" | "MIND_MAP" | "FLASHCARD" | "SUMMARY" | "COMPARISON_TABLE" | "ACTIVE_RECALL";

export type ErrorTypeCategory =
  | "MEMORIZATION"
  | "CONCEPTUAL_CONFUSION"
  | "ORGANIZATION"
  | "SYNTHESIS"
  | "APPLICATION"
  | "ATTENTION";

export interface ArtifactReason {
  code: string;
  description: string;
  weight: number;
}

export interface ArtifactSignals {
  errorTypeCategory?: ErrorTypeCategory;
  confusableConcepts?: boolean;
  complexHierarchy?: boolean;
  lowActiveRecallRate?: boolean;
  synthesisNeed?: boolean;
  memorizationDifficulty?: boolean;
}

export interface ArtifactContext {
  userId: string;
  topicId: string;
  decisionResult?: DecisionResult;
  pedagogicalAction?: PedagogicalAction;
  artifactSignals?: ArtifactSignals;
  retentionProfile?: RetentionProfile;
  retentionMatrix?: RetentionMatrixEntry;
  availableMinutes?: number;
}

export interface ArtifactDecision {
  userId: string;
  topicId: string;
  primaryArtifact: ArtifactKind;
  alternativeArtifact: ArtifactKind;
  pedagogicalAction: PedagogicalAction;
  suitabilityScore: number;
  reasons: ArtifactReason[];
  dataConfidence: number;
  timestamp: string;
}
