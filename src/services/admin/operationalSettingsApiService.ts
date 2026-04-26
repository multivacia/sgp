import type {
  OperationalCollaboratorRoleCreateInput,
  OperationalCollaboratorRolePatchInput,
  OperationalCollaboratorRoleRow,
  OperationalSectorCreateInput,
  OperationalSectorPatchInput,
  OperationalSectorRow,
} from '../../domain/operational-settings/operationalCatalog.types'
import { requestJson } from '../../lib/api/client'
import { fetchAdminEnvelope } from './adminUsersApiService'

const BASE = '/api/v1'

export async function listOperationalSectors(): Promise<OperationalSectorRow[]> {
  const { data } = await fetchAdminEnvelope<OperationalSectorRow[]>(
    'GET',
    `${BASE}/admin/operational-settings/sectors`,
  )
  return Array.isArray(data) ? data : []
}

export async function createOperationalSector(
  input: OperationalSectorCreateInput,
): Promise<OperationalSectorRow> {
  const { data } = await fetchAdminEnvelope<OperationalSectorRow>(
    'POST',
    `${BASE}/admin/operational-settings/sectors`,
    { body: input },
  )
  return data
}

export async function patchOperationalSector(
  id: string,
  input: OperationalSectorPatchInput,
): Promise<OperationalSectorRow> {
  const { data } = await fetchAdminEnvelope<OperationalSectorRow>(
    'PATCH',
    `${BASE}/admin/operational-settings/sectors/${encodeURIComponent(id)}`,
    { body: input },
  )
  return data
}

export async function deleteOperationalSector(id: string): Promise<void> {
  await requestJson<undefined>(
    'DELETE',
    `${BASE}/admin/operational-settings/sectors/${encodeURIComponent(id)}`,
  )
}

export async function listOperationalCollaboratorRoles(): Promise<
  OperationalCollaboratorRoleRow[]
> {
  const { data } = await fetchAdminEnvelope<OperationalCollaboratorRoleRow[]>(
    'GET',
    `${BASE}/admin/operational-settings/collaborator-roles`,
  )
  return Array.isArray(data) ? data : []
}

export async function createOperationalCollaboratorRole(
  input: OperationalCollaboratorRoleCreateInput,
): Promise<OperationalCollaboratorRoleRow> {
  const { data } = await fetchAdminEnvelope<OperationalCollaboratorRoleRow>(
    'POST',
    `${BASE}/admin/operational-settings/collaborator-roles`,
    { body: input },
  )
  return data
}

export async function patchOperationalCollaboratorRole(
  id: string,
  input: OperationalCollaboratorRolePatchInput,
): Promise<OperationalCollaboratorRoleRow> {
  const { data } = await fetchAdminEnvelope<OperationalCollaboratorRoleRow>(
    'PATCH',
    `${BASE}/admin/operational-settings/collaborator-roles/${encodeURIComponent(id)}`,
    { body: input },
  )
  return data
}

export async function deleteOperationalCollaboratorRole(id: string): Promise<void> {
  await requestJson<undefined>(
    'DELETE',
    `${BASE}/admin/operational-settings/collaborator-roles/${encodeURIComponent(id)}`,
  )
}
