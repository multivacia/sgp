-- Alocação multi-colaborador por STEP + apontamento analítico por colaborador em STEP.
-- Estrutura (conveyors + conveyor_nodes) | Alocação (conveyor_node_assignees) | Execução (conveyor_time_entries).
-- default_responsible_id em conveyor_nodes permanece por compatibilidade; fonte de verdade da alocação = conveyor_node_assignees.

CREATE TABLE IF NOT EXISTS conveyor_node_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conveyor_id UUID NOT NULL REFERENCES conveyors (id) ON DELETE RESTRICT,
  conveyor_node_id UUID NOT NULL REFERENCES conveyor_nodes (id) ON DELETE RESTRICT,
  collaborator_id UUID NOT NULL REFERENCES collaborators (id) ON DELETE RESTRICT,

  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assignment_origin VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (
    assignment_origin IN ('manual', 'base', 'reaproveitada')
  ),

  order_index INT NOT NULL DEFAULT 0,
  metadata_json JSONB NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,

  CONSTRAINT chk_conveyor_node_assignees_order_non_negative CHECK (order_index >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_conveyor_node_assignees_step_collaborator_active
  ON conveyor_node_assignees (conveyor_node_id, collaborator_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_conveyor_node_assignees_one_primary_per_step
  ON conveyor_node_assignees (conveyor_node_id)
  WHERE is_primary = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_node_assignees_conveyor
  ON conveyor_node_assignees (conveyor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_node_assignees_node
  ON conveyor_node_assignees (conveyor_node_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_node_assignees_collaborator
  ON conveyor_node_assignees (collaborator_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_node_assignees_primary_active
  ON conveyor_node_assignees (conveyor_node_id, is_primary)
  WHERE deleted_at IS NULL AND is_primary = TRUE;

CREATE OR REPLACE FUNCTION fn_validate_conveyor_node_assignee_row()
RETURNS TRIGGER AS $$
DECLARE
  v_node_conveyor_id UUID;
  v_node_type VARCHAR(16);
BEGIN
  SELECT cn.conveyor_id, cn.node_type
  INTO v_node_conveyor_id, v_node_type
  FROM conveyor_nodes cn
  WHERE cn.id = NEW.conveyor_node_id
    AND cn.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conveyor_node_assignees: nó inexistente ou arquivado'
      USING ERRCODE = '23514';
  END IF;

  IF v_node_type IS DISTINCT FROM 'STEP' THEN
    RAISE EXCEPTION 'conveyor_node_assignees: alocação só é permitida em nós STEP'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.conveyor_id IS DISTINCT FROM v_node_conveyor_id THEN
    RAISE EXCEPTION 'conveyor_node_assignees: conveyor_id incompatível com o nó'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_conveyor_node_assignees_biud ON conveyor_node_assignees;
CREATE TRIGGER tr_conveyor_node_assignees_biud
  BEFORE INSERT OR UPDATE ON conveyor_node_assignees
  FOR EACH ROW
  EXECUTE PROCEDURE fn_validate_conveyor_node_assignee_row();

CREATE TABLE IF NOT EXISTS conveyor_time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conveyor_id UUID NOT NULL REFERENCES conveyors (id) ON DELETE RESTRICT,
  conveyor_node_id UUID NOT NULL REFERENCES conveyor_nodes (id) ON DELETE RESTRICT,
  collaborator_id UUID NOT NULL REFERENCES collaborators (id) ON DELETE RESTRICT,

  conveyor_node_assignee_id UUID NULL REFERENCES conveyor_node_assignees (id) ON DELETE SET NULL,

  entry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  minutes INT NOT NULL,
  notes TEXT NULL,

  entry_mode VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (
    entry_mode IN ('manual', 'guided', 'imported')
  ),

  metadata_json JSONB NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,

  CONSTRAINT chk_conveyor_time_entries_minutes_positive CHECK (minutes > 0)
);

CREATE INDEX IF NOT EXISTS idx_conveyor_time_entries_conveyor
  ON conveyor_time_entries (conveyor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_time_entries_node
  ON conveyor_time_entries (conveyor_node_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_time_entries_collaborator
  ON conveyor_time_entries (collaborator_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_time_entries_entry_at
  ON conveyor_time_entries (entry_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_time_entries_assignee
  ON conveyor_time_entries (conveyor_node_assignee_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_time_entries_node_collab_entry
  ON conveyor_time_entries (conveyor_node_id, collaborator_id, entry_at);

CREATE OR REPLACE FUNCTION fn_validate_conveyor_time_entry_row()
RETURNS TRIGGER AS $$
DECLARE
  v_node_conveyor_id UUID;
  v_node_type VARCHAR(16);
  v_a_node UUID;
  v_a_collab UUID;
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
    SELECT cna.conveyor_node_id, cna.collaborator_id
    INTO v_a_node, v_a_collab
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

    IF v_a_collab IS DISTINCT FROM NEW.collaborator_id THEN
      RAISE EXCEPTION 'conveyor_time_entries: alocação não pertence ao mesmo colaborador'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_conveyor_time_entries_biud ON conveyor_time_entries;
CREATE TRIGGER tr_conveyor_time_entries_biud
  BEFORE INSERT OR UPDATE ON conveyor_time_entries
  FOR EACH ROW
  EXECUTE PROCEDURE fn_validate_conveyor_time_entry_row();
