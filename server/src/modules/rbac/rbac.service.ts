import type pg from 'pg'
import { insertAdminAuditEvent } from '../admin-audit/admin-audit.repository.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  findRoleById,
  getPermissionCodesForRole,
  listPermissionsCatalog,
  listRoles,
  replaceRolePermissions,
  resolvePermissionIdsByCodes,
  type PermissionCatalogRow,
  type RoleRow,
} from './rbac.repository.js'
import type { PutRolePermissionsBody } from './rbac.schemas.js'

const COLABORADOR_ROLE_CODE = 'COLABORADOR'
const ADMIN_ROLE_CODE = 'ADMIN'

/** Permissões que o papel ADMIN deve manter sempre (V1.5). */
export const ADMIN_REQUIRED_PERMISSION_CODES = [
  'rbac.manage_role_permissions',
  'users.view',
  'users.edit',
  'users.reset_password',
  'users.force_password_change',
  'audit.view',
] as const

async function withTransaction<T>(
  pool: pg.Pool,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function serviceListRbacRoles(pool: pg.Pool): Promise<RoleRow[]> {
  return listRoles(pool)
}

export async function serviceListRbacPermissionsCatalog(
  pool: pg.Pool,
): Promise<PermissionCatalogRow[]> {
  return listPermissionsCatalog(pool)
}

export async function serviceGetRolePermissionCodes(
  pool: pg.Pool,
  roleId: string,
): Promise<{ role: RoleRow; permissionCodes: string[] }> {
  const role = await findRoleById(pool, roleId)
  if (!role) {
    throw new AppError('Papel não encontrado.', 404, ErrorCodes.OPERATIONAL_RESOURCE_NOT_FOUND)
  }
  const permissionCodes = await getPermissionCodesForRole(pool, roleId)
  return { role, permissionCodes }
}

function assertAdminSafeguards(
  roleCode: string,
  nextCodes: Set<string>,
): void {
  if (roleCode !== ADMIN_ROLE_CODE) return
  const missing = ADMIN_REQUIRED_PERMISSION_CODES.filter(
    (c) => !nextCodes.has(c),
  )
  if (missing.length > 0) {
    throw new AppError(
      `O papel Administrador deve manter as permissões: ${missing.join(', ')}.`,
      400,
      ErrorCodes.VALIDATION_INVALID_INPUT,
    )
  }
}

export async function servicePutRolePermissions(
  pool: pg.Pool,
  actorUserId: string,
  roleId: string,
  body: PutRolePermissionsBody,
): Promise<{ permissionCodes: string[] }> {
  const role = await findRoleById(pool, roleId)
  if (!role) {
    throw new AppError('Papel não encontrado.', 404, ErrorCodes.OPERATIONAL_RESOURCE_NOT_FOUND)
  }

  if (role.code === COLABORADOR_ROLE_CODE) {
    throw new AppError(
      'O papel Colaborador não pode ser editado nesta versão (sem permissões RBAC explícitas).',
      403,
      ErrorCodes.RBAC_DENIED,
    )
  }

  const uniqueCodes = [...new Set(body.permissionCodes)]
  const before = await getPermissionCodesForRole(pool, roleId)
  const beforeSet = new Set(before)

  const resolved = await resolvePermissionIdsByCodes(pool, uniqueCodes)
  if (resolved.size !== uniqueCodes.length) {
    const missing = uniqueCodes.filter((c) => !resolved.has(c))
    throw new AppError(
      `Código(s) de permissão desconhecido(s): ${missing.join(', ')}`,
      400,
      ErrorCodes.VALIDATION_INVALID_INPUT,
    )
  }

  const nextSet = new Set(uniqueCodes)
  assertAdminSafeguards(role.code, nextSet)

  const orderedIds = uniqueCodes
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((c) => resolved.get(c)!)

  await withTransaction(pool, async (client) => {
    await replaceRolePermissions(client, roleId, orderedIds)
  })

  const after = await getPermissionCodesForRole(pool, roleId)
  const afterSet = new Set(after)
  const added = after.filter((c) => !beforeSet.has(c))
  const removed = before.filter((c) => !afterSet.has(c))

  await insertAdminAuditEvent(pool, {
    eventType: 'role_permissions_updated',
    actorUserId,
    targetUserId: null,
    targetCollaboratorId: null,
    metadata: {
      role_id: role.id,
      role_code: role.code,
      added_permission_codes: added,
      removed_permission_codes: removed,
    },
  })

  return { permissionCodes: after }
}
