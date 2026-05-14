import { describe, expect, it } from 'vitest'
import {
  isSessionExpiredByAbsoluteLimit,
  isSessionExpiredByIdle,
  resolveSessionActivityFromPayload,
} from './session-timeout.service.js'

describe('session-timeout.service', () => {
  it('não expira sessão ativa dentro dos limites', () => {
    const now = 1_700_000_000_000
    const activity = {
      authenticatedAtMs: now - 30 * 60_000,
      lastActivityAtMs: now - 5 * 60_000,
    }
    expect(isSessionExpiredByIdle(activity.lastActivityAtMs, 30, now)).toBe(false)
    expect(
      isSessionExpiredByAbsoluteLimit(activity.authenticatedAtMs, 8, now),
    ).toBe(false)
  })

  it('expira por inatividade além do limite configurado', () => {
    const now = 1_700_000_000_000
    const lastActivityAtMs = now - 31 * 60_000
    expect(isSessionExpiredByIdle(lastActivityAtMs, 30, now)).toBe(true)
  })

  it('expira por limite absoluto', () => {
    const now = 1_700_000_000_000
    const authenticatedAtMs = now - 9 * 3_600_000
    expect(isSessionExpiredByAbsoluteLimit(authenticatedAtMs, 8, now)).toBe(true)
  })

  it('resolve timestamps legados a partir do iat', () => {
    const iat = 1_700_000_000
    const resolved = resolveSessionActivityFromPayload({ iat })
    expect(resolved.authenticatedAtMs).toBe(iat * 1000)
    expect(resolved.lastActivityAtMs).toBe(iat * 1000)
  })
})
