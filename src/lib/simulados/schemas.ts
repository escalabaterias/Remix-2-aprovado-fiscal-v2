import { z } from "zod";

/**
 * SCHEMAS DE VALIDAÇÃO ZOD — DOMÍNIO DE SIMULADOS (Etapa 8.1)
 *
 * Schemas para validação contratual de entradas, parâmetros e payloads.
 */

export const ScoringRuleSchema = z.enum([
  "standard",
  "cebraspe_1_for_1",
  "cebraspe_half",
  "custom",
]);

export const ExamStatusSchema = z.enum([
  "ready",
  "in_progress",
  "paused",
  "submitted",
  "processing",
  "analyzed",
  "abandoned",
]);

export const ExamEventTypeSchema = z.enum([
  "answer_selected",
  "answer_changed",
  "flag_toggled",
  "question_viewed",
  "session_paused",
  "session_resumed",
  "session_submitted",
]);

export const SubjectDistributionConfigSchema = z.object({
  subject_id: z.string().uuid("subject_id deve ser um UUID válido"),
  count: z.number().int().min(1, "Quantidade de questões por disciplina deve ser maior que 0"),
  weight: z.number().positive("Peso da matéria deve ser maior que 0").default(1.0),
  topic_ids: z.array(z.string().uuid()).optional(),
});

export const DifficultyDistributionConfigSchema = z.object({
  easy: z.number().min(0).max(100).optional(),
  medium: z.number().min(0).max(100).optional(),
  hard: z.number().min(0).max(100).optional(),
});

export const DistributionConfigSchema = z.object({
  subjects: z
    .array(SubjectDistributionConfigSchema)
    .min(1, "A configuração de distribuição deve possuir ao menos 1 disciplina"),
  bancas: z.array(z.string()).optional(),
  difficulty_distribution: DifficultyDistributionConfigSchema.optional(),
  allow_already_answered: z.boolean().optional().default(true),
});

export const CreateExamTemplateSchema = z.object({
  contest_id: z.string().uuid().optional().nullable(),
  title: z.string().min(3, "Título deve ter ao menos 3 caracteres").max(150),
  description: z.string().max(500).optional().nullable(),
  scoring_rule: ScoringRuleSchema,
  negative_marking_penalty: z.number().min(0, "Penalidade não pode ser negativa").default(0),
  time_limit_minutes: z.number().int().min(1, "Tempo limite deve ser de pelo menos 1 minuto"),
  allow_pauses: z.boolean().default(false),
  distribution_config: DistributionConfigSchema,
  is_official_contest_template: z.boolean().default(false),
});

export const CreateExamSessionSchema = z.object({
  template_id: z.string().uuid().optional().nullable(),
  contest_id: z.string().uuid().optional().nullable(),
  set_id: z.string().uuid("set_id deve ser um UUID válido"),
  time_limit_seconds: z.number().int().min(60, "Tempo limite deve ter no mínimo 60 segundos"),
});

export const SaveExamAnswerSchema = z.object({
  session_id: z.string().uuid(),
  question_id: z.string().uuid(),
  position: z.number().int().positive(),
  chosen_answer: z.string().nullable().optional(),
  is_flagged_for_review: z.boolean().default(false),
  time_spent_seconds: z.number().int().min(0).default(0),
});

export const ExamGenerationOptionsSchema = z.object({
  shuffle_questions: z.boolean().optional().default(true),
  force_max_questions: z.boolean().optional().default(false),
  override_bancas: z.array(z.string()).optional(),
  override_difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});
