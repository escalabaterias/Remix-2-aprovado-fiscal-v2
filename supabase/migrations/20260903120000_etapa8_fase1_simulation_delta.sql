-- ============================================================
-- ETAPA 8 — FASE 1: Database Delta (Simulação & Idempotência)
-- ============================================================
-- Adiciona started_at em question_sets para tempo autoritativo de simulado
-- Adiciona set_item_id em question_attempts para vínculo com item de simulado
-- Cria constraint de unicidade (user_id, set_item_id) em question_attempts para idempotência
-- ============================================================

-- 1. Coluna started_at em question_sets
ALTER TABLE public.question_sets
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NULL;

-- 2. Coluna set_item_id em question_attempts
ALTER TABLE public.question_attempts
  ADD COLUMN IF NOT EXISTS set_item_id UUID NULL REFERENCES public.question_set_items(id) ON DELETE SET NULL;

-- 3. Constraint de unicidade para idempotência de tentativas por item de simulado
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'idx_unique_user_set_item_attempt'
  ) THEN
    ALTER TABLE public.question_attempts
      ADD CONSTRAINT idx_unique_user_set_item_attempt UNIQUE (user_id, set_item_id);
  END IF;
END $$;
