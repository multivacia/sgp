import type pg from 'pg'
import { loadEnv } from '../config/env.js'
import { signSessionToken } from '../modules/auth/auth.jwt.js'
import { defaultSessionActivityAtLogin } from '../modules/auth/session-timeout.service.js'

/**
 * Cookie de sessão alinhado a `password_changed_at` na BD (claim `pwdStampMs` no JWT).
 */
export async function sessionCookieForUser(
  pool: pg.Pool,
  userId: string,
  email: string,
  activity = defaultSessionActivityAtLogin(),
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
  const token = signSessionToken(userId, email, ms, activity, env)
  return `${env.authCookieName}=${token}`
}

/** Converte `Set-Cookie` do supertest em header `Cookie` para requests subsequentes. */
export function cookieHeaderFromSetCookie(
  setCookie: string[] | string | undefined,
): string {
  if (!setCookie) return ''
  const rows = Array.isArray(setCookie) ? setCookie : [setCookie]
  const byName = new Map<string, string>()
  for (const row of rows) {
    const part = row.split(';')[0]?.trim()
    if (!part) continue
    const eq = part.indexOf('=')
    if (eq <= 0) continue
    byName.set(part.slice(0, eq), part)
  }
  return [...byName.values()].join('; ')
}
