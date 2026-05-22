import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as planRepo from '../modules/conveyor-operational-plan/conveyor-operational-plan.repository.js'
import {
  mapPlanItemEnrichedRowToApi,
  serviceApproveConveyorOperationalPlan,
  serviceCreateConveyorOperationalPlan,
  serviceCreateConveyorOperationalPlanItem,
  serviceGenerateConveyorOperationalPlanItems,
  servicePreviewConveyorOperationalPlanGeneration,
  serviceGetConveyorOperationalPlan,
  servicePatchConveyorOperationalPlanItem,
  serviceSendConveyorOperationalPlanToFactory,
} from '../modules/conveyor-operational-plan/conveyor-operational-plan.service.js'
import * as conveyorsRepo from '../modules/conveyors/conveyors.repository.js'
import * as operationalSettingsService from '../modules/operational-settings/operational-settings.service.js'

const CONVEYOR_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const PLAN_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'
const ITEM_ID = 'cccccccc-dddd-eeee-ffff-000000000001'
const STEP_ID = 'dddddddd-eeee-ffff-0000-111111111111'
const USER_ID = 'eeeeeeee-ffff-0000-1111-222222222222'
const COLLAB_ID = '11111111-2222-3333-4444-555555555555'

const pool = {} as pg.Pool

function mockDefaultDailyCapacity(minutes: number, source: 'OPERATIONAL_SETTINGS' | 'FALLBACK' = 'OPERATIONAL_SETTINGS') {
  vi.spyOn(operationalSettingsService, 'serviceResolveDefaultOperationalDailyCapacity').mockResolvedValue({
    dailyCapacityMinutes: minutes,
    source,
  })
}

function draftPlan() {
  return {
    id: PLAN_ID,
    conveyor_id: CONVEYOR_ID,
    status: 'DRAFT' as const,
    planned_start_date: null,
    planned_end_date: null,
    version: 1,
    generated_at: null,
    generated_by: null,
    approved_at: null,
    approved_by: null,
    factory_planning_status: 'NOT_SCHEDULED' as const,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function sampleItemRow(
  partial: Partial<planRepo.PlanItemEnrichedRow> = {},
): planRepo.PlanItemEnrichedRow {
  return {
    id: ITEM_ID,
    plan_id: PLAN_ID,
    conveyor_id: CONVEYOR_ID,
    activity_node_id: STEP_ID,
    task_title: 'Tarefa',
    sector_title: 'Setor',
    activity_title: 'Atividade',
    planned_date: '2026-06-01',
    planned_order: 0,
    planned_minutes: 60,
    planned_collaborator_id: COLLAB_ID,
    planned_collaborator_name: 'Colaborador',
    planned_team_id: null,
    planned_team_name: null,
    status: 'PLANNED',
    source_kind: 'MANUAL',
    origin_work_plan_item_id: null,
    sync_status: null,
    review_required: false,
    cancellation_reason: null,
    notes: null,
    realized_minutes: 30,
    activity_operational_status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  }
}

function mockConveyor(status: string) {
  vi.spyOn(conveyorsRepo, 'findConveyorById').mockResolvedValue({
    id: CONVEYOR_ID,
    operational_status: status,
  } as Awaited<ReturnType<typeof conveyorsRepo.findConveyorById>>)
}

describe('serviceGetConveyorOperationalPlan', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns null when no active plan', async () => {
    mockDefaultDailyCapacity(480)
    mockConveyor('EM_PRODUCAO')
    vi.spyOn(planRepo, 'findActivePlanByConveyorId').mockResolvedValue(null)
    const out = await serviceGetConveyorOperationalPlan(pool, CONVEYOR_ID)
    expect(out).toBeNull()
  })

  it('returns dailyCapacityMinutes from operational settings on GET', async () => {
    mockDefaultDailyCapacity(540)
    mockConveyor('EM_PRODUCAO')
    vi.spyOn(planRepo, 'findActivePlanByConveyorId').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([
      sampleItemRow({ planned_minutes: 500 }),
    ])
    vi.spyOn(planRepo, 'loadStepTeamIdsByActivityIds').mockResolvedValue(new Map([[STEP_ID, []]]))

    const out = await serviceGetConveyorOperationalPlan(pool, CONVEYOR_ID)
    expect(out?.dailyCapacityMinutes).toBe(540)
    expect(out?.items[0]?.reviewReasons.map((r) => r.code)).not.toContain('OVER_DAILY_CAPACITY')
  })
})

