-- Apontamento por exceção: colaborador sem alocação na atividade (SGP+ R1-05).
-- `entry_origin` deriva-se da regra de negócio; `exception_justification` obrigatória apenas para UNASSIGNED_EXCEPTION.

ALTER TABLE conveyor_time_entries
  ADD COLUMN IF NOT EXISTS entry_origin VARCHAR(32) NOT NULL DEFAULT 'ASSIGNED',
  ADD COLUMN IF NOT EXISTS exception_justification TEXT NULL;

COMMENT ON COLUMN conveyor_time_entries.entry_origin IS
  'ASSIGNED: alocação direta ou via time; UNASSIGNED_EXCEPTION: sem alocação, com justificativa obrigatória.';

COMMENT ON COLUMN conveyor_time_entries.exception_justification IS
  'Obrigatória quando entry_origin = UNASSIGNED_EXCEPTION; deve ser NULL quando ASSIGNED.';

ALTER TABLE conveyor_time_entries
  DROP CONSTRAINT IF EXISTS chk_conveyor_time_entries_entry_origin_values;

ALTER TABLE conveyor_time_entries
  ADD CONSTRAINT chk_conveyor_time_entries_entry_origin_values
  CHECK (entry_origin IN ('ASSIGNED', 'UNASSIGNED_EXCEPTION'));

ALTER TABLE conveyor_time_entries
  DROP CONSTRAINT IF EXISTS chk_conveyor_time_entries_assigned_no_exception_text;

ALTER TABLE conveyor_time_entries
  ADD CONSTRAINT chk_conveyor_time_entries_assigned_no_exception_text
  CHECK (entry_origin <> 'ASSIGNED' OR exception_justification IS NULL);

ALTER TABLE conveyor_time_entries
  DROP CONSTRAINT IF EXISTS chk_conveyor_time_entries_unassigned_exception_shape;

ALTER TABLE conveyor_time_entries
  ADD CONSTRAINT chk_conveyor_time_entries_unassigned_exception_shape
  CHECK (
    entry_origin <> 'UNASSIGNED_EXCEPTION'
    OR (
      conveyor_node_assignee_id IS NULL
      AND exception_justification IS NOT NULL
      AND length(btrim(exception_justification)) > 0
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE conveyor_time_entries TO sgp_app';
  END IF;
END$$;
