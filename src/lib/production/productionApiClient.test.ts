import { afterEach, describe, expect, it, vi } from 'vitest'
import { productionRequestJson } from './productionApiClient'
import { SESSION_EXPIRED_CODE } from '../api/apiErrors'

describe('productionRequestJson', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('401 SESSION_EXPIRED não dispara evento de sessão administrativa', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const dispatch = vi.fn()
    vi.stubGlobal('window', { dispatchEvent: dispatch })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          error: {
            code: SESSION_EXPIRED_CODE,
            message: 'Sua sessão expirou.',
          },
        }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await expect(
      productionRequestJson('GET', '/api/v1/production/auth/session'),
    ).rejects.toMatchObject({ status: 401 })

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      credentials: 'include',
    })
    expect(dispatch).not.toHaveBeenCalled()
  })
})
