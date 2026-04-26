import type pg from 'pg'
import { loadEnv } from '../config/env.js'
import { signSessionToken } from '../modules/auth/auth.jwt.js'

/**
 * Cookie de sessão alinhado a `password_changed_at` na BD (claim `pwdStampMs` no JWT).
 */
export async function sessionCookieForUser(
  pool: pg.Pool,
  userId: string,
  email: string,
): Promise<string> {
  const env = loadEnv()
  const r = await pool.query<{ t: Date | null }>(
    `
    SELECT password_changed_at AS t
    FROM app_users
    WHERE id = $1::uuid AND deleted_at IS NULL
    `,
    [userId],
  )
  const ms = r.rows[0]?.t != null ? r.rows[0].t.getTime() : 0
  const token = signSessionToken(userId, email, ms, env)
  return `${env.authCookieName}=${token}`
}
