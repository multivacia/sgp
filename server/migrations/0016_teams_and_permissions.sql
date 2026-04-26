-- Equipes (teams) + membros (team_members) + RBAC.
-- Recomendação: executar migrações com o mesmo role PostgreSQL usado pela aplicação
-- (connection string), para as novas tabelas herdarem OWNER e evitarem "permissão negada".

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(256) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_active ON teams (is_active);
CREATE INDEX idx_teams_name ON teams (name);

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES collaborators (id) ON DELETE RESTRICT,
  role VARCHAR(128),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_members_team ON team_members (team_id);
CREATE INDEX idx_team_members_collaborator ON team_members (collaborator_id);

-- No máximo uma linha ativa por (team, collaborator).
CREATE UNIQUE INDEX idx_team_members_team_collaborator_active
  ON team_members (team_id, collaborator_id)
  WHERE is_active = true;

-- No máximo um membro ativo marcado como principal por equipe.
CREATE UNIQUE INDEX idx_team_members_one_primary_active
  ON team_members (team_id)
  WHERE is_primary = true AND is_active = true;

INSERT INTO app_permissions (code, name) VALUES
  ('teams.view', 'Equipes: consultar'),
  ('teams.create', 'Equipes: criar'),
  ('teams.update', 'Equipes: editar'),
  ('teams.manage_members', 'Equipes: gerir membros')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM app_permissions p
JOIN app_roles r ON r.code = 'ADMIN'
WHERE p.code IN (
  'teams.view',
  'teams.create',
  'teams.update',
  'teams.manage_members'
)
ON CONFLICT DO NOTHING;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM app_permissions p
JOIN app_roles r ON r.code = 'GESTOR'
WHERE p.code IN (
  'teams.view',
  'teams.create',
  'teams.update',
  'teams.manage_members'
)
ON CONFLICT DO NOTHING;
