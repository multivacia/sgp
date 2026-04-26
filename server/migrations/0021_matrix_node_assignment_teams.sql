CREATE TABLE IF NOT EXISTS matrix_node_assignment_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matrix_node_id UUID NOT NULL REFERENCES matrix_nodes (id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_matrix_node_assignment_teams_active
  ON matrix_node_assignment_teams (matrix_node_id, team_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_matrix_node_assignment_teams_node
  ON matrix_node_assignment_teams (matrix_node_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_matrix_node_assignment_teams_team
  ON matrix_node_assignment_teams (team_id)
  WHERE deleted_at IS NULL;
