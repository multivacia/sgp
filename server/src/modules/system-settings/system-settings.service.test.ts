import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SESSION_IDLE_TIMEOUT_FALLBACK_MINUTES,
  SESSION_IDLE_TIMEOUT_SETTING_KEY,
} from './session-timeout.config.js'
import {
  getSessionIdleTimeoutMinutes,
  resetSystemSettingsCacheForTests,
} from './system-settings.service.js'

function mockPoolWithValue(value: string | null) {
  return {
    query: vi.fn().mockResolvedValue({
      rows: value == null ? [] : [{ setting_value: value }],
    }),
  }
}

describe('getSessionIdleTimeoutMinutes', () => {
  beforeEach(() => {
    resetSystemSettingsCacheForTests()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    resetSystemSettingsCacheForTests()
  })

  it('lê valor válido da configuração', async () => {
    const pool = mockPoolWithValue('45')
    await expect(getSessionIdleTimeoutMinutes(pool as never)).resolves.toBe(45)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('system_settings'),
      [SESSION_IDLE_TIMEOUT_SETTING_KEY],
    )
  })

  it('usa fallback 30 quando configuração não existe', async () => {
    const pool = mockPoolWithValue(null)
    await expect(getSessionIdleTimeoutMinutes(pool as never)).resolves.toBe(
      SESSION_IDLE_TIMEOUT_FALLBACK_MINUTES,
    )
  })

  it('usa fallback 30 quando configuração é inválida', async () => {
    const pool = mockPoolWithValue('abc')
    await expect(getSessionIdleTimeoutMinutes(pool as never)).resolves.toBe(
      SESSION_IDLE_TIMEOUT_FALLBACK_MINUTES,
    )
  })

  it('usa fallback 30 quando valor está abaixo do mínimo', async () => {
    const pool = mockPoolWithValue('4')
    await expect(getSessionIdleTimeoutMinutes(pool as never)).resolves.toBe(
      SESSION_IDLE_TIMEOUT_FALLBACK_MINUTES,
    )
  })

  it('usa fallback 30 quando valor está acima do máximo', async () => {
    const pool = mockPoolWithValue('481')
    await expect(getSessionIdleTimeoutMinutes(pool as never)).resolves.toBe(
      SESSION_IDLE_TIMEOUT_FALLBACK_MINUTES,
    )
  })

  it('reutiliza cache até expirar o TTL', async () => {
    const pool = mockPoolWithValue('40')
    await expect(getSessionIdleTimeoutMinutes(pool as never)).resolves.toBe(40)
    await expect(getSessionIdleTimeoutMinutes(pool as never)).resolves.toBe(40)
    expect(pool.query).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(61_000)
    ;(pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [{ setting_value: '50' }],
    })
    await expect(getSessionIdleTimeoutMinutes(pool as never)).resolves.toBe(50)
    expect(pool.query).toHaveBeenCalledTimes(2)
  })

  it('mantém último valor válido quando leitura falha', async () => {
    const pool = mockPoolWithValue('35')
    await expect(getSessionIdleTimeoutMinutes(pool as never)).resolves.toBe(35)

    vi.advanceTimersByTime(61_000)
    ;(pool.query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('db down'),
    )
    await expect(getSessionIdleTimeoutMinutes(pool as never)).resolves.toBe(35)
  })
})
