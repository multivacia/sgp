/**
 * Códigos de permissão usados no cliente — alinhar com `app_permissions` e middleware no servidor.
 * Importar estes identificadores em menu, `RequirePermission` e checks pontuais para não haver drift.
 */

/** RBAC: ecrã e APIs `/api/v1/rbac/*` (ver `rbac.routes.ts`). */
export const PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS =
  'rbac.manage_role_permissions' as const

/** Catálogo operacional (setores e funções de colaborador) — ver `operational-settings.routes.ts`. */
export const PERMISSION_OPERATIONAL_SETTINGS_MANAGE =
  'operational_settings.manage' as const

/** Configurações sistêmicas sensíveis — ver `system-settings.routes.ts`. */
export const PERMISSION_SYSTEM_SETTINGS_VIEW = 'system_settings.view' as const
export const PERMISSION_SYSTEM_SETTINGS_MANAGE = 'system_settings.manage' as const

/** Gestão de backups administrativos — ver `backups.routes.ts`. */
export const PERMISSION_BACKUPS_VIEW = 'backups.view' as const
export const PERMISSION_BACKUPS_CREATE = 'backups.create' as const
export const PERMISSION_BACKUPS_DOWNLOAD = 'backups.download' as const
export const PERMISSION_BACKUPS_WAL_VIEW = 'backups.wal.view' as const
export const PERMISSION_BACKUPS_WAL_DOWNLOAD = 'backups.wal.download' as const
export const PERMISSION_BACKUPS_RESTORE = 'backups.restore' as const
export const PERMISSION_BACKUPS_DELETE = 'backups.delete' as const
export const PERMISSION_BACKUPS_SETTINGS = 'backups.settings' as const
