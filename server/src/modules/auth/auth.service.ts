import type pg from 'pg'
import type { Env } from '../../config/env.js'
import { hashPassword, verifyPassword } from '../../shared/password/password.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { signSessionToken } from './auth.jwt.js'
import {
  findAppUserForLoginByEmail,
  findAppUserForPasswordChange,
  findAppUserProfileById,
  incrementFailedLoginForUser,
  updateLoginSuccess,
  updatePasswordAfterChange,
} from './auth.repository.js'
import type { AuthMeUser } from './auth.types.js'
import { findPermissionCodesForAppUser } from '../permissions/permissions.repository.js'

function rowToAuthMeUser(row: {
  id: string
  email: string
  is_active: boolean
  collaborator_id: string | null
  role_id: string | null
  role_code: string | null
  avatar_url: string | null
  must_change_password: boolean
  password_changed_at: Date | null
}): AuthMeUser {
  return {
    userId: row.id,
    email: row.email,
    role: row.role_code,
    roleId: row.role_id,
    collaboratorId: row.collaborator_id,
    isActive: row.is_active,
    avatarUrl: row.avatar_url,
    mustChangePassword: row.must_change_password,
    passwordChangedAt: row.password_changed_at
      ? row.password_changed_at.toISOString()
      : null,
    permissions: [],
  }
}

async function withPermissions(
  pool: pg.Pool,
  user: AuthMeUser,
): Promise<AuthMeUser> {
  const permissions = await findPermissionCodesForAppUser(pool, user.userId)
  return { ...user, permissions }
}

const LOGIN_LOCKOUT_USER_MESSAGE =
  'Não foi possível entrar agora. Tente novamente mais tarde.'

export async function serviceLogin(
  pool: pg.Pool,
  env: Env,
  email: string,
  password: string,
): Promise<{ user: AuthMeUser; token: string }> {
  const trimmed = email.trim()
  if (!trimmed || !password) {
    throw new AppError(
      'E-mail ou senha inválidos.',
      401,
      ErrorCodes.UNAUTHORIZED,
    )
  }

  const row = await findAppUserForLoginByEmail(pool, trimmed)
  if (!row || !row.password_hash) {
    throw new AppError(
      'E-mail ou senha inválidos.',
      401,
      ErrorCodes.UNAUTHORIZED,
    )
  }

  if (row.locked_until && row.locked_until.getTime() > Date.now()) {
    throw new AppError(
      LOGIN_LOCKOUT_USER_MESSAGE,
      403,
      ErrorCodes.ACCOUNT_TEMPORARILY_LOCKED,
    )
  }

  if (!row.is_active) {
    throw new AppError(
      'Sua conta está inativa. Contacte o administrador.',
      403,
      ErrorCodes.ACCOUNT_INACTIVE,
    )
  }

  const { ok, needsRehash } = await verifyPassword(password, row.password_hash)
  if (!ok) {
    const afterFail = await incrementFailedLoginForUser(
      pool,
      row.id,
      env.loginMaxFailedAttempts,
      env.loginLockoutMinutes,
    )
    if (
      afterFail.lockedUntil &&
      afterFail.lockedUntil.getTime() > Date.now()
    ) {
      throw new AppError(
        LOGIN_LOCKOUT_USER_MESSAGE,
        403,
        ErrorCodes.ACCOUNT_TEMPORARILY_LOCKED,
      )
    }
    throw new AppError(
      'E-mail ou senha inválidos.',
      401,
      ErrorCodes.UNAUTHORIZED,
    )
  }

  let newHash: string | null = null
  if (needsRehash) {
    newHash = await hashPassword(password)
  }

  await updateLoginSuccess(pool, row.id, newHash)

  const base = rowToAuthMeUser({
    id: row.id,
    email: row.email,
    is_active: row.is_active,
    collaborator_id: row.collaborator_id,
    role_id: row.role_id,
    role_code: row.role_code,
    avatar_url: row.avatar_url,
    must_change_password: row.must_change_password,
    password_changed_at: row.password_changed_at,
  })
  const user = await withPermissions(pool, base)
  const pwdStampMs = row.password_changed_at
    ? row.password_changed_at.getTime()
    : 0
  const token = signSessionToken(user.userId, user.email, pwdStampMs, env)
  return { user, token }
}

export async function serviceGetMe(
  pool: pg.Pool,
  userId: string,
): Promise<AuthMeUser> {
  const profile = await findAppUserProfileById(pool, userId)
  if (!profile) {
    throw new AppError(
      'Não foi possível validar a sessão. Faça login novamente.',
      401,
      ErrorCodes.UNAUTHORIZED,
    )
  }
  if (!profile.isActive) {
    throw new AppError(
      'Sua conta está inativa. Contacte o administrador.',
      403,
      ErrorCodes.ACCOUNT_INACTIVE,
    )
  }
  return withPermissions(pool, profile)
}

export async function serviceChangePassword(
  pool: pg.Pool,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthMeUser> {
  const row = await findAppUserForPasswordChange(pool, userId)
  if (!row || !row.password_hash) {
    throw new AppError(
      'Não foi possível alterar a senha. Faça login novamente.',
      401,
      ErrorCodes.UNAUTHORIZED,
    )
  }
  if (!row.is_active) {
    throw new AppError(
      'Sua conta está inativa. Contacte o administrador.',
      403,
      ErrorCodes.ACCOUNT_INACTIVE,
    )
  }

  const { ok } = await verifyPassword(currentPassword, row.password_hash)
  if (!ok) {
    throw new AppError(
      'Senha atual incorreta.',
      401,
      ErrorCodes.UNAUTHORIZED,
    )
  }

  const sameAsNew = await verifyPassword(newPassword, row.password_hash)
  if (sameAsNew.ok) {
    throw new AppError(
      'A nova senha deve ser diferente da senha atual.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const newHash = await hashPassword(newPassword)
  await updatePasswordAfterChange(pool, userId, newHash)

  const profile = await findAppUserProfileById(pool, userId)
  if (!profile) {
    throw new AppError(
      'Não foi possível validar a sessão. Faça login novamente.',
      401,
      ErrorCodes.UNAUTHORIZED,
    )
  }
  return withPermissions(pool, profile)
}
