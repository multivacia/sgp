import type { Env } from '../../config/env.js'
import {
  isSessionExpiredByAbsoluteLimit,
  isSessionExpiredByIdle,
  resolveSessionActivityFromPayload,
} from '../auth/session-timeout.service.js'
import type { ProductionJwtPayload } from './production-auth.jwt.js'

export function getProductionSessionIdleTimeoutMinutes(env: Env): number {
  return env.productionSessionIdleTimeoutMinutes
}

export function getProductionSessionAbsoluteTimeoutHours(env: Env): number {
  return env.productionSessionAbsoluteTimeoutHours
}

export function isProductionSessionExpired(
  payload: ProductionJwtPayload,
  env: Env,
  nowMs: number = Date.now(),
): boolean {
  const activity = resolveSessionActivityFromPayload(payload, nowMs)
  const idleMinutes = getProductionSessionIdleTimeoutMinutes(env)
  const absoluteHours = getProductionSessionAbsoluteTimeoutHours(env)
  return (
    isSessionExpiredByIdle(activity.lastActivityAtMs, idleMinutes, nowMs) ||
    isSessionExpiredByAbsoluteLimit(
      activity.authenticatedAtMs,
      absoluteHours,
      nowMs,
    )
  )
}
