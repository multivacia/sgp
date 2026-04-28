import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../config/env.js'
import {
  CONVEYOR_HEALTH_CALLER_SYSTEM,
  CONVEYOR_HEALTH_INTENT,
  CONVEYOR_HEALTH_METADATA_SOURCE,
  CONVEYOR_HEALTH_SNAPSHOT_TIMEZONE,
  CONVEYOR_OPERATIONAL_SNAPSHOT_SCHEMA_VERSION,
  CONVEYOR_OPERATIONAL_SNAPSHOT_VERSION,
  type ConveyorOperationalSnapshotV1,
} from '../conveyors/health/conveyor-health.argos-types.js'
import { resolveArgosConveyorHealthAnalyzeUrl } from './argos-health.config.js'
import { postConveyorHealthAnalyze } from './argos-health.client.js'

function minimalSnapshot(): ConveyorOperationalSnapshotV1 {
  return {
    schemaVersion: CONVEYOR_OPERATIONAL_SNAPSHOT_SCHEMA_VERSION,
    request: {
      requestId: '11111111-1111-1111-1111-111111111111',
      correlationId: 'c1',
      policy: 'balanced',
      generatedAt: new Date().toISOString(),
      callerSystem: CONVEYOR_HEALTH_CALLER_SYSTEM,
      intent: CONVEYOR_HEALTH_INTENT,
    },
    conveyor: {
      id: 'cv1',
      code: null,
      name: 'X',
      customerName: null,
      vehicle: null,
      priority: 'media',
      operationalStatus: 'no_backlog',
      completedAt: null,
      createdAt: new Date().toISOString(),
    },
    totals: {
      plannedMinutes: 0,
      realizedMinutes: 0,
      pendingMinutes: 0,
      completionRatio: null,
      totalOptions: 0,
      totalAreas: 0,
      totalSteps: 0,
      completedSteps: 0,
      pendingSteps: 0,
      unassignedSteps: 0,
      overdueSteps: 0,
    },
    structure: { options: [] },
    areaExecutionSummary: [],
    peopleExecutionSummary: [],
    teamExecutionSummary: [],
    recentActivity: { timeEntries: [] },
    dataQuality: {
      missingPlannedMinutesSteps: 0,
      missingAssigneeSteps: 0,
      missingPrimaryResponsibleSteps: 0,
      inconsistentTimeEntries: 0,
      warnings: [],
    },
    metadata: {
      source: CONVEYOR_HEALTH_METADATA_SOURCE,
      snapshotVersion: CONVEYOR_OPERATIONAL_SNAPSHOT_VERSION,
      timezone: CONVEYOR_HEALTH_SNAPSHOT_TIMEZONE,
    },
  }
}

function healthEnv(overrides: Partial<Env> = {}): Env {
  return {
    argosBaseUrl: 'https://argos.test',
    argosConveyorHealthAnalyzePath: '/api/v1/specialists/conveyor-health/analyze',
    argosHealthTimeoutMs: 5000,
    argosIngestToken: 'tok-health',
    ...overrides,
  } as Env
}

describe('resolveArgosConveyorHealthAnalyzeUrl', () => {
  it('combina base sem slash final com path', () => {
    expect(
      resolveArgosConveyorHealthAnalyzeUrl(
        healthEnv({
          argosBaseUrl: 'https://argos.test/',
          argosConveyorHealthAnalyzePath: '/api/v1/specialists/conveyor-health/analyze',
        }),
      ),
    ).toBe('https://argos.test/api/v1/specialists/conveyor-health/analyze')
  })

  it('retorna null sem base', () => {
    expect(resolveArgosConveyorHealthAnalyzeUrl(healthEnv({ argosBaseUrl: undefined }))).toBe(null)
  })
})

describe('postConveyorHealthAnalyze', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('desativa com ARGOS_HEALTH_ENABLED=false', async () => {
    await expect(
      postConveyorHealthAnalyze(
        healthEnv({ argosHealthEnabled: false }),
        minimalSnapshot(),
      ),
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sucesso com envelope success/data', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: { routeUsed: 'deterministic', llmUsed: false, score: 0.9 },
        }),
    })

    const out = await postConveyorHealthAnalyze(healthEnv(), minimalSnapshot())
    expect(out.routeUsed).toBe('deterministic')
    expect(out.llmUsed).toBe(false)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://argos.test/api/v1/specialists/conveyor-health/analyze')
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok-health')
    expect(init?.body).toContain('"request"')
  })

  it('HTTP 400 devolve AppError', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          success: false,
          error: { message: 'Payload inválido' },
        }),
    })

    await expect(postConveyorHealthAnalyze(healthEnv(), minimalSnapshot())).rejects.toMatchObject({
      statusCode: 502,
      message: 'Payload inválido',
    })
  })

  it('timeout → 504', async () => {
    fetchMock.mockImplementation(() => {
      const e = new Error('The operation was aborted')
      e.name = 'AbortError'
      return Promise.reject(e)
    })

    await expect(postConveyorHealthAnalyze(healthEnv(), minimalSnapshot())).rejects.toMatchObject({
      statusCode: 504,
    })
  })

  it('sem token não envia Authorization', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: {} }),
    })

    await postConveyorHealthAnalyze(healthEnv({ argosIngestToken: '' }), minimalSnapshot())
    const init = fetchMock.mock.calls[0]![1] as RequestInit
    const h = init.headers as Record<string, string>
    expect(h.Authorization).toBeUndefined()
  })
})
