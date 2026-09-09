import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as repo from '../modules/operational-planning/operational-planning.repository.js'
import * as capacityMatrix from '../modules/operational-planning/buildCapacityByCollaboratorDay.js'
import {
  isUnchangedFinalizedPlanItem,
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
    conveyorId: 'cv-open',
    activityNodeId: 'step-open',
    assignedCollaboratorId: 'col-1',
    assignedTeamId: null as string | null,
    plannedDate: '2026-05-12',
    plannedOrder: 0,
    plannedMinutes: 60,
    notes: null as string | null,
    conveyorOperationalPlanItemId: null as string | null,
    ...overrides,
  }
}

function finalizedItem(overrides?: Partial<(typeof SAVE_BODY)['items'][0]>) {
  return openItem({
    conveyorId: 'cv-fin',
    activityNodeId: 'step-fin',
    plannedOrder: 1,
    ...overrides,
  })
}

const SAVE_BODY = {
  weekStartDate: WEEK_START,
  weekEndDate: WEEK_END,
  items: [openItem()],
}

function mockPoolWithClient(): {
  pool: pg.Pool
  client: { query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> }
} {
  const pool = { connect: vi.fn() } as unknown as pg.Pool
  const client = {
    query: vi.fn(async () => ({ rows: [] })),
    release: vi.fn(),
  }
  vi.mocked(pool.connect).mockResolvedValue(client as never)
  return { pool, client }
}

function stepRow(
  conveyorId: string,
  activityNodeId: string,
  opts: { conveyorStatus: string; operationalStatus: string },
): repo.StepPlanningValidationRow {
  return {
    conveyor_id: conveyorId,
    conveyor_operational_status: opts.conveyorStatus,
    node_type: 'STEP',
    is_active: true,
    operational_status: opts.operationalStatus,
  }
}

function activePlanItem(
  partial: Partial<repo.ActiveWorkPlanItemRow> &
    Pick<repo.ActiveWorkPlanItemRow, 'id' | 'activityNodeId' | 'conveyorId'>,
): repo.ActiveWorkPlanItemRow {
  return {
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

function finalizedBaseline(
  overrides?: Partial<repo.WeekPlanItemBaseline>,
): repo.WeekPlanItemBaseline {
  return {
    conveyorId: 'cv-fin',
    activityNodeId: 'step-fin',
    assignedCollaboratorId: 'col-1',
    assignedTeamId: null,
    plannedDate: '2026-05-12',
    plannedMinutes: 60,
    notes: null,
    conveyorOperationalPlanItemId: null,
    ...overrides,
  }
}

function mockSaveHappyPath(pool: pg.Pool, client: { query: ReturnType<typeof vi.fn> }) {
  vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
    planRow({ id: 'draft-1', status: 'DRAFT' }),
  )
  vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
  vi.spyOn(repo, 'isActivityPlannedInOtherWeeklyPlan').mockResolvedValue(false)
  vi.spyOn(repo, 'deleteItemsForWorkPlan').mockResolvedValue(undefined)
  vi.spyOn(repo, 'deleteItemsForWorkPlanExcept').mockResolvedValue(undefined)
  vi.spyOn(repo, 'insertWorkPlanItems').mockResolvedValue([
    { id: 'inserted', conveyorOperationalPlanItemId: null },
  ])
  vi.spyOn(repo, 'touchOperationalWorkPlanUpdatedAt').mockResolvedValue(undefined)
  vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
  vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])
  void pool
  void client
}

describe('isUnchangedFinalizedPlanItem', () => {
  const base = finalizedBaseline()

  it('considera iguais quando campos de decisão batem (ignora plannedOrder no caller)', () => {
    expect(
      isUnchangedFinalizedPlanItem(
        {
          assignedCollaboratorId: 'col-1',
          assignedTeamId: null,
          plannedDate: '2026-05-12',
          plannedMinutes: 60,
          notes: null,
          conveyorOperationalPlanItemId: null,
        },
        base,
      ),
    ).toBe(true)
  })

  it('normaliza null/undefined em team, minutes, cop id e notes vazias', () => {
    expect(
      isUnchangedFinalizedPlanItem(
        {
          assignedCollaboratorId: 'col-1',
          assignedTeamId: undefined,
          plannedDate: '2026-05-12',
          plannedMinutes: undefined,
          notes: '  ',
          conveyorOperationalPlanItemId: undefined,
        },
        finalizedBaseline({ plannedMinutes: null, notes: null }),
      ),
    ).toBe(true)
  })

  it('detecta mudança em plannedDate / colaborador / notes', () => {
    expect(
      isUnchangedFinalizedPlanItem(
        {
          assignedCollaboratorId: 'col-1',
          assignedTeamId: null,
          plannedDate: '2026-05-13',
          plannedMinutes: 60,
          notes: null,
          conveyorOperationalPlanItemId: null,
        },
        base,
      ),
    ).toBe(false)
    expect(
      isUnchangedFinalizedPlanItem(
        {
          assignedCollaboratorId: 'col-2',
          assignedTeamId: null,
          plannedDate: '2026-05-12',
          plannedMinutes: 60,
          notes: null,
          conveyorOperationalPlanItemId: null,
        },
        base,
      ),
    ).toBe(false)
    expect(
      isUnchangedFinalizedPlanItem(
        {
          assignedCollaboratorId: 'col-1',
          assignedTeamId: null,
          plannedDate: '2026-05-12',
          plannedMinutes: 60,
          notes: 'outra',
          conveyorOperationalPlanItemId: null,
        },
        base,
      ),
    ).toBe(false)
  })
})

