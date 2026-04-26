import type {
  AdminCollaborator,
  AdminCollaboratorListParams,
  CollaboratorCreateInput,
  CollaboratorUpdateInput,
  Role,
  Sector,
} from '../../domain/collaborators/collaborator.types'
import {
  adminCollaboratorFromApiJson,
  createInputToApiBody,
  roleFromApiJson,
  sectorFromApiJson,
  updateInputToApiBody,
} from '../../domain/collaborators/collaborator.mappers'
import { ApiError } from '../../lib/api/apiErrors'
import { requestJson } from '../../lib/api/client'
import { fetchAdminEnvelope } from './adminUsersApiService'

const BASE = '/api/v1'

export async function listAdminCollaborators(params: AdminCollaboratorListParams): Promise<{
  items: AdminCollaborator[]
  total: number
}> {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.sectorId?.trim()) qs.set('sector_id', params.sectorId.trim())
  if (params.roleId?.trim()) qs.set('role_id', params.roleId.trim())
  if (params.status && params.status !== 'ALL') qs.set('status', params.status)
  if (params.linkedUser) qs.set('linked_user', params.linkedUser)
  if (params.deleted) qs.set('deleted', params.deleted)
  if (params.limit !== undefined) qs.set('limit', String(params.limit))
  if (params.offset !== undefined) qs.set('offset', String(params.offset))
  const q = qs.toString()
  const path = `${BASE}/admin/collaborators${q ? `?${q}` : ''}`
  const { data, meta } = await fetchAdminEnvelope<AdminCollaborator[]>('GET', path)
  const total = Number(meta.total ?? 0)
  const arr = Array.isArray(data) ? data : []
  return { items: arr.map((row) => adminCollaboratorFromApiJson(row)), total }
}

export async function getAdminCollaborator(id: string): Promise<AdminCollaborator | null> {
  try {
    const raw = await requestJson<unknown>(
      'GET',
      `${BASE}/admin/collaborators/${encodeURIComponent(id)}`,
    )
    return adminCollaboratorFromApiJson(raw)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

export async function createAdminCollaborator(
  input: CollaboratorCreateInput,
): Promise<AdminCollaborator> {
  const raw = await requestJson<unknown>('POST', `${BASE}/admin/collaborators`, {
    body: createInputToApiBody(input),
  })
  return adminCollaboratorFromApiJson(raw)
}

export async function patchAdminCollaborator(
  id: string,
  input: CollaboratorUpdateInput,
): Promise<AdminCollaborator> {
  const raw = await requestJson<unknown>(
    'PATCH',
    `${BASE}/admin/collaborators/${encodeURIComponent(id)}`,
    { body: updateInputToApiBody(input) },
  )
  return adminCollaboratorFromApiJson(raw)
}

export async function postAdminCollaboratorActivate(id: string): Promise<AdminCollaborator> {
  const raw = await requestJson<unknown>(
    'POST',
    `${BASE}/admin/collaborators/${encodeURIComponent(id)}/activate`,
  )
  return adminCollaboratorFromApiJson(raw)
}

export async function postAdminCollaboratorInactivate(
  id: string,
): Promise<AdminCollaborator> {
  const raw = await requestJson<unknown>(
    'POST',
    `${BASE}/admin/collaborators/${encodeURIComponent(id)}/inactivate`,
  )
  return adminCollaboratorFromApiJson(raw)
}

export async function postAdminCollaboratorSoftDelete(id: string): Promise<AdminCollaborator> {
  const raw = await requestJson<unknown>(
    'POST',
    `${BASE}/admin/collaborators/${encodeURIComponent(id)}/soft-delete`,
  )
  return adminCollaboratorFromApiJson(raw)
}

export async function postAdminCollaboratorRestore(id: string): Promise<AdminCollaborator> {
  const raw = await requestJson<unknown>(
    'POST',
    `${BASE}/admin/collaborators/${encodeURIComponent(id)}/restore`,
  )
  return adminCollaboratorFromApiJson(raw)
}

export async function listSectorsPublic(): Promise<Sector[]> {
  const raw = await requestJson<unknown>('GET', `${BASE}/sectors`)
  const arr = Array.isArray(raw) ? raw : []
  return arr
    .map((a) => sectorFromApiJson(a))
    .filter((s) => s.id && s.name)
}

export async function listRolesPublic(): Promise<Role[]> {
  const raw = await requestJson<unknown>('GET', `${BASE}/roles`)
  const arr = Array.isArray(raw) ? raw : []
  return arr
    .map((a) => roleFromApiJson(a))
    .filter((r) => r.id && r.name)
}
