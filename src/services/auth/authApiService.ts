import type { AuthUser } from '../../lib/auth-store'
import { ApiError } from '../../lib/api/apiErrors'
import { requestJson } from '../../lib/api/client'

const BASE = '/api/v1'

function assertAuthUserPayload(data: unknown, label: string): AuthUser {
  if (!data || typeof data !== 'object' || !('user' in data)) {
    throw new ApiError(
      `Resposta inválida do servidor (${label}: envelope).`,
      500,
    )
  }
  const u = (data as { user: unknown }).user
  if (
    !u ||
    typeof u !== 'object' ||
    typeof (u as AuthUser).userId !== 'string' ||
    typeof (u as AuthUser).email !== 'string' ||
    typeof (u as AuthUser).isActive !== 'boolean' ||
    typeof (u as AuthUser).mustChangePassword !== 'boolean'
  ) {
    throw new ApiError(
      `Não foi possível validar a sessão (${label}).`,
      500,
    )
  }
  const avatarUrl = (u as AuthUser).avatarUrl
  const passwordChangedAt = (u as AuthUser).passwordChangedAt
  if (avatarUrl !== null && typeof avatarUrl !== 'string') {
    throw new ApiError(
      `Não foi possível validar a sessão (${label}: avatar).`,
      500,
    )
  }
  if (passwordChangedAt !== null && typeof passwordChangedAt !== 'string') {
    throw new ApiError(
      `Não foi possível validar a sessão (${label}: passwordChangedAt).`,
      500,
    )
  }
  const perms = (u as AuthUser).permissions
  if (!Array.isArray(perms) || !perms.every((p) => typeof p === 'string')) {
    throw new ApiError(
      `Não foi possível validar a sessão (${label}: permissions).`,
      500,
    )
  }
  return u as AuthUser
}

export async function postLogin(
  email: string,
  password: string,
): Promise<AuthUser> {
  const data = await requestJson<{ user: AuthUser }>(
    'POST',
    `${BASE}/auth/login`,
    { body: { email, password } },
  )
  return assertAuthUserPayload(data, 'login')
}

export async function postLogout(): Promise<void> {
  await requestJson<void>('POST', `${BASE}/auth/logout`, {})
}

export async function getMe(): Promise<AuthUser> {
  const data = await requestJson<{ user: AuthUser }>('GET', `${BASE}/auth/me`)
  return assertAuthUserPayload(data, 'auth/me')
}

export async function postChangePassword(input: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<AuthUser> {
  const data = await requestJson<{ user: AuthUser }>(
    'POST',
    `${BASE}/auth/change-password`,
    { body: input },
  )
  return assertAuthUserPayload(data, 'change-password')
}
