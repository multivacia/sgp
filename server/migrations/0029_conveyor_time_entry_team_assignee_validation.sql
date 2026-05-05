-- Permite `conveyor_node_assignee_id` referenciando alocação TEAM quando o colaborador
-- do apontamento é membro ativo do time (antes o trigger comparava apenas collaborator_id).

CREATE OR REPLACE FUNCTION fn_validate_conveyor_time_entry_row()
RETURNS TRIGGER AS $$
DECLARE
  v_node_conveyor_id UUID;
  v_node_type VARCHAR(16);
  v_a_node UUID;
  v_a_collab UUID;
  v_a_type VARCHAR(20);
  v_a_team UUID;
BEGIN
  SELECT cn.conveyor_id, cn.node_type
  INTO v_node_conveyor_id, v_node_type
  FROM conveyor_nodes cn
  WHERE cn.id = NEW.conveyor_node_id
    AND cn.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conveyor_time_entries: nó inexistente ou arquivado'
      USING ERRCODE = '23514';
  END IF;

  IF v_node_type IS DISTINCT FROM 'STEP' THEN
    RAISE EXCEPTION 'conveyor_time_entries: apontamento só é permitido em nós STEP'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.conveyor_id IS DISTINCT FROM v_node_conveyor_id THEN
    RAISE EXCEPTION 'conveyor_time_entries: conveyor_id incompatível com o nó'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.conveyor_node_assignee_id IS NOT NULL THEN
    SELECT
      cna.conveyor_node_id,
      cna.collaborator_id,
      cna.assignment_type,
      cna.team_id
    INTO v_a_node, v_a_collab, v_a_type, v_a_team
    FROM conveyor_node_assignees cna
    WHERE cna.id = NEW.conveyor_node_assignee_id
      AND cna.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'conveyor_time_entries: alocação referenciada inexistente ou arquivada'
        USING ERRCODE = '23514';
    END IF;

    IF v_a_node IS DISTINCT FROM NEW.conveyor_node_id THEN
      RAISE EXCEPTION 'conveyor_time_entries: alocação não pertence ao mesmo STEP'
        USING ERRCODE = '23514';
    END IF;

    IF COALESCE(v_a_type, 'COLLABORATOR') = 'COLLABORATOR' THEN
      IF v_a_collab IS DISTINCT FROM NEW.collaborator_id THEN
        RAISE EXCEPTION 'conveyor_time_entries: alocação não pertence ao mesmo colaborador'
          USING ERRCODE = '23514';
      END IF;
    ELSIF v_a_type = 'TEAM' THEN
      IF v_a_team IS NULL THEN
        RAISE EXCEPTION 'conveyor_time_entries: alocação TEAM sem time'
          USING ERRCODE = '23514';
      END IF;
      IF NOT EXISTS (
        SELECT 1
        FROM team_members tm
        WHERE tm.team_id = v_a_team
          AND tm.collaborator_id = NEW.collaborator_id
          AND tm.is_active = TRUE
      ) THEN
        RAISE EXCEPTION 'conveyor_time_entries: colaborador não pertence ao time alocado neste STEP'
          USING ERRCODE = '23514';
      END IF;
    ELSE
      RAISE EXCEPTION 'conveyor_time_entries: tipo de alocação inválido'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
