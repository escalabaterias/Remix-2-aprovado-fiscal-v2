/**
 * TIPOS E CONTRATOS DO ANALYTICS COGNITIVO PREDITIVO — Fase 7.4
 *
 * Contratos fortemente tipados e desacoplados para cálculo de retenção,
 * trajetória cognitiva, matriz de retenção, eficácia de intervenções e
 * prioridade preditiva.
 */

import type { CognitiveEvidenceKind, CognitiveEvidenceSource } from "@/lib/evidence/types";
import type { KnowledgeStateName } from "@/lib/diagnosis/engine";

/**
 * Categorias da Matriz de Retenção (Fase 7.4).
 */
export type RetentionCategory =
  | "RETENÇÃO_FORTE"
  | "RETENÇÃO_ESTÁVEL"
  | "RETENÇÃO_FRÁGIL"
  | "RISCO_DE_ESQUECIMENTO"
  | "RECUPERAÇÃO_EM_ANDAMENTO"
  | "REINCIDÊNCIA_DE_ERROS"
  | "DADOS_INSUFICIENTES";

/**
 * Padrões reconhecidos da Trajetória Cognitiva temporal.
 */
export type CognitiveTrajectoryPattern =
  | "DOMINIO_CONSISTENTE"
  | "DOMINIO_FALSO_INSTAVEL"
  | "EVOLUCAO"
  | "REGRESSAO"
  | "RECUPERACAO_APOS_ERRO"
  | "ESTAGNACAO"
  | "DADOS_INSUFICIENTES";

/**
 * Perfil de Retenção calculado para um tópico.
 */
export type RetentionProfile = {
  /** ID do tópico do edital */
  topicId: string;
  /** Pontuação de retenção ponderada (0.0 a 1.0) */
  retentionScore: number;
  /** Tendência do domínio (-1.0 a 1.0) */
  masteryTrend: number;
  /** Tendência da confiança (-1.0 a 1.0) */
  confidenceTrend: number;
  /** Risco computado de esquecimento por tempo/decaimento (0.0 a 1.0) */
  decayRisk: number;
  /** Taxa/índice de reincidência de erros (0.0 a 1.0) */
  errorRecurrence: number;
  /** Eficácia média observada de revisões adaptativas (0.0 a 1.0 ou null) */
  reviewEffectiveness: number | null;
  /** Eficácia média observada do Professor Fiscal / Socrático (0.0 a 1.0 ou null) */
  socraticEffectiveness: number | null;
  /** Data/hora ISO da última evidência registrada */
  lastEvidenceAt: string | null;
  /** Quantidade total de evidências registradas no tópico */
  evidenceCount: number;
  /** Estado de conhecimento atual vindo do motor de diagnóstico */
  currentKnowledgeState: KnowledgeStateName | string | null;
};

/**
 * Ponto na linha do tempo da trajetória cognitiva.
 */
export type TrajectoryPoint = {
  timestamp: string;
  kind: CognitiveEvidenceKind | string;
  source: CognitiveEvidenceSource | string;
  score: number | null;
  weight: number;
};

/**
 * Trajetória Cognitiva reconstruída a partir da sequência de evidências.
 */
export type CognitiveTrajectory = {
  topicId: string;
  /** Linha do tempo de pontos observados */
  timeline: TrajectoryPoint[];
  /** Padrão temporal identificado */
  pattern: CognitiveTrajectoryPattern;
  /** Resumo pedagógico descritivo determinístico */
  summary: string;
};

/**
 * Entrada na Matriz de Retenção.
 */
export type RetentionMatrixEntry = {
  topicId: string;
  category: RetentionCategory;
  retentionScore: number;
  decayRisk: number;
  errorRecurrence: number;
  reason: string;
};

/**
 * Medição da Eficácia de uma Intervenção Específica.
 */
export type InterventionType =
  "review" | "recall" | "remediation" | "practice" | "exposure" | "socratic";

export type InterventionEffectiveness = {
  kind: InterventionType;
  sampleCount: number;
  successRate: number | null;
  averageScoreGain: number | null;
  hasSufficientData: boolean;
  assessment: string;
};

/**
 * Fatores ponderados para a Prioridade Preditiva.
 */
export type PriorityFactors = {
  retentionSignal: number;
  decaySignal: number;
  errorRecurrenceSignal: number;
  masterySignal: number;
  confidenceSignal: number;
  recencySignal: number;
  reviewUrgencySignal: number;
  contestWeightSignal: number;
  prerequisiteSignal: number;
};

/**
 * Resultado da Prioridade Preditiva calculada.
 */
export type PredictivePriority = {
  topicId: string;
  predictivePriorityScore: number;
  factors: PriorityFactors;
  reason: string;
};

/**
 * Entrada bruta para cálculo do Analytics Cognitivo de um tópico.
 */
export type TopicEvidenceItem = {
  timestamp: string;
  kind: CognitiveEvidenceKind | string;
  source: CognitiveEvidenceSource | string;
  score?: number | null;
  declaredConfidence?: number | null;
  cognitiveWeight?: number;
  referenceId?: string | null;
};

export type AnalyticsContextInput = {
  userId: string;
  topicId: string;
  evidences: TopicEvidenceItem[];
  knowledgeState?: KnowledgeStateName | null;
  mastery?: number;
  confidence?: number;
  daysSinceStudy?: number | null;
  daysSinceError?: number | null;
  recentErrors?: number;
  unresolvedErrors?: number;
  recurringErrors?: number;
  contestWeight?: number;
  prerequisiteDeficit?: number;
  reviewUrgency?: number;
  referenceDate?: Date;
};

/**
 * Resultado analítico consolidado para consumo por módulos do sistema.
 */
export type TopicAnalyticsResult = {
  userId: string;
  topicId: string;
  retentionProfile: RetentionProfile;
  trajectory: CognitiveTrajectory;
  matrixEntry: RetentionMatrixEntry;
  interventions: Record<InterventionType, InterventionEffectiveness>;
  predictivePriority: PredictivePriority;
  computedAt: string;
};
