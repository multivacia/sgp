-- RBAC V1.5: permissão para gerir vínculos papel ↔ permissão (UI + API dedicadas).

INSERT INTO app_permissions (code, name) VALUES
  ('rbac.manage_role_permissions', 'RBAC: gerir permissões por papel')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM app_permissions p
JOIN app_roles r ON r.code = 'ADMIN'
WHERE p.code = 'rbac.manage_role_permissions'
ON CONFLICT DO NOTHING;
