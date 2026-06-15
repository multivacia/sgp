-- Credencial operacional (PIN) do Modo Fábrica — separada de app_users e collaborators.

CREATE TABLE IF NOT EXISTS collaborator_production_credentials (
  collaborator_id UUID PRIMARY KEY REFERENCES collaborators (id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  pin_changed_at TIMESTAMPTZ NULL,
  reset_by_user_id UUID NULL REFERENCES app_users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_collaborator_production_credentials_failed_attempts_nonneg
    CHECK (failed_attempts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_collaborator_production_credentials_enabled
  ON collaborator_production_credentials (collaborator_id)
  WHERE enabled = true;

COMMENT ON TABLE collaborator_production_credentials IS
  'PIN operacional do Modo Fábrica (hash Argon2id). Não armazenar PIN em texto puro.';

COMMENT ON COLUMN collaborator_production_credentials.pin_hash IS
  'Hash Argon2id do PIN numérico (4–8 dígitos).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE collaborator_production_credentials TO sgp_app';
  END IF;
END$$;
