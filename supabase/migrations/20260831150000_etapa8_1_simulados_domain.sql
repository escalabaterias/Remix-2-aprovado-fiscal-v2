-- ============================================================
-- ETAPA 8 — FASE 1: Domínio de Simulados & Inteligência de Performance
-- ============================================================
-- Cria as tabelas exam_templates, exam_sessions, exam_session_answers
-- e exam_session_events com constraints, RLS, índices e integridade.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. EXAM_TEMPLATES — Configurações / Templates de Prova
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exam_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contest_id uuid REFERENCES public.contests(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  scoring_rule text NOT NULL CHECK (scoring_rule IN ('standard', 'cebraspe_1_for_1', 'cebraspe_half', 'custom')),
  negative_marking_penalty numeric NOT NULL DEFAULT 0.0 CHECK (negative_marking_penalty >= 0),
  time_limit_minutes integer NOT NULL CHECK (time_limit_minutes > 0),
  allow_pauses boolean NOT NULL DEFAULT false,
  distribution_config jsonb NOT NULL,
  is_official_contest_template boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_templates TO authenticated;
GRANT ALL ON public.exam_templates TO service_role;
ALTER TABLE public.exam_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "exam_templates_select" ON public.exam_templates
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR is_official_contest_template = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exam_templates_write" ON public.exam_templates
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_exam_templates_updated
    BEFORE UPDATE ON public.exam_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_templates_user
  ON public.exam_templates (user_id);

CREATE INDEX IF NOT EXISTS idx_exam_templates_contest
  ON public.exam_templates (contest_id);

-- ────────────────────────────────────────────────────────────
-- 2. EXAM_SESSIONS — Execução e Controle Temporal de Prova
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.exam_templates(id) ON DELETE SET NULL,
  contest_id uuid REFERENCES public.contests(id) ON DELETE SET NULL,
  set_id uuid NOT NULL REFERENCES public.question_sets(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('ready', 'in_progress', 'paused', 'submitted', 'processing', 'analyzed', 'abandoned')),
  started_at timestamptz,
  ended_at timestamptz,
  total_time_seconds integer CHECK (total_time_seconds IS NULL OR total_time_seconds >= 0),
  time_limit_seconds integer NOT NULL CHECK (time_limit_seconds > 0),
  accumulated_pause_seconds integer NOT NULL DEFAULT 0 CHECK (accumulated_pause_seconds >= 0),
  last_paused_at timestamptz,
  last_resumed_at timestamptz,
  deadline_at timestamptz,
  gross_score numeric,
  net_score numeric,
  max_possible_score numeric CHECK (max_possible_score IS NULL OR max_possible_score >= 0),
  accuracy_percentage numeric CHECK (accuracy_percentage IS NULL OR (accuracy_percentage >= 0 AND accuracy_percentage <= 100)),
  performance_summary jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_sessions TO authenticated;
GRANT ALL ON public.exam_sessions TO service_role;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "exam_sessions_own" ON public.exam_sessions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_exam_sessions_updated
    BEFORE UPDATE ON public.exam_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_status
  ON public.exam_sessions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_set_id
  ON public.exam_sessions (set_id);

-- ────────────────────────────────────────────────────────────
-- 3. EXAM_SESSION_ANSWERS — Estado Atual da Resposta por Questão
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exam_session_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0),
  chosen_answer text,
  is_correct boolean,
  is_flagged_for_review boolean NOT NULL DEFAULT false,
  answer_change_count integer NOT NULL DEFAULT 0 CHECK (answer_change_count >= 0),
  first_chosen_answer text,
  time_spent_seconds integer NOT NULL DEFAULT 0 CHECK (time_spent_seconds >= 0),
  order_of_interaction integer CHECK (order_of_interaction IS NULL OR order_of_interaction > 0),
  attempt_id uuid REFERENCES public.question_attempts(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_exam_session_answers_session_question UNIQUE (session_id, question_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_session_answers TO authenticated;
GRANT ALL ON public.exam_session_answers TO service_role;
ALTER TABLE public.exam_session_answers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "exam_session_answers_own" ON public.exam_session_answers
    FOR ALL TO authenticated
    USING (
      auth.uid() = user_id AND
      EXISTS (
        SELECT 1 FROM public.exam_sessions s
        WHERE s.id = exam_session_answers.session_id AND s.user_id = auth.uid()
      )
    )
    WITH CHECK (
      auth.uid() = user_id AND
      EXISTS (
        SELECT 1 FROM public.exam_sessions s
        WHERE s.id = exam_session_answers.session_id AND s.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_exam_session_answers_updated
    BEFORE UPDATE ON public.exam_session_answers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_session_answers_session
  ON public.exam_session_answers (session_id);

CREATE INDEX IF NOT EXISTS idx_exam_session_answers_user
  ON public.exam_session_answers (user_id);

CREATE INDEX IF NOT EXISTS idx_exam_session_answers_question
  ON public.exam_session_answers (question_id);

-- ────────────────────────────────────────────────────────────
-- 4. EXAM_SESSION_EVENTS — Histórico Comportamental Append-Only
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exam_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('answer_selected', 'answer_changed', 'flag_toggled', 'question_viewed', 'session_paused', 'session_resumed', 'session_submitted')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.exam_session_events TO authenticated;
GRANT ALL ON public.exam_session_events TO service_role;
ALTER TABLE public.exam_session_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "exam_session_events_select" ON public.exam_session_events
    FOR SELECT TO authenticated
    USING (
      auth.uid() = user_id AND
      EXISTS (
        SELECT 1 FROM public.exam_sessions s
        WHERE s.id = exam_session_events.session_id AND s.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exam_session_events_insert" ON public.exam_session_events
    FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid() = user_id AND
      EXISTS (
        SELECT 1 FROM public.exam_sessions s
        WHERE s.id = exam_session_events.session_id AND s.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_session_events_session
  ON public.exam_session_events (session_id);

CREATE INDEX IF NOT EXISTS idx_exam_session_events_user
  ON public.exam_session_events (user_id);