describe('serviceCreateConveyorOperationalPlan', () => {
  afterEach(() => vi.restoreAllMocks())

  it('creates DRAFT plan', async () => {
    mockDefaultDailyCapacity(480)
    mockConveyor('PRONTA_LIBERAR')
    vi.spyOn(planRepo, 'findActivePlanByConveyorId').mockResolvedValue(null)
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    vi.spyOn(planRepo, 'insertPlan').mockResolvedValue(PLAN_ID)
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())

    const out = await serviceCreateConveyorOperationalPlan(pool, CONVEYOR_ID, {})
    expect(out.plan.status).toBe('DRAFT')
    expect(out.items).toEqual([])
    expect(out.dailyCapacityMinutes).toBe(480)
  })

  it('returns 409 when active plan exists', async () => {
    mockConveyor('EM_PRODUCAO')
    vi.spyOn(planRepo, 'findActivePlanByConveyorId').mockResolvedValue(draftPlan())
    await expect(
      serviceCreateConveyorOperationalPlan(pool, CONVEYOR_ID, {}),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: ErrorCodes.CONVEYOR_OPERATIONAL_PLAN_ALREADY_EXISTS,
    })
  })
})

describe('serviceCreateConveyorOperationalPlanItem', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => mockDefaultDailyCapacity(480))

  it('validates STEP belongs to conveyor', async () => {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'loadStepForPlanItem').mockResolvedValue(null)
    await expect(
      serviceCreateConveyorOperationalPlanItem(pool, CONVEYOR_ID, PLAN_ID, {
        activityNodeId: STEP_ID,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.VALIDATION_ERROR })
  })

  it('blocks non-STEP node', async () => {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'loadStepForPlanItem').mockResolvedValue({
      conveyor_id: CONVEYOR_ID,
      node_type: 'AREA',
      is_active: true,
      planned_minutes: 10,
      default_responsible_id: null,
    })
    await expect(
      serviceCreateConveyorOperationalPlanItem(pool, CONVEYOR_ID, PLAN_ID, {
        activityNodeId: STEP_ID,
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('STEP'),
    })
  })

  it('applies default plannedMinutes from STEP', async () => {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'loadStepForPlanItem').mockResolvedValue({
      conveyor_id: CONVEYOR_ID,
      node_type: 'STEP',
      is_active: true,
      planned_minutes: 90,
      default_responsible_id: null,
    })
    vi.spyOn(planRepo, 'existsPlanItemForActivity').mockResolvedValue(false)
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    const insertSpy = vi.spyOn(planRepo, 'insertPlanItem').mockResolvedValue(ITEM_ID)
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([])

    await serviceCreateConveyorOperationalPlanItem(pool, CONVEYOR_ID, PLAN_ID, {
      activityNodeId: STEP_ID,
    })
    expect(insertSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ plannedMinutes: 90 }),
    )
  })

  it('blocks duplicate activityNodeId', async () => {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'loadStepForPlanItem').mockResolvedValue({
      conveyor_id: CONVEYOR_ID,
      node_type: 'STEP',
      is_active: true,
      planned_minutes: 60,
      default_responsible_id: null,
    })
    vi.spyOn(planRepo, 'existsPlanItemForActivity').mockResolvedValue(true)
    await expect(
      serviceCreateConveyorOperationalPlanItem(pool, CONVEYOR_ID, PLAN_ID, {
        activityNodeId: STEP_ID,
      }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('blocks when plan is not DRAFT', async () => {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue({
      ...draftPlan(),
      status: 'APPROVED',
    })
    await expect(
      serviceCreateConveyorOperationalPlanItem(pool, CONVEYOR_ID, PLAN_ID, {
        activityNodeId: STEP_ID,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_STATUS_TRANSITION })
  })
})

describe('servicePatchConveyorOperationalPlanItem', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => mockDefaultDailyCapacity(480))

  it('updates fields in DRAFT and recalculates review', async () => {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'findPlanItemForPatch').mockResolvedValue({
      id: ITEM_ID,
      plan_id: PLAN_ID,
      conveyor_id: CONVEYOR_ID,
      activity_node_id: STEP_ID,
      planned_date: '2026-06-01',
      planned_order: 0,
      planned_minutes: null,
      planned_collaborator_id: COLLAB_ID,
      planned_team_id: null,
      status: 'NEEDS_REVIEW',
      notes: null,
    })
    vi.spyOn(planRepo, 'loadStepTeamIdsByActivityIds').mockResolvedValue(new Map([[STEP_ID, []]]))
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    const updateSpy = vi.spyOn(planRepo, 'updatePlanItem').mockResolvedValue()
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([
      sampleItemRow({ planned_minutes: 120, status: 'PLANNED', review_required: false }),
    ])

    await servicePatchConveyorOperationalPlanItem(pool, CONVEYOR_ID, PLAN_ID, ITEM_ID, {
      plannedMinutes: 120,
    })
    expect(updateSpy).toHaveBeenCalledWith(
      expect.anything(),
      ITEM_ID,
      expect.objectContaining({
        plannedMinutes: 120,
        reviewRequired: false,
        status: 'PLANNED',
      }),
    )
  })

  it('keeps NEEDS_REVIEW when patch still invalid', async () => {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'findPlanItemForPatch').mockResolvedValue({
      id: ITEM_ID,
      plan_id: PLAN_ID,
      conveyor_id: CONVEYOR_ID,
      activity_node_id: STEP_ID,
      planned_date: '2026-06-01',
      planned_order: 0,
      planned_minutes: 60,
      planned_collaborator_id: COLLAB_ID,
      planned_team_id: null,
      status: 'PLANNED',
      notes: null,
    })
    vi.spyOn(planRepo, 'loadStepTeamIdsByActivityIds').mockResolvedValue(new Map([[STEP_ID, []]]))
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    const updateSpy = vi.spyOn(planRepo, 'updatePlanItem').mockResolvedValue()
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([sampleItemRow()])

    await servicePatchConveyorOperationalPlanItem(pool, CONVEYOR_ID, PLAN_ID, ITEM_ID, {
      plannedMinutes: 0,
    })
    expect(updateSpy).toHaveBeenCalledWith(
      expect.anything(),
      ITEM_ID,
      expect.objectContaining({
        reviewRequired: true,
        status: 'NEEDS_REVIEW',
      }),
    )
  })

  it('blocks patch when plan not DRAFT', async () => {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue({
      ...draftPlan(),
      status: 'WAITING_FACTORY_PLANNING',
    })
    await expect(
      servicePatchConveyorOperationalPlanItem(pool, CONVEYOR_ID, PLAN_ID, ITEM_ID, {
        notes: 'x',
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_STATUS_TRANSITION })
  })

  function mockPatchItemFlow(
    itemPartial: Partial<planRepo.PlanItemPatchRow> = {},
  ) {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'findPlanItemForPatch').mockResolvedValue({
      id: ITEM_ID,
      plan_id: PLAN_ID,
      conveyor_id: CONVEYOR_ID,
      activity_node_id: STEP_ID,
      planned_date: '2026-06-01',
      planned_order: 0,
      planned_minutes: 60,
      planned_collaborator_id: COLLAB_ID,
      planned_team_id: null,
      status: 'PLANNED',
      notes: null,
      ...itemPartial,
    })
    vi.spyOn(planRepo, 'loadStepTeamIdsByActivityIds').mockResolvedValue(new Map([[STEP_ID, []]]))
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    const updateSpy = vi.spyOn(planRepo, 'updatePlanItem').mockResolvedValue()
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([sampleItemRow()])
    return updateSpy
  }

  it('updates plannedOrder in DRAFT', async () => {
    const updateSpy = mockPatchItemFlow()
    await servicePatchConveyorOperationalPlanItem(pool, CONVEYOR_ID, PLAN_ID, ITEM_ID, {
      plannedOrder: 3,
    })
    expect(updateSpy).toHaveBeenCalledWith(
      expect.anything(),
      ITEM_ID,
      expect.objectContaining({ plannedOrder: 3 }),
    )
  })

  it('cancels item with status CANCELLED', async () => {
    const updateSpy = mockPatchItemFlow()
    await servicePatchConveyorOperationalPlanItem(pool, CONVEYOR_ID, PLAN_ID, ITEM_ID, {
      status: 'CANCELLED',
    })
    expect(updateSpy).toHaveBeenCalledWith(
      expect.anything(),
      ITEM_ID,
      expect.objectContaining({ status: 'CANCELLED' }),
    )
    const patch = updateSpy.mock.calls[0]?.[2] as Record<string, unknown>
    expect(patch).not.toHaveProperty('reviewRequired')
  })

  it('restores cancelled item and recalculates review', async () => {
    const updateSpy = mockPatchItemFlow({
      status: 'CANCELLED',
      planned_minutes: null,
    })
    await servicePatchConveyorOperationalPlanItem(pool, CONVEYOR_ID, PLAN_ID, ITEM_ID, {
      status: 'PLANNED',
    })
    expect(updateSpy).toHaveBeenCalledWith(
      expect.anything(),
      ITEM_ID,
      expect.objectContaining({
        reviewRequired: true,
        status: 'NEEDS_REVIEW',
      }),
    )
  })
})

