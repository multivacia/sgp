import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api/apiErrors'
import {
  __resetColaboradoresRepositoryForTests,
  listColaboradoresOperacionais,
} from '../../mocks/colaboradores-operacionais-repository'
import {
  __resetCollaboratorsServiceForTests,
  getCollaboratorsService,
  isNetworkOrBackendUnavailableError,
} from './collaboratorsServiceFactory'

describe('collaboratorsServiceFactory', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    __resetCollaboratorsServiceForTests()
    __resetColaboradoresRepositoryForTests()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
    __resetCollaboratorsServiceForTests()
    __resetColaboradoresRepositoryForTests()
  })

  it('modo mock lista colaboradores do repositório em memória', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'mock')
    const svc = getCollaboratorsService()
    const list = await svc.listCollaborators()
    expect(list.length).toBe(listColaboradoresOperacionais().length)
    expect(list.some((c) => c.fullName === 'João')).toBe(true)
  })

  it('modo real usa fetch para a API', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'real')
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (u.includes('/collaborators') && !u.match(/collaborators\/[^/]+$/)) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [
                {
                  id: 'a1',
                  full_name: 'Só API',
                  ativo: true,
                },
              ],
            }),
        } as Response
      }
      if (u.includes('/sectors')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ data: [] }),
        } as Response
      }
      return {
        ok: false,
        status: 404,
        text: async () => '',
      } as Response
    })

    const svc = getCollaboratorsService()
    const list = await svc.listCollaborators()
    expect(list).toHaveLength(1)
    expect(list[0]!.fullName).toBe('Só API')
  })

  it('modo auto: rede indisponível faz fallback para mock', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'auto')
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })

    const svc = getCollaboratorsService()
    const list = await svc.listCollaborators()
    expect(list.length).toBeGreaterThan(0)
    expect(list.some((c) => c.fullName === 'João')).toBe(true)
  })

  it('modo auto: erro HTTP 500 não faz fallback para mock', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'auto')
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () =>
        JSON.stringify({
          error: { code: 'ERR', message: 'Falha no servidor' },
        }),
    })) as unknown as typeof fetch

    const svc = getCollaboratorsService()
    await expect(svc.listCollaborators()).rejects.toThrow(ApiError)
  })

  it.each([502, 503, 504] as const)(
    'modo auto: ApiError %s (proxy/backend) faz fallback para mock',
    async (status) => {
      vi.stubEnv('VITE_DATA_MODE', 'auto')
      vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
      globalThis.fetch = vi.fn(async () => ({
        ok: false,
        status,
        text: async () =>
          JSON.stringify({
            error: { code: 'BAD_GATEWAY', message: 'upstream' },
          }),
      })) as unknown as typeof fetch

      const svc = getCollaboratorsService()
      const list = await svc.listCollaborators()
      expect(list.length).toBeGreaterThan(0)
      expect(list.some((c) => c.fullName === 'João')).toBe(true)
    },
  )

  it('isNetworkOrBackendUnavailableError: ApiError só 502/503/504', () => {
    expect(
      isNetworkOrBackendUnavailableError(
        new ApiError('x', 500, { code: 'E' }),
      ),
    ).toBe(false)
    expect(isNetworkOrBackendUnavailableError(new ApiError('x', 502))).toBe(
      true,
    )
    expect(isNetworkOrBackendUnavailableError(new TypeError('net'))).toBe(
      true,
    )
  })
})
