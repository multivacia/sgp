-- ============================================================================
-- SGP+ ARGOS — Pós-validação do reset (estado esperado)
-- ============================================================================
-- Apenas leitura + RAISE EXCEPTION se algum critério falhar.
-- Execute após reset_to_initial_state.sql com sucesso.
-- ============================================================================

DO $$
DECLARE
  v_n bigint;
BEGIN
  SELECT COUNT(*) INTO v_n FROM app_users;
  IF v_n <> 1 THEN
    RAISE EXCEPTION '[postcheck] Esperado exatamente 1 app_users, obtido %.', v_n;
  END IF;

  SELECT COUNT(*) INTO v_n FROM collaborators;
  IF v_n <> 0 THEN
    RAISE EXCEPTION '[postcheck] Esperado 0 collaborators, obtido %.', v_n;
  END IF;

  SELECT COUNT(*) INTO v_n FROM conveyors;
  IF v_n <> 0 THEN
    RAISE EXCEPTION '[postcheck] Esperado 0 conveyors, obtido %.', v_n;
  END IF;

  SELECT COUNT(*) INTO v_n FROM conveyor_nodes;
  IF v_n <> 0 THEN
    RAISE EXCEPTION '[postcheck] Esperado 0 conveyor_nodes, obtido %.', v_n;
  END IF;

  SELECT COUNT(*) INTO v_n FROM conveyor_node_assignees;
  IF v_n <> 0 THEN
    RAISE EXCEPTION '[postcheck] Esperado 0 conveyor_node_assignees, obtido %.', v_n;
  END IF;

  SELECT COUNT(*) INTO v_n FROM conveyor_time_entries;
  IF v_n <> 0 THEN
    RAISE EXCEPTION '[postcheck] Esperado 0 conveyor_time_entries, obtido %.', v_n;
  END IF;

  SELECT COUNT(*) INTO v_n FROM matrix_nodes;
  IF v_n <> 0 THEN
    RAISE EXCEPTION '[postcheck] Esperado 0 matrix_nodes, obtido %.', v_n;
  END IF;

  SELECT COUNT(*) INTO v_n FROM conveyor_bases;
  IF v_n <> 0 THEN
    RAISE EXCEPTION '[postcheck] Esperado 0 conveyor_bases, obtido %.', v_n;
  END IF;

  SELECT COUNT(*) INTO v_n FROM conveyor_base_nodes;
  IF v_n <> 0 THEN
    RAISE EXCEPTION '[postcheck] Esperado 0 conveyor_base_nodes, obtido %.', v_n;
  END IF;

  SELECT COUNT(*) INTO v_n FROM admin_audit_events;
  IF v_n <> 0 THEN
    RAISE EXCEPTION '[postcheck] Esperado 0 admin_audit_events, obtido %.', v_n;
  END IF;

  SELECT COUNT(*) INTO v_n
  FROM app_users u
  INNER JOIN app_roles r ON r.id = u.role_id
  WHERE r.code = 'ADMIN'
    AND u.collaborator_id IS NULL
    AND u.deleted_at IS NULL
    AND u.is_active = true;

  IF v_n <> 1 THEN
    RAISE EXCEPTION '[postcheck] Esperado 1 app_user ativo (is_active) ADMIN com collaborator_id NULL, obtido %.', v_n;
  END IF;

  SELECT COUNT(*) INTO v_n FROM app_roles;
  IF v_n = 0 THEN
    RAISE EXCEPTION '[postcheck] Catálogo app_roles vazio — RBAC inconsistente.';
  END IF;

  SELECT COUNT(*) INTO v_n FROM app_permissions;
  IF v_n = 0 THEN
    RAISE WARNING '[postcheck] app_permissions está vazio (verificar se era esperado no ambiente).';
  END IF;

  RAISE NOTICE '[postcheck] OK — estado final alinhado aos critérios de aceite.';
END $$;