describe('serviceApproveConveyorOperationalPlan — cancelled items', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => mockDefaultDailyCapacity(480))

  it('approves when only cancelled items need review', async () => {
    vi.spyOn(planRepo, 'findPlanById')
      .mockResolvedValueOnce(draftPlan())
      .mockResolvedValueOnce({ ...draftPlan(), status: 'APPROVED' })
    vi.spyOn(planRepo, 'countActivePlanItems').mockResolvedValue(1)
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([
      sampleItemRow({ status: 'PLANNED', planned_minutes: 60, review_required: false }),
      sampleItemRow({
        id: 'cancelled-item',
        status: 'CANCELLED',
        planned_minutes: null,
        review_required: true,
      }),
    ])
    vi.spyOn(planRepo, 'loadStepTeamIdsByActivityIds').mockResolvedValue(new Map([[STEP_ID, []]]))
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    vi.spyOn(planRepo, 'approvePlan').mockResolvedValue(true)

    const out = await serviceApproveConveyorOperationalPlan(
      pool,
      CONVEYOR_ID,
      PLAN_ID,
      USER_ID,
    )
    expect(out.plan.status).toBe('APPROVED')
  })
})

describe('serviceApproveConveyorOperationalPlan', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => mockDefaultDailyCapacity(480))

  it('approves DRAFT -> APPROVED', async () => {
    vi.spyOn(planRepo, 'findPlanById')
      .mockResolvedValueOnce(draftPlan())
      .mockResolvedValueOnce({ ...draftPlan(), status: 'APPROVED' })
    vi.spyOn(planRepo, 'countActivePlanItems').mockResolvedValue(1)
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([sampleItemRow()])
    vi.spyOn(planRepo, 'loadStepTeamIdsByActivityIds').mockResolvedValue(new Map([[STEP_ID, []]]))
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    vi.spyOn(planRepo, 'approvePlan').mockResolvedValue(true)
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([sampleItemRow()])

    const out = await serviceApproveConveyorOperationalPlan(
      pool,
      CONVEYOR_ID,
      PLAN_ID,
      USER_ID,
    )
    expect(out.plan.status).toBe('APPROVED')
  })

  it('rejects approve without active items', async () => {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'countActivePlanItems').mockResolvedValue(0)
    await expect(
      serviceApproveConveyorOperationalPlan(pool, CONVEYOR_ID, PLAN_ID, USER_ID),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('rejects approve when items need review', async () => {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'countActivePlanItems').mockResolvedValue(1)
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([
      sampleItemRow({ planned_minutes: null, review_required: true, status: 'NEEDS_REVIEW' }),
    ])
    vi.spyOn(planRepo, 'loadStepTeamIdsByActivityIds').mockResolvedValue(new Map())
    await expect(
      serviceApproveConveyorOperationalPlan(pool, CONVEYOR_ID, PLAN_ID, USER_ID),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: ErrorCodes.CONVEYOR_OPERATIONAL_PLAN_ITEMS_NEED_REVIEW,
    })
  })

  it('approves when no items need review', async () => {
    vi.spyOn(planRepo, 'findPlanById')
      .mockResolvedValueOnce(draftPlan())
      .mockResolvedValueOnce({ ...draftPlan(), status: 'APPROVED' })
    vi.spyOn(planRepo, 'countActivePlanItems').mockResolvedValue(1)
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([sampleItemRow()])
    vi.spyOn(planRepo, 'loadStepTeamIdsByActivityIds').mockResolvedValue(new Map([[STEP_ID, []]]))
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    vi.spyOn(planRepo, 'approvePlan').mockResolvedValue(true)

    const out = await serviceApproveConveyorOperationalPlan(
      pool,
      CONVEYOR_ID,
      PLAN_ID,
      USER_ID,
    )
    expect(out.plan.status).toBe('APPROVED')
  })
})

