import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import {
  parsePlanItemRealizedMinutes,
  type PlanItemEnrichedRow,
} from '../modules/operational-planning/operational-planning.repository.js'
import {
  planItemEnrichedRowToApi,
  serviceGetOperationalPlanningWeek,
} from '../modules/operational-planning/operational-planning.service.js'
import * as repo from '../modules/operational-planning/operational-planning.repository.js'
import * as conveyorRepo from '../modules/conveyor-operational-plan/conveyor-operational-plan.repository.js'

function sampleRow(
  partial: Partial<PlanItemEnrichedRow> & Pick<PlanItemEnrichedRow, 'id' | 'activity_node_id'>,
): PlanItemEnrichedRow {
  return {
    id: partial.id,
    conveyor_id: partial.conveyor_id ?? 'cv-1',
    conveyor_title: partial.conveyor_title ?? 'Esteira A',
    activity_node_id: partial.activity_node_id,
    activity_title: partial.activity_title ?? 'Atividade',
    task_title: partial.task_title ?? 'Tarefa',
    sector_title: partial.sector_title ?? 'Setor',
    assigned_collaborator_id:
      'assigned_collaborator_id' in partial
        ? (partial.assigned_collaborator_id ?? null)
        : 'col-1',
    assigned_collaborator_name:
      'assigned_collaborator_name' in partial
        ? partial.assigned_collaborator_name ?? null
        : 'Colaborador',
    planned_date: partial.planned_date ?? '2026-05-12',
    planned_order: partial.planned_order ?? 0,
    planned_minutes: partial.planned_minutes ?? 120,
    status: partial.status ?? 'PLANNED',
    notes: partial.notes ?? null,
    realized_minutes: partial.realized_minutes ?? 0,
    activity_operational_status: partial.activity_operational_status ?? 'PENDING',
    assigned_team_id:
      'assigned_team_id' in partial ? (partial.assigned_team_id ?? null) : null,
    conveyor_operational_plan_item_id:
      'conveyor_operational_plan_item_id' in partial
        ? (partial.conveyor_operational_plan_item_id ?? null)
        : null,
  }
}

describe('parsePlanItemRealizedMinutes', () => {
  it('returns 0 for empty values', () => {
    expect(parsePlanItemRealizedMinutes(null)).toBe(0)
    expect(parsePlanItemRealizedMinutes('')).toBe(0)
    expect(parsePlanItemRealizedMinutes('0')).toBe(0)
  })

  it('parses numeric strings', () => {
    expect(parsePlanItemRealizedMinutes('45')).toBe(45)
    expect(parsePlanItemRealizedMinutes(90)).toBe(90)
  })
})

describe('planItemEnrichedRowToApi', () => {
  it('maps realizedMinutes and activityOperationalStatus', () => {
    const api = planItemEnrichedRowToApi(
      sampleRow({
        id: 'item-1',
        activity_node_id: 'step-1',
        realized_minutes: 75,
        activity_operational_status: 'IN_PROGRESS',
      }),
    )
    expect(api.realizedMinutes).toBe(75)
    expect(api.activityOperationalStatus).toBe('IN_PROGRESS')
    expect(api.plannedMinutes).toBe(120)
    expect(api.status).toBe('PLANNED')
  })

  it('does not infer COMPLETED from realized >= planned', () => {
    const api = planItemEnrichedRowToApi(
      sampleRow({
        id: 'item-2',
        activity_node_id: 'step-2',
        planned_minutes: 60,
        realized_minutes: 120,
        activity_operational_status: 'PENDING',
      }),
    )
    expect(api.realizedMinutes).toBe(120)
    expect(api.activityOperationalStatus).toBe('PENDING')
  })

  it('returns COMPLETED only from operational status', () => {
    const api = planItemEnrichedRowToApi(
      sampleRow({
        id: 'item-3',
        activity_node_id: 'step-3',
        realized_minutes: 10,
        activity_operational_status: 'COMPLETED',
      }),
    )
    expect(api.activityOperationalStatus).toBe('COMPLETED')
  })

  it('keeps previous API fields', () => {
    const api = planItemEnrichedRowToApi(
      sampleRow({ id: 'item-4', activity_node_id: 'step-4' }),
    )
    expect(api).toMatchObject({
      id: 'item-4',
      activityNodeId: 'step-4',
      conveyorId: 'cv-1',
      plannedDate: '2026-05-12',
      notes: null,
    })
  })
})