describe('FINALIZADA conveyor preserve no validatePlanItems', () => {
  beforeEach(() => {
    vi.spyOn(capacityMatrix, 'listActiveCollaboratorIdsForPlanningBoard').mockResolvedValue([])
    vi.spyOn(capacityMatrix, 'buildCapacityByCollaboratorDay').mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('1) legado FINALIZADA inalterado + alteração de outro item → save sucesso', async () => {
    const { pool, client } = mockPoolWithClient()
    mockSaveHappyPath(pool, client)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-fin', activityNodeId: 'step-fin' },
      { conveyorId: 'cv-open', activityNodeId: 'step-open' },
    ])
    vi.spyOn(repo, 'listActiveWeekPlanItemBaselines').mockResolvedValue([finalizedBaseline()])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockImplementation(async (_p, cv, activityId) => {
      if (activityId === 'step-fin') {
        return stepRow(cv, activityId, {
          conveyorStatus: 'FINALIZADA',
          operationalStatus: 'COMPLETED',
        })
      }
      return stepRow(cv, activityId, {
        conveyorStatus: 'EM_ANDAMENTO',
        operationalStatus: 'PENDING',
      })
    })
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([
      activePlanItem({
        id: 'keep-fin',
        conveyorId: 'cv-fin',
        activityNodeId: 'step-fin',
        plannedOrder: 1,
      }),
      activePlanItem({ id: 'old-open', conveyorId: 'cv-open', activityNodeId: 'step-open' }),
    ])

    await expect(
      serviceSaveOperationalWeekPlan(pool, ACTOR, {
        ...SAVE_BODY,
        items: [
          finalizedItem({ plannedOrder: 9 }),
          openItem({ plannedMinutes: 90 }),
        ],
      }),
    ).resolves.toBeTruthy()

    expect(repo.listActiveWeekPlanItemBaselines).toHaveBeenCalled()
  })

  it('2) legado FINALIZADA idêntico sozinho → permitido', async () => {
    const { pool, client } = mockPoolWithClient()
    mockSaveHappyPath(pool, client)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-fin', activityNodeId: 'step-fin' },
    ])
    vi.spyOn(repo, 'listActiveWeekPlanItemBaselines').mockResolvedValue([finalizedBaseline()])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue(
      stepRow('cv-fin', 'step-fin', {
        conveyorStatus: 'FINALIZADA',
        operationalStatus: 'COMPLETED',
      }),
    )
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([
      activePlanItem({
        id: 'keep-fin',
        conveyorId: 'cv-fin',
        activityNodeId: 'step-fin',
        plannedOrder: 1,
      }),
    ])

    await expect(
      serviceSaveOperationalWeekPlan(pool, ACTOR, {
        ...SAVE_BODY,
        items: [finalizedItem()],
      }),
    ).resolves.toBeTruthy()
  })

  it('3) novo item esteira FINALIZADA → rejeitado', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([])
    vi.spyOn(repo, 'listActiveWeekPlanItemBaselines').mockResolvedValue([])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue(
      stepRow('cv-fin', 'step-fin', {
        conveyorStatus: 'FINALIZADA',
        operationalStatus: 'PENDING',
      }),
    )

    await expect(
      serviceSaveOperationalWeekPlan(pool, ACTOR, {
        ...SAVE_BODY,
        items: [finalizedItem()],
      }),
    ).rejects.toMatchObject({
      message: 'Esteira concluída não aceita planejamento.',
      statusCode: 400,
      code: ErrorCodes.VALIDATION_ERROR,
      details: {
        conveyorId: 'cv-fin',
        activityNodeId: 'step-fin',
        conveyorOperationalStatus: 'FINALIZADA',
      },
    } satisfies Partial<AppError>)
  })

  it('4) mudança de plannedDate em legado FINALIZADA → rejeitado', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-fin', activityNodeId: 'step-fin' },
    ])
    vi.spyOn(repo, 'listActiveWeekPlanItemBaselines').mockResolvedValue([finalizedBaseline()])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue(
      stepRow('cv-fin', 'step-fin', {
        conveyorStatus: 'FINALIZADA',
        operationalStatus: 'COMPLETED',
      }),
    )

    await expect(
      serviceSaveOperationalWeekPlan(pool, ACTOR, {
        ...SAVE_BODY,
        items: [finalizedItem({ plannedDate: '2026-05-14' })],
      }),
    ).rejects.toMatchObject({
      message: 'Esteira concluída não aceita planejamento.',
      statusCode: 400,
      code: ErrorCodes.VALIDATION_ERROR,
    } satisfies Partial<AppError>)
  })

  it('5) mudança de assignedCollaboratorId em legado FINALIZADA → rejeitado', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      planRow({ id: 'draft-1', status: 'DRAFT' }),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-fin', activityNodeId: 'step-fin' },
    ])
    vi.spyOn(repo, 'listActiveWeekPlanItemBaselines').mockResolvedValue([finalizedBaseline()])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue(
      stepRow('cv-fin', 'step-fin', {
        conveyorStatus: 'FINALIZADA',
        operationalStatus: 'COMPLETED',
      }),
    )

    await expect(
      serviceSaveOperationalWeekPlan(pool, ACTOR, {
        ...SAVE_BODY,
        items: [finalizedItem({ assignedCollaboratorId: 'col-other' })],
      }),
    ).rejects.toMatchObject({
      message: 'Esteira concluída não aceita planejamento.',
      statusCode: 400,
      code: ErrorCodes.VALIDATION_ERROR,
    } satisfies Partial<AppError>)
  })

  it('6) regressão: STEP COMPLETED pré-existente (esteira não FINALIZADA) ainda funciona', async () => {
    const { pool, client } = mockPoolWithClient()
    mockSaveHappyPath(pool, client)
    vi.spyOn(repo, 'listActiveWeekPlanActivityKeys').mockResolvedValue([
      { conveyorId: 'cv-open', activityNodeId: 'step-done' },
    ])
    const baselinesSpy = vi.spyOn(repo, 'listActiveWeekPlanItemBaselines').mockResolvedValue([])
    vi.spyOn(repo, 'loadStepForPlanningValidation').mockResolvedValue(
      stepRow('cv-open', 'step-done', {
        conveyorStatus: 'EM_ANDAMENTO',
        operationalStatus: 'COMPLETED',
      }),
    )
    vi.spyOn(repo, 'listActiveWorkPlanItemsForPlan').mockResolvedValue([
      activePlanItem({
        id: 'keep-done',
        conveyorId: 'cv-open',
        activityNodeId: 'step-done',
      }),
    ])

    await expect(
      serviceSaveOperationalWeekPlan(pool, ACTOR, {
        ...SAVE_BODY,
        items: [
          openItem({
            activityNodeId: 'step-done',
            assignedCollaboratorId: 'col-mutated',
            notes: 'ignored-by-preserve',
          }),
        ],
      }),
    ).resolves.toBeTruthy()

    // Sem esteira FINALIZADA no payload, baselines não precisam ser carregados.
    expect(baselinesSpy).not.toHaveBeenCalled()
    expect(repo.deleteItemsForWorkPlanExcept).toHaveBeenCalledWith(client, 'draft-1', ['keep-done'])
  })

  it('listActiveWeekPlanItemBaselines prefere DRAFT e filtra cancelled/deleted', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          conveyor_id: 'cv-fin',
          activity_node_id: 'step-fin',
          assigned_collaborator_id: 'col-1',
          assigned_team_id: null,
          planned_date: '2026-05-12',
          planned_minutes: 60,
          notes: null,
          conveyor_operational_plan_item_id: null,
        },
      ],
    })
    const mockPool = { query } as unknown as pg.Pool
    const rows = await repo.listActiveWeekPlanItemBaselines(mockPool, ['draft-1', 'pub-1'])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.activityNodeId).toBe('step-fin')
    const sql = String(query.mock.calls[0]?.[0])
    expect(sql).toContain('DISTINCT ON')
    expect(sql).toContain("owpi.status <> 'CANCELLED'")
    expect(sql).toContain('owpi.deleted_at IS NULL')
    expect(sql).toContain("CASE owp.status WHEN 'DRAFT' THEN 0 ELSE 1 END")
    expect(sql).toContain('DRAFT')
    expect(sql).toContain('PUBLISHED')
    expect(query.mock.calls[0]?.[1]).toEqual([['draft-1', 'pub-1']])

    const empty = await repo.listActiveWeekPlanItemBaselines(mockPool, [])
    expect(empty).toEqual([])
  })
})
