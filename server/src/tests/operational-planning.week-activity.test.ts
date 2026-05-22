import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import * as repo from '../modules/operational-planning/operational-planning.repository.js'
import {
  mapWeekActivityStepEventToApi,
  mapWeekActivityTimeEntryToApi,
  mergeWeekActivityItems,
  type WeekActivityStepEventRow,
  type WeekActivityTimeEntryRow,
} from '../modules/operational-planning/operational-planning.week-activity.js'
import { serviceGetOperationalPlanningWeekActivity } from '../modules/operational-planning/operational-planning.service.js'

function sampleTimeEntry(
  partial: Partial<WeekActivityTimeEntryRow> & Pick<WeekActivityTimeEntryRow, 'id'>,
): WeekActivityTimeEntryRow {
  return {
    conveyor_id: partial.conveyor_id ?? 'cv-1',
    conveyor_name: partial.conveyor_name ?? 'Esteira A',
    activity_node_id: partial.activity_node_id ?? 'step-1',
    activity_title: partial.activity_title ?? 'Pintura',
    task_title: partial.task_title ?? 'Funilaria',
    sector_title: partial.sector_title ?? 'Prep',
    collaborator_id: partial.collaborator_id ?? 'col-1',
    collaborator_name: partial.collaborator_name ?? 'João',
    occurred_at: partial.occurred_at ?? new Date('2026-05-13T14:00:00.000Z'),
    minutes: partial.minutes ?? 30,
    entry_origin: partial.entry_origin ?? 'ASSIGNED',
    exception_justification: partial.exception_justification ?? null,
    outside_plan: partial.outside_plan ?? false,
    ...partial,
    id: partial.id,
  }
}

function sampleStepEvent(
  partial: Partial<WeekActivityStepEventRow> & Pick<WeekActivityStepEventRow, 'id'>,
): WeekActivityStepEventRow {
  return {
    conveyor_id: partial.conveyor_id ?? 'cv-1',
    conveyor_name: partial.conveyor_name ?? 'Esteira A',
    activity_node_id: partial.activity_node_id ?? 'step-1',
    activity_title: partial.activity_title ?? 'Pintura',
    task_title: partial.task_title ?? 'Funilaria',
    sector_title: partial.sector_title ?? 'Prep',
    occurred_at: partial.occurred_at ?? new Date('2026-05-13T16:00:00.000Z'),
    event_type: partial.event_type ?? 'CONVEYOR_STEP_COMPLETED',
    actor_name: partial.actor_name ?? 'Gestor',
    ...partial,
    id: partial.id,
  }
}

describe('mapWeekActivityTimeEntryToApi', () => {
  it('maps planned entry with outsidePlan false', () => {
    const api = mapWeekActivityTimeEntryToApi(
      sampleTimeEntry({ id: 'e1', outside_plan: false }),
    )
    expect(api.kind).toBe('TIME_ENTRY')
    expect(api.outsidePlan).toBe(false)
    expect(api.minutes).toBe(30)
    expect(api.id).toBe('te:e1')
  })

  it('maps outside plan entry', () => {
    const api = mapWeekActivityTimeEntryToApi(
      sampleTimeEntry({ id: 'e2', outside_plan: true }),
    )
    expect(api.outsidePlan).toBe(true)
    expect(api.description).toContain('fora do plano')
  })

  it('maps UNASSIGNED_EXCEPTION and justification', () => {
    const api = mapWeekActivityTimeEntryToApi(
      sampleTimeEntry({
        id: 'e3',
        entry_origin: 'UNASSIGNED_EXCEPTION',
        exception_justification: 'Apoio urgente',
      }),
    )
    expect(api.entryOrigin).toBe('UNASSIGNED_EXCEPTION')
    expect(api.exceptionJustification).toBe('Apoio urgente')
    expect(api.description).toContain('exceção')
  })
})

describe('mapWeekActivityStepEventToApi', () => {
  it('maps STEP_COMPLETED', () => {
    const api = mapWeekActivityStepEventToApi(sampleStepEvent({ id: 'ev-1' }))
    expect(api.kind).toBe('STEP_COMPLETED')
    expect(api.outsidePlan).toBeNull()
    expect(api.actorName).toBe('Gestor')
  })

  it('maps STEP_REOPENED', () => {
    const api = mapWeekActivityStepEventToApi(
      sampleStepEvent({ id: 'ev-2', event_type: 'CONVEYOR_STEP_REOPENED' }),
    )
    expect(api.kind).toBe('STEP_REOPENED')
    expect(api.description).toContain('reabriu')
  })
})

describe('mergeWeekActivityItems', () => {
  it('orders by occurredAt desc', () => {
    const { items } = mergeWeekActivityItems(
      [
        sampleTimeEntry({
          id: 'old',
          occurred_at: new Date('2026-05-12T10:00:00.000Z'),
        }),
      ],
      [
        sampleStepEvent({
          id: 'new',
          occurred_at: new Date('2026-05-13T18:00:00.000Z'),
        }),
      ],
      100,
    )
    expect(items[0]?.kind).toBe('STEP_COMPLETED')
    expect(items[1]?.kind).toBe('TIME_ENTRY')
  })

  it('limits result and sets hasMore', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      sampleTimeEntry({
        id: `e${i}`,
        occurred_at: new Date(`2026-05-13T1${i}:00:00.000Z`),
      }),
    )
    const { items, hasMore } = mergeWeekActivityItems(entries, [], 3)
    expect(items).toHaveLength(3)
    expect(hasMore).toBe(true)
  })
})

describe('serviceGetOperationalPlanningWeekActivity', () => {
  beforeEach(() => {
    vi.spyOn(repo, 'findOperationalWorkPlanByWeekStart').mockResolvedValue({
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns week time entries and step events', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'listWeekActivityTimeEntriesForWeek').mockResolvedValue([
      sampleTimeEntry({ id: 'te-1' }),
    ])
    vi.spyOn(repo, 'listWeekActivityStepEventsForWeek').mockResolvedValue([
      sampleStepEvent({ id: 'ev-1' }),
    ])

    const out = await serviceGetOperationalPlanningWeekActivity(pool, '2026-05-11')
    expect(out.data).toHaveLength(2)
    expect(out.meta.count).toBe(2)
    expect(out.data.some((i) => i.kind === 'TIME_ENTRY')).toBe(true)
    expect(out.data.some((i) => i.kind === 'STEP_COMPLETED')).toBe(true)
  })

  it('respects limit parameter', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'listWeekActivityTimeEntriesForWeek').mockResolvedValue(
      Array.from({ length: 10 }, (_, i) =>
        sampleTimeEntry({
          id: `te-${i}`,
          occurred_at: new Date(`2026-05-13T${10 + i}:00:00.000Z`),
        }),
      ),
    )
    vi.spyOn(repo, 'listWeekActivityStepEventsForWeek').mockResolvedValue([])

    const out = await serviceGetOperationalPlanningWeekActivity(pool, '2026-05-11', 5)
    expect(out.data).toHaveLength(5)
    expect(out.meta.hasMore).toBe(true)
  })

  it('passes workPlanId null when no plan exists', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    const listTe = vi.spyOn(repo, 'listWeekActivityTimeEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listWeekActivityStepEventsForWeek').mockResolvedValue([])

    await serviceGetOperationalPlanningWeekActivity(pool, '2026-05-11')

    expect(listTe).toHaveBeenCalledWith(
      pool,
      expect.objectContaining({ workPlanId: null }),
    )
  })
})