describe('serviceGetOperationalPlanningWeek — execution fields', () => {
  beforeEach(() => {
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes realizedMinutes per planned item from enriched rows', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-1',
      week_start_date: '2026-05-11',
      week_end_date: '2026-05-15',
      status: 'DRAFT',
      created_by: 'user-1',
      published_at: null,
      published_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([
      sampleRow({
        id: 'item-a',
        activity_node_id: 'step-a',
        assigned_collaborator_id: null,
        realized_minutes: 0,
        activity_operational_status: 'PENDING',
      }),
      sampleRow({
        id: 'item-b',
        activity_node_id: 'step-b',
        assigned_collaborator_id: null,
        realized_minutes: 45,
        activity_operational_status: 'IN_PROGRESS',
      }),
    ])

    const out = await serviceGetOperationalPlanningWeek(pool, '2026-05-11')
    expect(out.plan?.items).toHaveLength(2)
    expect(out.plan?.items[0]?.realizedMinutes).toBe(0)
    expect(out.plan?.items[1]?.realizedMinutes).toBe(45)
    expect(out.plan?.items[1]?.activityOperationalStatus).toBe('IN_PROGRESS')
    expect(out.executionOutsidePlanSummary.entriesCount).toBe(0)
    expect(out.executionOutsidePlanEntries).toEqual([])
  })

  it('includes execution outside plan summary and entries', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-1',
      week_start_date: '2026-05-11',
      week_end_date: '2026-05-15',
      status: 'DRAFT',
      created_by: 'user-1',
      published_at: null,
      published_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([
      {
        id: 'te-1',
        conveyor_id: 'cv-1',
        conveyor_title: 'Esteira X',
        activity_node_id: 'step-x',
        activity_title: 'Pintura',
        task_title: 'Funilaria',
        sector_title: 'Prep',
        collaborator_id: 'col-1',
        collaborator_name: 'João',
        entry_at: new Date('2026-05-12T15:00:00.000Z'),
        minutes: 45,
        entry_origin: 'ASSIGNED',
        exception_justification: null,
        notes: null,
      },
    ])

    const out = await serviceGetOperationalPlanningWeek(pool, '2026-05-11')
    expect(out.executionOutsidePlanSummary).toEqual({
      totalMinutes: 45,
      entriesCount: 1,
      activitiesCount: 1,
      conveyorsCount: 1,
    })
    expect(out.executionOutsidePlanEntries).toHaveLength(1)
    expect(out.executionOutsidePlanEntries[0]?.minutes).toBe(45)
  })

  it('exposes syncStatus and syncDifferences for linked conveyor plan items', async () => {
    const pool = {} as pg.Pool
    const copId = 'cop-item-1'
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-1',
      week_start_date: '2026-05-11',
      week_end_date: '2026-05-15',
      status: 'DRAFT',
      created_by: 'user-1',
      published_at: null,
      published_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([
      sampleRow({
        id: 'item-linked',
        activity_node_id: 'step-linked',
        assigned_collaborator_id: null,
        assigned_collaborator_name: null,
        planned_date: '2026-05-12',
        planned_minutes: 90,
        conveyor_operational_plan_item_id: copId,
      }),
    ])
    vi.spyOn(conveyorRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(
      new Map([
        [
          copId,
          {
            id: copId,
            planned_date: '2026-05-13',
            planned_minutes: 90,
            planned_collaborator_id: null,
            planned_team_id: null,
            status: 'PLANNED',
            review_required: false,
            origin_work_plan_item_id: 'item-linked',
          },
        ],
      ]),
    )

    const out = await serviceGetOperationalPlanningWeek(pool, '2026-05-11')
    const linked = out.plan?.items[0]
    expect(linked?.syncStatus).toBe('DIVERGED')
    expect(linked?.syncDifferences?.map((d) => d.code)).toContain('PLANNED_DATE_CHANGED')

    vi.restoreAllMocks()
  })
})