describe('serviceGenerateConveyorOperationalPlanItems', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => mockDefaultDailyCapacity(480))

  const stepRow = (
    partial: Partial<planRepo.ConveyorPlanGenerationStepRow> = {},
  ): planRepo.ConveyorPlanGenerationStepRow => ({
    activity_node_id: STEP_ID,
    task_name: 'Tarefa',
    area_name: 'Setor',
    activity_name: 'Atividade',
    option_order_index: 0,
    area_order_index: 0,
    step_order_index: 0,
    planned_minutes: 60,
    default_responsible_id: null,
    collaborator_assignee_ids: [COLLAB_ID],
    team_assignee_ids: [],
    ...partial,
  })

  it('generates items on empty DRAFT plan', async () => {
    mockDefaultDailyCapacity(480)
    vi.spyOn(planRepo, 'countFactoryLinkedActivePlanItems').mockResolvedValue(0)
    vi.spyOn(planRepo, 'findPlanById')
      .mockResolvedValueOnce(draftPlan())
      .mockResolvedValueOnce({
        ...draftPlan(),
        planned_start_date: '2026-06-01',
        planned_end_date: '2026-06-01',
        generated_at: new Date().toISOString(),
        generated_by: USER_ID,
      })
    vi.spyOn(planRepo, 'countActivePlanItems').mockResolvedValue(0)
    vi.spyOn(planRepo, 'listConveyorStepsForPlanGeneration').mockResolvedValue([stepRow()])
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    const insertSpy = vi.spyOn(planRepo, 'insertGeneratedPlanItem').mockResolvedValue(ITEM_ID)
    const updateSpy = vi.spyOn(planRepo, 'updatePlanAfterGeneration').mockResolvedValue()
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([
      sampleItemRow({ source_kind: 'GENERATED' }),
    ])
    vi.spyOn(planRepo, 'loadStepTeamIdsByActivityIds').mockResolvedValue(new Map([[STEP_ID, []]]))

    const { response: out, generationMeta } = await serviceGenerateConveyorOperationalPlanItems(
      pool,
      CONVEYOR_ID,
      PLAN_ID,
      { plannedStartDate: '2026-06-01', overwrite: false },
      USER_ID,
    )
    expect(generationMeta).toEqual({
      dailyCapacityMinutesUsed: 480,
      dailyCapacitySource: 'OPERATIONAL_SETTINGS',
    })
    expect(insertSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        activityNodeId: STEP_ID,
        status: 'PLANNED',
        reviewRequired: false,
      }),
    )
    expect(updateSpy).toHaveBeenCalledWith(
      expect.anything(),
      PLAN_ID,
      expect.objectContaining({
        plannedStartDate: '2026-06-01',
        generatedByUserId: USER_ID,
      }),
    )
    expect(out.items[0]?.sourceKind).toBe('GENERATED')
  })

  it('uses configured daily capacity 540 for generation and review', async () => {
    mockDefaultDailyCapacity(540)
    vi.spyOn(planRepo, 'countFactoryLinkedActivePlanItems').mockResolvedValue(0)
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValueOnce(draftPlan()).mockResolvedValueOnce(draftPlan())
    vi.spyOn(planRepo, 'countActivePlanItems').mockResolvedValue(0)
    vi.spyOn(planRepo, 'listConveyorStepsForPlanGeneration').mockResolvedValue([
      stepRow({ planned_minutes: 500 }),
    ])
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    const insertSpy = vi.spyOn(planRepo, 'insertGeneratedPlanItem').mockResolvedValue(ITEM_ID)
    vi.spyOn(planRepo, 'updatePlanAfterGeneration').mockResolvedValue()
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([])

    await serviceGenerateConveyorOperationalPlanItems(
      pool,
      CONVEYOR_ID,
      PLAN_ID,
      { plannedStartDate: '2026-06-01', overwrite: false },
      USER_ID,
    )
    expect(insertSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ reviewRequired: false }),
    )
  })

  it('uses fallback 480 when operational settings are unavailable', async () => {
    mockDefaultDailyCapacity(480, 'FALLBACK')
    vi.spyOn(planRepo, 'countFactoryLinkedActivePlanItems').mockResolvedValue(0)
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValueOnce(draftPlan()).mockResolvedValueOnce(draftPlan())
    vi.spyOn(planRepo, 'countActivePlanItems').mockResolvedValue(0)
    vi.spyOn(planRepo, 'listConveyorStepsForPlanGeneration').mockResolvedValue([stepRow()])
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    vi.spyOn(planRepo, 'insertGeneratedPlanItem').mockResolvedValue(ITEM_ID)
    vi.spyOn(planRepo, 'updatePlanAfterGeneration').mockResolvedValue()
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([])

    const { generationMeta } = await serviceGenerateConveyorOperationalPlanItems(
      pool,
      CONVEYOR_ID,
      PLAN_ID,
      { plannedStartDate: '2026-06-01', overwrite: false },
      USER_ID,
    )
    expect(generationMeta).toEqual({
      dailyCapacityMinutesUsed: 480,
      dailyCapacitySource: 'FALLBACK',
    })
  })

  it('blocks generation when items exist without overwrite', async () => {
    mockDefaultDailyCapacity(480)
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'countActivePlanItems').mockResolvedValue(2)
    vi.spyOn(planRepo, 'countFactoryLinkedActivePlanItems').mockResolvedValue(0)
    vi.spyOn(planRepo, 'listConveyorStepsForPlanGeneration').mockResolvedValue([stepRow()])
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([
      sampleItemRow({ source_kind: 'MANUAL' }),
    ])
    await expect(
      serviceGenerateConveyorOperationalPlanItems(
        pool,
        CONVEYOR_ID,
        PLAN_ID,
        { plannedStartDate: '2026-06-01', overwrite: false },
        USER_ID,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: ErrorCodes.CONVEYOR_OPERATIONAL_PLAN_ITEMS_EXIST,
      details: expect.objectContaining({
        hasExistingItems: true,
        existingManualItemsCount: 1,
      }),
    })
  })

  it('blocks generation when factory-linked items exist', async () => {
    mockDefaultDailyCapacity(480)
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'countFactoryLinkedActivePlanItems').mockResolvedValue(1)
    await expect(
      serviceGenerateConveyorOperationalPlanItems(
        pool,
        CONVEYOR_ID,
        PLAN_ID,
        { plannedStartDate: '2026-06-01', overwrite: true },
        USER_ID,
      ),
    ).rejects.toMatchObject({
      code: ErrorCodes.CONVEYOR_OPERATIONAL_PLAN_FACTORY_LINKED,
    })
  })

  it('soft-deletes and regenerates when overwrite=true', async () => {
    mockDefaultDailyCapacity(480)
    vi.spyOn(planRepo, 'countFactoryLinkedActivePlanItems').mockResolvedValue(0)
    vi.spyOn(planRepo, 'findPlanById')
      .mockResolvedValueOnce(draftPlan())
      .mockResolvedValueOnce(draftPlan())
    vi.spyOn(planRepo, 'countActivePlanItems').mockResolvedValue(1)
    vi.spyOn(planRepo, 'listConveyorStepsForPlanGeneration').mockResolvedValue([stepRow()])
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    const softSpy = vi.spyOn(planRepo, 'softDeleteActivePlanItemsForPlan').mockResolvedValue(1)
    vi.spyOn(planRepo, 'insertGeneratedPlanItem').mockResolvedValue(ITEM_ID)
    vi.spyOn(planRepo, 'updatePlanAfterGeneration').mockResolvedValue()
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([])

    await serviceGenerateConveyorOperationalPlanItems(
      pool,
      CONVEYOR_ID,
      PLAN_ID,
      { plannedStartDate: '2026-06-01', overwrite: true },
      USER_ID,
    )
    expect(softSpy).toHaveBeenCalled()
  })

  it('blocks generation when plan is not DRAFT', async () => {
    mockDefaultDailyCapacity(480)
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue({
      ...draftPlan(),
      status: 'APPROVED',
    })
    await expect(
      serviceGenerateConveyorOperationalPlanItems(
        pool,
        CONVEYOR_ID,
        PLAN_ID,
        { plannedStartDate: '2026-06-01', overwrite: false },
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_STATUS_TRANSITION })
  })

  it('uses insertGeneratedPlanItem instead of manual insert', async () => {
    mockDefaultDailyCapacity(480)
    vi.spyOn(planRepo, 'countFactoryLinkedActivePlanItems').mockResolvedValue(0)
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValueOnce(draftPlan()).mockResolvedValueOnce(draftPlan())
    vi.spyOn(planRepo, 'countActivePlanItems').mockResolvedValue(0)
    vi.spyOn(planRepo, 'listConveyorStepsForPlanGeneration').mockResolvedValue([stepRow()])
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    const manualSpy = vi.spyOn(planRepo, 'insertPlanItem')
    const generatedSpy = vi.spyOn(planRepo, 'insertGeneratedPlanItem').mockResolvedValue(ITEM_ID)
    vi.spyOn(planRepo, 'updatePlanAfterGeneration').mockResolvedValue()
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([])

    await serviceGenerateConveyorOperationalPlanItems(
      pool,
      CONVEYOR_ID,
      PLAN_ID,
      { plannedStartDate: '2026-06-01', overwrite: false },
      USER_ID,
    )
    expect(generatedSpy).toHaveBeenCalled()
    expect(manualSpy).not.toHaveBeenCalled()
  })
})

