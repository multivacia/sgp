import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api/apiErrors'
import type { CreateConveyorInput } from '../../domain/conveyors/conveyor.types'
import {
  createConveyor,
  getConveyorOperationalEvents,
  getConveyorHealthAnalysisHistory,
  getConveyorHealthSummary,
  getLatestConveyorHealthAnalysis,
  postConveyorHealthAnalysis,
} from './conveyorsApiService'

describe('createConveyor', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('POST /api/v1/conveyors com corpo JSON e devolve data do envelope', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const created = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      code: null,
      name: 'E1',
      priority: 'media',
      originRegister: 'MANUAL',
      operationalStatus: 'NO_BACKLOG',
      totals: {
        totalOptions: 1,
        totalAreas: 1,
        totalSteps: 1,
        totalPlannedMinutes: 10,
      },
      createdAt: '2026-04-04T12:00:00.000Z',
    }
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain('/api/v1/conveyors')
      expect(init?.method).toBe('POST')
      const body = JSON.parse(String(init?.body)) as CreateConveyorInput
      expect(body.dados.nome).toBe('E1')
      expect(body.options).toHaveLength(1)
      return {
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify({
            data: created,
            meta: {},
          }),
      } as Response
    })

    const input: CreateConveyorInput = {
      dados: { nome: 'E1', prioridade: 'media' },
      originType: 'MANUAL',
      baseId: null,
      options: [
        {
          titulo: 'O1',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'A1',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'S1',
                  orderIndex: 1,
                  plannedMinutes: 10,
                  sourceOrigin: 'manual',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    }

    const data = await createConveyor(input)
    expect(data.id).toBe(created.id)
    expect(data.totals.totalPlannedMinutes).toBe(10)
  })

  it('422 propaga ApiError com mensagem do envelope', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 422,
      text: async () =>
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Colaborador (responsável) não encontrado.',
          },
        }),
    })) as unknown as typeof fetch

    const input: CreateConveyorInput = {
      dados: { nome: 'X', colaboradorId: '00000000-0000-4000-8000-000000000001' },
      originType: 'MANUAL',
      options: [
        {
          titulo: 'O',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'A',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'S',
                  orderIndex: 1,
                  plannedMinutes: 1,
                  sourceOrigin: 'manual',
                },
              ],
            },
          ],
        },
      ],
    }

    await expect(createConveyor(input)).rejects.toSatisfy((e: unknown) => {
      return (
        e instanceof ApiError &&
        e.status === 422 &&
        e.message === 'Colaborador (responsável) não encontrado.'
      )
    })
  })
})

describe('postConveyorHealthAnalysis', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('POST /api/v1/conveyors/:id/health-analysis com policy balanced e preserva meta', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    globalThis.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const u =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url
        expect(u).toContain(`/api/v1/conveyors/${id}/health-analysis`)
        expect(init?.method).toBe('POST')
        const body = JSON.parse(String(init?.body)) as { policy: string }
        expect(body.policy).toBe('balanced')
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: {
                narrative: 'Resumo operacional.',
                score: 72,
              },
              meta: {
                requestId: 'r1',
                correlationId: 'c1',
                routeUsed: 'deterministic',
                llmUsed: false,
              },
            }),
        } as Response
      },
    )

    const r = await postConveyorHealthAnalysis(id)
    expect(r.data.narrative).toBe('Resumo operacional.')
    expect(r.data.score).toBe(72)
    expect(r.meta.requestId).toBe('r1')
    expect(r.meta.correlationId).toBe('c1')
    expect(r.meta.routeUsed).toBe('deterministic')
    expect(r.meta.llmUsed).toBe(false)
  })
})

describe('getLatestConveyorHealthAnalysis', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('GET /api/v1/conveyors/:id/health-analysis/latest retorna análise salva', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain(`/api/v1/conveyors/${id}/health-analysis/latest`)
      expect(init?.method).toBe('GET')
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: { narrative: 'Última análise', score: 70 },
            meta: {
              analysisId: 'h1',
              createdAt: '2026-04-27T12:00:00.000Z',
              requestId: 'r-latest',
              correlationId: 'c-latest',
            },
          }),
      } as Response
    }) as unknown as typeof fetch

    const r = await getLatestConveyorHealthAnalysis(id)
    expect(r.data?.narrative).toBe('Última análise')
    expect(r.meta.analysisId).toBe('h1')
    expect(r.meta.requestId).toBe('r-latest')
  })

  it('GET /api/v1/conveyors/:id/health-analysis/latest aceita data null sem erro', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    globalThis.fetch = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: null,
            meta: { hasAnalysis: false },
          }),
      } as Response
    }) as unknown as typeof fetch

    const r = await getLatestConveyorHealthAnalysis(id)
    expect(r.data).toBeNull()
    expect(r.meta.hasAnalysis).toBe(false)
  })
})

describe('getConveyorHealthAnalysisHistory', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('GET /history monta URL com limit e preserva meta count/hasMore', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain(`/api/v1/conveyors/${id}/health-analysis/history?limit=10`)
      expect(init?.method).toBe('GET')
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [
              {
                analysisId: 'h1',
                createdAt: '2026-04-27T12:00:00.000Z',
                requestId: 'r1',
                correlationId: 'c1',
                policy: 'balanced',
                routeUsed: 'deterministic',
                llmUsed: false,
                healthStatus: 'attention',
                score: 71,
                riskLevel: 'medium',
                analysis: { score: 71 },
              },
            ],
            meta: { limit: 10, count: 1, hasMore: false },
          }),
      } as Response
    }) as unknown as typeof fetch

    const r = await getConveyorHealthAnalysisHistory(id)
    expect(r.data).toHaveLength(1)
    expect(r.data[0]?.analysisId).toBe('h1')
    expect(r.meta.count).toBe(1)
    expect(r.meta.hasMore).toBe(false)
  })
})

describe('getConveyorHealthSummary', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('GET /summary monta URL correta e preserva meta', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain('/api/v1/conveyors/health-analysis/summary?limit=100')
      expect(init?.method).toBe('GET')
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [
              {
                conveyorId: 'cv-1',
                analysisId: 'an-1',
                createdAt: '2026-04-27T12:00:00.000Z',
                healthStatus: 'attention',
                score: 71,
                riskLevel: 'medium',
                routeUsed: 'deterministic',
                llmUsed: false,
              },
            ],
            meta: { count: 1 },
          }),
      } as Response
    }) as unknown as typeof fetch

    const r = await getConveyorHealthSummary()
    expect(r.data[0]?.conveyorId).toBe('cv-1')
    expect(r.meta.count).toBe(1)
  })
})

describe('getConveyorOperationalEvents', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('monta URL correta com limit', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain(`/api/v1/conveyors/${id}/operational-events?limit=20`)
      expect(init?.method).toBe('GET')
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [],
            meta: { total: 0, limit: 20 },
          }),
      } as Response
    }) as unknown as typeof fetch

    const out = await getConveyorOperationalEvents(id, { limit: 20 })
    expect(Array.isArray(out.data)).toBe(true)
    expect(out.meta.limit).toBe(20)
  })
})
