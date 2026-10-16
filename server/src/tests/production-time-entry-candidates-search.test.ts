import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const serviceMock = vi.hoisted(() => vi.fn())

vi.mock('../modules/my-activities/my-activities.service.js', () => ({
  serviceListTimeEntryCandidates: serviceMock,
  serviceListMyActivities: vi.fn(),
}))
vi.mock('../modules/auth/auth.repository.js', () => ({
  findCollaboratorIdByAppUserId: vi.fn(async () => 'collab-1'),
}))

const { getProductionTimeEntryCandidates } = await import(
  '../modules/production/production-time-entry-candidates.controller.js'
)
const { getTimeEntryCandidates } = await import(
  '../modules/my-activities/my-activities.controller.js'
)

type SearchArgs = {
  q: string | null
  conveyorQ: string | null
  activityQ: string | null
  limit: number
  includeUnassigned: boolean
}

function fakeRes(): Response {
  return { json: vi.fn() } as unknown as Response
}

function lastSearchArgs(): SearchArgs {
  const input = serviceMock.mock.calls.at(-1)?.[1] as SearchArgs & { collaboratorId: string }
  const { q, conveyorQ, activityQ, limit, includeUnassigned } = input
  // O serviço trata ausente e `null` da mesma forma.
  return {
    q: q ?? null,
    conveyorQ: conveyorQ ?? null,
    activityQ: activityQ ?? null,
    limit,
    includeUnassigned,
  }
}

/** Termos enviados ao serviço pelo Kiosk ("Outra atividade"). */
async function kioskArgs(query: Record<string, unknown>): Promise<SearchArgs> {
  const req = {
    app: { locals: { pool: {} } },
    productionSession: { collaboratorId: 'collab-1' },
    query,
  } as unknown as Request
  await getProductionTimeEntryCandidates(req, fakeRes())
  return lastSearchArgs()
}

/** Termos enviados ao serviço pelo "Apontar horas" (referência). */
async function referenceArgs(query: Record<string, unknown>): Promise<SearchArgs> {
  const req = {
    app: { locals: { pool: {} } },
    authUser: { id: 'user-1' },
    query,
  } as unknown as Request
  await getTimeEntryCandidates(req, fakeRes())
  return lastSearchArgs()
}

describe('GET /production/me/time-entry-candidates — pesquisa "Esteira & atividade"', () => {
  beforeEach(() => {
    serviceMock.mockReset()
    serviceMock.mockResolvedValue({ items: [], collaboratorId: 'collab-1', unavailableReason: null })
  })

  it('q com & separa esteira/OS (esquerda) e atividade (direita), sem acento/caixa', async () => {
    expect(
      await kioskArgs({ q: '  7070   &   Xptó  ', includeUnassigned: 'true', limit: '20' }),
    ).toEqual({
      q: null,
      conveyorQ: '7070',
      activityQ: 'xpto',
      limit: 20,
      includeUnassigned: true,
    })
  })

  it('lados vazios do & são ignorados', async () => {
    expect(await kioskArgs({ q: '7070 &' })).toMatchObject({
      q: null,
      conveyorQ: '7070',
      activityQ: null,
    })
    expect(await kioskArgs({ q: '& banco' })).toMatchObject({
      q: null,
      conveyorQ: null,
      activityQ: 'banco',
    })
  })

  it('sem &, pesquisa por atividade ou por OS segue como pesquisa livre (inalterada)', async () => {
    expect(await kioskArgs({ q: '  Costura  ' })).toMatchObject({
      q: 'Costura',
      conveyorQ: null,
      activityQ: null,
    })
    expect(await kioskArgs({ q: '7070' })).toMatchObject({
      q: '7070',
      conveyorQ: null,
      activityQ: null,
    })
  })

  it.each([
    { q: 'Costura do tecido' },
    { q: '7070' },
    { q: '7070 & XPTO' },
    { q: '  7070   &   xptó  ' },
    { q: '7070&BANCO' },
    { q: '7070 &' },
    { q: '& Revestir' },
    { q: 'a & b & c' },
    { q: '   ' },
    {},
    { conveyorQ: ' 7070 ', activityQ: ' banco ' },
    { q: 'Cli', includeUnassigned: 'true', limit: '20' },
  ])('mesmos termos que "Apontar horas" para %j', async (query) => {
    expect(await kioskArgs(query)).toEqual(await referenceArgs(query))
  })
})
