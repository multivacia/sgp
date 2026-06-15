-- Auditoria de autenticação do Modo Fábrica (sem PIN nem pin_hash).

CREATE TABLE IF NOT EXISTS production_auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NULL REFERENCES collaborators (id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  request_id TEXT NULL,
  result TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_production_auth_events_event_type
    CHECK (
      event_type IN (
        'PRODUCTION_LOGIN_SUCCESS',
        'PRODUCTION_LOGIN_FAILURE',
        'PRODUCTION_LOGOUT',
        'PRODUCTION_SESSION_REJECTED'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_production_auth_events_occurred_at
  ON production_auth_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_production_auth_events_collaborator
  ON production_auth_events (collaborator_id, occurred_at DESC)
  WHERE collaborator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_production_auth_events_event_type
  ON production_auth_events (event_type, occurred_at DESC);

COMMENT ON TABLE production_auth_events IS
  'Trilha de login/logout/falhas do Modo Fábrica. Nunca armazenar PIN ou pin_hash.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT ON TABLE production_auth_events TO sgp_app';
  END IF;
END$$;
