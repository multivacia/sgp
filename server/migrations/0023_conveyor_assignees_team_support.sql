-- Esteiras: suporte a alocação por TIME na mesma tabela de assignees.
-- Modelo unificado (COLLABORATOR | TEAM), mantendo retrocompatibilidade de dados.

ALTER TABLE conveyor_node_assignees
  ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(20);

ALTER TABLE conveyor_node_assignees
  ADD COLUMN IF NOT EXISTS team_id UUID NULL REFERENCES teams (id) ON DELETE RESTRICT;

UPDATE conveyor_node_assignees
SET assignment_type = 'COLLABORATOR'
WHERE assignment_type IS NULL;

ALTER TABLE conveyor_node_assignees
  ALTER COLUMN assignment_type SET DEFAULT 'COLLABORATOR';

ALTER TABLE conveyor_node_assignees
  ALTER COLUMN assignment_type SET NOT NULL;

ALTER TABLE conveyor_node_assignees
  ALTER COLUMN collaborator_id DROP NOT NULL;

ALTER TABLE conveyor_node_assignees
  DROP CONSTRAINT IF EXISTS chk_conveyor_node_assignees_assignment_target;

ALTER TABLE conveyor_node_assignees
  ADD CONSTRAINT chk_conveyor_node_assignees_assignment_target CHECK (
    (assignment_type = 'COLLABORATOR' AND collaborator_id IS NOT NULL AND team_id IS NULL)
    OR
    (assignment_type = 'TEAM' AND team_id IS NOT NULL AND collaborator_id IS NULL)
  );

ALTER TABLE conveyor_node_assignees
  DROP CONSTRAINT IF EXISTS chk_conveyor_node_assignees_team_not_primary;

ALTER TABLE conveyor_node_assignees
  ADD CONSTRAINT chk_conveyor_node_assignees_team_not_primary CHECK (
    assignment_type <> 'TEAM' OR is_primary = FALSE
  );

DROP INDEX IF EXISTS ux_conveyor_node_assignees_step_collaborator_active;
CREATE UNIQUE INDEX IF NOT EXISTS ux_conveyor_node_assignees_step_collaborator_active
  ON conveyor_node_assignees (conveyor_node_id, collaborator_id)
  WHERE deleted_at IS NULL AND assignment_type = 'COLLABORATOR';

CREATE UNIQUE INDEX IF NOT EXISTS ux_conveyor_node_assignees_step_team_active
  ON conveyor_node_assignees (conveyor_node_id, team_id)
  WHERE deleted_at IS NULL AND assignment_type = 'TEAM';

DROP INDEX IF EXISTS ux_conveyor_node_assignees_one_primary_per_step;
CREATE UNIQUE INDEX IF NOT EXISTS ux_conveyor_node_assignees_one_primary_per_step
  ON conveyor_node_assignees (conveyor_node_id)
  WHERE deleted_at IS NULL AND assignment_type = 'COLLABORATOR' AND is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_conveyor_node_assignees_team
  ON conveyor_node_assignees (team_id)
  WHERE deleted_at IS NULL AND assignment_type = 'TEAM';
