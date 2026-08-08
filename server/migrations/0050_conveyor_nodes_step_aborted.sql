-- Dispensa operacional de STEP (ABORTED / rótulo UI "Dispensada").
-- Amplia o CHECK de operational_status e adiciona auditoria própria de aborto no nó.
-- Eventos CONVEYOR_STEP_ABORTED / CONVEYOR_STEP_RESTORED usam VARCHAR livre em
-- conveyor_operational_events (sem CHECK de enum de tipos) — sem alteração de constraint.

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
        'REOPENED',
        'ABORTED'
      )
    )
    OR (node_type <> 'STEP' AND operational_status IS NULL)
  );

ALTER TABLE conveyor_nodes
  ADD COLUMN IF NOT EXISTS aborted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS aborted_by UUID NULL REFERENCES app_users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS abort_reason_code VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS abort_reason_text TEXT NULL;

COMMENT ON COLUMN conveyor_nodes.operational_status IS
  'Estado operacional do STEP (PENDING|IN_PROGRESS|BLOCKED|COMPLETED|REOPENED|ABORTED). NULL em OPTION/AREA.';
COMMENT ON COLUMN conveyor_nodes.aborted_at IS
  'Momento da dispensa operacional do STEP (operational_status = ABORTED). Não reutiliza operational_completed_*.';
COMMENT ON COLUMN conveyor_nodes.aborted_by IS
  'app_users.id do utilizador que dispensou o STEP.';
COMMENT ON COLUMN conveyor_nodes.abort_reason_code IS
  'Código do catálogo de motivos de dispensa (ex.: NAO_MAIS_NECESSARIA, OUTRO).';
COMMENT ON COLUMN conveyor_nodes.abort_reason_text IS
  'Texto livre obrigatório quando abort_reason_code = OUTRO; demais códigos tipicamente NULL.';
