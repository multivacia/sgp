-- system_settings: somente SUPER_ADMIN.
-- Migration 0013 reatribui todas as permissões existentes ao ADMIN em cada execução de migrate;
-- esta migration roda depois e remove acesso indevido a configurações sensíveis.

DELETE FROM app_role_permissions rp
USING app_permissions p
WHERE rp.permission_id = p.id
  AND p.code IN ('system_settings.view', 'system_settings.manage')
  AND rp.role_id IN (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid
  );
