-- Conclusão explícita de STEP (Backlog 6): status operacional por nó STEP em `conveyor_nodes`.
-- OPTION/AREA: colunas NULL (sem status operacional de etapa).

ALTER TABLE conveyor_nodes
  ADD COLUMN IF NOT EXISTS operational_status VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS operational_completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS operational_completed_by UUID NULL REFERENCES app_users (id) ON DELETE SET NULL;

UPDATE conveyor_nodes
SET operational_status = 'PENDING'
WHERE node_type = 'STEP'
  AND deleted_at IS NULL
  AND operational_status IS NULL;

ALTER TABLE conveyor_nodes
  DROP CONSTRAINT IF EXISTS chk_conveyor_nodes_step_operational_status;

ALTER TABLE conveyor_nodes
  ADD CONSTRAINT chk_conveyor_nodes_step_operational_status CHECK (
    (
      node_type = 'STEP'
      AND operational_status IS NOT NULL
      AND operational_status IN (
        'PENDING',
        'IN_PROGRESS',
        'BLOCKED',
        'COMPLETED',
        'REOPENED'
      )
    )
    OR (node_type <> 'STEP' AND operational_status IS NULL)
  );

COMMENT ON COLUMN conveyor_nodes.operational_status IS
  'Estado operacional do STEP (PENDING|IN_PROGRESS|BLOCKED|COMPLETED|REOPENED). NULL em OPTION/AREA.';
COMMENT ON COLUMN conveyor_nodes.operational_completed_at IS
  'Momento da conclusão explícita do STEP (operational_status = COMPLETED).';
COMMENT ON COLUMN conveyor_nodes.operational_completed_by IS
  'app_users.id do utilizador que concluiu explicitamente o STEP.';

CREATE INDEX IF NOT EXISTS idx_conveyor_nodes_conveyor_step_operational_status
  ON conveyor_nodes (conveyor_id, operational_status)
  WHERE deleted_at IS NULL AND node_type = 'STEP';
