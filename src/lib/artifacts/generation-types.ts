/**
 * CONTRATOS DO ADAPTIVE STUDY ARTIFACT GENERATOR — Fase 7.6.2
 */

import type { ArtifactDecision, ArtifactKind } from "./types";
import type { LegalSource } from "../legal/types";
import type { DecisionResult } from "../decision/types";
import type { ArtifactPresentationProfile } from "./personalization";

export interface ArtifactGenerationContext {
  userId: string;
  topicId: string;
  topicName: string;
  artifactDecision?: ArtifactDecision;
  decisionResult?: DecisionResult;
  presentationProfile?: ArtifactPresentationProfile;
  availableMinutes?: number;
  legalSources?: LegalSource[];
  studyNotes?: string;
  knownErrorsSummary?: string;
}

export interface GeneratedArtifactContent {
  title: string;
  summaryOrOverview?: string;
  mnemonic?: {
    word: string;
    expansion: Array<{ letter: string; meaning: string }>;
    explanation: string;
  };
  mindMap?: {
    centralNode: string;
    nodes: Array<{
      id: string;
      label: string;
      parent?: string;
      relationship?: string;
    }>;
  };
  flashcard?: {
    front: string;
    back: string;
    keyConcept: string;
  };
  summary?: {
    keyPoints: string[];
    coreRule: string;
    exceptions?: string[];
  };
  comparisonTable?: {
    conceptA: string;
    conceptB: string;
    headers: string[];
    rows: Array<{ feature: string; valA: string; valB: string }>;
  };
  activeRecall?: {
    promptQuestions: Array<{ id: number; question: string; hint: string }>;
  };
  rawMarkdown?: string;
}

export interface GeneratedArtifact {
  artifactId: string;
  artifactKind: ArtifactKind;
  topicId: string;
  title: string;
  content: GeneratedArtifactContent;
  sourceContext: {
    hasLegalSources: boolean;
    availableMinutes: number;
    errorCountUsed: number;
  };
  grounded: boolean;
  presentationProfile?: ArtifactPresentationProfile;
  groundingDetails?: {
    unfoundCitations: string[];
    groundingScore: number;
  };
  dataConfidence: number;
  generatedAt: string;
}

export interface ArtifactGenerationResult {
  success: boolean;
  artifact: GeneratedArtifact;
  fallbackApplied: boolean;
  cached: boolean;
  statusMessage?: string;
  errorMessage?: string;
}
