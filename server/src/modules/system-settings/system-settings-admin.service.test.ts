import type pg from 'pg'
import { describe, expect, it, vi } from 'vitest'
import { servicePatchAllowlistedSystemSetting } from './system-settings-admin.service.js'
import { SESSION_IDLE_TIMEOUT_SETTING_KEY } from './session-timeout.config.js'
import {
  getSessionIdleTimeoutMinutes,
  primeSessionIdleTimeoutCache,
  resetSystemSettingsCacheForTests,
} from './system-settings.service.js'

describe('servicePatchAllowlistedSystemSetting', () => {
  it('rejeita chave fora da allowlist', async () => {
    const pool = { query: vi.fn() } as unknown as pg.Pool
    await expect(
      servicePatchAllowlistedSystemSetting(pool, 'UNKNOWN_KEY', 30, 'actor'),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('getSessionIdleTimeoutMinutes após atualização administrativa', () => {
  it('usa valor atualizado imediatamente após primeSessionIdleTimeoutCache', async () => {
    resetSystemSettingsCacheForTests()
    primeSessionIdleTimeoutCache(45)
    const pool = { query: vi.fn() } as unknown as pg.Pool
    await expect(getSessionIdleTimeoutMinutes(pool)).resolves.toBe(45)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('continua aplicando fallback para valor inválido lido do banco', async () => {
    resetSystemSettingsCacheForTests()
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ setting_value: '2' }],
      }),
    } as unknown as pg.Pool
    await expect(getSessionIdleTimeoutMinutes(pool)).resolves.toBe(30)
    expect(pool.query).toHaveBeenCalledWith(
      expect.any(String),
      [SESSION_IDLE_TIMEOUT_SETTING_KEY],
    )
  })
})
