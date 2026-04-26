import type pg from 'pg'
import type { AuthMeUser } from './auth.types.js'

export type AppUserAuthRow = {
  id: string
  email: string
  password_hash: string | null
  is_active: boolean
  collaborator_id: string | null
  role_id: string | null
  role_code: string | null
  avatar_url: string | null
  must_change_password: boolean
  password_changed_at: Date | null
  deleted_at: Date | null
  locked_until: Date | null
  failed_login_count: number
}

const meSelect = `
  u.id::text,
  u.email,
  u.is_active,
  u.collaborator_id::text,
  u.role_id::text,
  r.code AS role_code,
  u.avatar_url,
  u.must_change_password,
  u.password_changed_at
`

function rowToMe(
  row: Omit<
    AppUserAuthRow,
    'password_hash' | 'deleted_at' | 'locked_until'
  >,
): AuthMeUser {
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

export async function findAppUserForLoginByEmail(
  pool: pg.Pool,
  email: string,
): Promise<AppUserAuthRow | null> {
  const r = await pool.query<AppUserAuthRow>(
    `
    SELECT
      u.id::text,
      u.email,
      u.password_hash,
      u.is_active,
      u.collaborator_id::text,
      u.role_id::text,
      r.code AS role_code,
      u.avatar_url,
      u.must_change_password,
      u.password_changed_at,
      u.deleted_at,
      u.locked_until,
      u.failed_login_count
    FROM app_users u
    LEFT JOIN app_roles r ON r.id = u.role_id
    WHERE lower(btrim(u.email::text)) = lower(btrim($1::text))
      AND u.deleted_at IS NULL
    `,
    [email],
  )
  return r.rows[0] ?? null
}

export async function findAppUserProfileById(
  pool: pg.Pool,
  userId: string,
): Promise<AuthMeUser | null> {
  const r = await pool.query<
    Omit<AppUserAuthRow, 'password_hash' | 'deleted_at' | 'locked_until'>
  >(
    `
    SELECT ${meSelect}
    FROM app_users u
    LEFT JOIN app_roles r ON r.id = u.role_id
    WHERE u.id = $1::uuid
      AND u.deleted_at IS NULL
    `,
    [userId],
  )
  const row = r.rows[0]
  return row ? rowToMe(row) : null
}

export async function findAppUserForPasswordChange(
  pool: pg.Pool,
  userId: string,
): Promise<AppUserAuthRow | null> {
  const r = await pool.query<AppUserAuthRow>(
    `
    SELECT
      u.id::text,
      u.email,
      u.password_hash,
      u.is_active,
      u.collaborator_id::text,
      u.role_id::text,
      r.code AS role_code,
      u.avatar_url,
      u.must_change_password,
      u.password_changed_at,
      u.deleted_at,
      u.locked_until,
      u.failed_login_count
    FROM app_users u
    LEFT JOIN app_roles r ON r.id = u.role_id
    WHERE u.id = $1::uuid
      AND u.deleted_at IS NULL
    `,
    [userId],
  )
  return r.rows[0] ?? null
}

/**
 * Incrementa falhas consecutivas e aplica bloqueio quando atinge o limiar.
 * A linha deve existir e estar elegível (chamado só após senha inválida).
 */
export async function incrementFailedLoginForUser(
  pool: pg.Pool,
  userId: string,
  maxAttempts: number,
  lockoutMinutes: number,
): Promise<{ failedLoginCount: number; lockedUntil: Date | null }> {
  const r = await pool.query<{
    failed_login_count: string
    locked_until: Date | null
  }>(
    `
    UPDATE app_users
    SET
      failed_login_count = app_users.failed_login_count + 1,
      locked_until = CASE
        WHEN app_users.failed_login_count + 1 >= $2::int
        THEN now() + ($3::int * interval '1 minute')
        ELSE app_users.locked_until
      END,
      updated_at = now()
    WHERE id = $1::uuid AND deleted_at IS NULL
    RETURNING failed_login_count, locked_until
    `,
    [userId, maxAttempts, lockoutMinutes],
  )
  const row = r.rows[0]
  if (!row) {
    throw new Error('incrementFailedLoginForUser: utilizador não encontrado')
  }
  return {
    failedLoginCount: Number(row.failed_login_count),
    lockedUntil: row.locked_until,
  }
}

/** Colaborador operacional ligado ao utilizador (se existir). */
/** Para validação de sessão após JWT: marca de senha ou conta inexistente/apagada. */
export async function findPasswordStampForSessionAuth(
  pool: pg.Pool,
  userId: string,
): Promise<
  { found: false } | { found: true; passwordChangedAt: Date | null }
> {
  const r = await pool.query<{ password_changed_at: Date | null }>(
    `
    SELECT u.password_changed_at
    FROM app_users u
    WHERE u.id = $1::uuid
      AND u.deleted_at IS NULL
    `,
    [userId],
  )
  const row = r.rows[0]
  if (!row) {
    return { found: false }
  }
  return { found: true, passwordChangedAt: row.password_changed_at }
}

export async function findCollaboratorIdByAppUserId(
  pool: pg.Pool,
  userId: string,
): Promise<string | null> {
  const r = await pool.query<{ c: string | null }>(
    `
    SELECT collaborator_id::text AS c
    FROM app_users
    WHERE id = $1::uuid AND deleted_at IS NULL
    `,
    [userId],
  )
  return r.rows[0]?.c ?? null
}

export async function findAppUserEmailById(
  pool: pg.Pool,
  userId: string,
): Promise<string | null> {
  const r = await pool.query<{ email: string }>(
    `
    SELECT email
    FROM app_users
    WHERE id = $1::uuid AND deleted_at IS NULL
    LIMIT 1
    `,
    [userId],
  )
  return r.rows[0]?.email ?? null
}

export async function updateLoginSuccess(
  pool: pg.Pool,
  userId: string,
  newPasswordHash: string | null,
): Promise<void> {
  if (newPasswordHash) {
    await pool.query(
      `
      UPDATE app_users
      SET
        last_login_at = now(),
        updated_at = now(),
        password_hash = $2,
        failed_login_count = 0,
        locked_until = NULL
      WHERE id = $1::uuid AND deleted_at IS NULL
      `,
      [userId, newPasswordHash],
    )
    return
  }
  await pool.query(
    `
    UPDATE app_users
    SET
      last_login_at = now(),
      updated_at = now(),
      failed_login_count = 0,
      locked_until = NULL
    WHERE id = $1::uuid AND deleted_at IS NULL
    `,
    [userId],
  )
}

export async function updatePasswordAfterChange(
  pool: pg.Pool,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await pool.query(
    `
    UPDATE app_users
    SET
      password_hash = $2,
      password_changed_at = now(),
      must_change_password = false,
      updated_at = now()
    WHERE id = $1::uuid AND deleted_at IS NULL
    `,
    [userId, passwordHash],
  )
}

