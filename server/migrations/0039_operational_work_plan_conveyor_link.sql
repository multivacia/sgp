-- R3-S3: vínculo opcional entre item do planejamento semanal da fábrica e item do plano da esteira.

ALTER TABLE operational_work_plan_items
  ADD COLUMN IF NOT EXISTS conveyor_operational_plan_item_id UUID NULL
  REFERENCES conveyor_operational_plan_items (id) ON DELETE RESTRICT;

COMMENT ON COLUMN operational_work_plan_items.conveyor_operational_plan_item_id IS
  'Item do plano operacional da esteira encaixado neste slot semanal; nullable para planejamento manual.';

CREATE INDEX IF NOT EXISTS idx_operational_work_plan_items_conveyor_plan_item_id
  ON operational_work_plan_items (conveyor_operational_plan_item_id)
  WHERE deleted_at IS NULL AND conveyor_operational_plan_item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_operational_work_plan_items_one_conveyor_plan_item_active
  ON operational_work_plan_items (conveyor_operational_plan_item_id)
  WHERE conveyor_operational_plan_item_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN conveyor_operational_plan_items.origin_work_plan_item_id IS
  'Item semanal da fábrica (operational_work_plan_items) vinculado após encaixe; sem FK para evitar ciclos.';
