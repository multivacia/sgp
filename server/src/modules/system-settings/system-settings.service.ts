import type pg from 'pg'
import type { Logger } from 'pino'
import {
  SESSION_IDLE_TIMEOUT_CACHE_TTL_MS,
  SESSION_IDLE_TIMEOUT_FALLBACK_MINUTES,
  SESSION_IDLE_TIMEOUT_MAX_MINUTES,
  SESSION_IDLE_TIMEOUT_MIN_MINUTES,
  SESSION_IDLE_TIMEOUT_SETTING_KEY,
  SESSION_IDLE_WARNING_FALLBACK_MINUTES,
  SESSION_IDLE_WARNING_MAX_MINUTES,
  SESSION_IDLE_WARNING_MIN_MINUTES,
  SESSION_IDLE_WARNING_SETTING_KEY,
} from './session-timeout.config.js'
import { findActiveSystemSettingValue } from './system-settings.repository.js'

type IdleSettingCache = {
  value: number
  expiresAtMs: number
}

let idleTimeoutCache: IdleSettingCache | undefined
let idleWarningCache: IdleSettingCache | undefined
let lastValidIdleTimeoutMinutes: number | undefined
let lastValidIdleWarningMinutes: number | undefined

export function resetSystemSettingsCacheForTests(): void {
  idleTimeoutCache = undefined
  idleWarningCache = undefined
  lastValidIdleTimeoutMinutes = undefined
  lastValidIdleWarningMinutes = undefined
}

export function primeSessionIdleTimeoutCache(minutes: number): void {
  const now = Date.now()
  lastValidIdleTimeoutMinutes = minutes
  idleTimeoutCache = {
    value: minutes,
    expiresAtMs: now + SESSION_IDLE_TIMEOUT_CACHE_TTL_MS,
  }
}

export function primeSessionIdleWarningCache(minutes: number): void {
  const now = Date.now()
  lastValidIdleWarningMinutes = minutes
  idleWarningCache = {
    value: minutes,
    expiresAtMs: now + SESSION_IDLE_TIMEOUT_CACHE_TTL_MS,
  }
}

export function invalidateSessionIdleTimeoutCache(): void {
  idleTimeoutCache = undefined
}

export function invalidateSessionIdleWarningCache(): void {
  idleWarningCache = undefined
}

function parseIdleTimeoutMinutes(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null
  const n = Number.parseInt(raw.trim(), 10)
  if (!Number.isFinite(n) || String(n) !== raw.trim()) return null
  if (n < SESSION_IDLE_TIMEOUT_MIN_MINUTES || n > SESSION_IDLE_TIMEOUT_MAX_MINUTES) {
    return null
  }
  return n
}

function parseIdleWarningMinutes(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null
  const n = Number.parseInt(raw.trim(), 10)
  if (!Number.isFinite(n) || String(n) !== raw.trim()) return null
  if (n < SESSION_IDLE_WARNING_MIN_MINUTES || n > SESSION_IDLE_WARNING_MAX_MINUTES) {
    return null
  }
  return n
}

function resolveIdleTimeoutFallback(logger?: Logger, reason?: string): number {
  if (lastValidIdleTimeoutMinutes != null) {
    return lastValidIdleTimeoutMinutes
  }
  if (reason) {
    logger?.warn(
      { settingKey: SESSION_IDLE_TIMEOUT_SETTING_KEY, reason },
      'session_idle_timeout_using_fallback',
    )
  }
  return SESSION_IDLE_TIMEOUT_FALLBACK_MINUTES
}

function resolveIdleWarningFallback(
  timeoutMinutes: number,
  logger?: Logger,
  reason?: string,
): number {
  if (lastValidIdleWarningMinutes != null) {
    return clampWarningToTimeout(lastValidIdleWarningMinutes, timeoutMinutes)
  }
  if (reason) {
    logger?.warn(
      { settingKey: SESSION_IDLE_WARNING_SETTING_KEY, reason },
      'session_idle_warning_using_fallback',
    )
  }
  const base =
    timeoutMinutes <= SESSION_IDLE_WARNING_FALLBACK_MINUTES
      ? Math.max(SESSION_IDLE_WARNING_MIN_MINUTES, timeoutMinutes - 1)
      : SESSION_IDLE_WARNING_FALLBACK_MINUTES
  return clampWarningToTimeout(base, timeoutMinutes)
}

