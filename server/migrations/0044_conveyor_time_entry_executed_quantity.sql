-- Item B: quantidade executada por apontamento (nullable para legado).

ALTER TABLE conveyor_time_entries
  ADD COLUMN IF NOT EXISTS executed_quantity INT NULL;

ALTER TABLE conveyor_time_entries
  DROP CONSTRAINT IF EXISTS chk_conveyor_time_entries_executed_quantity_nonneg;

ALTER TABLE conveyor_time_entries
  ADD CONSTRAINT chk_conveyor_time_entries_executed_quantity_nonneg
  CHECK (executed_quantity IS NULL OR executed_quantity >= 0);

COMMENT ON COLUMN conveyor_time_entries.executed_quantity IS
  'Unidades concluídas neste apontamento. NULL = não informado (legado).';
