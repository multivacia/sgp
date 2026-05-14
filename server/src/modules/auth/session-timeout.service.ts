import type { Env } from '../../config/env.js'

export type SessionActivityTimestamps = {
  authenticatedAtMs: number
  lastActivityAtMs: number
}

export function getSessionAbsoluteTimeoutHours(env: Env): number {
  return env.sessionAbsoluteTimeoutHours
}

export function isSessionExpiredByIdle(
  lastActivityAtMs: number,
  idleTimeoutMinutes: number,
  nowMs: number = Date.now(),
): boolean {
  return nowMs - lastActivityAtMs > idleTimeoutMinutes * 60_000
}

export function isSessionExpiredByAbsoluteLimit(
  authenticatedAtMs: number,
  absoluteTimeoutHours: number,
  nowMs: number = Date.now(),
): boolean {
  return nowMs - authenticatedAtMs > absoluteTimeoutHours * 3_600_000
}

export function resolveSessionActivityFromPayload(
  payload: {
    iat: number
    authAtMs?: number
    lastActMs?: number
  },
  nowMs: number = Date.now(),
): SessionActivityTimestamps {
  const fallbackMs = payload.iat * 1000
  const authenticatedAtMs =
    typeof payload.authAtMs === 'number' && Number.isFinite(payload.authAtMs)
      ? payload.authAtMs
      : fallbackMs
  const lastActivityAtMs =
    typeof payload.lastActMs === 'number' && Number.isFinite(payload.lastActMs)
      ? payload.lastActMs
      : fallbackMs
  return {
    authenticatedAtMs,
    lastActivityAtMs: Math.min(lastActivityAtMs, nowMs),
  }
}

export function defaultSessionActivityAtLogin(nowMs: number = Date.now()): SessionActivityTimestamps {
  return {
    authenticatedAtMs: nowMs,
    lastActivityAtMs: nowMs,
  }
}