describe('servicePreviewConveyorOperationalPlanGeneration', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => mockDefaultDailyCapacity(480))

  const stepRow = (
    partial: Partial<planRepo.ConveyorPlanGenerationStepRow> = {},
  ): planRepo.ConveyorPlanGenerationStepRow => ({
    activity_node_id: STEP_ID,
    task_name: 'Tarefa',
    area_name: 'Setor',
    activity_name: 'Atividade',
    option_order_index: 0,
    area_order_index: 0,
    step_order_index: 0,
    planned_minutes: 60,
    default_responsible_id: null,
    collaborator_assignee_ids: [COLLAB_ID],
    team_assignee_ids: [],
    ...partial,
  })

  it('returns preview without persisting', async () => {
    mockConveyor('EM_PRODUCAO')
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    vi.spyOn(planRepo, 'listConveyorStepsForPlanGeneration').mockResolvedValue([stepRow()])
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([])
    const insertSpy = vi.spyOn(planRepo, 'insertGeneratedPlanItem')
    const softSpy = vi.spyOn(planRepo, 'softDeleteActivePlanItemsForPlan')

    const preview = await servicePreviewConveyorOperationalPlanGeneration(
      pool,
      CONVEYOR_ID,
      PLAN_ID,
      { plannedStartDate: '2026-06-01' },
    )
    expect(preview.generatedItemsCount).toBe(1)
    expect(preview.hasExistingItems).toBe(false)
    expect(insertSpy).not.toHaveBeenCalled()
    expect(softSpy).not.toHaveBeenCalled()
  })

  it('blocks preview when plan is not DRAFT', async () => {
    mockConveyor('EM_PRODUCAO')
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue({ ...draftPlan(), status: 'APPROVED' })
    await expect(
      servicePreviewConveyorOperationalPlanGeneration(pool, CONVEYOR_ID, PLAN_ID, {
        plannedStartDate: '2026-06-01',
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_STATUS_TRANSITION })
  })
})

