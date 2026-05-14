import type pg from 'pg'
import type { Logger } from 'pino'
import type { SessionActivityTimestamps } from '../auth/session-timeout.service.js'
import {
  getSessionIdleTimeoutMinutes,
  getSessionIdleWarningMinutes,
} from '../system-settings/system-settings.service.js'

export type SessionIdlePolicy = {
  idleTimeoutMinutes: number
  idleWarningMinutes: number
  lastActivityAt: string
  idleExpiresAt: string
}

export async function buildSessionIdlePolicy(
  pool: pg.Pool,
  activity: SessionActivityTimestamps,
  logger?: Logger,
): Promise<SessionIdlePolicy> {
  const idleTimeoutMinutes = await getSessionIdleTimeoutMinutes(pool, logger)
  const idleWarningMinutes = await getSessionIdleWarningMinutes(
    pool,
    logger,
    idleTimeoutMinutes,
  )
  const idleExpiresAtMs =
    activity.lastActivityAtMs + idleTimeoutMinutes * 60_000
  return {
    idleTimeoutMinutes,
    idleWarningMinutes,
    lastActivityAt: new Date(activity.lastActivityAtMs).toISOString(),
    idleExpiresAt: new Date(idleExpiresAtMs).toISOString(),
  }
}
