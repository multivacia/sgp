import { describe, expect, it } from 'vitest'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'

/**
 * Espelha a denylist de `servicePutRolePermissions` sem depender do pool.
 */
function assertSuperAdminOnlyPermissions(
  roleCode: string,
  permissionCodes: string[],
): void {
  if (roleCode === 'SUPER_ADMIN') return
  const blocked = permissionCodes.filter(
    (code) => code.startsWith('backups.') || code.startsWith('system_settings.'),
  )
  if (blocked.length > 0) {
    throw new AppError(
      `Permissões restritas ao Super Administrador não podem ser atribuídas a este papel: ${blocked.join(', ')}.`,
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
}

describe('RBAC denylist backups/system_settings', () => {
  it('bloqueia backups.* em papel ADMIN', () => {
    expect(() =>
      assertSuperAdminOnlyPermissions('ADMIN', [
        'users.view',
        'backups.view',
      ]),
    ).toThrow(AppError)
  })

  it('bloqueia system_settings.* em GESTOR', () => {
    expect(() =>
      assertSuperAdminOnlyPermissions('GESTOR', ['system_settings.manage']),
    ).toThrow(/Super Administrador/)
  })

  it('permite backups.* apenas em SUPER_ADMIN', () => {
    expect(() =>
      assertSuperAdminOnlyPermissions('SUPER_ADMIN', [
        'backups.view',
        'backups.create',
        'system_settings.view',
      ]),
    ).not.toThrow()
  })
})
