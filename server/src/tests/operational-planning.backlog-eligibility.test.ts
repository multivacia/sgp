import { describe, expect, it, vi, afterEach } from 'vitest'
import type pg from 'pg'
import {
  OPERATIONAL_PLANNING_BACKLOG_EXCLUDED_CONVEYOR_STATUSES,
  OPERATIONAL_PLANNING_BACKLOG_INACTIVE_PLAN_STATUSES,
  operationalPlanningBacklogConveyorStatusSql,
  operationalPlanningBacklogExcludeConveyorPlanItemsSql,
  operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql,
} from '../modules/operational-planning/operational-planning.backlog-eligibility.js'
import { listOperationalPlanningBacklog } from '../modules/operational-planning/operational-planning.repository.js'
import { serviceListOperationalPlanningBacklog } from '../modules/operational-planning/operational-planning.service.js'
import * as opRepo from '../modules/operational-planning/operational-planning.repository.js'
import * as conveyorRepo from '../modules/conveyors/conveyors.repository.js'

const pool = {} as pg.Pool

describe('operational planning backlog eligibility SQL', () => {
  it('excludes conveyor statuses NO_BACKLOG, EM_REVISAO, PRONTA_LIBERAR and CONCLUIDA', () => {
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

  it('excludes EM_PRODUCAO conveyors with an active operational plan', () => {
    const sql = operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql()
    expect(sql).toContain("operational_status = 'EM_PRODUCAO'")
    expect(sql).toContain('conveyor_operational_plans')
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
    expect(sql).toContain('NO_BACKLOG')
    expect(sql).toContain('EM_REVISAO')
    expect(sql).toContain('PRONTA_LIBERAR')
    expect(sql).toContain('conveyor_operational_plan_items')
    expect(sql).toContain("operational_status = 'EM_PRODUCAO'")
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
  })
})
