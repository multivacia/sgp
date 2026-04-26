import { fetchAdminEnvelope } from './adminUsersApiService'

const BASE = '/api/v1'

export type RbacRole = {
  id: string
  code: string
  name: string
}

export type RbacPermissionRow = {
  id: string
  code: string
  name: string
}

export async function fetchRbacRoles(): Promise<RbacRole[]> {
  const { data } = await fetchAdminEnvelope<RbacRole[]>('GET', `${BASE}/rbac/roles`)
  return Array.isArray(data) ? data : []
}

export async function fetchRbacPermissionsCatalog(): Promise<RbacPermissionRow[]> {
  const { data } = await fetchAdminEnvelope<RbacPermissionRow[]>(
    'GET',
    `${BASE}/rbac/permissions`,
  )
  return Array.isArray(data) ? data : []
}

export async function fetchRbacRolePermissions(roleId: string): Promise<{
  role: RbacRole
  permissionCodes: string[]
}> {
  const { data } = await fetchAdminEnvelope<{
    role: RbacRole
    permissionCodes: string[]
  }>('GET', `${BASE}/rbac/roles/${encodeURIComponent(roleId)}/permissions`)
  if (!data || typeof data !== 'object') {
    throw new Error('Resposta inválida (permissões do papel).')
  }
  const d = data as { role?: RbacRole; permissionCodes?: string[] }
  if (!d.role || !Array.isArray(d.permissionCodes)) {
    throw new Error('Resposta inválida (permissões do papel).')
  }
  return { role: d.role, permissionCodes: d.permissionCodes }
}

export async function putRbacRolePermissions(
  roleId: string,
  permissionCodes: string[],
): Promise<string[]> {
  const { data } = await fetchAdminEnvelope<{ permissionCodes: string[] }>(
    'PUT',
    `${BASE}/rbac/roles/${encodeURIComponent(roleId)}/permissions`,
    { body: { permissionCodes } },
  )
  if (!data || !Array.isArray(data.permissionCodes)) {
    throw new Error('Resposta inválida após guardar.')
  }
  return data.permissionCodes
}
