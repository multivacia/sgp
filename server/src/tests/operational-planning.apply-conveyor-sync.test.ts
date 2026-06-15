import { describe, expect, it, vi, afterEach } from 'vitest'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import * as conveyorRepo from '../modules/conveyor-operational-plan/conveyor-operational-plan.repository.js'
import * as refreshSync from '../modules/conveyor-operational-plan/refreshConveyorOperationalPlanSyncStatus.js'
import * as repo from '../modules/operational-planning/operational-planning.repository.js'
import * as planningService from '../modules/operational-planning/operational-planning.service.js'

const pool = {
  connect: vi.fn(),
  query: vi.fn(async () => ({ rows: [] })),
} as unknown as pg.Pool
const copId = 'cop-item-1'
const workItemId = 'wp-item-1'
const planId = 'plan-1'

function mockFactoryItem(
  partial: Partial<repo.WorkPlanItemForSyncApplyRow> = {},
): repo.WorkPlanItemForSyncApplyRow {
  return {
    id: workItemId,
    work_plan_id: planId,
    week_start_date: '2026-05-11',
    week_end_date: '2026-05-15',
    conveyor_operational_plan_item_id: copId,
    planned_date: '2026-05-12',
    planned_minutes: 90,
    assigned_collaborator_id: 'col-factory',
    assigned_team_id: 'team-factory',
    status: 'PLANNED',
    activity_operational_status: 'PENDING',
    ...partial,
  }
}

function conveyorPlanRow(
  partial: Partial<conveyorRepo.ConveyorPlanItemForWeekSyncRow> = {},
): conveyorRepo.ConveyorPlanItemForWeekSyncRow {
  return {
    id: copId,
    planned_date: '2026-05-13',
    planned_minutes: 120,
    planned_collaborator_id: 'col-plan',
    planned_team_id: 'team-plan',
    status: 'PLANNED',
    review_required: false,
    origin_work_plan_item_id: workItemId,
    ...partial,
  }
}

function mockClient() {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] }
      return { rows: [] }
    }),
    release: vi.fn(),
  }
}

describe('serviceApplyConveyorPlanValuesToWeekItem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applies date, minutes, collaborator and team from conveyor plan', async () => {
    vi.spyOn(repo, 'loadWorkPlanItemForSyncApply').mockResolvedValue(mockFactoryItem())
    vi.spyOn(conveyorRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(
      new Map([[copId, conveyorPlanRow()]]),
    )
    const updateSpy = vi.spyOn(repo, 'updateWorkPlanItemFromConveyorPlan').mockResolvedValue()
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue()
    vi.spyOn(refreshSync, 'refreshConveyorOperationalPlanSyncStatusByItemIds').mockResolvedValue()
    vi.mocked(pool.connect).mockResolvedValue(mockClient() as never)
    vi.spyOn(repo, 'findOperationalWorkPlanByWeekStart').mockResolvedValue(null)

    const out = await planningService.serviceApplyConveyorPlanValuesToWeekItem(pool, workItemId, {})
    expect(out.hasPlan).toBe(false)

    expect(updateSpy).toHaveBeenCalledWith(expect.anything(), workItemId, {
      plannedDate: '2026-05-13',
      plannedMinutes: 120,
      assignedCollaboratorId: 'col-plan',
      assignedTeamId: 'team-plan',
    })
  })

  it('blocks item without conveyor link', async () => {
    vi.spyOn(repo, 'loadWorkPlanItemForSyncApply').mockResolvedValue(
      mockFactoryItem({ conveyor_operational_plan_item_id: null }),
    )
    await expect(
      planningService.serviceApplyConveyorPlanValuesToWeekItem(pool, workItemId, {}),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('blocks cancelled factory item', async () => {
    vi.spyOn(repo, 'loadWorkPlanItemForSyncApply').mockResolvedValue(
      mockFactoryItem({ status: 'CANCELLED' }),
    )
    await expect(
      planningService.serviceApplyConveyorPlanValuesToWeekItem(pool, workItemId, {}),
    ).rejects.toMatchObject({
      message: expect.stringContaining('cancelado'),
    })
  })

  it('blocks completed step', async () => {
    vi.spyOn(repo, 'loadWorkPlanItemForSyncApply').mockResolvedValue(
      mockFactoryItem({ activity_operational_status: 'COMPLETED' }),
    )
    await expect(
      planningService.serviceApplyConveyorPlanValuesToWeekItem(pool, workItemId, {}),
    ).rejects.toMatchObject({
      message: expect.stringContaining('concluída'),
    })
  })

  it('blocks conveyor plan date outside work plan week', async () => {
    vi.spyOn(repo, 'loadWorkPlanItemForSyncApply').mockResolvedValue(mockFactoryItem())
    vi.spyOn(conveyorRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(
      new Map([[copId, conveyorPlanRow({ planned_date: '2026-05-18' })]]),
    )
    await expect(
      planningService.serviceApplyConveyorPlanValuesToWeekItem(pool, workItemId, {}),
    ).rejects.toMatchObject({
      message: expect.stringContaining('fora da semana'),
    })
  })

  it('returns refreshed week payload', async () => {
    vi.spyOn(repo, 'loadWorkPlanItemForSyncApply').mockResolvedValue(mockFactoryItem())
    vi.spyOn(conveyorRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(
      new Map([[copId, conveyorPlanRow({ planned_date: '2026-05-12' })]]),
    )
    vi.spyOn(repo, 'updateWorkPlanItemFromConveyorPlan').mockResolvedValue()
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue()
    vi.spyOn(refreshSync, 'refreshConveyorOperationalPlanSyncStatusByItemIds').mockResolvedValue()
    vi.mocked(pool.connect).mockResolvedValue(mockClient() as never)

    vi.spyOn(repo, 'findOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: planId,
      week_start_date: '2026-05-11',
      week_end_date: '2026-05-15',
      status: 'DRAFT',
      created_by: 'user-1',
      published_at: null,
      published_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    const out = await planningService.serviceApplyConveyorPlanValuesToWeekItem(
      pool,
      workItemId,
      {},
    )
    expect(out.hasPlan).toBe(true)
    expect(out.week.weekStartDate).toBe('2026-05-11')
  })
})
