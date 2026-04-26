-- RBAC V1.5: permissão para gerir vínculos papel ↔ permissão (UI + API dedicadas).

INSERT INTO app_permissions (code, name) VALUES
  ('rbac.manage_role_permissions', 'RBAC: gerir permissões por papel')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111'::uuid, p.id
FROM app_permissions p
WHERE p.code = 'rbac.manage_role_permissions'
ON CONFLICT DO NOTHING;
