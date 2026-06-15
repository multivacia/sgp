import jwt from 'jsonwebtoken'
import type { Env } from '../../config/env.js'
import type { ProductionScope } from './production.types.js'

export const PRODUCTION_JWT_SCOPE: ProductionScope = 'PRODUCTION_MODE'

export type ProductionJwtPayload = {
  sub: string
  scope: ProductionScope
  iat: number
  authAtMs: number
  lastActMs: number
}

export type ProductionTokenActivity = {
  authenticatedAtMs: number
  lastActivityAtMs: number
}

export function signProductionSessionToken(
  collaboratorId: string,
  activity: ProductionTokenActivity,
  env: Env,
): string {
  return jwt.sign(
    {
      sub: collaboratorId,
      scope: PRODUCTION_JWT_SCOPE,
      authAtMs: activity.authenticatedAtMs,
      lastActMs: activity.lastActivityAtMs,
    },
    env.productionJwtSecret,
    {
      expiresIn: `${env.jwtExpiresDays}d`,
    },
  )
}

export function verifyProductionSessionToken(
  token: string,
  secret: string,
): ProductionJwtPayload {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & {
    scope?: string
    authAtMs?: number
    lastActMs?: number
  }
  if (typeof decoded.sub !== 'string') {
    throw new Error('invalid_production_token_payload')
  }
  if (decoded.scope !== PRODUCTION_JWT_SCOPE) {
    throw new Error('invalid_production_token_scope')
  }
  if (typeof decoded.iat !== 'number') {
    throw new Error('invalid_production_token_payload')
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
    scope: PRODUCTION_JWT_SCOPE,
    iat: decoded.iat,
    authAtMs,
    lastActMs,
  }
}
