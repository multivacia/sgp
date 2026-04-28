import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestJson, requestJsonEnvelope } from './client'

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

  it('requestJsonEnvelope devolve data e meta do envelope', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: { ok: true },
          meta: {
            requestId: 'req-1',
            correlationId: 'corr-1',
            routeUsed: 'deterministic',
            llmUsed: false,
          },
        }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const r = await requestJsonEnvelope<{ ok: boolean }>(
      'POST',
      '/api/v1/conveyors/x/health-analysis',
      { body: { policy: 'balanced' } },
    )

    expect(r.data.ok).toBe(true)
    expect(r.meta.requestId).toBe('req-1')
    expect(r.meta.correlationId).toBe('corr-1')
    expect(r.meta.routeUsed).toBe('deterministic')
    expect(r.meta.llmUsed).toBe(false)
  })
})
