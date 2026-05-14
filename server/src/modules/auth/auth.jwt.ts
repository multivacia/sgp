import jwt from 'jsonwebtoken'
import type { Env } from '../../config/env.js'

export type SessionJwtPayload = {
  sub: string
  email: string
  /** Unix timestamp (seconds), emitido pelo jsonwebtoken. */
  iat: number
  /**
   * `password_changed_at` da conta no instante da emissão (ms desde epoch).
   * Comparação com a BD detecta alteração de senha sem ambiguidade de segundos do `iat`.
   */
  pwdStampMs: number
  /** Início da sessão autenticada (ms desde epoch). */
  authAtMs: number
  /** Última atividade autenticada válida (ms desde epoch). */
  lastActMs: number
}

export type SessionTokenActivity = {
  authenticatedAtMs: number
  lastActivityAtMs: number
}

export function signSessionToken(
  userId: string,
  email: string,
  passwordChangedAtMs: number,
  activity: SessionTokenActivity,
  env: Env,
): string {
  return jwt.sign(
    {
      sub: userId,
      email,
      pwdStampMs: passwordChangedAtMs,
      authAtMs: activity.authenticatedAtMs,
      lastActMs: activity.lastActivityAtMs,
    },
    env.jwtSecret,
    {
      expiresIn: `${env.jwtExpiresDays}d`,
    },
  )
}

export function verifySessionToken(
  token: string,
  secret: string,
): SessionJwtPayload {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & {
    email?: string
    pwdStampMs?: number
    authAtMs?: number
    lastActMs?: number
  }
  if (typeof decoded.sub !== 'string' || typeof decoded.email !== 'string') {
    throw new Error('invalid_token_payload')
  }
  if (typeof decoded.iat !== 'number') {
    throw new Error('invalid_token_payload')
  }
  if (
    typeof decoded.pwdStampMs !== 'number' ||
    !Number.isFinite(decoded.pwdStampMs)
  ) {
    throw new Error('invalid_token_payload')
  }
  const authAtMs =
    typeof decoded.authAtMs === 'number' && Number.isFinite(decoded.authAtMs)
      ? decoded.authAtMs
      : decoded.iat * 1000
  const lastActMs =
    typeof decoded.lastActMs === 'number' && Number.isFinite(decoded.lastActMs)
      ? decoded.lastActMs
      : decoded.iat * 1000
  return {
    sub: decoded.sub,
    email: decoded.email,
    iat: decoded.iat,
    pwdStampMs: decoded.pwdStampMs,
    authAtMs,
    lastActMs,
  }
}
