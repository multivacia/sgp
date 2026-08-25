import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import type { PlanItemEnrichedRow } from '../modules/operational-planning/operational-planning.repository.js'
import {
  buildOperationalPlanningCapacityBlock,
  type CollaboratorPlanningCapacitySummary,
} from '../modules/operational-planning/operational-planning.capacity.js'
import { serviceGetOperationalPlanningWeek } from '../modules/operational-planning/operational-planning.service.js'
import * as repo from '../modules/operational-planning/operational-planning.repository.js'
import * as conveyorRepo from '../modules/conveyor-operational-plan/conveyor-operational-plan.repository.js'
import * as operationalSettings from '../modules/operational-settings/operational-settings.service.js'

const WEEKDAY_DATES = [
  '2026-05-11',
  '2026-05-12',
  '2026-05-13',
  '2026-05-14',
  '2026-05-15',
] as const

function minutes(hours: number): number {
  return hours * 60
}

function buildExplicitCapacities(
  collaboratorId: string,
  explicitDailyMinutes: Array<number | null>,
) {
  return WEEKDAY_DATES.map((date, index) => ({
    collaboratorId,
    date,
    explicitDailyMinutes: explicitDailyMinutes[index] ?? null,
  }))
}

function item(
  partial: Partial<PlanItemEnrichedRow> & Pick<PlanItemEnrichedRow, 'id' | 'activity_node_id'>,
): PlanItemEnrichedRow {
  return {
    id: partial.id,
    conveyor_id: partial.conveyor_id ?? 'cv-1',
    conveyor_title: partial.conveyor_title ?? 'Esteira 1',
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
        ? (partial.assigned_collaborator_name ?? null)
        : 'Ana',
    assigned_team_id:
      'assigned_team_id' in partial ? (partial.assigned_team_id ?? null) : null,
    planned_date: partial.planned_date ?? '2026-05-12',
    planned_order: partial.planned_order ?? 0,
    planned_minutes: partial.planned_minutes ?? 60,
    status: partial.status ?? 'PLANNED',
    notes: partial.notes ?? null,
    realized_minutes: partial.realized_minutes ?? 0,
    activity_operational_status: partial.activity_operational_status ?? 'PENDING',
    conveyor_operational_plan_item_id:
      'conveyor_operational_plan_item_id' in partial
        ? (partial.conveyor_operational_plan_item_id ?? null)
        : null,
  }
}

function findCollaborator(
  rows: readonly CollaboratorPlanningCapacitySummary[],
  collaboratorId: string,
): CollaboratorPlanningCapacitySummary {
  const found = rows.find((row) => row.collaboratorId === collaboratorId)
  expect(found).toBeDefined()
  return found!
}

