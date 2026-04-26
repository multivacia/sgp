-- ============================================================================
-- SGP+ ARGOS — Pré-validação antes do reset operacional da base
-- ============================================================================
-- NÃO executa alterações destrutivas (apenas leitura + RAISE NOTICE / EXCEPTION).
--
-- Edite APENAS os dois NULLs abaixo (exatamente UM deles preenchido).
-- Copie o mesmo par para reset_to_initial_state.sql e postcheck.
-- ============================================================================

DO $$
DECLARE
  v_master_user_id uuid := NULL; -- ex.: '11111111-1111-1111-1111-111111111111'::uuid
  v_master_email     text := 'master@bravo.com.br'; -- ex.: 'admin@empresa.com'
  v_resolved_id      uuid;
  v_n                bigint;
  v_admins           bigint;
BEGIN
  IF v_master_user_id IS NOT NULL AND v_master_email IS NOT NULL THEN
    RAISE EXCEPTION '[precheck] Preencha apenas um dos dois: v_master_user_id OU v_master_email (não ambos).';
  END IF;

  IF v_master_user_id IS NULL AND (v_master_email IS NULL OR btrim(v_master_email) = '') THEN
    RAISE EXCEPTION '[precheck] v_master_user_id e v_master_email estão vazios. Defina exatamente um deles.';
  END IF;

  IF v_master_user_id IS NOT NULL THEN
    SELECT u.id
    INTO v_resolved_id
    FROM app_users u
    WHERE u.id = v_master_user_id
      AND u.deleted_at IS NULL;

    IF v_resolved_id IS NULL THEN
      RAISE EXCEPTION '[precheck] Nenhum app_users ativo encontrado para v_master_user_id = %.', v_master_user_id;
    END IF;
  ELSE
    SELECT COUNT(*) INTO v_n
    FROM app_users u
    WHERE u.deleted_at IS NULL
      AND lower(btrim(u.email::text)) = lower(btrim(v_master_email));

    IF v_n = 0 THEN
      RAISE EXCEPTION '[precheck] Nenhum app_users ativo encontrado para email = %.', v_master_email;
    END IF;
    IF v_n > 1 THEN
      RAISE EXCEPTION '[precheck] Mais de um app_users ativo com o mesmo email normalizado (n=%). Corrija antes do reset.', v_n;
    END IF;

    SELECT u.id
    INTO STRICT v_resolved_id
    FROM app_users u
    WHERE u.deleted_at IS NULL
      AND lower(btrim(u.email::text)) = lower(btrim(v_master_email));
  END IF;

  SELECT COUNT(*) INTO v_n FROM app_users WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_admins
  FROM app_users u
  INNER JOIN app_roles r ON r.id = u.role_id
  WHERE u.deleted_at IS NULL AND r.code = 'ADMIN';

  RAISE NOTICE '[precheck] Utilizador resolvido para preservar: %', v_resolved_id;
  RAISE NOTICE '[precheck] app_users ativos (total): %', v_n;
  RAISE NOTICE '[precheck] app_users ativos com papel ADMIN (total): %', v_admins;
  RAISE NOTICE '[precheck] collaborators (linhas na tabela): %', (SELECT COUNT(*) FROM collaborators);
  RAISE NOTICE '[precheck] conveyors (não apagados logicamente): %', (SELECT COUNT(*) FROM conveyors WHERE deleted_at IS NULL);
  RAISE NOTICE '[precheck] conveyor_time_entries (ativos): %', (SELECT COUNT(*) FROM conveyor_time_entries WHERE deleted_at IS NULL);
  RAISE NOTICE '[precheck] matrix_nodes (não apagados): %', (SELECT COUNT(*) FROM matrix_nodes WHERE deleted_at IS NULL);
  RAISE NOTICE '[precheck] conveyor_bases (não apagados): %', (SELECT COUNT(*) FROM conveyor_bases WHERE deleted_at IS NULL);
  RAISE NOTICE '[precheck] admin_audit_events: %', (SELECT COUNT(*) FROM admin_audit_events);

  RAISE NOTICE '[precheck] OK — parâmetros resolvem exatamente um utilizador. Pode executar reset_to_initial_state.sql (mesmos NULLs).';
END $$;
