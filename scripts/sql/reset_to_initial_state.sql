-- ============================================================================
-- SGP+ ARGOS — Reset controlado da base ao estado inicial operacional "verde"
-- ============================================================================
-- DESTRUTIVO. Faça backup completo (pg_dump) antes de executar.
-- Não altera ficheiros de migration no disco — apenas DADOS nas tabelas abaixo.
--
-- Edite os MESMOS v_master_user_id / v_master_email que em precheck.sql
-- (exatamente UM preenchido).
-- ============================================================================

BEGIN;

-- Tabela temporária com o único id a preservar (preenchida pelo bloco seguinte)
CREATE TEMP TABLE _sgp_reset_keep (
  id uuid PRIMARY KEY
) ON COMMIT DROP;

DO $$
DECLARE
  v_master_user_id uuid := NULL;
  v_master_email     text := 'master@bravo.com.br';
  v_keep             uuid;
  v_n                bigint;
  v_admin_role       uuid;
BEGIN
  IF v_master_user_id IS NOT NULL AND v_master_email IS NOT NULL THEN
    RAISE EXCEPTION '[reset] Preencha apenas um: v_master_user_id OU v_master_email.';
  END IF;
  IF v_master_user_id IS NULL AND (v_master_email IS NULL OR btrim(v_master_email) = '') THEN
    RAISE EXCEPTION '[reset] Parâmetros vazios. Defina v_master_user_id OU v_master_email.';
  END IF;

  IF v_master_user_id IS NOT NULL THEN
    SELECT u.id INTO v_keep FROM app_users u
    WHERE u.id = v_master_user_id AND u.deleted_at IS NULL;
    IF v_keep IS NULL THEN
      RAISE EXCEPTION '[reset] Utilizador não encontrado ou soft-deleted: %', v_master_user_id;
    END IF;
  ELSE
    SELECT COUNT(*) INTO v_n
    FROM app_users u
    WHERE u.deleted_at IS NULL
      AND lower(btrim(u.email::text)) = lower(btrim(v_master_email));
    IF v_n = 0 THEN
      RAISE EXCEPTION '[reset] Nenhum utilizador ativo com email %.', v_master_email;
    END IF;
    IF v_n > 1 THEN
      RAISE EXCEPTION '[reset] Ambiguidade: % utilizadores ativos com o mesmo email.', v_n;
    END IF;
    SELECT u.id INTO STRICT v_keep FROM app_users u
    WHERE u.deleted_at IS NULL
      AND lower(btrim(u.email::text)) = lower(btrim(v_master_email));
  END IF;

  SELECT id INTO v_admin_role FROM app_roles WHERE code = 'ADMIN' LIMIT 1;
  IF v_admin_role IS NULL THEN
    RAISE EXCEPTION '[reset] Catálogo app_roles sem papel ADMIN — base inconsistente.';
  END IF;

  INSERT INTO _sgp_reset_keep (id) VALUES (v_keep);
  RAISE NOTICE '[reset] Preservando app_users.id = % (será promovido a ADMIN).', v_keep;
END $$;

-- --------------------------------------------------------------------------
-- Dados operacionais e templates (ordem alinhada a server/scripts/dev_truncate_conveyors.sql)
-- TRUNCATE em SQL top-level (não dentro de DO — compatibilidade PL/pgSQL).
-- --------------------------------------------------------------------------
TRUNCATE TABLE
  conveyor_time_entries,
  conveyor_node_assignees,
  conveyor_nodes,
  conveyors
RESTART IDENTITY CASCADE;

TRUNCATE TABLE matrix_nodes RESTART IDENTITY CASCADE;

TRUNCATE TABLE
  conveyor_base_nodes,
  conveyor_bases
RESTART IDENTITY CASCADE;

TRUNCATE TABLE admin_audit_events RESTART IDENTITY CASCADE;

-- Vínculos operacionais antes de apagar colaboradores
UPDATE app_users SET collaborator_id = NULL WHERE collaborator_id IS NOT NULL;

-- Self-FKs: referências a utilizadores que serão removidos
UPDATE app_users SET created_by = NULL
WHERE created_by IS NOT NULL
  AND created_by NOT IN (SELECT id FROM _sgp_reset_keep);

UPDATE app_users SET updated_by = NULL
WHERE updated_by IS NOT NULL
  AND updated_by NOT IN (SELECT id FROM _sgp_reset_keep);

UPDATE app_users SET created_by = NULL WHERE id IN (SELECT id FROM _sgp_reset_keep);
UPDATE app_users SET updated_by = NULL WHERE id IN (SELECT id FROM _sgp_reset_keep);

DELETE FROM app_users WHERE id NOT IN (SELECT id FROM _sgp_reset_keep);

UPDATE app_users u
SET
  role_id = (SELECT id FROM app_roles WHERE code = 'ADMIN' LIMIT 1),
  collaborator_id = NULL,
  is_active = true,
  updated_at = now()
WHERE u.id IN (SELECT id FROM _sgp_reset_keep);

DELETE FROM collaborators;

DO $$
DECLARE
  v_n bigint;
BEGIN
  SELECT COUNT(*) INTO v_n FROM app_users;
  IF v_n <> 1 THEN
    RAISE EXCEPTION '[reset] Invariante: esperado 1 app_users, obtido %.', v_n;
  END IF;
  SELECT COUNT(*) INTO v_n FROM collaborators;
  IF v_n <> 0 THEN
    RAISE EXCEPTION '[reset] Invariante: esperado 0 collaborators, obtido %.', v_n;
  END IF;
END $$;

COMMIT;