describe('buildOperationalPlanningCapacityBlock', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('8h/dia, 5 dias, planejado 40h -> ocupação 100%, saldo 0, status PROXIMO_DO_LIMITE', () => {
    const out = buildOperationalPlanningCapacityBlock({
      weekdayDates: WEEKDAY_DATES,
      items: [
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-12',
          plannedMinutes: minutes(40),
          status: 'PLANNED',
        },
      ],
      explicitCapacityByCollaboratorDay: buildExplicitCapacities('col-1', [480, 480, 480, 480, 480]),
    })

    expect(out.collaborators).toHaveLength(1)
    expect(out.collaborators[0]).toEqual({
      collaboratorId: 'col-1',
      collaboratorName: 'Ana',
      capacityMinutes: minutes(40),
      plannedMinutes: minutes(40),
      availableMinutes: 0,
      overloadMinutes: 0,
      occupancyPct: 100,
      status: 'PROXIMO_DO_LIMITE',
    })
  })

  it('capacidade 40h, planejado 36h -> ocupação 90%, disponível 4h, status PROXIMO_DO_LIMITE', () => {
    const out = buildOperationalPlanningCapacityBlock({
      weekdayDates: WEEKDAY_DATES,
      items: [
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-12',
          plannedMinutes: minutes(36),
          status: 'PLANNED',
        },
      ],
      explicitCapacityByCollaboratorDay: buildExplicitCapacities('col-1', [480, 480, 480, 480, 480]),
    })

    expect(out.collaborators[0]).toMatchObject({
      capacityMinutes: minutes(40),
      plannedMinutes: minutes(36),
      availableMinutes: minutes(4),
      overloadMinutes: 0,
      occupancyPct: 90,
      status: 'PROXIMO_DO_LIMITE',
    })
  })

  it('capacidade 40h, planejado 44h -> ocupação 110%, excesso 4h, status ACIMA_DA_CAPACIDADE', () => {
    const out = buildOperationalPlanningCapacityBlock({
      weekdayDates: WEEKDAY_DATES,
      items: [
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-12',
          plannedMinutes: minutes(44),
          status: 'PLANNED',
        },
      ],
      explicitCapacityByCollaboratorDay: buildExplicitCapacities('col-1', [480, 480, 480, 480, 480]),
    })

    expect(out.collaborators[0]).toMatchObject({
      capacityMinutes: minutes(40),
      plannedMinutes: minutes(44),
      availableMinutes: 0,
      overloadMinutes: minutes(4),
      occupancyPct: 110,
      status: 'ACIMA_DA_CAPACIDADE',
    })
  })

  it('capacidade 40h, planejado 48h -> ocupação 120%, status SOBRECARGA_CRITICA', () => {
    const out = buildOperationalPlanningCapacityBlock({
      weekdayDates: WEEKDAY_DATES,
      items: [
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-12',
          plannedMinutes: minutes(48),
          status: 'PLANNED',
        },
      ],
      explicitCapacityByCollaboratorDay: buildExplicitCapacities('col-1', [480, 480, 480, 480, 480]),
    })

    expect(out.collaborators[0]).toMatchObject({
      occupancyPct: 120,
      overloadMinutes: minutes(8),
      status: 'SOBRECARGA_CRITICA',
    })
  })

  it('sem capacidade cadastrada -> ocupação null, status SEM_CAPACIDADE_CADASTRADA', () => {
    const out = buildOperationalPlanningCapacityBlock({
      weekdayDates: WEEKDAY_DATES,
      items: [
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-12',
          plannedMinutes: minutes(10),
          status: 'PLANNED',
        },
      ],
      explicitCapacityByCollaboratorDay: [
        { collaboratorId: 'col-1', date: '2026-05-11', explicitDailyMinutes: 480 },
        { collaboratorId: 'col-1', date: '2026-05-12', explicitDailyMinutes: 480 },
        { collaboratorId: 'col-1', date: '2026-05-13', explicitDailyMinutes: null },
        { collaboratorId: 'col-1', date: '2026-05-14', explicitDailyMinutes: 480 },
        { collaboratorId: 'col-1', date: '2026-05-15', explicitDailyMinutes: 480 },
      ],
    })

    expect(out.collaborators[0]).toEqual({
      collaboratorId: 'col-1',
      collaboratorName: 'Ana',
      capacityMinutes: null,
      plannedMinutes: minutes(10),
      availableMinutes: null,
      overloadMinutes: 0,
      occupancyPct: null,
      status: 'SEM_CAPACIDADE_CADASTRADA',
    })
  })

  it('carga planejada zero -> ocupação 0%, disponível total, status DISPONIVEL', () => {
    const out = buildOperationalPlanningCapacityBlock({
      weekdayDates: WEEKDAY_DATES,
      items: [
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-12',
          plannedMinutes: 0,
          status: 'PLANNED',
        },
      ],
      explicitCapacityByCollaboratorDay: buildExplicitCapacities('col-1', [480, 480, 480, 480, 480]),
    })

    expect(out.collaborators[0]).toMatchObject({
      capacityMinutes: minutes(40),
      plannedMinutes: 0,
      availableMinutes: minutes(40),
      overloadMinutes: 0,
      occupancyPct: 0,
      status: 'DISPONIVEL',
    })
  })

  it('múltiplas esteiras no mesmo período somam corretamente para o mesmo colaborador', () => {
    const out = buildOperationalPlanningCapacityBlock({
      weekdayDates: WEEKDAY_DATES,
      items: [
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-12',
          plannedMinutes: 120,
          status: 'PLANNED',
        },
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-13',
          plannedMinutes: 180,
          status: 'PLANNED',
        },
      ],
      explicitCapacityByCollaboratorDay: buildExplicitCapacities('col-1', [480, 480, 480, 480, 480]),
    })

    expect(out.collaborators[0]).toMatchObject({
      plannedMinutes: 300,
      availableMinutes: minutes(40) - 300,
    })
  })

  it('colaboradores diferentes não misturam carga', () => {
    const out = buildOperationalPlanningCapacityBlock({
      weekdayDates: WEEKDAY_DATES,
      items: [
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-12',
          plannedMinutes: 120,
          status: 'PLANNED',
        },
        {
          collaboratorId: 'col-2',
          collaboratorName: 'Bruno',
          plannedDate: '2026-05-12',
          plannedMinutes: 60,
          status: 'PLANNED',
        },
      ],
      explicitCapacityByCollaboratorDay: [
        ...buildExplicitCapacities('col-1', [480, 480, 480, 480, 480]),
        ...buildExplicitCapacities('col-2', [480, 480, 480, 480, 480]),
      ],
    })

    expect(findCollaborator(out.collaborators, 'col-1').plannedMinutes).toBe(120)
    expect(findCollaborator(out.collaborators, 'col-2').plannedMinutes).toBe(60)
  })

  it('itens fora do período não entram no cálculo', () => {
    const out = buildOperationalPlanningCapacityBlock({
      weekdayDates: WEEKDAY_DATES,
      items: [
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-16',
          plannedMinutes: 999,
          status: 'PLANNED',
        },
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-12',
          plannedMinutes: 60,
          status: 'PLANNED',
        },
      ],
      explicitCapacityByCollaboratorDay: buildExplicitCapacities('col-1', [480, 480, 480, 480, 480]),
    })

    expect(out.collaborators[0]).toMatchObject({
      plannedMinutes: 60,
      availableMinutes: minutes(40) - 60,
    })
  })

  it('itens cancelados/removidos não entram, respeitando o padrão atual', () => {
    const out = buildOperationalPlanningCapacityBlock({
      weekdayDates: WEEKDAY_DATES,
      items: [
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-12',
          plannedMinutes: 60,
          status: 'PLANNED',
        },
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-13',
          plannedMinutes: 120,
          status: 'CANCELLED',
        },
        {
          collaboratorId: 'col-1',
          collaboratorName: 'Ana',
          plannedDate: '2026-05-14',
          plannedMinutes: 180,
          status: 'REMOVED',
        },
      ],
      explicitCapacityByCollaboratorDay: buildExplicitCapacities('col-1', [480, 480, 480, 480, 480]),
    })

    expect(out.collaborators[0]).toMatchObject({
      plannedMinutes: 60,
      availableMinutes: minutes(40) - 60,
      overloadMinutes: 0,
    })
  })
})

