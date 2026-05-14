-- SUPER_ADMIN e permissões sistêmicas para configurações sensíveis (ex.: timeout de sessão).

INSERT INTO app_roles (id, code, name) VALUES
  ('66666666-6666-6666-6666-666666666666', 'SUPER_ADMIN', 'Super administrador')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO app_permissions (code, name) VALUES
  ('system_settings.view', 'Configurações do sistema: consultar'),
  ('system_settings.manage', 'Configurações do sistema: alterar')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT '66666666-6666-6666-6666-666666666666'::uuid, p.id
FROM app_permissions p
WHERE p.code IN ('system_settings.view', 'system_settings.manage')
ON CONFLICT DO NOTHING;


UPDATE app_users
SET role_id = (
  SELECT id
  FROM app_roles
  WHERE code = 'SUPER_ADMIN'
)
WHERE email = 'master@bravo.com.br';