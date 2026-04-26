import type {
  AdminResetPasswordResponse,
  AdminUserCreateInput,
  AdminUserRow,
  AdminUserUpdateInput,
  AppRoleOption,
  CollaboratorLinkageSummary,
  EligibleCollaboratorOption,
} from '../../domain/admin/adminUser.types'
import { ApiError, parseErrorEnvelope } from '../../lib/api/apiErrors'
import { getApiBaseUrl } from '../../lib/api/env'
import { SGP_NETWORK_ERROR_API_DIAGNOSTIC_MESSAGE } from '../../lib/errors/sgpErrorContract'
import { requestJson } from '../../lib/api/client'

const BASE = '/api/v1'

/** Envelope `{ data, meta }` das rotas `/api/v1/admin/*` (cookies + JSON). */
export async function fetchAdminEnvelope<T>(
  method: string,
  path: string,
  init?: { body?: unknown },
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const base = getApiBaseUrl()
  const pathPart = path.startsWith('/') ? path : `/${path}`
  const url = base ? `${base}${pathPart}` : pathPart
  const headers: Record<string, string> = {}
  if (init?.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body:
        init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  } catch (e) {
    const isNetwork =
      e instanceof TypeError ||
      (e instanceof Error &&
        (e.message.includes('Failed to fetch') ||
          e.message.includes('NetworkError') ||
          e.name === 'NetworkError'))
    const msg = isNetwork
      ? SGP_NETWORK_ERROR_API_DIAGNOSTIC_MESSAGE
      : 'Falha de ligação inesperada. Tente novamente ou recarregue a página.'
    throw new ApiError(msg, 503, { code: 'NETWORK_ERROR', cause: e })
  }

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    if (!res.ok) {
      throw new ApiError('Resposta inválida do servidor.', res.status)
    }
    throw new ApiError('Resposta inválida do servidor.', res.status)
  }

  if (!res.ok) {
    const { message, code, details } = parseErrorEnvelope(parsed, res.status)
    throw new ApiError(message, res.status, { code, details })
  }

  if (parsed && typeof parsed === 'object' && 'data' in parsed) {
    const p = parsed as { data: T; meta?: Record<string, unknown> }
    return { data: p.data, meta: p.meta ?? {} }
  }
  throw new ApiError('Resposta inválida do servidor.', res.status)
}

export type AdminUserListParams = {
  search?: string
  roleId?: string
  limit?: number
  offset?: number
}

export async function fetchCollaboratorLinkageSummary(): Promise<CollaboratorLinkageSummary> {
  return requestJson<CollaboratorLinkageSummary>(
    'GET',
    `${BASE}/admin/users/collaborator-linkage-summary`,
  )
}

export async function getAdminUser(id: string): Promise<AdminUserRow> {
  return requestJson<AdminUserRow>(
    'GET',
    `${BASE}/admin/users/${encodeURIComponent(id)}`,
  )
}

export async function listAdminUsers(params: AdminUserListParams): Promise<{
  items: AdminUserRow[]
  total: number
}> {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.roleId) qs.set('role_id', params.roleId)
  if (params.limit !== undefined) qs.set('limit', String(params.limit))
  if (params.offset !== undefined) qs.set('offset', String(params.offset))
  const q = qs.toString()
  const path = `${BASE}/admin/users${q ? `?${q}` : ''}`
  const { data, meta } = await fetchAdminEnvelope<AdminUserRow[]>('GET', path)
  const total = Number(meta.total ?? 0)
  return { items: Array.isArray(data) ? data : [], total }
}

export async function createAdminUser(
  input: AdminUserCreateInput,
): Promise<AdminUserRow> {
  return requestJson<AdminUserRow>('POST', `${BASE}/admin/users`, {
    body: {
      email: input.email,
      password: input.password,
      roleId: input.roleId,
      collaboratorId: input.collaboratorId ?? null,
      avatarUrl: input.avatarUrl ?? null,
      mustChangePassword: input.mustChangePassword ?? true,
      isActive: input.isActive ?? true,
    },
  })
}

export async function patchAdminUser(
  id: string,
  patch: AdminUserUpdateInput,
): Promise<AdminUserRow> {
  return requestJson<AdminUserRow>('PATCH', `${BASE}/admin/users/${encodeURIComponent(id)}`, {
    body: patch,
  })
}

export async function postActivateUser(id: string): Promise<AdminUserRow> {
  return requestJson<AdminUserRow>(
    'POST',
    `${BASE}/admin/users/${encodeURIComponent(id)}/activate`,
    {},
  )
}

export async function postInactivateUser(id: string): Promise<AdminUserRow> {
  return requestJson<AdminUserRow>(
    'POST',
    `${BASE}/admin/users/${encodeURIComponent(id)}/inactivate`,
    {},
  )
}

export async function postSoftDeleteUser(id: string): Promise<AdminUserRow> {
  return requestJson<AdminUserRow>(
    'POST',
    `${BASE}/admin/users/${encodeURIComponent(id)}/soft-delete`,
    {},
  )
}

export async function postRestoreUser(id: string): Promise<AdminUserRow> {
  return requestJson<AdminUserRow>(
    'POST',
    `${BASE}/admin/users/${encodeURIComponent(id)}/restore`,
    {},
  )
}

export async function postForcePasswordChange(id: string): Promise<AdminUserRow> {
  return requestJson<AdminUserRow>(
    'POST',
    `${BASE}/admin/users/${encodeURIComponent(id)}/force-password-change`,
    {},
  )
}

export async function postResetAdminPassword(
  id: string,
): Promise<AdminResetPasswordResponse> {
  const { data } = await fetchAdminEnvelope<AdminResetPasswordResponse>(
    'POST',
    `${BASE}/admin/users/${encodeURIComponent(id)}/reset-password`,
  )
  return data
}

export async function listAppRoles(): Promise<AppRoleOption[]> {
  const raw = await requestJson<unknown>('GET', `${BASE}/roles`)
  if (!Array.isArray(raw)) return []
  return raw.map((r) => {
    const x = r as Record<string, unknown>
    return {
      id: String(x.id),
      code: String(x.code ?? ''),
      name: String(x.name ?? ''),
    }
  })
}

export async function listEligibleCollaborators(
  excludeUserId?: string | null,
): Promise<EligibleCollaboratorOption[]> {
  const qs = new URLSearchParams()
  if (excludeUserId) qs.set('excludeUserId', excludeUserId)
  const q = qs.toString()
  const path = `${BASE}/admin/collaborators/eligible-for-link${q ? `?${q}` : ''}`
  const raw = await requestJson<unknown>('GET', path)
  if (!Array.isArray(raw)) return []
  return raw.map((r) => {
    const x = r as Record<string, unknown>
    return {
      id: String(x.id),
      fullName: String(x.fullName ?? ''),
      email: x.email === null || x.email === undefined ? null : String(x.email),
      code: x.code === null || x.code === undefined ? null : String(x.code),
    }
  })
}
