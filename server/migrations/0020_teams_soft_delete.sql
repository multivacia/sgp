ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON teams (deleted_at);
