-- Permissões gerenciais de correção de apontamentos (editar / remover qualquer).
-- Não inclui create_on_behalf; não concede a SUPER_ADMIN.

INSERT INTO app_permissions (code, name) VALUES
  ('time_entries.edit_any', 'Apontamentos: editar qualquer lançamento (correção gerencial)'),
  ('time_entries.delete_any', 'Apontamentos: remover qualquer lançamento (correção gerencial)')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM app_roles r
INNER JOIN app_permissions p ON p.code IN (
  'time_entries.edit_any',
  'time_entries.delete_any'
)
WHERE r.code IN ('ADMIN', 'GESTOR')
ON CONFLICT DO NOTHING;
