-- Event log operacional base (R5 S1.2 Sprint 2).
-- Infraestrutura para registrar fatos operacionais da esteira.

CREATE TABLE IF NOT EXISTS conveyor_operational_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conveyor_id UUID NOT NULL REFERENCES conveyors (id) ON DELETE CASCADE,
  node_id UUID NULL REFERENCES conveyor_nodes (id) ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL CHECK (btrim(event_type) <> ''),
  previous_value TEXT NULL,
  new_value TEXT NULL,
  reason VARCHAR(120) NULL,
  source VARCHAR(80) NOT NULL CHECK (btrim(source) <> ''),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_by UUID NULL REFERENCES app_users (id) ON DELETE SET NULL,
  metadata_json JSONB NULL,
  idempotency_key VARCHAR(180) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conveyor_operational_events_conveyor_occurred_desc
  ON conveyor_operational_events (conveyor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_conveyor_operational_events_type_occurred_desc
  ON conveyor_operational_events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_conveyor_operational_events_node_occurred_desc
  ON conveyor_operational_events (node_id, occurred_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_conveyor_operational_events_idempotency_key
  ON conveyor_operational_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE conveyor_operational_events TO sgp_app';
  END IF;
END$$;

