import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as repo from '../modules/operational-planning/operational-planning.repository.js'
import * as conveyorRepo from '../modules/conveyor-operational-plan/conveyor-operational-plan.repository.js'
import * as refreshSync from '../modules/conveyor-operational-plan/refreshConveyorOperationalPlanSyncStatus.js'
import {
  serviceGetOperationalPlanningWeek,
  servicePatchOperationalWeekPlan,
  servicePublishOperationalWeekPlan,
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

describe('operational planning revision flow', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serviceGetOperationalPlanningWeek retorna DRAFT editável quando coexistem PUBLISHED e DRAFT', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    const out = await serviceGetOperationalPlanningWeek(pool, WEEK_START)
    expect(out.plan?.id).toBe('draft-1')
    expect(out.plan?.status).toBe('DRAFT')
    expect(out.revision).toEqual({
      hasActivePublished: true,
      activePublishedPlanId: 'pub-1',
      activePublishedAt: '2026-05-10T12:00:00.000Z',
      hasUnpublishedRevision: true,
    })
  })

  it('serviceGetOperationalPlanningWeek usa PUBLISHED para execução fora do plano quando há revisão', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    const outsideSpy = vi
      .spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek')
      .mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await serviceGetOperationalPlanningWeek(pool, WEEK_START)
    expect(outsideSpy).toHaveBeenCalledWith(pool, {
      weekStartDate: WEEK_START,
      weekEndDate: WEEK_END,
      workPlanId: 'pub-1',
    })
  })

  it('servicePatchOperationalWeekPlan em plano PUBLISHED cria DRAFT sem alterar publicado', async () => {
    const pool = { connect: vi.fn() } as unknown as pg.Pool
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] }
        if (typeof sql === 'string' && sql.includes('INSERT INTO operational_work_plans')) {
          return { rows: [] }
        }
        return { rows: [] }
      }),
      release: vi.fn(),
    }
    vi.mocked(pool.connect).mockResolvedValue(client as never)

    vi.spyOn(repo, 'findOperationalWorkPlanById').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    vi.spyOn(repo, 'insertOperationalWorkPlan').mockResolvedValue('draft-new')
    vi.spyOn(repo, 'deleteItemsForWorkPlan').mockResolvedValue(undefined)
    vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([{ id: 'item-1', conveyorOperationalPlanItemId: null }])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue({
      conveyor_id: 'cv-1',
      conveyor_operational_status: 'EM_ANDAMENTO',
      node_type: 'STEP',
      is_active: true,
      operational_status: 'PENDING',
    })
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await servicePatchOperationalWeekPlan(pool, 'pub-1', ACTOR, SAVE_BODY)

    expect(repo.insertOperationalWorkPlan).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ status: 'DRAFT', weekStartDate: WEEK_START }),
    )
    expect(repo.deleteItemsForWorkPlan).toHaveBeenCalledWith(client, 'draft-new')
    expect(repo.findOperationalWorkPlanById).toHaveBeenCalledWith(pool, 'pub-1')
  })

  it('servicePatchOperationalWeekPlan atualiza DRAFT existente quando já há revisão', async () => {
    const pool = { connect: vi.fn() } as unknown as pg.Pool
    const client = {
      query: vi.fn(async () => ({ rows: [] })),
      release: vi.fn(),
    }
    vi.mocked(pool.connect).mockResolvedValue(client as never)

    vi.spyOn(repo, 'findOperationalWorkPlanById').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    const insertSpy = vi.spyOn(repo, 'insertOperationalWorkPlan')
    vi.spyOn(repo, 'deleteItemsForWorkPlan').mockResolvedValue(undefined)
    vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([{ id: 'item-1', conveyorOperationalPlanItemId: null }])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue({
      conveyor_id: 'cv-1',
      conveyor_operational_status: 'EM_ANDAMENTO',
      node_type: 'STEP',
      is_active: true,
      operational_status: 'PENDING',
    })
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await servicePatchOperationalWeekPlan(pool, 'draft-1', ACTOR, SAVE_BODY)

    expect(repo.deleteItemsForWorkPlan).toHaveBeenCalledWith(client, 'draft-1')
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('servicePublishOperationalWeekPlan arquiva PUBLISHED anterior e reconcilia vínculos', async () => {
    const pool = { connect: vi.fn() } as unknown as pg.Pool
    const client = {
      query: vi.fn(async () => ({ rows: [] })),
      release: vi.fn(),
    }
    vi.mocked(pool.connect).mockResolvedValue(client as never)

    vi.spyOn(repo, 'findOperationalWorkPlanById').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([
      {
        id: 'item-1',
        conveyor_id: 'cv-1',
        conveyor_title: 'E',
        activity_node_id: 'step-1',
        activity_title: 'A',
        task_title: 'T',
        sector_title: 'S',
        assigned_collaborator_id: 'col-1',
        assigned_collaborator_name: 'C',
        assigned_team_id: null,
        planned_date: '2026-05-12',
        planned_order: 0,
        planned_minutes: 60,
        status: 'PLANNED',
        notes: null,
        realized_minutes: 0,
        activity_operational_status: 'PENDING',
        conveyor_operational_plan_item_id: 'cop-1',
      },
    ])
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-old', status: 'PUBLISHED' }),
    )
    vi.spyOn(conveyorRepo, 'clearConveyorPlanItemsByOriginWorkPlanItemIds').mockResolvedValue([])
    vi.spyOn(repo, 'softDeleteOperationalWorkPlanWithItems').mockResolvedValue(undefined)
    vi.spyOn(repo, 'publishOperationalWorkPlan').mockResolvedValue(true)
    vi.spyOn(conveyorRepo, 'linkConveyorPlanItemToWorkPlanItem').mockResolvedValue('plan-cv')
    vi.spyOn(refreshSync, 'refreshConveyorOperationalPlanSyncStatusByItemIds').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listWorkPlanItemLinks')
      .mockResolvedValueOnce([{ factoryItemId: 'old-item', conveyorOperationalPlanItemId: 'cop-old' }])
      .mockResolvedValueOnce([{ factoryItemId: 'item-1', conveyorOperationalPlanItemId: 'cop-1' }])

    const result = await servicePublishOperationalWeekPlan(pool, 'draft-1', ACTOR)

    expect(result).toEqual({ published: true })
    expect(repo.softDeleteOperationalWorkPlanWithItems).toHaveBeenCalledWith(client, 'pub-old')
    expect(repo.publishOperationalWorkPlan).toHaveBeenCalledWith(client, 'draft-1', ACTOR)
    expect(conveyorRepo.linkConveyorPlanItemToWorkPlanItem).toHaveBeenCalledWith(
      client,
      'cop-1',
      'item-1',
    )
  })

  it('servicePublishOperationalWeekPlan continua bloqueando plano vazio', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findOperationalWorkPlanById').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await expect(servicePublishOperationalWeekPlan(pool, 'draft-1', ACTOR)).rejects.toMatchObject({
      message: 'Adicione ao menos uma atividade antes de publicar o plano.',
      statusCode: 400,
      code: ErrorCodes.VALIDATION_ERROR,
    } satisfies Partial<AppError>)
  })

  it('serviceSaveOperationalWeekPlan mantém DRAFT quando já existe revisão', async () => {
    const pool = { connect: vi.fn() } as unknown as pg.Pool
    const client = {
      query: vi.fn(async () => ({ rows: [] })),
      release: vi.fn(),
    }
    vi.mocked(pool.connect).mockResolvedValue(client as never)

    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    const insertSpy = vi.spyOn(repo, 'insertOperationalWorkPlan')
    vi.spyOn(repo, 'deleteItemsForWorkPlan').mockResolvedValue(undefined)
    vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([{ id: 'item-1', conveyorOperationalPlanItemId: null }])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue({
      conveyor_id: 'cv-1',
      conveyor_operational_status: 'EM_ANDAMENTO',
      node_type: 'STEP',
      is_active: true,
      operational_status: 'PENDING',
    })
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await serviceSaveOperationalWeekPlan(pool, ACTOR, SAVE_BODY)

    expect(repo.deleteItemsForWorkPlan).toHaveBeenCalledWith(client, 'draft-1')
    expect(insertSpy).not.toHaveBeenCalled()
  })
})
