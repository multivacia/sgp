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
}

export function signSessionToken(
  userId: string,
  email: string,
  passwordChangedAtMs: number,
  env: Env,
): string {
  return jwt.sign(
    { sub: userId, email, pwdStampMs: passwordChangedAtMs },
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
  return {
    sub: decoded.sub,
    email: decoded.email,
    iat: decoded.iat,
    pwdStampMs: decoded.pwdStampMs,
  }
}
