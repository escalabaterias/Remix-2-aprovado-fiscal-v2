-- ============================================================
-- P0.1-B — Tabela de Custódia Segura das Credenciais Google Drive
-- ============================================================
-- Armazenamento persistente server-side do ciphertext do refresh_token.
-- Restrição estrita de acesso:
--   - RLS habilitado sem policies permissivas para clientes (anon / authenticated)
--   - Revogação explícita de permissões para roles públicas (anon, authenticated)
--   - Concessão exclusiva para a role técnica service_role (backend server-side)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_drive_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_refresh_token TEXT NOT NULL,
  encryption_version VARCHAR(10) NOT NULL DEFAULT 'enc_v2',
  scope VARCHAR(255) NOT NULL DEFAULT 'https://www.googleapis.com/auth/drive.metadata.readonly',
  account_email VARCHAR(255) NULL,
  last_validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_drive_credentials_user_id UNIQUE (user_id)
);

-- Habilita Row Level Security (RLS)
ALTER TABLE public.user_drive_credentials ENABLE ROW LEVEL SECURITY;

-- Revoga explicitamente todos os privilégios de papéis públicos/navegador
REVOKE ALL ON TABLE public.user_drive_credentials FROM anon;
REVOKE ALL ON TABLE public.user_drive_credentials FROM authenticated;

-- Concede privilégios estritos apenas para a role administrativa de servidor
GRANT ALL ON TABLE public.user_drive_credentials TO service_role;

-- Índice para busca rápida por user_id
CREATE INDEX IF NOT EXISTS idx_user_drive_credentials_user_id ON public.user_drive_credentials(user_id);
