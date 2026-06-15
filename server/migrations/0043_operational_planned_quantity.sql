-- Item B: quantidade planejada por atividade (matriz + esteira).
-- `planned_minutes` permanece como tempo planejado unitário em STEPs/ACTIVITY.

ALTER TABLE matrix_nodes
  ADD COLUMN IF NOT EXISTS planned_quantity INT NOT NULL DEFAULT 1;

ALTER TABLE matrix_nodes
  DROP CONSTRAINT IF EXISTS chk_matrix_nodes_planned_quantity_positive;

ALTER TABLE matrix_nodes
  ADD CONSTRAINT chk_matrix_nodes_planned_quantity_positive
  CHECK (planned_quantity >= 1);

COMMENT ON COLUMN matrix_nodes.planned_quantity IS
  'Quantidade planejada (ACTIVITY). Tempo em planned_minutes é por unidade; total = unitário × quantidade.';

ALTER TABLE conveyor_nodes
  ADD COLUMN IF NOT EXISTS planned_quantity INT NOT NULL DEFAULT 1;

ALTER TABLE conveyor_nodes
  DROP CONSTRAINT IF EXISTS chk_conveyor_nodes_planned_quantity_positive;

ALTER TABLE conveyor_nodes
  ADD CONSTRAINT chk_conveyor_nodes_planned_quantity_positive
  CHECK (planned_quantity >= 1);

COMMENT ON COLUMN conveyor_nodes.planned_quantity IS
  'Quantidade planejada (STEP). Tempo em planned_minutes é por unidade; total = unitário × quantidade.';

UPDATE matrix_nodes
SET planned_quantity = 1
WHERE planned_quantity IS NULL OR planned_quantity < 1;

UPDATE conveyor_nodes
SET planned_quantity = 1
WHERE planned_quantity IS NULL OR planned_quantity < 1;
