import type { AuthUser } from '../../lib/auth-store'
import type { SessionIdlePolicy } from '../../domain/auth/sessionIdle.types'
import { ApiError } from '../../lib/api/apiErrors'
import { requestJson } from '../../lib/api/client'

const BASE = '/api/v1'

function assertAuthUserPayload(user: unknown, label: string): AuthUser {
  if (
    !user ||
    typeof user !== 'object' ||
    typeof (user as AuthUser).userId !== 'string' ||
    typeof (user as AuthUser).email !== 'string' ||
    typeof (user as AuthUser).isActive !== 'boolean' ||
    typeof (user as AuthUser).mustChangePassword !== 'boolean'
  ) {
    throw new ApiError(
      `Não foi possível validar a sessão (${label}).`,
      500,
    )
  }
  const avatarUrl = (user as AuthUser).avatarUrl
  const passwordChangedAt = (user as AuthUser).passwordChangedAt
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
  const perms = (user as AuthUser).permissions
  if (!Array.isArray(perms) || !perms.every((p) => typeof p === 'string')) {
    throw new ApiError(
      `Não foi possível validar a sessão (${label}: permissions).`,
      500,
    )
  }
  return user as AuthUser
}

function assertSessionIdlePolicy(
  sessionIdle: unknown,
  label: string,
): SessionIdlePolicy {
  if (
    !sessionIdle ||
    typeof sessionIdle !== 'object' ||
    typeof (sessionIdle as SessionIdlePolicy).idleTimeoutMinutes !== 'number' ||
    typeof (sessionIdle as SessionIdlePolicy).idleWarningMinutes !== 'number' ||
    typeof (sessionIdle as SessionIdlePolicy).lastActivityAt !== 'string' ||
    typeof (sessionIdle as SessionIdlePolicy).idleExpiresAt !== 'string'
  ) {
    throw new ApiError(
      `Não foi possível validar a política de sessão (${label}).`,
      500,
    )
  }
  return sessionIdle as SessionIdlePolicy
}

function assertAuthEnvelope(
  data: unknown,
  label: string,
): { user: AuthUser; sessionIdle: SessionIdlePolicy } {
  if (!data || typeof data !== 'object' || !('user' in data)) {
    throw new ApiError(
      `Resposta inválida do servidor (${label}: envelope).`,
      500,
    )
  }
  const user = assertAuthUserPayload((data as { user: unknown }).user, label)
  const sessionIdle = assertSessionIdlePolicy(
    (data as { sessionIdle?: unknown }).sessionIdle,
    label,
  )
  return { user, sessionIdle }
}

export async function postLogin(
  email: string,
  password: string,
): Promise<{ user: AuthUser; sessionIdle: SessionIdlePolicy }> {
  const data = await requestJson<{ user: AuthUser; sessionIdle: SessionIdlePolicy }>(
    'POST',
    `${BASE}/auth/login`,
    { body: { email, password } },
  )
  return assertAuthEnvelope(data, 'login')
}

export async function postLogout(): Promise<void> {
  await requestJson<void>('POST', `${BASE}/auth/logout`, {})
}

export async function getMe(): Promise<{
  user: AuthUser
  sessionIdle: SessionIdlePolicy
}> {
  const data = await requestJson<{ user: AuthUser; sessionIdle: SessionIdlePolicy }>(
    'GET',
    `${BASE}/auth/me`,
  )
  return assertAuthEnvelope(data, 'auth/me')
}

export async function postChangePassword(input: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<{ user: AuthUser; sessionIdle: SessionIdlePolicy }> {
  const data = await requestJson<{ user: AuthUser; sessionIdle: SessionIdlePolicy }>(
    'POST',
    `${BASE}/auth/change-password`,
    { body: input },
  )
  return assertAuthEnvelope(data, 'change-password')
}
