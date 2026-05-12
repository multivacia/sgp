-- Planejamento semanal operacional (SGP+ R1-05 S4): planos por semana (seg–sex) e itens por Atividade da esteira.

CREATE TABLE IF NOT EXISTS operational_work_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_by UUID NOT NULL REFERENCES app_users (id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ NULL,
  published_by UUID NULL REFERENCES app_users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_operational_work_plans_status CHECK (status IN ('DRAFT', 'PUBLISHED')),
  CONSTRAINT chk_operational_work_plans_week_order CHECK (week_end_date >= week_start_date)
);

COMMENT ON TABLE operational_work_plans IS
  'Plano semanal de distribuição de Atividades (STEP) por colaborador/dia; não altera esteira nem execução.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_operational_work_plans_week_active
  ON operational_work_plans (week_start_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_operational_work_plans_week_status
  ON operational_work_plans (week_start_date, status)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS operational_work_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_plan_id UUID NOT NULL REFERENCES operational_work_plans (id) ON DELETE CASCADE,
  conveyor_id UUID NOT NULL REFERENCES conveyors (id) ON DELETE RESTRICT,
  activity_node_id UUID NOT NULL REFERENCES conveyor_nodes (id) ON DELETE RESTRICT,
  assigned_collaborator_id UUID NULL REFERENCES collaborators (id) ON DELETE SET NULL,
  assigned_team_id UUID NULL REFERENCES teams (id) ON DELETE SET NULL,
  planned_date DATE NOT NULL,
  planned_order INTEGER NOT NULL DEFAULT 0,
  planned_minutes INTEGER NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_operational_work_plan_items_status CHECK (
    status IN ('PLANNED', 'MOVED', 'CANCELLED')
  ),
  CONSTRAINT chk_operational_work_plan_items_planned_order_nonneg CHECK (planned_order >= 0),
  CONSTRAINT chk_operational_work_plan_items_planned_minutes_nonneg CHECK (
    planned_minutes IS NULL OR planned_minutes >= 0
  )
);

COMMENT ON COLUMN operational_work_plan_items.activity_node_id IS
  'Nó STEP (Atividade) na esteira referenciada por conveyor_id.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_operational_work_plan_items_plan_activity_active
  ON operational_work_plan_items (work_plan_id, activity_node_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_operational_work_plan_items_work_plan_id
  ON operational_work_plan_items (work_plan_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_operational_work_plan_items_planned_date
  ON operational_work_plan_items (planned_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_operational_work_plan_items_assigned_collaborator_id
  ON operational_work_plan_items (assigned_collaborator_id)
  WHERE deleted_at IS NULL AND assigned_collaborator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operational_work_plan_items_conveyor_id
  ON operational_work_plan_items (conveyor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_operational_work_plan_items_activity_node_id
  ON operational_work_plan_items (activity_node_id)
  WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE operational_work_plans TO sgp_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE operational_work_plan_items TO sgp_app';
  END IF;
END$$;
