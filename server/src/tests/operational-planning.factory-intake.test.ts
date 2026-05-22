import { describe, expect, it, vi, afterEach } from 'vitest'
import type pg from 'pg'
import * as opRepo from '../modules/operational-planning/operational-planning.repository.js'
import { serviceListFactoryIntakeItems } from '../modules/operational-planning/operational-planning.service.js'

const pool = {} as pg.Pool

function sampleIntakeRow(
  partial: Partial<opRepo.FactoryIntakeRawRow> = {},
): opRepo.FactoryIntakeRawRow {
  return {
    conveyor_operational_plan_id: 'plan-1',
    conveyor_operational_plan_item_id: 'cop-item-1',
    conveyor_id: 'cv-1',
    conveyor_name: 'Esteira A',
    activity_node_id: 'step-1',
    planned_date: '2026-05-12',
    planned_order: 0,
    planned_minutes: 90,
    planned_collaborator_id: 'col-1',
    planned_collaborator_name: 'João',
    planned_team_id: null,
    planned_team_name: null,
    task_title: 'Tarefa',
    sector_title: 'Setor',
    activity_title: 'Atividade',
    activity_operational_status: 'PENDING',
    realized_minutes: 15,
    review_required: false,
    sync_status: 'PENDING',
    factory_planning_status: 'NOT_SCHEDULED',
    operational_plan_status: 'WAITING_FACTORY_PLANNING',
    plan_item_status: 'PLANNED',
    total_plan_items: 3,
    linked_plan_items: 1,
    pending_plan_items: 2,
    ...partial,
  }
}

describe('serviceListFactoryIntakeItems', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns mapped intake items', async () => {
    vi.spyOn(opRepo, 'listFactoryIntakeItems').mockResolvedValue([sampleIntakeRow()])
    const out = await serviceListFactoryIntakeItems(pool, '2026-05-12')
    expect(out.items).toHaveLength(1)
    expect(out.items[0]?.conveyorName).toBe('Esteira A')
    expect(out.items[0]?.syncStatus).toBe('PENDING')
    expect(out.items[0]?.realizedMinutes).toBe(15)
    expect(out.items[0]?.activityOperationalStatus).toBe('PENDING')
    expect(out.items[0]?.operationalPlanStatus).toBe('WAITING_FACTORY_PLANNING')
    expect(out.items[0]?.totalPlanItems).toBe(3)
    expect(out.items[0]?.linkedPlanItems).toBe(1)
    expect(out.items[0]?.pendingPlanItems).toBe(2)
  })
})
