import { describe, expect, it } from 'vitest'
import { GESTAO_NAV_ITEMS } from '../shell/app-nav-config'
import { PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS } from './permissionCodes'

describe('PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS', () => {
  it('é o mesmo gate que o item do menu “Permissões por papel” e a rota protegida', () => {
    const item = GESTAO_NAV_ITEMS.find((i) => i.to === '/app/permissoes-por-papel')
    expect(item?.permission).toBe(PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS)
    expect(PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS).toBe('rbac.manage_role_permissions')
  })
})
