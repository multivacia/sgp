import { describe, expect, it } from 'vitest'
import { GESTAO_NAV_ITEMS } from '../shell/app-nav-config'
import {
  PERMISSION_BACKUPS_CREATE,
  PERMISSION_BACKUPS_DELETE,
  PERMISSION_BACKUPS_DOWNLOAD,
  PERMISSION_BACKUPS_RESTORE,
  PERMISSION_BACKUPS_SETTINGS,
  PERMISSION_BACKUPS_VIEW,
  PERMISSION_BACKUPS_WAL_DOWNLOAD,
  PERMISSION_BACKUPS_WAL_VIEW,
  PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS,
} from './permissionCodes'

describe('PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS', () => {
  it('é o mesmo gate que o item do menu “Permissões por papel” e a rota protegida', () => {
    const item = GESTAO_NAV_ITEMS.find((i) => i.to === '/app/permissoes-por-papel')
    expect(item?.permission).toBe(PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS)
    expect(PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS).toBe('rbac.manage_role_permissions')
  })
})

describe('PERMISSION_BACKUPS_*', () => {
  it('expõe os códigos funcionais e reservados alinhados ao backend', () => {
    expect(PERMISSION_BACKUPS_VIEW).toBe('backups.view')
    expect(PERMISSION_BACKUPS_CREATE).toBe('backups.create')
    expect(PERMISSION_BACKUPS_DOWNLOAD).toBe('backups.download')
    expect(PERMISSION_BACKUPS_WAL_VIEW).toBe('backups.wal.view')
    expect(PERMISSION_BACKUPS_WAL_DOWNLOAD).toBe('backups.wal.download')
    expect(PERMISSION_BACKUPS_RESTORE).toBe('backups.restore')
    expect(PERMISSION_BACKUPS_DELETE).toBe('backups.delete')
    expect(PERMISSION_BACKUPS_SETTINGS).toBe('backups.settings')
  })
})
