import { describe, expect, it, vi, afterEach } from 'vitest'
import type pg from 'pg'
import {
  OPERATIONAL_PLANNING_BACKLOG_EXCLUDED_CONVEYOR_STATUSES,
  OPERATIONAL_PLANNING_BACKLOG_INACTIVE_PLAN_STATUSES,
  operationalPlanningBacklogConveyorStatusSql,
  operationalPlanningBacklogExcludeConveyorPlanItemsSql,
  operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql,
  operationalPlanningBacklogExcludeWeeklyPlanItemsSql,
  stepSatisfiesLateAddBacklogException,
} from '../modules/operational-planning/operational-planning.backlog-eligibility.js'
import { listOperationalPlanningBacklog } from '../modules/operational-planning/operational-planning.repository.js'
import { serviceListOperationalPlanningBacklog } from '../modules/operational-planning/operational-planning.service.js'
import * as opRepo from '../modules/operational-planning/operational-planning.repository.js'
import * as conveyorRepo from '../modules/conveyors/conveyors.repository.js'

const pool = {} as pg.Pool

describe('operational planning backlog eligibility SQL', () => {
  it('excludes conveyor statuses EM_ELABORACAO, AGUARDANDO_PLANEJAMENTO, FINALIZADA e CANCELADA', () => {
    const sql = operationalPlanningBacklogConveyorStatusSql()
    for (const status of OPERATIONAL_PLANNING_BACKLOG_EXCLUDED_CONVEYOR_STATUSES) {
      expect(sql).toContain(`'${status}'`)
    }
    expect(sql).toMatch(/NOT IN/)
  })

  it('excludes STEPs linked to active conveyor operational plan items', () => {
    const sql = operationalPlanningBacklogExcludeConveyorPlanItemsSql()
    expect(sql).toContain('conveyor_operational_plan_items')
    expect(sql).toContain('conveyor_operational_plans')
    for (const status of OPERATIONAL_PLANNING_BACKLOG_INACTIVE_PLAN_STATUSES) {
      expect(sql).toContain(`'${status}'`)
    }
    expect(sql).toContain("copi.status <> 'CANCELLED'")
  })

  it('excludes EM_ANDAMENTO conveyors with an active operational plan', () => {
    const sql = operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql()
    expect(sql).toContain("operational_status = 'EM_ANDAMENTO'")
    expect(sql).toContain('conveyor_operational_plans')
  })

  it('A2: lateAddToWeeklyBacklog exception uses step alias (default step)', () => {
    const sql = operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql()
    expect(sql).toContain("metadata_json->>'lateAddToWeeklyBacklog'")
    expect(sql).toContain("= 'true'")
    expect(sql).toContain('step.metadata_json')
    expect(sql).toContain('cv.operational_status')
  })

  it('A2: accepts custom conveyorAlias and stepAlias without breaking call site order', () => {
    const sql = operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql('cv', 'step')
    expect(sql).toContain('cv.operational_status')
    expect(sql).toContain('step.metadata_json')
    // Chamada legado do repository: só conveyorAlias — stepAlias permanece 'step'
    const legacy = operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql('cv')
    expect(legacy).toContain('step.metadata_json')
  })

  it('A6: fragmento SQL inclui exceção lateAddToWeeklyBacklog=true', () => {
    const sql = operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql()
    expect(sql).toContain("COALESCE(step.metadata_json->>'lateAddToWeeklyBacklog', 'false') = 'true'")
    // Proteções A6 só dentro da exceção late-add (não filtro global ABORTED no repository)
    expect(sql).toContain("operational_status IS DISTINCT FROM 'ABORTED'")
    expect(sql).toContain("operational_status IS DISTINCT FROM 'COMPLETED'")
    expect(sql).toContain('is_active = TRUE')
    expect(sql).toContain('deleted_at IS NULL')
  })

  it('A6: helper puro — exige flag lateAdd; exclui ABORTED e COMPLETED', () => {
    expect(
      stepSatisfiesLateAddBacklogException({
        lateAddToWeeklyBacklog: true,
        operationalStatus: 'PENDING',
        isActive: true,
        deletedAt: null,
      }),
    ).toBe(true)
    expect(
      stepSatisfiesLateAddBacklogException({
        lateAddToWeeklyBacklog: false,
        operationalStatus: 'PENDING',
        isActive: true,
        deletedAt: null,
      }),
    ).toBe(false)
    expect(
      stepSatisfiesLateAddBacklogException({
        lateAddToWeeklyBacklog: true,
        operationalStatus: 'ABORTED',
        isActive: true,
        deletedAt: null,
      }),
    ).toBe(false)
    expect(
      stepSatisfiesLateAddBacklogException({
        lateAddToWeeklyBacklog: true,
        operationalStatus: 'COMPLETED',
        isActive: true,
        deletedAt: null,
      }),
    ).toBe(false)
  })

  it('A6: helper puro — exige is_active=TRUE e deleted_at IS NULL', () => {
    expect(
      stepSatisfiesLateAddBacklogException({
        lateAddToWeeklyBacklog: true,
        operationalStatus: 'PENDING',
        isActive: false,
        deletedAt: null,
      }),
    ).toBe(false)
    expect(
      stepSatisfiesLateAddBacklogException({
        lateAddToWeeklyBacklog: true,
        operationalStatus: 'PENDING',
        isActive: true,
        deletedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe(false)
  })

  it('A6: REOPENED (ou status ≠ ABORTED/COMPLETED) com flag NÃO é bloqueado pelas proteções A6', () => {
    expect(
      stepSatisfiesLateAddBacklogException({
        lateAddToWeeklyBacklog: true,
        operationalStatus: 'REOPENED',
        isActive: true,
        deletedAt: null,
      }),
    ).toBe(true)
    expect(
      stepSatisfiesLateAddBacklogException({
        lateAddToWeeklyBacklog: true,
        operationalStatus: 'IN_PROGRESS',
        isActive: true,
        deletedAt: null,
      }),
    ).toBe(true)
    expect(
      stepSatisfiesLateAddBacklogException({
        lateAddToWeeklyBacklog: 'true',
        operationalStatus: null,
        isActive: true,
        deletedAt: null,
      }),
    ).toBe(true)
    // Fragmento SQL continua com IS DISTINCT FROM (REOPENED passa no AND NOT ABORTED/COMPLETED)
    const sql = operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql()
    expect(sql).toMatch(/IS DISTINCT FROM 'ABORTED'/)
    expect(sql).toMatch(/IS DISTINCT FROM 'COMPLETED'/)
    expect(sql).not.toContain("= 'REOPENED'")
  })

  it('excludes STEPs already present in active weekly work plans', () => {
    const sql = operationalPlanningBacklogExcludeWeeklyPlanItemsSql()
    expect(sql).toContain('operational_work_plan_items')
    expect(sql).toContain('operational_work_plans')
    expect(sql).toContain('deleted_at IS NULL')
    expect(sql).toContain("status <> 'CANCELLED'")
    expect(sql).toContain('DRAFT')
    expect(sql).toContain('PUBLISHED')
    expect(sql).not.toContain("owp.status <> 'CANCELLED'")
  })

  it('listOperationalPlanningBacklog query applies eligibility filters', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    const mockPool = { query } as unknown as pg.Pool
    await listOperationalPlanningBacklog(mockPool, {
      q: null,
      limit: 50,
      conveyorId: null,
      collaboratorId: null,
    })
    const sql = String(query.mock.calls[0]?.[0])
    expect(sql).toContain('EM_ELABORACAO')
    expect(sql).toContain('AGUARDANDO_PLANEJAMENTO')
    expect(sql).toContain('FINALIZADA')
    expect(sql).toContain('conveyor_operational_plan_items')
    expect(sql).toContain('operational_work_plan_items')
    expect(sql).toContain('operational_work_plans')
    expect(sql).toContain("operational_status = 'EM_ANDAMENTO'")
    expect(sql).toContain("step.operational_status IS DISTINCT FROM 'COMPLETED'")
  })
})

describe('serviceListOperationalPlanningBacklog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps rows returned by repository after eligibility filtering', async () => {
    vi.spyOn(opRepo, 'listOperationalPlanningBacklog').mockResolvedValue([
      {
        conveyor_id: 'cv-legacy',
        conveyor_title: 'Esteira legado',
        client_name: null,
        vehicle_description: null,
        license_plate: null,
        estimated_deadline: null,
        activity_node_id: 'step-1',
        activity_title: 'Atividade',
        task_title: 'Tarefa',
        sector_title: 'Setor',
        planned_minutes: 60,
        realized_minutes: 0,
        pending_minutes: 60,
        assigned_collaborators_json: [],
        assigned_teams_json: [],
      },
    ])
    vi.spyOn(opRepo, 'loadPlanningSuggestionFactsForSteps').mockResolvedValue({
      assignees: [],
      members: [],
      queryCount: 0,
    })
    vi.spyOn(conveyorRepo, 'listConveyorNodesForSequenceAnalysis').mockResolvedValue([
      {
        id: 'step-1',
        parent_id: 'area-1',
        node_type: 'STEP',
        name: 'Atividade',
        is_active: true,
        operational_status: 'PENDING',
        order_index: 0,
      },
    ])

    const out = await serviceListOperationalPlanningBacklog(pool, {
      q: null,
      limit: 100,
      conveyorId: null,
      collaboratorId: null,
    })

    expect(out.items).toHaveLength(1)
    expect(out.items[0]?.conveyorId).toBe('cv-legacy')
    expect(out.items[0]?.activityNodeId).toBe('step-1')
    expect(out.items[0]?.suggestionContext.members).toEqual([])
  })
})
