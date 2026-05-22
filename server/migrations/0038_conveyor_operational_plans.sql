-- Plano Operacional da Esteira (R3-S2): trajeto previsto da esteira do início ao fim.
-- Distinto de operational_work_plans (agenda semanal global da fábrica).

CREATE TABLE IF NOT EXISTS conveyor_operational_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conveyor_id UUID NOT NULL REFERENCES conveyors (id) ON DELETE RESTRICT,
  status VARCHAR(40) NOT NULL,
  planned_start_date DATE NULL,
  planned_end_date DATE NULL,
  version INTEGER NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ NULL,
  generated_by UUID NULL REFERENCES app_users (id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ NULL,
  approved_by UUID NULL REFERENCES app_users (id) ON DELETE SET NULL,
  factory_planning_status VARCHAR(40) NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_conveyor_operational_plans_status CHECK (
    status IN (
      'DRAFT',
      'APPROVED',
      'WAITING_FACTORY_PLANNING',
      'PARTIALLY_PLANNED_IN_FACTORY',
      'FULLY_PLANNED_IN_FACTORY',
      'IN_EXECUTION',
      'COMPLETED',
      'CANCELLED'
    )
  ),
  CONSTRAINT chk_conveyor_operational_plans_factory_planning_status CHECK (
    factory_planning_status IS NULL
    OR factory_planning_status IN (
      'NOT_SCHEDULED',
      'PARTIALLY_SCHEDULED',
      'FULLY_SCHEDULED',
      'DIVERGED',
      'REVIEW_REQUIRED'
    )
  ),
  CONSTRAINT chk_conveyor_operational_plans_version_positive CHECK (version >= 1),
  CONSTRAINT chk_conveyor_operational_plans_dates_order CHECK (
    planned_end_date IS NULL
    OR planned_start_date IS NULL
    OR planned_end_date >= planned_start_date
  )
);

COMMENT ON TABLE conveyor_operational_plans IS
  'Plano operacional da vida da esteira; independente do planejamento semanal da fábrica.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_conveyor_operational_plans_one_active_per_conveyor
  ON conveyor_operational_plans (conveyor_id)
  WHERE deleted_at IS NULL
    AND status NOT IN ('CANCELLED', 'COMPLETED');

CREATE INDEX IF NOT EXISTS idx_conveyor_operational_plans_conveyor_id
  ON conveyor_operational_plans (conveyor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_operational_plans_status
  ON conveyor_operational_plans (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_operational_plans_planned_start_date
  ON conveyor_operational_plans (planned_start_date)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS conveyor_operational_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES conveyor_operational_plans (id) ON DELETE CASCADE,
  conveyor_id UUID NOT NULL REFERENCES conveyors (id) ON DELETE RESTRICT,
  activity_node_id UUID NOT NULL REFERENCES conveyor_nodes (id) ON DELETE RESTRICT,
  planned_date DATE NULL,
  planned_order INTEGER NOT NULL DEFAULT 0,
  planned_minutes INTEGER NULL,
  planned_collaborator_id UUID NULL REFERENCES collaborators (id) ON DELETE SET NULL,
  planned_team_id UUID NULL REFERENCES teams (id) ON DELETE SET NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'PLANNED',
  source_kind VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
  origin_work_plan_item_id UUID NULL,
  sync_status VARCHAR(40) NULL,
  review_required BOOLEAN NOT NULL DEFAULT false,
  cancellation_reason TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_conveyor_operational_plan_items_status CHECK (
    status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_REVIEW')
  ),
  CONSTRAINT chk_conveyor_operational_plan_items_source_kind CHECK (
    source_kind IN ('MANUAL', 'GENERATED', 'IMPORTED')
  ),
  CONSTRAINT chk_conveyor_operational_plan_items_sync_status CHECK (
    sync_status IS NULL OR sync_status IN ('PENDING', 'SYNCED', 'DIVERGED')
  ),
  CONSTRAINT chk_conveyor_operational_plan_items_planned_order_nonneg CHECK (planned_order >= 0),
  CONSTRAINT chk_conveyor_operational_plan_items_planned_minutes_nonneg CHECK (
    planned_minutes IS NULL OR planned_minutes >= 0
  )
);

COMMENT ON COLUMN conveyor_operational_plan_items.origin_work_plan_item_id IS
  'Reservado para vínculo futuro com operational_work_plan_items; sem FK nesta fase.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_conveyor_operational_plan_items_plan_activity_active
  ON conveyor_operational_plan_items (plan_id, activity_node_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_operational_plan_items_plan_id
  ON conveyor_operational_plan_items (plan_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_operational_plan_items_conveyor_id
  ON conveyor_operational_plan_items (conveyor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_operational_plan_items_activity_node_id
  ON conveyor_operational_plan_items (activity_node_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_operational_plan_items_planned_date
  ON conveyor_operational_plan_items (planned_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_operational_plan_items_status
  ON conveyor_operational_plan_items (status)
  WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE conveyor_operational_plans TO sgp_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE conveyor_operational_plan_items TO sgp_app';
  END IF;
END$$;
