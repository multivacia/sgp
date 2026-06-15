-- RBAC fino V1: permissÃƒÆ’Ã‚Âµes explÃƒÆ’Ã‚Â­citas por papel (ADMIN / GESTOR / COLABORADOR).

CREATE TABLE IF NOT EXISTS app_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(256) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_role_permissions (
  role_id UUID NOT NULL REFERENCES app_roles (id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES app_permissions (id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_app_role_permissions_role ON app_role_permissions (role_id);

-- Roles base necessÃƒÂ¡rios para RBAC em base limpa.
INSERT INTO app_roles (id, code, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ADMIN', 'Administrador'),
  ('22222222-2222-2222-2222-222222222222', 'COLABORADOR', 'Colaborador'),
  ('33333333-3333-3333-3333-333333333333', 'GESTOR', 'Gestor')
ON CONFLICT (code) DO NOTHING;
INSERT INTO app_permissions (code, name) VALUES
  ('users.view', 'Utilizadores: consultar'),
  ('users.create', 'Utilizadores: criar'),
  ('users.edit', 'Utilizadores: editar'),
  ('users.activate', 'Utilizadores: ativar'),
  ('users.deactivate', 'Utilizadores: inativar'),
  ('users.soft_delete', 'Utilizadores: eliminaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o lÃƒÆ’Ã‚Â³gica'),
  ('users.restore', 'Utilizadores: restaurar'),
  ('users.reset_password', 'Utilizadores: repor senha'),
  ('users.force_password_change', 'Utilizadores: forÃƒÆ’Ã‚Â§ar troca de senha'),
  ('audit.view', 'Trilha administrativa: consultar'),
  ('dashboard.view_executive', 'Dashboard gerencial'),
  ('collaborators_admin.soft_delete', 'Colaboradores admin: eliminaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o lÃƒÆ’Ã‚Â³gica'),
  ('collaborators_admin.restore', 'Colaboradores admin: restaurar'),
  ('collaborators_admin.view', 'Colaboradores admin: consultar'),
  ('collaborators_admin.create', 'Colaboradores admin: criar'),
  ('collaborators_admin.edit', 'Colaboradores admin: editar'),
  ('collaborators_admin.activate', 'Colaboradores admin: ativar'),
  ('collaborators_admin.deactivate', 'Colaboradores admin: inativar'),
  ('conveyors.create', 'Esteiras: criar'),
  ('conveyors.edit_status', 'Esteiras: alterar estado operacional'),
  ('conveyors.manage_assignments', 'Esteiras: gerir alocaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes por etapa'),
  ('operation_matrix.view', 'Matriz de operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: consultar'),
  ('operation_matrix.manage', 'Matriz de operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: alterar'),
  ('dashboard.view_operational', 'Dashboard operacional'),
  ('system.health_db', 'Health DB (produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o)')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- ADMIN: todas as permissÃƒÆ’Ã‚Âµes V1
INSERT INTO app_role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111'::uuid, p.id
FROM app_permissions p
ON CONFLICT DO NOTHING;

-- GESTOR: operacional + health (sem permissÃƒÆ’Ã‚Âµes sÃƒÆ’Ã‚Â³ ADMIN)
INSERT INTO app_role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333'::uuid, p.id
FROM app_permissions p
WHERE p.code IN (
  'collaborators_admin.view',
  'collaborators_admin.create',
  'collaborators_admin.edit',
  'collaborators_admin.activate',
  'collaborators_admin.deactivate',
  'conveyors.create',
  'conveyors.edit_status',
  'conveyors.manage_assignments',
  'operation_matrix.view',
  'operation_matrix.manage',
  'dashboard.view_operational',
  'system.health_db'
)
ON CONFLICT DO NOTHING;

-- COLABORADOR: sem linhas (apenas requireAuth nas rotas operacionais)