describe('serviceSendConveyorOperationalPlanToFactory', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => mockDefaultDailyCapacity(480))

  it('transitions APPROVED -> WAITING_FACTORY_PLANNING', async () => {
    vi.spyOn(planRepo, 'findPlanById')
      .mockResolvedValueOnce({ ...draftPlan(), status: 'APPROVED' })
      .mockResolvedValueOnce({
        ...draftPlan(),
        status: 'WAITING_FACTORY_PLANNING',
      })
    const connect = vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    })
    ;(pool as { connect: typeof connect }).connect = connect
    vi.spyOn(planRepo, 'sendPlanToFactory').mockResolvedValue(true)
    vi.spyOn(planRepo, 'listEnrichedItemsForPlan').mockResolvedValue([])

    const out = await serviceSendConveyorOperationalPlanToFactory(pool, CONVEYOR_ID, PLAN_ID)
    expect(out.plan.status).toBe('WAITING_FACTORY_PLANNING')
  })

  it('rejects send when not APPROVED', async () => {
    vi.spyOn(planRepo, 'findPlanById').mockResolvedValue(draftPlan())
    await expect(
      serviceSendConveyorOperationalPlanToFactory(pool, CONVEYOR_ID, PLAN_ID),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_STATUS_TRANSITION })
  })
})

