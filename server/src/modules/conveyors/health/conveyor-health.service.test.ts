import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../../config/env.js'
import { AppError } from '../../../shared/errors/AppError.js'
import { ErrorCodes } from '../../../shared/errors/errorCodes.js'
import type { ConveyorDetailApi } from '../conveyors.dto.js'
import type { ConveyorNodeWorkloadApi } from '../conveyorNodeWorkload.dto.js'
import { postConveyorHealthAnalyze } from '../../argos/argos-health.client.js'
import { serviceGetConveyorById } from '../conveyors.service.js'
import { serviceGetConveyorNodeWorkload } from '../conveyorNodeWorkload.service.js'
import { DEFAULT_CONVEYOR_HEALTH_POLICY } from './conveyor-health.argos-types.js'
import {
  serviceAnalyzeConveyorHealth,
  serviceAnalyzeConveyorHealthAndPersist,
  serviceGetLatestConveyorHealth,
  serviceListLatestConveyorHealthSummaries,
  serviceListConveyorHealthHistory,
} from './conveyor-health.service.js'
import {
  getLatestConveyorHealthAnalysis,
  insertConveyorHealthAnalysis,
  listLatestConveyorHealthSummaries,
  listConveyorHealthAnalyses,
} from './conveyor-health.repository.js'

vi.mock('../conveyors.service.js', () => ({
  serviceGetConveyorById: vi.fn(),
}))
vi.mock('../conveyorNodeWorkload.service.js', () => ({
  serviceGetConveyorNodeWorkload: vi.fn(),
}))
vi.mock('../../argos/argos-health.client.js', () => ({
  postConveyorHealthAnalyze: vi.fn(),
}))
vi.mock('./conveyor-health.repository.js', () => ({
  listPeopleExecutionSummaryForConveyor: vi.fn().mockResolvedValue([]),
  listTeamExecutionSummaryForConveyor: vi.fn().mockResolvedValue([]),
  listRecentActivityForConveyor: vi.fn().mockResolvedValue({ timeEntries: [] }),
  listLatestConveyorHealthSummaries: vi.fn().mockResolvedValue([]),
  listConveyorHealthAnalyses: vi.fn().mockResolvedValue([]),
  insertConveyorHealthAnalysis: vi
    .fn()
    .mockResolvedValue({
      analysisId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      createdAt: '2026-04-01T10:00:00.000Z',
    }),
  getLatestConveyorHealthAnalysis: vi.fn().mockResolvedValue(null),
}))

const mockDetail = (): ConveyorDetailApi => ({
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  code: 'E-1',
  name: 'Fixture',
  clientName: null,
  vehicle: null,
  modelVersion: null,
  plate: null,
  initialNotes: null,
  responsible: null,
  priority: 'media',
  originRegister: 'MANUAL',
  baseRefSnapshot: null,
  baseCodeSnapshot: null,
  baseNameSnapshot: null,
  baseVersionSnapshot: null,
  matrixRootItemId: null,
  operationalStatus: 'EM_PRODUCAO',
  createdAt: '2026-01-01T10:00:00.000Z',
  completedAt: null,
  estimatedDeadline: null,
  totalOptions: 1,
  totalAreas: 1,
  totalSteps: 1,
  totalPlannedMinutes: 10,
  structure: {
    options: [
      {
        id: 'opt1',
        name: 'O1',
        orderIndex: 1,
        areas: [
          {
            id: 'ar1',
            name: 'A1',
            orderIndex: 1,
            steps: [
              {
                id: 'st1',
                name: 'S1',
                orderIndex: 1,
                plannedMinutes: 10,
                assignees: [],
              },
            ],
          },
        ],
      },
    ],
  },
})

const mockWorkload = (): ConveyorNodeWorkloadApi => ({
  semanticsVersion: '1.5',
  conveyorId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  conveyor: { operationalBucket: 'em_andamento', isOverdueContext: false },
  notes: '',
  steps: [
    {
      optionId: 'opt1',
      optionName: 'O1',
      areaId: 'ar1',
      areaName: 'A1',
      stepId: 'st1',
      stepName: 'S1',
      plannedMinutes: 10,
      realizedMinutes: 0,
      pendingMinutes: 10,
    },
  ],
  areas: [
    {
      optionId: 'opt1',
      optionName: 'O1',
      areaId: 'ar1',
      areaName: 'A1',
      plannedMinutesSum: 10,
      realizedMinutesSum: 0,
      pendingMinutesSum: 10,
    },
  ],
})

