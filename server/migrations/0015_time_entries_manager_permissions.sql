-- Apontamento gerencial V1: criar em nome de outro e remover com permissão dedicada.

INSERT INTO app_permissions (code, name) VALUES
  ('time_entries.create_on_behalf', 'Apontamentos: registar em nome de outro colaborador'),
  ('time_entries.delete_any', 'Apontamentos: remover lançamento (qualquer responsável no passo)')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM app_permissions p
JOIN app_roles r ON r.code = 'ADMIN'
WHERE p.code IN ('time_entries.create_on_behalf', 'time_entries.delete_any')
ON CONFLICT DO NOTHING;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM app_permissions p
JOIN app_roles r ON r.code = 'GESTOR'
WHERE p.code IN ('time_entries.create_on_behalf', 'time_entries.delete_any')
ON CONFLICT DO NOTHING;
