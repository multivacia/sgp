import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestJson, requestJsonEnvelope } from './client'
import { SESSION_EXPIRED_CODE, SESSION_REVOKED_CREDENTIALS_CHANGED_CODE } from './apiErrors'

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

  it('401 SESSION_EXPIRED dispara evento e preserva ApiError', async () => {
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
            message: 'Sua sessão expirou. Faça login novamente.',
          },
        }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await expect(requestJson('GET', '/api/v1/auth/me')).rejects.toMatchObject({
      status: 401,
      code: SESSION_EXPIRED_CODE,
    })
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sgp:session-expired' }),
    )
  })

  it('401 comum não dispara eventos de sessão encerrada', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const dispatch = vi.fn()
    vi.stubGlobal('window', { dispatchEvent: dispatch })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Sessão não autenticada. Faça login.',
          },
        }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await expect(requestJson('GET', '/api/v1/auth/me')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    })
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sgp:session-expired' }),
    )
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sgp:session-revoked' }),
    )
  })

  it('401 SESSION_REVOKED_CREDENTIALS_CHANGED continua disparando evento dedicado', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const dispatch = vi.fn()
    vi.stubGlobal('window', { dispatchEvent: dispatch })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          error: {
            code: SESSION_REVOKED_CREDENTIALS_CHANGED_CODE,
            message: 'Sua sessão foi encerrada porque suas credenciais foram alteradas. Faça login novamente.',
          },
        }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await expect(requestJson('GET', '/api/v1/auth/me')).rejects.toMatchObject({
      status: 401,
      code: SESSION_REVOKED_CREDENTIALS_CHANGED_CODE,
    })
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sgp:session-revoked' }),
    )
  })
})
