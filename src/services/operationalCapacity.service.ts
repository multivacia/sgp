import type {
  CollaboratorCapacityOverrideApi,
  CollaboratorCapacityResolved,
  OperationalCapacitySettings,
} from '../domain/operational-capacity'
import { requestJson } from '../lib/api/client'
import { fetchAdminEnvelope } from './admin/adminUsersApiService'

const BASE = '/api/v1'

export async function getOperationalCapacitySettings(): Promise<OperationalCapacitySettings> {
  const { data } = await fetchAdminEnvelope<OperationalCapacitySettings>(
    'GET',
    `${BASE}/admin/operational-settings/capacity`,
  )
  return data
}

export async function updateOperationalCapacitySettings(input: {
  defaultDailyMinutes: number
}): Promise<OperationalCapacitySettings> {
  const { data } = await fetchAdminEnvelope<OperationalCapacitySettings>(
    'PUT',
    `${BASE}/admin/operational-settings/capacity`,
    { body: input },
  )
  return data
}

export async function getCollaboratorCapacityResolved(
  collaboratorId: string,
  opts?: { date?: string },
): Promise<CollaboratorCapacityResolved> {
  const qs = new URLSearchParams()
  if (opts?.date?.trim()) qs.set('date', opts.date.trim())
  const q = qs.toString()
  const path = `${BASE}/admin/operational-settings/collaborators/${encodeURIComponent(collaboratorId)}/capacity${q ? `?${q}` : ''}`
  const { data } = await fetchAdminEnvelope<CollaboratorCapacityResolved>('GET', path)
  return data
}

export async function upsertCollaboratorCapacityOverride(input: {
  collaboratorId: string
  dailyMinutes: number
  effectiveFrom?: string | null
  effectiveTo?: string | null
  isActive?: boolean
}): Promise<CollaboratorCapacityOverrideApi> {
  const body = {
    dailyMinutes: input.dailyMinutes,
    effectiveFrom: input.effectiveFrom ?? null,
    effectiveTo: input.effectiveTo ?? null,
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  }
  const { data } = await fetchAdminEnvelope<CollaboratorCapacityOverrideApi>(
    'PUT',
    `${BASE}/admin/operational-settings/collaborators/${encodeURIComponent(input.collaboratorId)}/capacity`,
    { body },
  )
  return data
}

export async function deleteCollaboratorCapacityOverride(
  collaboratorId: string,
): Promise<void> {
  await requestJson<undefined>(
    'DELETE',
    `${BASE}/admin/operational-settings/collaborators/${encodeURIComponent(collaboratorId)}/capacity`,
  )
}
