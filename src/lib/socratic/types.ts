/**
 * TIPOS E CONTRATOS — SOCRATIC ENGINE CORE (Fase 7.3.1)
 *
 * Núcleo agnóstico de diálogo socrático adaptativo para o PROFESSOR FISCAL.
 */

export type SocraticState =
  | "QUESTION"
  | "WAITING_FOR_ANSWER"
  | "EVALUATING"
  | "HINT_1"
  | "HINT_2"
  | "HINT_3"
  | "REFORMULATING"
  | "CORRECTING"
  | "CONSOLIDATING"
  | "COMPLETED";

export type SocraticPedagogicalMode =
  "ACTIVE_RECALL" | "CONCEPTUAL_REASONING" | "ERROR_REMEDIATION" | "REVIEW" | "QUESTION_ANALYSIS";

export type SocraticAction =
  "ASK" | "HINT" | "REFORMULATE" | "EVALUATE" | "EXPLAIN" | "CONSOLIDATE" | "COMPLETE";

export type StudentResponseClassification =
  "CORRECT" | "PARTIALLY_CORRECT" | "INCORRECT" | "UNCERTAIN" | "NO_RESPONSE";

export type StudentReasoningQuality = "excelente" | "solido" | "fragil" | "equivocado" | "ausente";

export type StudentResponseEvaluation = {
  classification: StudentResponseClassification;
  confidence: number;
  identifiedGap?: string;
  misconception?: string;
  reasoningQuality: StudentReasoningQuality;
  needsHint: boolean;
  recommendedNextStep: SocraticAction;
};

export type SocraticTurnSummary = {
  turnNumber: number;
  state: SocraticState;
  action: SocraticAction;
  questionOrHintText?: string;
  explanationText?: string;
  studentAnswerText?: string;
  evaluationClassification?: StudentResponseClassification;
  hintLevel: number;
  timestamp: string;
};

export type SocraticQuestionContext = {
  questionId?: string;
  statement: string;
  options?: string[];
  correctAnswer?: string;
  targetConcept: string;
  expectedReasoning?: string;
};

export type SocraticSessionConstraints = {
  maxHints: number;
  maxTurns: number;
  allowDirectExplanationAfterMaxHints: boolean;
};

export type SocraticSessionContext = {
  sessionId: string;
  topicId: string;
  topicName: string;
  subjectName?: string;
  pedagogicalGoal: string;
  pedagogicalMode: SocraticPedagogicalMode;
  currentState: SocraticState;
  currentTurnNumber: number;
  hintLevel: number;
  currentQuestion?: SocraticQuestionContext;
  studentAnswerText?: string;
  turnHistory: SocraticTurnSummary[];
  constraints: SocraticSessionConstraints;
  validTopicNames: string[];
  contextMetadata?: Record<string, unknown>;
};

export type SocraticResponse = {
  status: "active" | "evaluating" | "completed" | "error";
  pedagogicalMode: SocraticPedagogicalMode;
  action: SocraticAction;
  question?: string;
  explanation?: string;
  hintLevel: number;
  evaluation?: StudentResponseEvaluation;
  detectedGap?: string;
  confidenceScore: number;
  shouldContinue: boolean;
  nextAction?: SocraticAction;
  generatedAt?: string;
};

export type SocraticServiceResult = {
  response: SocraticResponse | null;
  updatedContext: SocraticSessionContext;
  cached: boolean;
  status: "processado" | "erro" | "concluido";
  errorMessage?: string;
  model?: string;
  durationMs?: number;
};

/**
 * Constantes preparatórias para integração futura com a Evidence Layer (Fase 7.3.5)
 */
export const SOCRATIC_EVIDENCE_KINDS = {
  ATTEMPT: "SOCRATIC_ATTEMPT",
  RECALL: "SOCRATIC_RECALL",
  HINT: "SOCRATIC_HINT",
  REMEDIATION: "SOCRATIC_REMEDIATION",
  SUCCESS: "SOCRATIC_SUCCESS",
} as const;
