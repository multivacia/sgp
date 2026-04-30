-- Capacidade operacional base (R5 S1.2 Sprint 1).
-- Define um default global de minutos/dia e override por colaborador.

CREATE TABLE IF NOT EXISTS operational_capacity_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_daily_minutes INT NOT NULL CHECK (default_daily_minutes > 0 AND default_daily_minutes <= 1440),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL REFERENCES app_users (id) ON DELETE SET NULL
);

INSERT INTO operational_capacity_settings (id, default_daily_minutes)
VALUES (1, 480)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS collaborator_capacity_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL REFERENCES collaborators (id) ON DELETE RESTRICT,
  daily_minutes INT NOT NULL CHECK (daily_minutes > 0 AND daily_minutes <= 1440),
  effective_from DATE NULL,
  effective_to DATE NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES app_users (id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES app_users (id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_collaborator_capacity_overrides_window
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_collaborator_capacity_overrides_collaborator
  ON collaborator_capacity_overrides (collaborator_id);

CREATE INDEX IF NOT EXISTS idx_collaborator_capacity_overrides_collaborator_active
  ON collaborator_capacity_overrides (collaborator_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_collaborator_capacity_overrides_collaborator_window
  ON collaborator_capacity_overrides (collaborator_id, effective_from, effective_to)
  WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE operational_capacity_settings TO sgp_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE collaborator_capacity_overrides TO sgp_app';
  END IF;
END$$;

