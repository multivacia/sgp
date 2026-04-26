-- Trilha administrativa V1: eventos de governança de utilizadores (sem segredos).

CREATE TABLE admin_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES app_users (id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES app_users (id) ON DELETE SET NULL,
  target_collaborator_id UUID REFERENCES collaborators (id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result_status TEXT NOT NULL DEFAULT 'success',
  metadata_json JSONB
);

CREATE INDEX idx_admin_audit_occurred_at ON admin_audit_events (occurred_at DESC);
CREATE INDEX idx_admin_audit_target_user ON admin_audit_events (target_user_id, occurred_at DESC);
CREATE INDEX idx_admin_audit_actor ON admin_audit_events (actor_user_id, occurred_at DESC);
CREATE INDEX idx_admin_audit_event_type ON admin_audit_events (event_type, occurred_at DESC);

COMMENT ON TABLE admin_audit_events IS
  'Auditoria administrativa (V1). Não armazenar senhas, hashes, tokens ou payloads brutos.';
