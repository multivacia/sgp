import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api/apiErrors'
import {
  createProductionTimeEntry,
  createProductionUnassignedTimeEntry,
  getProductionSession,
  getProductionWorkQueue,
  listProductionCollaborators,
  listProductionTimeEntryCandidates,
  loginProduction,
  logoutProduction,
  mapProductionLoginError,
  PRODUCTION_OTHER_ACTIVITY_CANDIDATES_ERROR_MESSAGE,
  PRODUCTION_OTHER_ACTIVITY_ENTRY_ERROR_MESSAGE,
  PRODUCTION_PIN_INVALID_MESSAGE,
  PRODUCTION_LIST_KIOSK_MESSAGE,
  PRODUCTION_TIME_ENTRY_ERROR_MESSAGE,
  PRODUCTION_TIME_ENTRY_UNASSIGNED_MESSAGE,
  PRODUCTION_WORK_QUEUE_ERROR_MESSAGE,
} from './productionApiService'

vi.mock('../../lib/production/productionApiClient', () => ({
  productionRequestJson: vi.fn(),
}))

vi.mock('../../lib/api/env', () => ({
  getProductionKioskToken: vi.fn(() => undefined),
}))

import { productionRequestJson } from '../../lib/production/productionApiClient'
import { getProductionKioskToken } from '../../lib/api/env'

const mockRequest = vi.mocked(productionRequestJson)
const mockKioskToken = vi.mocked(getProductionKioskToken)

const mockCollaborator = (
  overrides: Partial<{
    id: string
    fullName: string
    productionCredentialStatus: string
  }> = {},
) => ({
  id: overrides.id ?? 'a',
  fullName: overrides.fullName ?? 'Ana',
  name: overrides.fullName ?? 'Ana',
  displayName: overrides.fullName ?? 'Ana',
  avatarUrl: null,
  initials: 'AN',
  teamName: null,
  productionCredentialStatus: overrides.productionCredentialStatus ?? 'READY',
})

