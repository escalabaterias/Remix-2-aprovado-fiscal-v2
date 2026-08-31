/**
 * TIPOS E CONTRATOS DA ETAPA 7.7 — ORQUESTRADOR UNIFICADO DO CICLO COGNITIVO
 *
 * Conecta e integra todos os motores determinísticos e a IA da Suíte 7:
 * - Analytics Preditivo (Fase 7.4)
 * - Decision Engine (Fase 7.5 — Autoridade da Ação Pedagógica)
 * - Artifacts Engine (Fase 7.6.1 — Autoridade do Tipo de Artefato)
 * - Artifact Generator (Fase 7.6.2 & 7.6.5 — Geração e Personalização de Artefatos)
 * - Socratic Engine (Fase 7.3.1 - 7.3.4 — Diálogo Pedagógico)
 * - Legal Grounding & RAG (Fase 7.3.2 — Anti-alucinação Jurídica)
 * - Evidence & Knowledge Layer (Fase 5 — Evidências Reais)
 *
 * REGRAS DE AUTORIDADE:
 * 1. Decision Engine é a ÚNICA autoridade da ação pedagógica.
 * 2. Artifacts Engine é a ÚNICA autoridade do tipo de artefato.
 * 3. AI Gateway é usado estritamente para geração/síntese com grounding.
 * 4. Evidência registrada SOMENTE mediante interação real do aluno (sem evidência passiva).
 * 5. Idempotência garantida via idempotencyKey.
 */

import type { PedagogicalAction, DecisionResult, DecisionSignalsInput } from "../decision/types";
import type { ArtifactKind } from "../artifacts/types";
import type { GeneratedArtifact } from "../artifacts/generation-types";
import type { AdaptiveStudyArtifactResult } from "../artifacts/integration";
import type { ArtifactInteractionResult, ArtifactUserResponse } from "../artifacts/interaction";
import type { SocraticSessionContext, SocraticResponse } from "../socratic/types";
import type { LegalEvidenceMetadata } from "../legal/types";
import type { RetentionProfile, PredictivePriority, CognitiveTrajectory } from "../analytics/types";
import type { RecordEvidenceResult, DeclaredConfidence } from "../evidence/types";

/** Modo principal de execução da etapa cognitiva. */
export type CognitiveExecutionMode =
  "artifact" | "socratic" | "standard_practice" | "review" | "direct_study";

/** Entrada para o orquestrador do ciclo cognitivo. */
export interface CognitiveCycleInput {
  userId: string;
  topicId: string;
  topicName?: string;
  subjectId?: string | null;
  subjectName?: string;
  taskId?: string | null;
  sessionId?: string | null;
  errorEntryId?: string | null;
  questionContext?: {
    questionId?: string;
    statement: string;
    options?: string[];
    correctAnswer?: string;
    targetConcept?: string;
  };
  customSignals?: Partial<DecisionSignalsInput>;
  userResponse?: string;
  forceRefresh?: boolean;
  idempotencyKey?: string;
}

/** Plano de execução gerado pelo Orquestrador Unificado do Ciclo Cognitivo. */
export interface CognitiveCycleStepPlan {
  userId: string;
  topicId: string;
  topicName: string;
  subjectId: string | null;
  subjectName: string;

  /** Ação pedagógica decidida pelo Decision Engine (Fase 7.5). */
  pedagogicalDecision: DecisionResult;

  /** Modo de execução derivado da ação determinística. */
  executionMode: CognitiveExecutionMode;

  /** Artefato adaptativo gerado se o modo for "artifact" (Fase 7.6.1-7.6.5). */
  artifactResult: AdaptiveStudyArtifactResult | null;

  /** Contexto socrático inicializado se o modo for "socratic" (Fase 7.3.1-7.3.4). */
  socraticContext: SocraticSessionContext | null;

  /** Perfil analítico do tópico (Fase 7.4). */
  analyticsProfile: RetentionProfile | null;

  /** Trajetória cognitiva do tópico (Fase 7.4). */
  analyticsTrajectory: CognitiveTrajectory | null;

  /** Prioridade preditiva (Fase 7.4). */
  predictivePriority: PredictivePriority | null;

  /** Metadados de fundamentação jurídica RAG (Fase 7.3.2) se aplicável. */
  legalGrounding: LegalEvidenceMetadata | null;

  /** Chave de idempotência da execução. */
  idempotencyKey: string;

  /** Indica se houve degradação/fallback para modo determinístico por erro de IA. */
  fallbackTriggered: boolean;

  /** Mensagem explicativa em caso de fallback. */
  fallbackReason?: string;

  /** Timestamp de geração do plano. */
  timestamp: string;
}

/** Entrada para a interação do aluno no ciclo cognitivo. */
export interface CognitiveCycleInteractionInput {
  userId: string;
  topicId: string;
  subjectId?: string | null;
  taskId?: string | null;
  sessionId?: string | null;
  stepPlan: CognitiveCycleStepPlan;

  /** Resposta do aluno no artefato cognitivo ou no turno socrático. */
  userResponse: ArtifactUserResponse | string;

  /** Confiança declarada pelo aluno. */
  declaredConfidence?: DeclaredConfidence;

  /** Tempo investido em segundos. */
  timeSpentSeconds?: number;

  /** Chave de idempotência da interação. */
  idempotencyKey?: string;
}

/** Resultado do processamento da interação no ciclo cognitivo. */
export interface CognitiveCycleInteractionResult {
  success: boolean;

  /** Evidência cognitiva registrada no motor de evidências. */
  evidenceResult: RecordEvidenceResult | null;

  /** Resultado detalhado da interação no artefato (se aplicável). */
  artifactInteractionResult: ArtifactInteractionResult | null;

  /** Resposta do turno socrático (se aplicável). */
  socraticResponse: SocraticResponse | null;

  /** Status da atualização de erro no Error Central. */
  errorCentralUpdated: boolean;

  /** Status da atualização na fila de revisão. */
  reviewUpdated: boolean;

  /** Próxima ação recomendada determinística. */
  nextPedagogicalAction: PedagogicalAction;

  /** Mensagem amigável de orientação pedagógica. */
  guidanceSummary: string;

  /** Chave de idempotência processada. */
  idempotencyKey: string;

  /** Timestamp de conclusão da interação. */
  completedAt: string;
}