function baseEnv(overrides: Partial<Env> = {}): Env {
  return {
    argosBaseUrl: 'https://argos.test',
    argosConveyorHealthAnalyzePath: '/api/v1/specialists/conveyor-health/analyze',
    argosHealthTimeoutMs: 5000,
    ...overrides,
  } as Env
}

describe('serviceAnalyzeConveyorHealth', () => {
  const getDetail = vi.mocked(serviceGetConveyorById)
  const getWl = vi.mocked(serviceGetConveyorNodeWorkload)
  const postArgos = vi.mocked(postConveyorHealthAnalyze)
  const insertAnalysis = vi.mocked(insertConveyorHealthAnalysis)
  const getLatest = vi.mocked(getLatestConveyorHealthAnalysis)
  const listSummary = vi.mocked(listLatestConveyorHealthSummaries)
  const listHistory = vi.mocked(listConveyorHealthAnalyses)

  beforeEach(() => {
    vi.clearAllMocks()
    getDetail.mockResolvedValue(mockDetail())
    getWl.mockResolvedValue(mockWorkload())
    postArgos.mockResolvedValue({ routeUsed: 'deterministic', llmUsed: false, score: 1 })
    insertAnalysis.mockResolvedValue({
      analysisId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      createdAt: '2026-04-01T10:00:00.000Z',
    })
    getLatest.mockResolvedValue(null)
    listSummary.mockResolvedValue([])
    listHistory.mockResolvedValue([])
  })

  it('sem policy usa balanced no snapshot', async () => {
    await serviceAnalyzeConveyorHealth({} as never, baseEnv(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', {
      requestId: 'req-a',
      correlationId: 'cor-a',
    })
    const snap = postArgos.mock.calls[0]![1]
    expect(snap.request.policy).toBe(DEFAULT_CONVEYOR_HEALTH_POLICY)
  })

  it('propaga policy explícita', async () => {
    await serviceAnalyzeConveyorHealth({} as never, baseEnv(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', {
      policy: 'economy',
      requestId: 'r1',
      correlationId: 'c1',
    })
    expect(postArgos.mock.calls[0]![1].request.policy).toBe('economy')
  })

  it('propaga requestId e correlationId', async () => {
    await serviceAnalyzeConveyorHealth({} as never, baseEnv(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', {
      requestId: 'rid',
      correlationId: 'cid',
    })
    const snap = postArgos.mock.calls[0]![1]
    expect(snap.request.requestId).toBe('rid')
    expect(snap.request.correlationId).toBe('cid')
  })

  it('esteira inexistente → 404', async () => {
    getDetail.mockResolvedValueOnce(null)
    await expect(
      serviceAnalyzeConveyorHealth({} as never, baseEnv(), '00000000-0000-0000-0000-000000000000', {
        requestId: 'r',
        correlationId: 'c',
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: ErrorCodes.NOT_FOUND })
    expect(postArgos).not.toHaveBeenCalled()
  })

  it('ARGOS desativado → 503 do client', async () => {
    postArgos.mockRejectedValueOnce(
      new AppError('Análise de saúde da esteira desativada no servidor.', 503, ErrorCodes.INTERNAL),
    )
    await expect(
      serviceAnalyzeConveyorHealth({} as never, baseEnv({ argosHealthEnabled: false }), 'dddddddd-dddd-dddd-dddd-dddddddddddd', {
        requestId: 'r',
        correlationId: 'c',
      }),
    ).rejects.toMatchObject({ statusCode: 503 })
  })

  it('timeout ARGOS → 504', async () => {
    postArgos.mockRejectedValueOnce(
      new AppError('Timeout ao contactar ARGOS (health).', 504, ErrorCodes.INTERNAL),
    )
    await expect(
      serviceAnalyzeConveyorHealth({} as never, baseEnv(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', {
        requestId: 'r',
        correlationId: 'c',
      }),
    ).rejects.toMatchObject({ statusCode: 504 })
  })

  it('chama postConveyorHealthAnalyze uma vez com snapshot coerente', async () => {
    await serviceAnalyzeConveyorHealth({} as never, baseEnv(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', {
      requestId: 'r',
      correlationId: 'c',
    })
    expect(postArgos).toHaveBeenCalledTimes(1)
    const snap = postArgos.mock.calls[0]![1]
    expect(snap.metadata.snapshotVersion).toBe('conveyor_operational_snapshot_v1')
    expect(snap.structure.options).toHaveLength(1)
  })

  it('persiste análise em sucesso e retorna analysisId/savedAt', async () => {
    const out = await serviceAnalyzeConveyorHealthAndPersist(
      {} as never,
      baseEnv(),
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      {
        requestId: 'r-save',
        correlationId: 'c-save',
      },
    )
    expect(insertAnalysis).toHaveBeenCalledTimes(1)
    expect(out.persisted.analysisId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    expect(out.persisted.savedAt).toBe('2026-04-01T10:00:00.000Z')
  })

  it('persiste campos denormalizados a partir de analysis.health e request.routeUsed', async () => {
    postArgos.mockResolvedValueOnce({
      request: { routeUsed: 'deterministic' },
      health: { status: 'attention', score: 71, riskLevel: 'medium' },
      governance: { llmUsed: false },
    })
    await serviceAnalyzeConveyorHealthAndPersist(
      {} as never,
      baseEnv(),
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      {
        requestId: 'r-nested',
        correlationId: 'c-nested',
      },
    )
    const payload = insertAnalysis.mock.calls.at(-1)?.[1]
    expect(payload?.routeUsed).toBe('deterministic')
    expect(payload?.llmUsed).toBe(false)
    expect(payload?.healthStatus).toBe('attention')
    expect(payload?.score).toBe(71)
    expect(payload?.riskLevel).toBe('medium')
  })

  it('força llmUsed=false quando routeUsed deterministic e llm ausente', async () => {
    postArgos.mockResolvedValueOnce({
      request: { routeUsed: 'deterministic' },
      health: { status: 'healthy', score: 90, riskLevel: 'low' },
    })
    await serviceAnalyzeConveyorHealthAndPersist(
      {} as never,
      baseEnv(),
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      {
        requestId: 'r-det',
        correlationId: 'c-det',
      },
    )
    const payload = insertAnalysis.mock.calls.at(-1)?.[1]
    expect(payload?.routeUsed).toBe('deterministic')
    expect(payload?.llmUsed).toBe(false)
  })

  it('não persiste quando ARGOS falha', async () => {
    postArgos.mockRejectedValueOnce(
      new AppError('Timeout ao contactar ARGOS (health).', 504, ErrorCodes.INTERNAL),
    )
    await expect(
      serviceAnalyzeConveyorHealthAndPersist(
        {} as never,
        baseEnv(),
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        {
          requestId: 'r',
          correlationId: 'c',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 504 })
    expect(insertAnalysis).not.toHaveBeenCalled()
  })

  it('retorna erro 500 quando persistência falha', async () => {
    insertAnalysis.mockRejectedValueOnce(new Error('db down'))
    await expect(
      serviceAnalyzeConveyorHealthAndPersist(
        {} as never,
        baseEnv(),
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        {
          requestId: 'r',
          correlationId: 'c',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 500 })
  })

  it('latest sem histórico retorna data null', async () => {
    getLatest.mockResolvedValueOnce(null)
    const out = await serviceGetLatestConveyorHealth(
      {} as never,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
    )
    expect(out.data).toBeNull()
    expect(out.meta).toEqual({ hasAnalysis: false })
  })

  it('latest retorna análise mais recente', async () => {
    getLatest.mockResolvedValueOnce({
      analysisId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      createdAt: '2026-04-02T10:00:00.000Z',
      requestId: 'r-latest',
      correlationId: 'c-latest',
      routeUsed: 'deterministic',
      llmUsed: false,
      analysis: {
        narrative: 'Resumo',
        score: 77,
      },
    })
    const out = await serviceGetLatestConveyorHealth(
      {} as never,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
    )
    expect(out.data?.score).toBe(77)
    expect(out.meta.hasAnalysis).toBe(true)
    expect(out.meta.analysisId).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    expect(out.meta.requestId).toBe('r-latest')
  })

  it('latest devolve routeUsed e llmUsed vindos da análise quando colunas estiverem vazias', async () => {
    getLatest.mockResolvedValueOnce({
      analysisId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      createdAt: '2026-04-02T12:00:00.000Z',
      requestId: 'r-latest-2',
      correlationId: 'c-latest-2',
      routeUsed: undefined,
      llmUsed: undefined,
      analysis: {
        request: { routeUsed: 'deterministic' },
        governance: { llmUsed: false },
        health: { status: 'attention', score: 71, riskLevel: 'medium' },
      },
    })
    const out = await serviceGetLatestConveyorHealth(
      {} as never,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
    )
    expect(out.meta.hasAnalysis).toBe(true)
    expect(out.meta.routeUsed).toBe('deterministic')
    expect(out.meta.llmUsed).toBe(false)
    expect(out.meta.requestId).toBe('r-latest-2')
    expect(out.meta.correlationId).toBe('c-latest-2')
    expect(out.meta.analysisId).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    expect(out.meta.createdAt).toBe('2026-04-02T12:00:00.000Z')
  })

  it('latest propaga erro real de banco', async () => {
    getLatest.mockRejectedValueOnce(new Error('relation conveyor_health_analyses does not exist'))
    await expect(
      serviceGetLatestConveyorHealth(
        {} as never,
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
      ),
    ).rejects.toThrow('relation conveyor_health_analyses does not exist')
  })

  it('history sem registros retorna data [] e meta count 0', async () => {
    listHistory.mockResolvedValueOnce([])
    const out = await serviceListConveyorHealthHistory(
      {} as never,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      { limit: 10 },
    )
    expect(out.data).toEqual([])
    expect(out.meta).toEqual({ limit: 10, count: 0, hasMore: false })
  })

  it('history retorna ordenado por createdAt desc', async () => {
    listHistory.mockResolvedValueOnce([
      {
        analysisId: 'n1',
        createdAt: '2026-04-02T10:00:00.000Z',
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
      {
        analysisId: 'n0',
        createdAt: '2026-04-01T10:00:00.000Z',
        requestId: 'r0',
        correlationId: 'c0',
        policy: 'balanced',
        routeUsed: 'deterministic',
        llmUsed: false,
        healthStatus: 'healthy',
        score: 90,
        riskLevel: 'low',
        analysis: { score: 90 },
      },
    ])
    const out = await serviceListConveyorHealthHistory(
      {} as never,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      { limit: 10 },
    )
    expect(out.data[0]?.analysisId).toBe('n1')
    expect(out.data[1]?.analysisId).toBe('n0')
    expect(out.meta.hasMore).toBe(false)
  })

  it('history usa limit default 10', async () => {
    await serviceListConveyorHealthHistory(
      {} as never,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
    )
    expect(listHistory).toHaveBeenCalledWith(
      expect.anything(),
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      { limit: 10 },
    )
  })

  it('history respeita limit máximo 50', async () => {
    await serviceListConveyorHealthHistory(
      {} as never,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      { limit: 999 },
    )
    expect(listHistory).toHaveBeenCalledWith(
      expect.anything(),
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      { limit: 50 },
    )
  })

  it('history marca hasMore=true quando retorna mais que limit', async () => {
    listHistory.mockResolvedValueOnce([
      {
        analysisId: 'a1',
        createdAt: '2026-04-03T10:00:00.000Z',
        requestId: 'r1',
        correlationId: 'c1',
        policy: 'balanced',
        analysis: {},
      },
      {
        analysisId: 'a2',
        createdAt: '2026-04-02T10:00:00.000Z',
        requestId: 'r2',
        correlationId: 'c2',
        policy: 'balanced',
        analysis: {},
      },
      {
        analysisId: 'a3',
        createdAt: '2026-04-01T10:00:00.000Z',
        requestId: 'r3',
        correlationId: 'c3',
        policy: 'balanced',
        analysis: {},
      },
    ])
    const out = await serviceListConveyorHealthHistory(
      {} as never,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      { limit: 2 },
    )
    expect(out.data).toHaveLength(2)
    expect(out.meta.hasMore).toBe(true)
  })

  it('history propaga erro real de banco', async () => {
    listHistory.mockRejectedValueOnce(new Error('db boom'))
    await expect(
      serviceListConveyorHealthHistory(
        {} as never,
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        { limit: 10 },
      ),
    ).rejects.toThrow('db boom')
  })

  it('summary retorna última análise por esteira sem analysis_json', async () => {
    listSummary.mockResolvedValueOnce([
      {
        conveyorId: 'cv-1',
        analysisId: 'a-1',
        createdAt: '2026-04-03T10:00:00.000Z',
        healthStatus: 'attention',
        score: 71,
        riskLevel: 'medium',
        routeUsed: 'deterministic',
        llmUsed: false,
      },
    ])
    const out = await serviceListLatestConveyorHealthSummaries({} as never)
    expect(out.data).toHaveLength(1)
    expect(out.data[0]).not.toHaveProperty('analysis')
    expect(out.meta.count).toBe(1)
  })

  it('summary retorna lista vazia quando não há análises', async () => {
    listSummary.mockResolvedValueOnce([])
    const out = await serviceListLatestConveyorHealthSummaries({} as never)
    expect(out.data).toEqual([])
    expect(out.meta.count).toBe(0)
  })

  it('summary propaga erro real de banco', async () => {
    listSummary.mockRejectedValueOnce(new Error('db summary fail'))
    await expect(serviceListLatestConveyorHealthSummaries({} as never)).rejects.toThrow(
      'db summary fail',
    )
  })
})
