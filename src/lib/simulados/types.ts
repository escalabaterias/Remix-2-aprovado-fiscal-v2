/**
 * TIPOS E CONTRATOS DO DOMÍNIO DE SIMULADOS — Etapa 8, Fase 1
 *
 * Contratos de dados e tipos para simulados e provas cronometradas.
 * Corresponde exatamente ao schema do banco e às regras de domínio.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS E TIPOS LITERAIS
// ─────────────────────────────────────────────────────────────────────────────

/** Regras de pontuação e penalização de simulado */
export type ScoringRule = "standard" | "cebraspe_1_for_1" | "cebraspe_half" | "custom";

/** Estados do ciclo de vida da sessão de prova */
export type ExamStatus =
  "ready" | "in_progress" | "paused" | "submitted" | "processing" | "analyzed" | "abandoned";

/** Tipos de eventos comportamentais em prova */
export type ExamEventType =
  | "answer_selected"
  | "answer_changed"
  | "flag_toggled"
  | "question_viewed"
  | "session_paused"
  | "session_resumed"
  | "session_submitted";

// ─────────────────────────────────────────────────────────────────────────────
// ESTRUTURAS DE CONFIGURAÇÃO (JSONB)
// ─────────────────────────────────────────────────────────────────────────────

/** Configuração de distribuição de questões por disciplina */
export interface SubjectDistributionConfig {
  subject_id: string;
  count: number;
  weight: number;
  topic_ids?: string[];
}

/** Distribuição proporcional por nível de dificuldade */
export interface DifficultyDistributionConfig {
  easy?: number;
  medium?: number;
  hard?: number;
}

/** Configuração completa de composição do simulado */
export interface DistributionConfig {
  subjects: SubjectDistributionConfig[];
  bancas?: string[];
  difficulty_distribution?: DifficultyDistributionConfig;
  allow_already_answered?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTIDADES PRINCIPAIS
// ─────────────────────────────────────────────────────────────────────────────

/** Template / Configuração reutilizável de Simulado (exam_templates) */
export interface ExamTemplate {
  id: string;
  user_id: string;
  contest_id?: string | null;
  title: string;
  description?: string | null;
  scoring_rule: ScoringRule;
  negative_marking_penalty: number;
  time_limit_minutes: number;
  allow_pauses: boolean;
  distribution_config: DistributionConfig;
  is_official_contest_template: boolean;
  created_at: string;
  updated_at: string;
}

/** Instância / Execução Temporal de Simulado (exam_sessions) */
export interface ExamSession {
  id: string;
  user_id: string;
  template_id?: string | null;
  contest_id?: string | null;
  set_id: string;
  status: ExamStatus;
  started_at?: string | null;
  ended_at?: string | null;
  total_time_seconds?: number | null;
  time_limit_seconds: number;
  accumulated_pause_seconds: number;
  last_paused_at?: string | null;
  last_resumed_at?: string | null;
  deadline_at?: string | null;
  gross_score?: number | null;
  net_score?: number | null;
  max_possible_score?: number | null;
  accuracy_percentage?: number | null;
  performance_summary?: Record<string, unknown> | null;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Estado Atual da Resposta por Questão (exam_session_answers) */
export interface ExamSessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  user_id: string;
  position: number;
  subject_id: string;
  topic_id: string;
  weight: number;
  chosen_answer?: string | null;
  is_correct?: boolean | null;
  is_flagged_for_review: boolean;
  answer_change_count: number;
  first_chosen_answer?: string | null;
  time_spent_seconds: number;
  order_of_interaction?: number | null;
  attempt_id?: string | null;
  updated_at: string;
}

/** Evento Comportamental Append-Only (exam_session_events) */
export interface ExamSessionEvent {
  id: string;
  session_id: string;
  question_id?: string | null;
  user_id: string;
  event_type: ExamEventType;
  payload: Record<string, unknown>;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MÁQUINA DE ESTADOS DO SIMULADO
// ─────────────────────────────────────────────────────────────────────────────

/** Transições válidas permitidas na sessão de prova */
export const VALID_EXAM_STATUS_TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
  ready: ["in_progress", "abandoned"],
  in_progress: ["paused", "submitted", "abandoned"],
  paused: ["in_progress", "submitted", "abandoned"],
  submitted: ["processing"],
  processing: ["analyzed"],
  analyzed: [],
  abandoned: [],
};

/**
 * Valida se a transição de um estado para outro é permitida pelo domínio
 */
export function isValidExamStatusTransition(
  currentStatus: ExamStatus,
  targetStatus: ExamStatus,
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_EXAM_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DA ETAPA 8.2 — MOTOR DE GERAÇÃO DE PROVAS
// ─────────────────────────────────────────────────────────────────────────────

/** Opções extras para customizar a geração da sessão de prova */
export interface ExamGenerationOptions {
  shuffle_questions?: boolean;
  force_max_questions?: boolean;
  override_bancas?: string[];
  override_difficulty?: "easy" | "medium" | "hard";
}

/** Questão Candidata disponível para seleção */
export interface QuestionCandidate {
  id: string;
  subject_id: string;
  topic_id: string;
  banca: string;
  difficulty: "easy" | "medium" | "hard";
  text?: string;
}

/** Aviso gerado durante a montagem do simulado */
export interface ExamGenerationWarning {
  code:
    | "insufficient_questions"
    | "missing_subject_questions"
    | "banca_filter_relaxed"
    | "difficulty_filter_relaxed";
  message: string;
  subject_id: string;
  requested_count: number;
  available_count: number;
}

/** Estrutura do Simulado Gerado */
export interface GeneratedExamStructure {
  session_payload: {
    set_id: string;
    time_limit_seconds: number;
    max_possible_score: number;
  };
  selected_questions: Array<{
    question: QuestionCandidate;
    position: number;
    weight: number;
  }>;
  warnings: ExamGenerationWarning[];
}