describe('serviceGetOperationalPlanningWeek — capacity block', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna capacity somando múltiplas esteiras e preservando capacityByCollaboratorDay', async () => {
    const pool = {} as pg.Pool

    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-1',
      week_start_date: '2026-05-11',
      week_end_date: '2026-05-15',
      status: 'DRAFT',
      created_by: 'user-1',
      published_at: null,
      published_by: null,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
    })
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listExecutionOutsidePlanEntriesForWeek').mockResolvedValue([])
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([
      item({
        id: 'item-1',
        conveyor_id: 'cv-1',
        conveyor_title: 'Esteira 1',
        activity_node_id: 'step-1',
        assigned_collaborator_id: 'col-1',
        assigned_collaborator_name: 'Ana',
        planned_date: '2026-05-12',
        planned_minutes: 120,
      }),
      item({
        id: 'item-2',
        conveyor_id: 'cv-2',
        conveyor_title: 'Esteira 2',
        activity_node_id: 'step-2',
        assigned_collaborator_id: 'col-1',
        assigned_collaborator_name: 'Ana',
        planned_date: '2026-05-13',
        planned_minutes: 180,
      }),
      item({
        id: 'item-3',
        conveyor_id: 'cv-3',
        conveyor_title: 'Esteira 3',
        activity_node_id: 'step-3',
        assigned_collaborator_id: 'col-2',
        assigned_collaborator_name: 'Bruno',
        planned_date: '2026-05-15',
        planned_minutes: 60,
      }),
    ])
    vi.spyOn(conveyorRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(new Map())
    vi
      .spyOn(operationalSettings, 'serviceResolveCollaboratorDailyCapacity')
      .mockImplementation(async (_pool, collaboratorId, date) => ({
        collaboratorId,
        date: date ?? '2026-05-12',
        defaultDailyMinutes: 480,
        overrideDailyMinutes: null,
        resolvedDailyMinutes: 480,
        source: 'default',
      }))
    vi
      .spyOn(operationalSettings, 'serviceResolveCollaboratorExplicitDailyCapacity')
      .mockImplementation(async (_pool, collaboratorId, date) => ({
        collaboratorId,
        date: date ?? '2026-05-12',
        defaultDailyMinutes: 480,
        overrideDailyMinutes: null,
        explicitDailyMinutes: 480,
        source: 'default',
      }))

    const out = await serviceGetOperationalPlanningWeek(pool, '2026-05-11')

    expect(out.capacityByCollaboratorDay).toEqual([
      {
        collaboratorId: 'col-1',
        date: '2026-05-12',
        capacityMinutes: 480,
        plannedMinutes: 120,
      },
      {
        collaboratorId: 'col-1',
        date: '2026-05-13',
        capacityMinutes: 480,
        plannedMinutes: 180,
      },
      {
        collaboratorId: 'col-2',
        date: '2026-05-15',
        capacityMinutes: 480,
        plannedMinutes: 60,
      },
    ])
    expect(out.capacity.summary.collaboratorsCount).toBe(2)
    expect(out.capacity.summary.totalPlannedMinutes).toBe(360)
    expect(out.capacity.collaborators).toEqual([
      {
        collaboratorId: 'col-1',
        collaboratorName: 'Ana',
        capacityMinutes: 2400,
        plannedMinutes: 300,
        availableMinutes: 2100,
        overloadMinutes: 0,
        occupancyPct: 12.5,
        status: 'DISPONIVEL',
      },
      {
        collaboratorId: 'col-2',
        collaboratorName: 'Bruno',
        capacityMinutes: 2400,
        plannedMinutes: 60,
        availableMinutes: 2340,
        overloadMinutes: 0,
        occupancyPct: 2.5,
        status: 'DISPONIVEL',
      },
    ])
  })
})
