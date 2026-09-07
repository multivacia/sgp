-- Permite que apontamentos "Extra esteira" originados do Modo Fábrica (Kiosk/PIN) sejam
-- persistidos sem `app_users`: o Kiosk só conhece `collaboratorId` da sessão de produção.

ALTER TABLE operational_extra_time_entries
  ALTER COLUMN created_by_user_id DROP NOT NULL;

ALTER TABLE operational_extra_time_entries
  ADD COLUMN IF NOT EXISTS created_by_collaborator_id uuid NULL
    REFERENCES collaborators(id) ON DELETE RESTRICT;

ALTER TABLE operational_extra_time_entries
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'WEB';

COMMENT ON COLUMN operational_extra_time_entries.origin IS
  'Canal de origem do apontamento extra esteira: WEB (app_users) ou PRODUCTION (Kiosk/PIN, collaborators).';
COMMENT ON COLUMN operational_extra_time_entries.created_by_collaborator_id IS
  'Preenchido apenas quando origin = PRODUCTION (Kiosk/PIN não possui app_users).';

ALTER TABLE operational_extra_time_entries
  DROP CONSTRAINT IF EXISTS chk_operational_extra_time_entries_origin_valid;
ALTER TABLE operational_extra_time_entries
  ADD CONSTRAINT chk_operational_extra_time_entries_origin_valid
    CHECK (origin IN ('WEB', 'PRODUCTION'));

ALTER TABLE operational_extra_time_entries
  DROP CONSTRAINT IF EXISTS chk_operational_extra_time_entries_origin_author_xor;
ALTER TABLE operational_extra_time_entries
  ADD CONSTRAINT chk_operational_extra_time_entries_origin_author_xor
    CHECK (
      (origin = 'WEB' AND created_by_user_id IS NOT NULL AND created_by_collaborator_id IS NULL)
      OR
      (origin = 'PRODUCTION' AND created_by_collaborator_id IS NOT NULL AND created_by_user_id IS NULL)
    );

-- Sem backfill necessário: linhas existentes já são origin='WEB' (DEFAULT) e já têm
-- created_by_user_id preenchido (constraint NOT NULL vigente até esta migration).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE operational_extra_time_entries TO sgp_app';
  END IF;
END$$;
