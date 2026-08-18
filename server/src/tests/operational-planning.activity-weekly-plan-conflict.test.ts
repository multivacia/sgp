import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as repo from '../modules/operational-planning/operational-planning.repository.js'
import {
  servicePatchOperationalWeekPlan,
  serviceSaveOperationalWeekPlan,
} from '../modules/operational-planning/operational-planning.service.js'

const WEEK_START = '2026-05-11'
const WEEK_END = '2026-05-15'
const ACTOR = 'user-1'

function planRow(
  partial: Partial<repo.OperationalWorkPlanRow> & Pick<repo.OperationalWorkPlanRow, 'id' | 'status'>,
): repo.OperationalWorkPlanRow {
  return {
    week_start_date: WEEK_START,
    week_end_date: WEEK_END,
    created_by: ACTOR,
    published_at: partial.status === 'PUBLISHED' ? '2026-05-10T12:00:00.000Z' : null,
    published_by: partial.status === 'PUBLISHED' ? ACTOR : null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...partial,
  }
}

const SAVE_BODY = {
  weekStartDate: WEEK_START,
  weekEndDate: WEEK_END,
  items: [
    {
      conveyorId: 'cv-1',
      activityNodeId: 'step-1',
      assignedCollaboratorId: 'col-1',
      assignedTeamId: null,
      plannedDate: '2026-05-12',
      plannedOrder: 0,
      plannedMinutes: 60,
      notes: null,
      conveyorOperationalPlanItemId: null,
    },
  ],
}

function mockValidStep(): void {
  vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue({
    conveyor_id: 'cv-1',
    conveyor_operational_status: 'EM_ANDAMENTO',
    node_type: 'STEP',
    is_active: true,
    operational_status: 'PENDING',
  })
}

function mockSaveTransactionPool(): pg.Pool {
  const pool = { connect: vi.fn() } as unknown as pg.Pool
  const client = {
    query: vi.fn(async () => ({ rows: [] })),
    release: vi.fn(),
  }
  vi.mocked(pool.connect).mockResolvedValue(client as never)
  return pool
}

describe('atividade já planejada em outro plano semanal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('save rejeita 409 CONFLICT quando atividade já está em outro plano', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    mockValidStep()
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(true)

    await expect(serviceSaveOperationalWeekPlan(pool, ACTOR, SAVE_BODY)).rejects.toMatchObject({
      message: 'Atividade já está planejada em outro plano semanal.',
      statusCode: 409,
      code: ErrorCodes.CONFLICT,
    } satisfies Partial<AppError>)
  })

  it('atualizar próprio rascunho não gera conflito e exclude contém o draft id', async () => {
    const pool = mockSaveTransactionPool()
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    mockValidStep()
    const conflictSpy = vi
      .spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan')
      .mockResolvedValue(false)
    vi.spyOn(repo, 'deleteItemsForWorkPlan').mockResolvedValue(undefined)
    vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([
      { id: 'item-1', conveyorOperationalPlanItemId: null },
    ])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await serviceSaveOperationalWeekPlan(pool, ACTOR, SAVE_BODY)

    expect(conflictSpy).toHaveBeenCalledWith(
      pool,
      'cv-1',
      'step-1',
      expect.arrayContaining(['draft-1']),
    )
  })

  it('revisar própria semana (published + draft) passa exclude com ambos os ids', async () => {
    const pool = mockSaveTransactionPool()
    vi.spyOn(repo, 'findOperationalWorkPlanById').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    mockValidStep()
    const conflictSpy = vi
      .spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan')
      .mockResolvedValue(false)
    vi.spyOn(repo, 'deleteItemsForWorkPlan').mockResolvedValue(undefined)
    vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([
      { id: 'item-1', conveyorOperationalPlanItemId: null },
    ])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await servicePatchOperationalWeekPlan(pool, 'draft-1', ACTOR, SAVE_BODY)

    expect(conflictSpy).toHaveBeenCalledWith(
      pool,
      'cv-1',
      'step-1',
      expect.arrayContaining(['draft-1', 'pub-1']),
    )
  })

  it('isActivityPlannedInOtherWeeklyPlan SQL ignora CANCELLED/deleted e retorna false sem rows', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    const mockPool = { query } as unknown as pg.Pool

    const result = await repo.isActivityPlannedInOtherWeeklyPlan(
      mockPool,
      'cv-1',
      'step-1',
      ['draft-1'],
    )

    expect(result).toBe(false)
    const sql = String(query.mock.calls[0]?.[0])
    expect(sql).toContain("status <> 'CANCELLED'")
    expect(sql).toContain('deleted_at IS NULL')
    expect(sql).toContain('DRAFT')
    expect(sql).toContain('PUBLISHED')
    expect(sql).toContain('activity_node_id')
    expect(sql).toContain('conveyor_id')
    expect(sql).not.toContain("owp.status <> 'CANCELLED'")
    expect(query.mock.calls[0]?.[1]).toEqual(['cv-1', 'step-1', ['draft-1']])
  })

  it('isActivityPlannedInOtherWeeklyPlan retorna true quando há item ativo em outro plano', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'owpi-other' }] })
    const mockPool = { query } as unknown as pg.Pool

    const result = await repo.isActivityPlannedInOtherWeeklyPlan(mockPool, 'cv-1', 'step-1', [
      'draft-same-week',
    ])

    expect(result).toBe(true)
    const sql = String(query.mock.calls[0]?.[0])
    expect(sql).toContain("owpi.status <> 'CANCELLED'")
    expect(sql).toContain('owpi.deleted_at IS NULL')
    expect(sql).toContain('owp.deleted_at IS NULL')
  })

  it('duplicidade no mesmo payload continua 400', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    mockValidStep()
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)

    const body = {
      ...SAVE_BODY,
      items: [
        SAVE_BODY.items[0]!,
        {
          ...SAVE_BODY.items[0]!,
          plannedOrder: 1,
        },
      ],
    }

    await expect(serviceSaveOperationalWeekPlan(pool, ACTOR, body)).rejects.toMatchObject({
      message: 'Cada Atividade só pode aparecer uma vez no plano.',
      statusCode: 400,
      code: ErrorCodes.VALIDATION_ERROR,
    } satisfies Partial<AppError>)
  })
})

/**
 * Filtro local do frontend (buildVisiblePlanningBacklogItems) é coberto por
 * src/features/operational-planning/buildVisiblePlanningBacklogItems.test.ts —
 * sem regressão esperada nesta mudança backend.
 */
