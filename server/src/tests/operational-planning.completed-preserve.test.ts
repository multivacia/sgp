import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as repo from '../modules/operational-planning/operational-planning.repository.js'
import * as conveyorRepo from '../modules/conveyor-operational-plan/conveyor-operational-plan.repository.js'
import * as refreshSync from '../modules/conveyor-operational-plan/refreshConveyorOperationalPlanSyncStatus.js'
import * as operationalSettings from '../modules/operational-settings/operational-settings.service.js'
import {
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

function openItem(overrides?: Partial<(typeof SAVE_BODY)['items'][0]>) {
  return {
    conveyorId: 'cv-1',
    activityNodeId: 'step-open',
    assignedCollaboratorId: 'col-1',
    assignedTeamId: null,
    plannedDate: '2026-05-12',
    plannedOrder: 0,
    plannedMinutes: 60,
    notes: null,
    conveyorOperationalPlanItemId: null as string | null,
    ...overrides,
  }
}

function completedItem(overrides?: Partial<(typeof SAVE_BODY)['items'][0]>) {
  return openItem({
    activityNodeId: 'step-done',
    plannedOrder: 1,
    ...overrides,
  })
}

const SAVE_BODY = {
  weekStartDate: WEEK_START,
  weekEndDate: WEEK_END,
  items: [openItem()],
}

function mockPoolWithClient(): { pool: pg.Pool; client: { query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> } } {
  const pool = { connect: vi.fn() } as unknown as pg.Pool
  const client = {
    query: vi.fn(async () => ({ rows: [] })),
    release: vi.fn(),
  }
  vi.mocked(pool.connect).mockResolvedValue(client as never)
  return { pool, client }
}

function stepRow(
  activityNodeId: string,
  operationalStatus: string,
): repo.StepPlanningValidationRow {
  return {
    conveyor_id: 'cv-1',
    conveyor_operational_status: 'EM_ANDAMENTO',
    node_type: 'STEP',
    is_active: true,
    operational_status: operationalStatus,
  }
}

function activePlanItem(
  partial: Partial<repo.ActiveWorkPlanItemRow> &
    Pick<repo.ActiveWorkPlanItemRow, 'id' | 'activityNodeId'>,
): repo.ActiveWorkPlanItemRow {
  return {
    conveyorId: 'cv-1',
    status: 'PLANNED',
    assignedCollaboratorId: 'col-1',
    assignedTeamId: null,
    plannedDate: '2026-05-12',
    plannedOrder: 0,
    plannedMinutes: 60,
    notes: null,
    conveyorOperationalPlanItemId: null,
    ...partial,
  }
}

describe('COMPLETED STEP preserve no replace seletivo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('1) draft com STEP COMPLETED pré-existente + nova aberta: save preserva id e insere só a nova', async () => {
    const { pool, client } = mockPoolWithClient()
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-1', activityNodeId: 'step-done' },
    ])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockImplementation(async (_p, _cv, activityId) => {
      if (activityId === 'step-done') return stepRow('step-done', 'COMPLETED')
      return stepRow(activityId, 'PENDING')
    })
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([
      activePlanItem({ id: 'keep-done', activityNodeId: 'step-done', plannedOrder: 1 }),
    ])
    const deleteExcept = vi.spyOn(repo, 'deleteItemsForWorkPlanExcept').mockResolvedValue(undefined)
    const deleteAll = vi.spyOn(repo, 'deleteItemsForWorkPlan').mockResolvedValue(undefined)
    const insertSpy = vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([
      { id: 'new-open', conveyorOperationalPlanItemId: null },
    ])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await serviceSaveOperationalWeekPlan(pool, ACTOR, {
      ...SAVE_BODY,
      items: [completedItem(), openItem()],
    })

    expect(deleteExcept).toHaveBeenCalledWith(client, 'draft-1', ['keep-done'])
    expect(deleteAll).not.toHaveBeenCalled()
    expect(insertSpy).toHaveBeenCalledWith(client, 'draft-1', [
      expect.objectContaining({ activityNodeId: 'step-open' }),
    ])
    const inserted = insertSpy.mock.calls[0]?.[2] ?? []
    expect(inserted.some((it) => it.activityNodeId === 'step-done')).toBe(false)
  })

  it('2) published + COMPLETED: patch cria/atualiza revisão com sucesso', async () => {
    const { pool, client } = mockPoolWithClient()
    vi.spyOn(repo, 'findOperationalWorkPlanById').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-1', activityNodeId: 'step-done' },
    ])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockImplementation(async (_p, _cv, activityId) => {
      if (activityId === 'step-done') return stepRow('step-done', 'COMPLETED')
      return stepRow(activityId, 'PENDING')
    })
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)
    vi.spyOn(repo, 'insertOperationalWorkPlan').mockResolvedValue('draft-new')
    vi.spyOn(repo, 'listWorkPlanItemInsertsForPlan').mockResolvedValue([
      {
        conveyorId: 'cv-1',
        activityNodeId: 'step-done',
        assignedCollaboratorId: 'col-1',
        assignedTeamId: null,
        plannedDate: '2026-05-12',
        plannedOrder: 1,
        plannedMinutes: 60,
        notes: null,
        conveyorOperationalPlanItemId: null,
      },
    ])
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([
      activePlanItem({ id: 'seeded-done', activityNodeId: 'step-done', plannedOrder: 1 }),
    ])
    const deleteExcept = vi.spyOn(repo, 'deleteItemsForWorkPlanExcept').mockResolvedValue(undefined)
    vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([
      { id: 'new-open', conveyorOperationalPlanItemId: null },
    ])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await servicePatchOperationalWeekPlan(pool, 'pub-1', ACTOR, {
      ...SAVE_BODY,
      items: [completedItem(), openItem()],
    })

    expect(repo.insertOperationalWorkPlan).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ status: 'DRAFT' }),
    )
    expect(deleteExcept).toHaveBeenCalledWith(client, 'draft-new', ['seeded-done'])
  })

  it('3) coexistência published+draft: COMPLETED permitido via preexisting/exclude', async () => {
    const { pool } = mockPoolWithClient()
    vi.spyOn(repo, 'findOperationalWorkPlanById').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    const keysSpy = vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-1', activityNodeId: 'step-done' },
    ])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockImplementation(async (_p, _cv, activityId) => {
      if (activityId === 'step-done') return stepRow('step-done', 'COMPLETED')
      return stepRow(activityId, 'PENDING')
    })
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([
      activePlanItem({ id: 'keep-done', activityNodeId: 'step-done' }),
    ])
    vi.spyOn(repo, 'deleteItemsForWorkPlanExcept').mockResolvedValue(undefined)
    vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([
      { id: 'new-open', conveyorOperationalPlanItemId: null },
    ])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await servicePatchOperationalWeekPlan(pool, 'draft-1', ACTOR, {
      ...SAVE_BODY,
      items: [completedItem(), openItem()],
    })

    expect(keysSpy).toHaveBeenCalledWith(
      pool,
      expect.arrayContaining(['draft-1', 'pub-1']),
    )
  })

  it('4) publish revisão com COMPLETED + nova aberta → sucesso', async () => {
    const { pool } = mockPoolWithClient()
    vi.spyOn(repo, 'findOperationalWorkPlanById').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan')
      .mockResolvedValueOnce([
        {
          id: 'keep-done',
          conveyor_id: 'cv-1',
          conveyor_title: 'E',
          activity_node_id: 'step-done',
          activity_title: 'Done',
          task_title: 'T',
          sector_title: 'S',
          assigned_collaborator_id: 'col-1',
          assigned_collaborator_name: 'C',
          assigned_team_id: null,
          planned_date: '2026-05-12',
          planned_order: 1,
          planned_minutes: 60,
          status: 'PLANNED',
          notes: null,
          realized_minutes: 0,
          activity_operational_status: 'COMPLETED',
          conveyor_operational_plan_item_id: null,
        },
        {
          id: 'item-open',
          conveyor_id: 'cv-1',
          conveyor_title: 'E',
          activity_node_id: 'step-open',
          activity_title: 'Open',
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
          conveyor_operational_plan_item_id: null,
        },
      ])
      .mockResolvedValue([])
    vi.spyOn(conveyorRepo, 'clearConveyorPlanItemsByOriginWorkPlanItemIds').mockResolvedValue([])
    vi.spyOn(repo, 'softDeleteOperationalWorkPlanWithItems').mockResolvedValue(undefined)
    vi.spyOn(repo, 'publishOperationalWorkPlan').mockResolvedValue(true)
    vi.spyOn(repo, 'listWorkPlanItemLinks').mockResolvedValue([])
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart')
      .mockResolvedValueOnce(planRow({ id: 'pub-old', status: 'PUBLISHED' }))
      .mockResolvedValue(planRow({ id: 'draft-1', status: 'PUBLISHED' }))
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(operationalSettings, 'serviceResolveCollaboratorDailyCapacity').mockResolvedValue(480)
    vi.spyOn(conveyorRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(new Map())
    vi.spyOn(refreshSync, 'refreshConveyorOperationalPlanSyncStatusByItemIds').mockResolvedValue(
      undefined,
    )

    const result = await servicePublishOperationalWeekPlan(pool, 'draft-1', ACTOR)
    expect(result.plan?.id).toBe('draft-1')
    expect(repo.publishOperationalWorkPlan).toHaveBeenCalled()
  })

  it('5) COMPLETED novo (não pré-existente) → 400', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue(
      stepRow('step-done', 'COMPLETED'),
    )

    await expect(
      serviceSaveOperationalWeekPlan(pool, ACTOR, {
        ...SAVE_BODY,
        items: [completedItem()],
      }),
    ).rejects.toMatchObject({
      message: 'Atividade já concluída não pode ser planejada.',
      statusCode: 400,
      code: ErrorCodes.VALIDATION_ERROR,
    } satisfies Partial<AppError>)
  })

  it('6) nova atividade já em outro plano → 409', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue(stepRow('step-open', 'PENDING'))
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(true)

    await expect(serviceSaveOperationalWeekPlan(pool, ACTOR, SAVE_BODY)).rejects.toMatchObject({
      message: 'Atividade já está planejada em outro plano semanal.',
      statusCode: 409,
      code: ErrorCodes.CONFLICT,
    } satisfies Partial<AppError>)
  })

  it('7) COMPLETED pré-existente NÃO recriado como PLANNED (preserve id via deleteExcept)', async () => {
    const { pool, client } = mockPoolWithClient()
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-1', activityNodeId: 'step-done' },
    ])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockImplementation(async (_p, _cv, activityId) => {
      if (activityId === 'step-done') return stepRow('step-done', 'COMPLETED')
      return stepRow(activityId, 'PENDING')
    })
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([
      activePlanItem({
        id: 'owpi-done-original',
        activityNodeId: 'step-done',
        status: 'PLANNED',
      }),
    ])
    const deleteExcept = vi.spyOn(repo, 'deleteItemsForWorkPlanExcept').mockResolvedValue(undefined)
    const insertSpy = vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await serviceSaveOperationalWeekPlan(pool, ACTOR, {
      ...SAVE_BODY,
      items: [completedItem()],
    })

    expect(deleteExcept).toHaveBeenCalledWith(client, 'draft-1', ['owpi-done-original'])
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('8) ao editar mesmo plano, id e status owpi do concluído preservados', async () => {
    const { pool, client } = mockPoolWithClient()
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-1', activityNodeId: 'step-done' },
      { conveyorId: 'cv-1', activityNodeId: 'step-open' },
    ])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockImplementation(async (_p, _cv, activityId) => {
      if (activityId === 'step-done') return stepRow('step-done', 'COMPLETED')
      return stepRow(activityId, 'PENDING')
    })
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([
      activePlanItem({
        id: 'owpi-done-stable',
        activityNodeId: 'step-done',
        status: 'MOVED',
        plannedOrder: 1,
      }),
      activePlanItem({ id: 'owpi-open-old', activityNodeId: 'step-open', status: 'PLANNED' }),
    ])
    const deleteExcept = vi.spyOn(repo, 'deleteItemsForWorkPlanExcept').mockResolvedValue(undefined)
    const insertSpy = vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([
      { id: 'owpi-open-new', conveyorOperationalPlanItemId: null },
    ])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await serviceSaveOperationalWeekPlan(pool, ACTOR, {
      ...SAVE_BODY,
      items: [
        completedItem({ assignedCollaboratorId: 'col-mutated', notes: 'ignored' }),
        openItem({ plannedMinutes: 90 }),
      ],
    })

    expect(deleteExcept).toHaveBeenCalledWith(client, 'draft-1', ['owpi-done-stable'])
    expect(insertSpy).toHaveBeenCalledWith(client, 'draft-1', [
      expect.objectContaining({ activityNodeId: 'step-open', plannedMinutes: 90 }),
    ])
  })

  it('9) revisão: após seed, replace preserva COMPLETED do draft seedado', async () => {
    const { pool, client } = mockPoolWithClient()
    vi.spyOn(repo, 'findOperationalWorkPlanById').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-1', activityNodeId: 'step-done' },
    ])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockImplementation(async (_p, _cv, activityId) => {
      if (activityId === 'step-done') return stepRow('step-done', 'COMPLETED')
      return stepRow(activityId, 'PENDING')
    })
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)
    vi.spyOn(repo, 'insertOperationalWorkPlan').mockResolvedValue('draft-seeded')
    vi.spyOn(repo, 'listWorkPlanItemInsertsForPlan').mockResolvedValue([
      {
        conveyorId: 'cv-1',
        activityNodeId: 'step-done',
        assignedCollaboratorId: 'col-1',
        assignedTeamId: null,
        plannedDate: '2026-05-12',
        plannedOrder: 1,
        plannedMinutes: 60,
        notes: null,
        conveyorOperationalPlanItemId: null,
      },
    ])
    // Após seed, o item COMPLETED no draft tem novo id (seeded-done-id)
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([
      activePlanItem({ id: 'seeded-done-id', activityNodeId: 'step-done', plannedOrder: 1 }),
    ])
    const deleteExcept = vi.spyOn(repo, 'deleteItemsForWorkPlanExcept').mockResolvedValue(undefined)
    const insertSpy = vi.spyOn(repo, 'insertWorkPlanItems')
    // 1ª chamada = seed; 2ª = replace insert da aberta
    insertSpy
      .mockResolvedValueOnce([{ id: 'seeded-done-id', conveyorOperationalPlanItemId: null }])
      .mockResolvedValueOnce([{ id: 'open-new', conveyorOperationalPlanItemId: null }])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await servicePatchOperationalWeekPlan(pool, 'pub-1', ACTOR, {
      ...SAVE_BODY,
      items: [completedItem(), openItem()],
    })

    expect(deleteExcept).toHaveBeenCalledWith(client, 'draft-seeded', ['seeded-done-id'])
    expect(insertSpy).toHaveBeenCalledTimes(2)
    expect(insertSpy.mock.calls[1]?.[2]).toEqual([
      expect.objectContaining({ activityNodeId: 'step-open' }),
    ])
  })

  it('9b) COMPLETED só no published (draft sem linha): replace copia source, não payload mutável', async () => {
    const { pool, client } = mockPoolWithClient()
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    // validate: chave pré-existente via published
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-1', activityNodeId: 'step-done' },
    ])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockImplementation(async (_p, _cv, activityId) => {
      if (activityId === 'step-done') return stepRow('step-done', 'COMPLETED')
      return stepRow(activityId, 'PENDING')
    })
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)
    // Draft alvo sem a linha COMPLETED (seed filtrou / timing)
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([])
    vi.spyOn(repo, 'findActiveWeekPlanItemByActivity').mockResolvedValue(
      activePlanItem({
        id: 'pub-owpi-done',
        activityNodeId: 'step-done',
        assignedCollaboratorId: 'col-original',
        assignedTeamId: 'team-original',
        plannedDate: '2026-05-13',
        plannedOrder: 7,
        plannedMinutes: 45,
        notes: 'fonte-published',
        conveyorOperationalPlanItemId: 'cop-original',
      }),
    )
    const deleteAll = vi.spyOn(repo, 'deleteItemsForWorkPlan').mockResolvedValue(undefined)
    const insertSpy = vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([
      { id: 'copied-done', conveyorOperationalPlanItemId: 'cop-original' },
      { id: 'new-open', conveyorOperationalPlanItemId: null },
    ])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await serviceSaveOperationalWeekPlan(pool, ACTOR, {
      ...SAVE_BODY,
      items: [
        completedItem({
          assignedCollaboratorId: 'col-mutated',
          assignedTeamId: 'team-mutated',
          plannedDate: '2026-05-14',
          plannedOrder: 99,
          plannedMinutes: 999,
          notes: 'payload-mutado',
          conveyorOperationalPlanItemId: 'cop-mutated',
        }),
        openItem(),
      ],
    })

    expect(deleteAll).toHaveBeenCalledWith(client, 'draft-1')
    expect(repo.findActiveWeekPlanItemByActivity).toHaveBeenCalledWith(
      client,
      expect.arrayContaining(['draft-1', 'pub-1']),
      'cv-1',
      'step-done',
    )
    expect(insertSpy).toHaveBeenCalledWith(client, 'draft-1', [
      expect.objectContaining({
        activityNodeId: 'step-done',
        assignedCollaboratorId: 'col-original',
        assignedTeamId: 'team-original',
        plannedDate: '2026-05-13',
        plannedOrder: 7,
        plannedMinutes: 45,
        notes: 'fonte-published',
        conveyorOperationalPlanItemId: 'cop-original',
      }),
      expect.objectContaining({ activityNodeId: 'step-open' }),
    ])
    const inserted = insertSpy.mock.calls[0]?.[2] ?? []
    expect(inserted.some((it) => it.assignedCollaboratorId === 'col-mutated')).toBe(false)
  })

  it('9c) COMPLETED só no published sem source.collaborator: não insere via payload', async () => {
    const { pool } = mockPoolWithClient()
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'pub-1', status: 'PUBLISHED' }),
    )
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-1', activityNodeId: 'step-done' },
    ])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockImplementation(async (_p, _cv, activityId) => {
      if (activityId === 'step-done') return stepRow('step-done', 'COMPLETED')
      return stepRow(activityId, 'PENDING')
    })
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([])
    vi.spyOn(repo, 'findActiveWeekPlanItemByActivity').mockResolvedValue(
      activePlanItem({
        id: 'pub-owpi-done',
        activityNodeId: 'step-done',
        assignedCollaboratorId: null,
      }),
    )
    vi.spyOn(repo, 'deleteItemsForWorkPlan').mockResolvedValue(undefined)
    const insertSpy = vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([
      { id: 'new-open', conveyorOperationalPlanItemId: null },
    ])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await serviceSaveOperationalWeekPlan(pool, ACTOR, {
      ...SAVE_BODY,
      items: [
        completedItem({ assignedCollaboratorId: 'col-mutated' }),
        openItem(),
      ],
    })

    expect(insertSpy).toHaveBeenCalledWith(
      expect.anything(),
      'draft-1',
      [expect.objectContaining({ activityNodeId: 'step-open' })],
    )
    const inserted = insertSpy.mock.calls[0]?.[2] ?? []
    expect(inserted.some((it) => it.activityNodeId === 'step-done')).toBe(false)
  })

  it('10-11) Cancelled/deleted não entram em preexisting (SQL de listActiveWeekPlanActivityKeys)', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    const mockPool = { query } as unknown as pg.Pool

    const empty = await repo.listActiveWeekPlanActivityKeys(mockPool, [])
    expect(empty).toEqual([])
    expect(query).not.toHaveBeenCalled()

    await repo.listActiveWeekPlanActivityKeys(mockPool, ['draft-1', 'pub-1'])
    const sql = String(query.mock.calls[0]?.[0])
    expect(sql).toContain("owpi.status <> 'CANCELLED'")
    expect(sql).toContain('owpi.deleted_at IS NULL')
    expect(sql).toContain('owp.deleted_at IS NULL')
    expect(sql).toContain('DRAFT')
    expect(sql).toContain('PUBLISHED')
    expect(sql).toContain('ANY($1::uuid[])')
    expect(query.mock.calls[0]?.[1]).toEqual([['draft-1', 'pub-1']])
  })

  it('12) duplicidade no payload continua 400', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue(stepRow('step-open', 'PENDING'))
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)

    await expect(
      serviceSaveOperationalWeekPlan(pool, ACTOR, {
        ...SAVE_BODY,
        items: [openItem(), openItem({ plannedOrder: 1 })],
      }),
    ).rejects.toMatchObject({
      message: 'Cada Atividade só pode aparecer uma vez no plano.',
      statusCode: 400,
      code: ErrorCodes.VALIDATION_ERROR,
    } satisfies Partial<AppError>)
  })

  it('14) plano sem COMPLETED: replace ainda faz delete all + insert (regressão)', async () => {
    const { pool, client } = mockPoolWithClient()
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue(stepRow('step-open', 'PENDING'))
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([
      activePlanItem({ id: 'old-open', activityNodeId: 'step-open' }),
    ])
    const deleteAll = vi.spyOn(repo, 'deleteItemsForWorkPlan').mockResolvedValue(undefined)
    const deleteExcept = vi.spyOn(repo, 'deleteItemsForWorkPlanExcept').mockResolvedValue(undefined)
    const insertSpy = vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([
      { id: 'reinserted', conveyorOperationalPlanItemId: null },
    ])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await serviceSaveOperationalWeekPlan(pool, ACTOR, SAVE_BODY)

    expect(deleteAll).toHaveBeenCalledWith(client, 'draft-1')
    expect(deleteExcept).not.toHaveBeenCalled()
    expect(insertSpy).toHaveBeenCalledWith(client, 'draft-1', [
      expect.objectContaining({ activityNodeId: 'step-open' }),
    ])
  })

  it('15) pré-existente com COP id: save não exige WAITING_FACTORY_PLANNING', async () => {
    const { pool, client } = mockPoolWithClient()
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-1', activityNodeId: 'step-open' },
    ])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue(stepRow('step-open', 'PENDING'))
    vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)
    const copSpy = vi.spyOn(repo, 'loadConveyorPlanItemForFactoryLink')
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([
      activePlanItem({
        id: 'item-with-cop',
        activityNodeId: 'step-open',
        conveyorOperationalPlanItemId: 'cop-1',
      }),
    ])
    vi.spyOn(repo, 'deleteItemsForWorkPlan').mockResolvedValue(undefined)
    vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([
      { id: 'reinserted', conveyorOperationalPlanItemId: 'cop-1' },
    ])
    vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await serviceSaveOperationalWeekPlan(pool, ACTOR, {
      ...SAVE_BODY,
      items: [openItem({ conveyorOperationalPlanItemId: 'cop-1' })],
    })

    expect(copSpy).not.toHaveBeenCalled()
    expect(repo.deleteItemsForWorkPlan).toHaveBeenCalledWith(client, 'draft-1')
  })

  it('deleteItemsForWorkPlanExcept com keep vazio deleta todos', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    const client = { query } as unknown as pg.PoolClient
    await repo.deleteItemsForWorkPlanExcept(client, 'plan-1', [])
    expect(query).toHaveBeenCalledWith(
      `DELETE FROM operational_work_plan_items WHERE work_plan_id = $1::uuid`,
      ['plan-1'],
    )
  })

  it('deleteItemsForWorkPlanExcept com keep ids usa <> ALL', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    const client = { query } as unknown as pg.PoolClient
    await repo.deleteItemsForWorkPlanExcept(client, 'plan-1', ['keep-a', 'keep-b'])
    expect(query).toHaveBeenCalledWith(
      `DELETE FROM operational_work_plan_items WHERE work_plan_id = $1::uuid AND id <> ALL($2::uuid[])`,
      ['plan-1', ['keep-a', 'keep-b']],
    )
  })

  it('listActiveWorkPlanItemsForPlan filtra cancelled/deleted', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'i1',
          conveyor_id: 'cv-1',
          activity_node_id: 'step-1',
          status: 'PLANNED',
          assigned_collaborator_id: 'col-1',
          assigned_team_id: null,
          planned_date: '2026-05-12',
          planned_order: 0,
          planned_minutes: 60,
          notes: null,
          conveyor_operational_plan_item_id: null,
        },
      ],
    })
    const mockPool = { query } as unknown as pg.Pool
    const rows = await repo.listActiveWorkPlanItemsForPlan(mockPool, 'plan-1')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe('i1')
    const sql = String(query.mock.calls[0]?.[0])
    expect(sql).toContain("status <> 'CANCELLED'")
    expect(sql).toContain('deleted_at IS NULL')
  })

  it('findActiveWeekPlanItemByActivity prefere DRAFT e filtra cancelled', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'draft-item',
          conveyor_id: 'cv-1',
          activity_node_id: 'step-done',
          status: 'PLANNED',
          assigned_collaborator_id: 'col-1',
          assigned_team_id: null,
          planned_date: '2026-05-12',
          planned_order: 1,
          planned_minutes: 60,
          notes: null,
          conveyor_operational_plan_item_id: null,
        },
      ],
    })
    const mockPool = { query } as unknown as pg.Pool
    const row = await repo.findActiveWeekPlanItemByActivity(
      mockPool,
      ['draft-1', 'pub-1'],
      'cv-1',
      'step-done',
    )
    expect(row?.id).toBe('draft-item')
    const sql = String(query.mock.calls[0]?.[0])
    expect(sql).toContain("owpi.status <> 'CANCELLED'")
    expect(sql).toContain('owpi.deleted_at IS NULL')
    expect(sql).toContain("CASE owp.status WHEN 'DRAFT' THEN 0 ELSE 1 END")
    expect(sql).toContain('LIMIT 1')
    expect(query.mock.calls[0]?.[1]).toEqual([['draft-1', 'pub-1'], 'cv-1', 'step-done'])

    const empty = await repo.findActiveWeekPlanItemByActivity(mockPool, [], 'cv-1', 'step-done')
    expect(empty).toBeNull()
  })
})
