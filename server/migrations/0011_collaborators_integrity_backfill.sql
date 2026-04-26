-- Integridade final: status / is_active em collaborators + backfill seguro de app_users.collaborator_id.
--
-- Regra: is_active = (status = 'ACTIVE')  (equivalente a ACTIVE <=> true, INACTIVE <=> false)
--
-- Ordem: 1) alinhar dados existentes; 2) backfill (apenas correspondência única por e-mail normalizado,
--         colaborador ativo, sem vínculo já ocupado); 3) CHECK constraint.

DO $$
DECLARE
  n bigint;
BEGIN
  UPDATE collaborators
  SET is_active = (status = 'ACTIVE')
  WHERE is_active IS DISTINCT FROM (status = 'ACTIVE');
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '0011: collaborators is_active aligned (rows) = %', n;
END $$;

DO $$
DECLARE
  n bigint;
BEGIN
  WITH normalized_collab AS (
    SELECT
      c.id AS collab_id,
      lower(btrim(c.email::text)) AS em
    FROM collaborators c
    WHERE c.deleted_at IS NULL
      AND c.email IS NOT NULL
      AND btrim(c.email::text) <> ''
      AND c.status = 'ACTIVE'
      AND c.is_active = true
  ),
  email_uniq AS (
    SELECT em
    FROM normalized_collab
    GROUP BY em
    HAVING COUNT(*) = 1
  ),
  pick AS (
    SELECT nc.collab_id, nc.em
    FROM normalized_collab nc
    INNER JOIN email_uniq u ON u.em = nc.em
  )
  UPDATE app_users u
  SET collaborator_id = pick.collab_id,
      updated_at = now()
  FROM pick
  WHERE u.collaborator_id IS NULL
    AND u.deleted_at IS NULL
    AND lower(btrim(u.email::text)) = pick.em
    AND NOT EXISTS (
      SELECT 1
      FROM app_users u2
      WHERE u2.collaborator_id = pick.collab_id
        AND u2.deleted_at IS NULL
        AND u2.id <> u.id
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '0011: app_users collaborator_id backfill (rows) = %', n;
END $$;

DO $$
BEGIN
  ALTER TABLE collaborators
    ADD CONSTRAINT chk_collaborators_status_is_active
    CHECK (is_active = (status = 'ACTIVE'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON CONSTRAINT chk_collaborators_status_is_active ON collaborators IS
  'Espelho obrigatório: is_active = (status = ''ACTIVE'').';

-- Pós-migração: contas ainda sem vínculo — SELECT COUNT(*) FROM app_users
--   WHERE deleted_at IS NULL AND collaborator_id IS NULL;
-- E-mails ambíguos (mais de um colaborador ativo com o mesmo e-mail) não são vinculados automaticamente.
