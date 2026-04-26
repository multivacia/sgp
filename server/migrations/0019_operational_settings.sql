-- Catálogo operacional: estado em `sectors` e recorte seguro em `app_roles` (sem alterar RBAC core).

ALTER TABLE sectors
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN sectors.is_active IS
  'Quando false, o setor deixa de aparecer nas listagens públicas (ex.: colaboradores).';

ALTER TABLE app_roles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN app_roles.is_active IS
  'Quando false, o papel deixa de aparecer em GET /roles (dropdowns operacionais). RBAC usa consultas próprias.';

ALTER TABLE app_roles
  ADD COLUMN IF NOT EXISTS is_collaborator_function BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN app_roles.is_collaborator_function IS
  'True = papel gerido em Configurações operacionais como função/papel de colaborador. ADMIN permanece false.';

UPDATE app_roles
SET is_collaborator_function = true
WHERE code IN ('COLABORADOR', 'GESTOR');

INSERT INTO app_permissions (code, name) VALUES
  ('operational_settings.manage', 'Configurações operacionais: gerir catálogo (setores e funções)')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111'::uuid, p.id
FROM app_permissions p
WHERE p.code = 'operational_settings.manage'
ON CONFLICT DO NOTHING;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333'::uuid, p.id
FROM app_permissions p
WHERE p.code = 'operational_settings.manage'
ON CONFLICT DO NOTHING;