describe('mapPlanItemEnrichedRowToApi', () => {
  it('derives reviewReasons for item without planned minutes', () => {
    const api = mapPlanItemEnrichedRowToApi(
      sampleItemRow({
        planned_minutes: null,
        planned_collaborator_id: COLLAB_ID,
      }),
      [],
      480,
    )
    expect(api.reviewRequired).toBe(true)
    expect(api.reviewReasons.map((r) => r.code)).toContain('MISSING_PLANNED_MINUTES')
  })

  it('derives reviewReasons for over daily capacity', () => {
    const api = mapPlanItemEnrichedRowToApi(
      sampleItemRow({ planned_minutes: 500, planned_collaborator_id: COLLAB_ID }),
      [],
      480,
    )
    expect(api.reviewReasons.map((r) => r.code)).toContain('OVER_DAILY_CAPACITY')
  })

  it('does not flag over capacity when daily capacity is 540', () => {
    const api = mapPlanItemEnrichedRowToApi(
      sampleItemRow({ planned_minutes: 500, planned_collaborator_id: COLLAB_ID }),
      [],
      540,
    )
    expect(api.reviewReasons.map((r) => r.code)).not.toContain('OVER_DAILY_CAPACITY')
  })

  it('maps realizedMinutes and activityOperationalStatus', () => {
    const api = mapPlanItemEnrichedRowToApi(
      sampleItemRow({ realized_minutes: 75, activity_operational_status: 'IN_PROGRESS' }),
      [],
      480,
    )
    expect(api.realizedMinutes).toBe(75)
    expect(api.activityOperationalStatus).toBe('IN_PROGRESS')
  })

  it('does not infer COMPLETED from realized >= planned', () => {
    const api = mapPlanItemEnrichedRowToApi(
      sampleItemRow({
        planned_minutes: 60,
        realized_minutes: 120,
        activity_operational_status: 'PENDING',
      }),
      [],
      480,
    )
    expect(api.status).toBe('PLANNED')
    expect(api.activityOperationalStatus).toBe('PENDING')
  })
})