export function clampWarningToTimeout(
  warningMinutes: number,
  timeoutMinutes: number,
): number {
  if (warningMinutes >= timeoutMinutes) {
    return Math.max(SESSION_IDLE_WARNING_MIN_MINUTES, timeoutMinutes - 1)
  }
  return warningMinutes
}

export async function getSessionIdleTimeoutMinutes(
  pool: pg.Pool,
  logger?: Logger,
): Promise<number> {
  const now = Date.now()
  if (idleTimeoutCache && idleTimeoutCache.expiresAtMs > now) {
    return idleTimeoutCache.value
  }

  try {
    const raw = await findActiveSystemSettingValue(
      pool,
      SESSION_IDLE_TIMEOUT_SETTING_KEY,
    )
    const parsed = parseIdleTimeoutMinutes(raw)
    if (parsed == null) {
      const reason =
        raw == null
          ? 'setting_missing_or_inactive'
          : 'setting_invalid_or_out_of_range'
      const fallback = resolveIdleTimeoutFallback(logger, reason)
      idleTimeoutCache = {
        value: fallback,
        expiresAtMs: now + SESSION_IDLE_TIMEOUT_CACHE_TTL_MS,
      }
      return fallback
    }

    lastValidIdleTimeoutMinutes = parsed
    idleTimeoutCache = {
      value: parsed,
      expiresAtMs: now + SESSION_IDLE_TIMEOUT_CACHE_TTL_MS,
    }
    return parsed
  } catch (e) {
    logger?.warn(
      { err: e, settingKey: SESSION_IDLE_TIMEOUT_SETTING_KEY },
      'session_idle_timeout_read_failed',
    )
    const fallback = resolveIdleTimeoutFallback(logger)
    idleTimeoutCache = {
      value: fallback,
      expiresAtMs: now + SESSION_IDLE_TIMEOUT_CACHE_TTL_MS,
    }
    return fallback
  }
}

export async function getSessionIdleWarningMinutes(
  pool: pg.Pool,
  logger?: Logger,
  timeoutMinutes?: number,
): Promise<number> {
  const timeout =
    timeoutMinutes ?? (await getSessionIdleTimeoutMinutes(pool, logger))
  const now = Date.now()
  if (idleWarningCache && idleWarningCache.expiresAtMs > now) {
    return clampWarningToTimeout(idleWarningCache.value, timeout)
  }

  try {
    const raw = await findActiveSystemSettingValue(
      pool,
      SESSION_IDLE_WARNING_SETTING_KEY,
    )
    const parsed = parseIdleWarningMinutes(raw)
    if (parsed == null) {
      const reason =
        raw == null
          ? 'setting_missing_or_inactive'
          : 'setting_invalid_or_out_of_range'
      const fallback = resolveIdleWarningFallback(timeout, logger, reason)
      idleWarningCache = {
        value: fallback,
        expiresAtMs: now + SESSION_IDLE_TIMEOUT_CACHE_TTL_MS,
      }
      return fallback
    }

    const effective = clampWarningToTimeout(parsed, timeout)
    lastValidIdleWarningMinutes = effective
    idleWarningCache = {
      value: effective,
      expiresAtMs: now + SESSION_IDLE_TIMEOUT_CACHE_TTL_MS,
    }
    return effective
  } catch (e) {
    logger?.warn(
      { err: e, settingKey: SESSION_IDLE_WARNING_SETTING_KEY },
      'session_idle_warning_read_failed',
    )
    const fallback = resolveIdleWarningFallback(timeout, logger)
    idleWarningCache = {
      value: fallback,
      expiresAtMs: now + SESSION_IDLE_TIMEOUT_CACHE_TTL_MS,
    }
    return fallback
  }
}
