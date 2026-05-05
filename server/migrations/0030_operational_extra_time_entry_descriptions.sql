CREATE TABLE IF NOT EXISTS operational_extra_time_entry_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  normalized_description text NOT NULL,
  internal_note text NULL,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS operational_extra_time_entry_descriptions_norm_uq
  ON operational_extra_time_entry_descriptions (normalized_description)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE operational_extra_time_entry_descriptions IS
  'Catálogo de descrições para apontamentos extra esteira (fora de STEP).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE operational_extra_time_entry_descriptions TO sgp_app';
  END IF;
END$$;
