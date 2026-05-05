CREATE TABLE IF NOT EXISTS operational_extra_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
  created_by_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  description_id uuid NOT NULL REFERENCES operational_extra_time_entry_descriptions(id) ON DELETE RESTRICT,
  entry_date date NOT NULL DEFAULT current_date,
  minutes integer NOT NULL CHECK (minutes > 0),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_operational_extra_time_entries_collab_date
  ON operational_extra_time_entries (collaborator_id, entry_date DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION validate_operational_extra_time_entry_description_active()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM operational_extra_time_entry_descriptions d
    WHERE d.id = NEW.description_id
      AND d.is_active = true
      AND d.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Descrição de apontamento extra esteira inexistente/inativa.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_operational_extra_time_entry_description_active
  ON operational_extra_time_entries;

CREATE TRIGGER trg_validate_operational_extra_time_entry_description_active
BEFORE INSERT OR UPDATE OF description_id
ON operational_extra_time_entries
FOR EACH ROW
EXECUTE FUNCTION validate_operational_extra_time_entry_description_active();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE operational_extra_time_entries TO sgp_app';
  END IF;
END$$;
