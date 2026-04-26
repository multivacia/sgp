import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestJson } from './client'

describe('requestJson', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('GET sem body não envia Content-Type: application/json', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [] }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await requestJson<unknown[]>('GET', '/api/v1/collaborators')

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.headers).toBeDefined()
    const raw = init.headers
    const ct =
      raw instanceof Headers
        ? raw.get('Content-Type')
        : (raw as Record<string, string>)['Content-Type']
    expect(ct).toBeUndefined()
  })

  it('POST com body envia Content-Type: application/json', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () =>
        JSON.stringify({ data: { id: 'x', full_name: 'A' } }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await requestJson('POST', '/api/v1/collaborators', {
      body: { fullName: 'A' },
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const raw = init.headers
    const ct =
      raw instanceof Headers
        ? raw.get('Content-Type')
        : (raw as Record<string, string>)['Content-Type']
    expect(ct).toBe('application/json')
  })
})
