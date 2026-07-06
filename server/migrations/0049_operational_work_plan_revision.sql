-- Permite coexistência de plano PUBLISHED vigente e revisão DRAFT na mesma semana.
-- Escopo de unicidade de conveyor_operational_plan_item_id por work_plan_id (não global).

DROP INDEX IF EXISTS uq_operational_work_plans_week_active;

CREATE UNIQUE INDEX IF NOT EXISTS uq_operational_work_plans_week_published_active
  ON operational_work_plans (week_start_date)
  WHERE deleted_at IS NULL AND status = 'PUBLISHED';

CREATE UNIQUE INDEX IF NOT EXISTS uq_operational_work_plans_week_draft_active
  ON operational_work_plans (week_start_date)
  WHERE deleted_at IS NULL AND status = 'DRAFT';

DROP INDEX IF EXISTS uq_operational_work_plan_items_one_conveyor_plan_item_active;

CREATE UNIQUE INDEX IF NOT EXISTS uq_operational_work_plan_items_plan_conveyor_plan_item_active
  ON operational_work_plan_items (work_plan_id, conveyor_operational_plan_item_id)
  WHERE conveyor_operational_plan_item_id IS NOT NULL AND deleted_at IS NULL;