describe('productionApiService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('listProductionCollaborators', () => {
    it('sem kiosk token configurado: chama GET sem header X-SGP-Kiosk-Token', async () => {
      mockKioskToken.mockReturnValue(undefined)
      mockRequest.mockResolvedValue({
        items: [mockCollaborator()],
      })
      const result = await listProductionCollaborators()
      expect(mockRequest).toHaveBeenCalledWith(
        'GET',
        '/api/v1/production/collaborators',
        { headers: {} },
      )
      expect(result.items).toHaveLength(1)
      expect(result.items[0]?.fullName).toBe('Ana')
    })

    it('com kiosk token configurado: envia X-SGP-Kiosk-Token', async () => {
      mockKioskToken.mockReturnValue('meu-token-kiosk')
      mockRequest.mockResolvedValue({
        items: [mockCollaborator()],
      })
      await listProductionCollaborators()
      expect(mockRequest).toHaveBeenCalledWith(
        'GET',
        '/api/v1/production/collaborators',
        { headers: { 'X-SGP-Kiosk-Token': 'meu-token-kiosk' } },
      )
    })

    it('erro 403 PRODUCTION_KIOSK_REQUIRED retorna mensagem amigável de kiosk', async () => {
      mockKioskToken.mockReturnValue(undefined)
      mockRequest.mockRejectedValue(
        new ApiError('acesso negado', 403, { code: 'PRODUCTION_KIOSK_REQUIRED' }),
      )
      await expect(listProductionCollaborators()).rejects.toMatchObject({
        status: 403,
        message: PRODUCTION_LIST_KIOSK_MESSAGE,
        code: 'PRODUCTION_KIOSK_REQUIRED',
      })
    })

    it('chama GET /production/collaborators (legado — compat)', async () => {
      mockKioskToken.mockReturnValue(undefined)
      mockRequest.mockResolvedValue({
        items: [mockCollaborator()],
      })
      await listProductionCollaborators()
      const [method, path] = mockRequest.mock.calls[0] ?? []
      expect(method).toBe('GET')
      expect(path).toBe('/api/v1/production/collaborators')
    })
  })

  it('loginProduction chama POST com collaboratorId e pin (sem persistência local)', async () => {
    mockRequest.mockResolvedValue({
      collaborator: mockCollaborator(),
      scope: 'PRODUCTION_MODE',
      status: 'AUTHENTICATED',
      mustChangePin: false,
    })
    await loginProduction('a', '2468')
    expect(mockRequest).toHaveBeenCalledWith(
      'POST',
      '/api/v1/production/auth/login',
      { body: { collaboratorId: 'a', pin: '2468' } },
    )
  })

  it('getProductionSession chama GET /production/auth/session', async () => {
    mockRequest.mockResolvedValue({
      collaborator: mockCollaborator(),
      scope: 'PRODUCTION_MODE',
      status: 'AUTHENTICATED',
      mustChangePin: false,
    })
    const session = await getProductionSession()
    expect(mockRequest).toHaveBeenCalledWith(
      'GET',
      '/api/v1/production/auth/session',
    )
    expect(session.scope).toBe('PRODUCTION_MODE')
  })

  it('logoutProduction chama POST /production/auth/logout', async () => {
    mockRequest.mockResolvedValue(undefined)
    await logoutProduction()
    expect(mockRequest).toHaveBeenCalledWith(
      'POST',
      '/api/v1/production/auth/logout',
      {},
    )
  })

  it('mapProductionLoginError normaliza PIN inválido', () => {
    const mapped = mapProductionLoginError(
      new ApiError('raw', 401, { code: 'PRODUCTION_PIN_INVALID' }),
    )
    expect(mapped.message).toBe(PRODUCTION_PIN_INVALID_MESSAGE)
  })

  describe('getProductionWorkQueue', () => {
    it('chama GET /api/v1/production/me/work-queue usando productionApiClient', async () => {
      mockRequest.mockResolvedValue({
        date: '2026-05-28',
        planStatus: 'PUBLISHED',
        summary: { plannedItemsToday: 2, overdueItems: 0, completedItemsToday: 0 },
        items: [],
      })
      const result = await getProductionWorkQueue()
      expect(mockRequest).toHaveBeenCalledWith(
        'GET',
        '/api/v1/production/me/work-queue',
      )
      expect(result.planStatus).toBe('PUBLISHED')
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('com date: passa query string na URL', async () => {
      mockRequest.mockResolvedValue({
        date: '2026-05-20',
        planStatus: null,
        summary: { plannedItemsToday: 0, overdueItems: 0, completedItemsToday: 0 },
        items: [],
      })
      await getProductionWorkQueue('2026-05-20')
      const [, path] = mockRequest.mock.calls[0] ?? []
      expect(path).toContain('date=2026-05-20')
    })

    it('erro 401 normaliza para mensagem amigável via productionApiClient', async () => {
      mockRequest.mockRejectedValue(new ApiError('não autorizado', 401))
      await expect(getProductionWorkQueue()).rejects.toMatchObject({
        message: PRODUCTION_WORK_QUEUE_ERROR_MESSAGE,
        status: 401,
      })
    })

    it('erro de rede normaliza para mensagem amigável', async () => {
      mockRequest.mockRejectedValue(new Error('network failure'))
      await expect(getProductionWorkQueue()).rejects.toMatchObject({
        message: PRODUCTION_WORK_QUEUE_ERROR_MESSAGE,
        status: 503,
      })
    })
  })

  describe('createProductionTimeEntry', () => {
    it('chama POST /api/v1/production/time-entries com payload correto', async () => {
      mockRequest.mockResolvedValue({ id: 'te-1', minutes: 60, entryOrigin: 'ASSIGNED' })
      await createProductionTimeEntry({
        conveyorId: 'cv-1',
        stepNodeId: 'step-1',
        minutes: 60,
      })
      expect(mockRequest).toHaveBeenCalledWith(
        'POST',
        '/api/v1/production/time-entries',
        {
          body: { conveyorId: 'cv-1', stepNodeId: 'step-1', minutes: 60 },
        },
      )
    })

    it('payload não inclui collaboratorId', async () => {
      mockRequest.mockResolvedValue({ id: 'te-2', minutes: 30, entryOrigin: 'ASSIGNED' })
      await createProductionTimeEntry({ conveyorId: 'cv-1', stepNodeId: 'step-1', minutes: 30 })
      const [, , init] = mockRequest.mock.calls[0] ?? []
      const body = (init as { body?: Record<string, unknown> } | undefined)?.body ?? {}
      expect(body).not.toHaveProperty('collaboratorId')
    })

    it('payload não inclui exceptionJustification nesta sprint', async () => {
      mockRequest.mockResolvedValue({ id: 'te-3', minutes: 15, entryOrigin: 'ASSIGNED' })
      await createProductionTimeEntry({ conveyorId: 'cv-1', stepNodeId: 'step-1', minutes: 15 })
      const [, , init] = mockRequest.mock.calls[0] ?? []
      const body = (init as { body?: Record<string, unknown> } | undefined)?.body ?? {}
      expect(body).not.toHaveProperty('exceptionJustification')
    })

    it('com note: inclui note no payload', async () => {
      mockRequest.mockResolvedValue({ id: 'te-4', minutes: 20, entryOrigin: 'ASSIGNED' })
      await createProductionTimeEntry({
        conveyorId: 'cv-1',
        stepNodeId: 'step-1',
        minutes: 20,
        note: 'Observação de teste',
      })
      const [, , init] = mockRequest.mock.calls[0] ?? []
      const body = (init as { body?: Record<string, unknown> } | undefined)?.body ?? {}
      expect(body.note).toBe('Observação de teste')
    })

    it('erro UNASSIGNED retorna mensagem de atividade indisponível', async () => {
      mockRequest.mockRejectedValue(
        new ApiError('não alocado', 422, { code: 'TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION' }),
      )
      await expect(
        createProductionTimeEntry({ conveyorId: 'cv-1', stepNodeId: 'step-1', minutes: 10 }),
      ).rejects.toMatchObject({
        message: PRODUCTION_TIME_ENTRY_UNASSIGNED_MESSAGE,
        status: 422,
      })
    })

    it('erro genérico 500 retorna mensagem amigável', async () => {
      mockRequest.mockRejectedValue(new ApiError('internal', 500))
      await expect(
        createProductionTimeEntry({ conveyorId: 'cv-1', stepNodeId: 'step-1', minutes: 10 }),
      ).rejects.toMatchObject({
        message: PRODUCTION_TIME_ENTRY_ERROR_MESSAGE,
        status: 500,
      })
    })

    it('erro de rede retorna mensagem amigável com status 503', async () => {
      mockRequest.mockRejectedValue(new Error('network'))
      await expect(
        createProductionTimeEntry({ conveyorId: 'cv-1', stepNodeId: 'step-1', minutes: 10 }),
      ).rejects.toMatchObject({ message: PRODUCTION_TIME_ENTRY_ERROR_MESSAGE, status: 503 })
    })
  })

  describe('listProductionTimeEntryCandidates', () => {
    it('consulta candidatos de apontamento pela rota do kiosk com query params', async () => {
      mockRequest.mockResolvedValue([])
      await listProductionTimeEntryCandidates({ q: 'OS', limit: 50, includeUnassigned: true })
      expect(mockRequest).toHaveBeenCalledWith(
        'GET',
        '/api/v1/production/me/time-entry-candidates?q=OS&limit=50&includeUnassigned=true',
      )
    })

    it('sem query params: chama a rota base sem querystring', async () => {
      mockRequest.mockResolvedValue([])
      await listProductionTimeEntryCandidates({ q: '' })
      expect(mockRequest).toHaveBeenCalledWith(
        'GET',
        '/api/v1/production/me/time-entry-candidates',
      )
    })

    it('resposta inválida retorna lista vazia', async () => {
      mockRequest.mockResolvedValue(null)
      const result = await listProductionTimeEntryCandidates({ q: 'x' })
      expect(result).toEqual([])
    })

    it('erro genérico retorna mensagem amigável', async () => {
      mockRequest.mockRejectedValue(new ApiError('falhou', 500))
      await expect(listProductionTimeEntryCandidates({ q: 'x' })).rejects.toMatchObject({
        message: PRODUCTION_OTHER_ACTIVITY_CANDIDATES_ERROR_MESSAGE,
        status: 500,
      })
    })
  })

  describe('createProductionUnassignedTimeEntry', () => {
    it('registra exceção de atividade não alocada na rota específica', async () => {
      mockRequest.mockResolvedValue({ id: 'entry-1', minutes: 30, entryOrigin: 'UNASSIGNED_EXCEPTION' })
      await createProductionUnassignedTimeEntry({
        conveyorId: 'cv-1',
        stepNodeId: 'step-1',
        minutes: 30,
        exceptionJustification: 'Apoio na atividade',
      })
      expect(mockRequest).toHaveBeenCalledWith(
        'POST',
        '/api/v1/production/time-entries/unassigned-exception',
        {
          body: {
            conveyorId: 'cv-1',
            stepNodeId: 'step-1',
            minutes: 30,
            exceptionJustification: 'Apoio na atividade',
          },
        },
      )
    })

    it('erro genérico retorna mensagem amigável', async () => {
      mockRequest.mockRejectedValue(new ApiError('falhou', 422))
      await expect(
        createProductionUnassignedTimeEntry({
          conveyorId: 'cv-1',
          stepNodeId: 'step-1',
          minutes: 30,
        }),
      ).rejects.toMatchObject({
        message: PRODUCTION_OTHER_ACTIVITY_ENTRY_ERROR_MESSAGE,
        status: 422,
      })
    })
  })
})
