-- Permite que apontamentos extra esteira (operational_extra_time_entries) sejam
-- criados também pelo Modo Fábrica (Kiosk), preservando a autoria original do
-- fluxo web (app_users) sem introduzir dependência de app_users no Modo Fábrica.
--
-- created_by_user_id passa a ser NULLABLE; um registro criado via produção grava
-- created_by_collaborator_id (referenciando collaborators.id diretamente, via
-- req.productionSession.collaboratorId) e origin='PRODUCTION'. Registros do fluxo
-- web continuam com created_by_user_id preenchido e origin='WEB' (default de coluna).
--
-- Sem backfill necessário: linhas existentes já têm created_by_user_id preenchido
-- e assumem origin='WEB' via DEFAULT.

ALTER TABLE operational_extra_time_entries
  ALTER COLUMN created_by_user_id DROP NOT NULL;

ALTER TABLE operational_extra_time_entries
  ADD COLUMN IF NOT EXISTS created_by_collaborator_id uuid NULL
    REFERENCES collaborators(id) ON DELETE RESTRICT;

ALTER TABLE operational_extra_time_entries
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'WEB';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_operational_extra_time_entries_origin_values'
  ) THEN
    ALTER TABLE operational_extra_time_entries
      ADD CONSTRAINT chk_operational_extra_time_entries_origin_values
      CHECK (origin IN ('WEB', 'PRODUCTION'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_operational_extra_time_entries_origin_author_xor'
  ) THEN
    ALTER TABLE operational_extra_time_entries
      ADD CONSTRAINT chk_operational_extra_time_entries_origin_author_xor
      CHECK (
        (
          created_by_user_id IS NOT NULL
          AND origin = 'WEB'
          AND created_by_collaborator_id IS NULL
        )
        OR
        (
          created_by_collaborator_id IS NOT NULL
          AND origin = 'PRODUCTION'
          AND created_by_user_id IS NULL
        )
      );
  END IF;
END$$;

COMMENT ON COLUMN operational_extra_time_entries.origin IS
  'Canal de criação do apontamento extra esteira: WEB (app_users) ou PRODUCTION (Kiosk/Modo Fábrica, collaborators).';
COMMENT ON COLUMN operational_extra_time_entries.created_by_collaborator_id IS
  'Preenchido apenas quando origin=PRODUCTION; vem de req.productionSession.collaboratorId, nunca resolvido via app_users.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE operational_extra_time_entries TO sgp_app';
  END IF;
END$$;
