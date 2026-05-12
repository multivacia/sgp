-- Marcação de apontamento fora da sequência recomendada (R1-05 S3).
-- Independente de entry_origin (S2 — não alocado).

ALTER TABLE conveyor_time_entries
  ADD COLUMN IF NOT EXISTS is_out_of_sequence BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS out_of_sequence_justification TEXT NULL;

COMMENT ON COLUMN conveyor_time_entries.is_out_of_sequence IS
  'True quando o apontamento ocorreu com atividades anteriores ainda não concluídas na esteira.';

COMMENT ON COLUMN conveyor_time_entries.out_of_sequence_justification IS
  'Obrigatória quando is_out_of_sequence = true; deve ser NULL quando false.';

ALTER TABLE conveyor_time_entries
  DROP CONSTRAINT IF EXISTS chk_conveyor_time_entries_oos_justification_shape;

ALTER TABLE conveyor_time_entries
  ADD CONSTRAINT chk_conveyor_time_entries_oos_justification_shape
  CHECK (
    is_out_of_sequence = false
    OR (
      out_of_sequence_justification IS NOT NULL
      AND length(btrim(out_of_sequence_justification)) > 0
    )
  );

ALTER TABLE conveyor_time_entries
  DROP CONSTRAINT IF EXISTS chk_conveyor_time_entries_oos_false_null_text;

ALTER TABLE conveyor_time_entries
  ADD CONSTRAINT chk_conveyor_time_entries_oos_false_null_text
  CHECK (
    is_out_of_sequence = true
    OR out_of_sequence_justification IS NULL
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE conveyor_time_entries TO sgp_app';
  END IF;
END$$;
