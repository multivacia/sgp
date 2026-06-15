import type { Env } from '../../config/env.js'

export function productionAuthCookieOptions(env: Env) {
  const maxAgeMs = env.jwtExpiresDays * 24 * 60 * 60 * 1000
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: maxAgeMs,
  }
}

export function clearProductionAuthCookieOptions(env: Env) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.nodeEnv === 'production',
    path: '/',
  }
}
