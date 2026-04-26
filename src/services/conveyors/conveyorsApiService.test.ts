import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api/apiErrors'
import type { CreateConveyorInput } from '../../domain/conveyors/conveyor.types'
import { createConveyor } from './conveyorsApiService'

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
