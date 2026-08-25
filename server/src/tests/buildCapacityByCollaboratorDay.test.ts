import { describe, expect, it, vi, beforeEach } from 'vitest'
import type pg from 'pg'
import type { CollaboratorCapacityOverrideRow } from '../modules/operational-settings/operational-settings.repository.js'
import {
  buildCapacityByCollaboratorDay,
  pickOverrideDailyMinutesForDate,
  sumPlannedMinutesByCollaboratorDay,
} from '../modules/operational-planning/buildCapacityByCollaboratorDay.js'

const repoMocks = vi.hoisted(() => ({
  getOperationalCapacitySettings: vi.fn(),
  listCollaboratorCapacityOverrides: vi.fn(),
}))

vi.mock('../modules/operational-settings/operational-settings.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/operational-settings/operational-settings.repository.js')
  >('../modules/operational-settings/operational-settings.repository.js')
  return {
    ...actual,
    getOperationalCapacitySettings: repoMocks.getOperationalCapacitySettings,
    listCollaboratorCapacityOverrides: repoMocks.listCollaboratorCapacityOverrides,
  }
})

const COLLAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const COLLAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const WEEK = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28'] as const

function override(
  partial: Partial<CollaboratorCapacityOverrideRow> &
    Pick<CollaboratorCapacityOverrideRow, 'collaborator_id' | 'daily_minutes'>,
): CollaboratorCapacityOverrideRow {
  return {
    id: 'ov-1',
    effective_from: null,
    effective_to: null,
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    created_by: null,
    updated_by: null,
    deleted_at: null,
    ...partial,
  }
}

describe('pickOverrideDailyMinutesForDate', () => {
  it('respeita effective_from / effective_to por data', () => {
    const rows = [
      override({
        collaborator_id: COLLAB_A,
        daily_minutes: 360,
        effective_from: '2026-08-25',
        effective_to: '2026-08-25',
      }),
    ]
    expect(pickOverrideDailyMinutesForDate(rows, COLLAB_A, '2026-08-24')).toBeNull()
    expect(pickOverrideDailyMinutesForDate(rows, COLLAB_A, '2026-08-25')).toBe(360)
    expect(pickOverrideDailyMinutesForDate(rows, COLLAB_A, '2026-08-26')).toBeNull()
  })

  it('ignora override inativo ou de outro colaborador', () => {
    const rows = [
      override({
        collaborator_id: COLLAB_A,
        daily_minutes: 300,
        is_active: false,
      }),
      override({
        collaborator_id: COLLAB_B,
        daily_minutes: 200,
      }),
    ]
    expect(pickOverrideDailyMinutesForDate(rows, COLLAB_A, '2026-08-25')).toBeNull()
  })
})

describe('sumPlannedMinutesByCollaboratorDay', () => {
  it('soma múltiplas atividades do mesmo colaborador no mesmo dia', () => {
    const map = sumPlannedMinutesByCollaboratorDay([
      {
        assigned_collaborator_id: COLLAB_A,
        planned_date: '2026-08-25',
        planned_minutes: 300,
      },
      {
        assigned_collaborator_id: COLLAB_A,
        planned_date: '2026-08-25',
        planned_minutes: 240,
      },
      {
        assigned_collaborator_id: COLLAB_A,
        planned_date: '2026-08-26',
        planned_minutes: 60,
      },
    ])
    expect(map.get(`${COLLAB_A}|2026-08-25`)).toBe(540)
    expect(map.get(`${COLLAB_A}|2026-08-26`)).toBe(60)
  })
})

describe('buildCapacityByCollaboratorDay', () => {
  beforeEach(() => {
    repoMocks.getOperationalCapacitySettings.mockReset()
    repoMocks.listCollaboratorCapacityOverrides.mockReset()
    repoMocks.getOperationalCapacitySettings.mockResolvedValue({
      id: 1,
      default_daily_minutes: 480,
      created_at: new Date(),
      updated_at: new Date(),
      updated_by: null,
    })
    repoMocks.listCollaboratorCapacityOverrides.mockResolvedValue([])
  })

  it('semana sem itens devolve capacidade dos colaboradores para todos os dias', async () => {
    const out = await buildCapacityByCollaboratorDay({} as pg.Pool, {
      items: [],
      weekdayDates: WEEK,
      collaboratorIds: [COLLAB_A],
    })
    expect(out).toHaveLength(5)
    expect(out.every((r) => r.collaboratorId === COLLAB_A)).toBe(true)
    expect(out.every((r) => r.capacityMinutes === 480)).toBe(true)
    expect(out.every((r) => r.plannedMinutes === 0)).toBe(true)
    expect(new Set(out.map((r) => r.date)).size).toBe(5)
  })

  it('plano vazio + múltiplos colaboradores não duplica colaborador+data', async () => {
    const out = await buildCapacityByCollaboratorDay({} as pg.Pool, {
      items: [],
      weekdayDates: ['2026-08-25'],
      collaboratorIds: [COLLAB_A, COLLAB_B, COLLAB_A],
    })
    expect(out).toHaveLength(2)
    expect(out.map((r) => r.collaboratorId).sort()).toEqual([COLLAB_A, COLLAB_B])
  })

  it('aplica capacidade padrão e override vigente na data', async () => {
    repoMocks.listCollaboratorCapacityOverrides.mockResolvedValue([
      override({
        collaborator_id: COLLAB_A,
        daily_minutes: 360,
        effective_from: '2026-08-25',
        effective_to: '2026-08-25',
      }),
    ])
    const out = await buildCapacityByCollaboratorDay({} as pg.Pool, {
      items: [
        {
          id: '1',
          conveyor_id: 'c',
          conveyor_title: 'E',
          activity_node_id: 'a',
          activity_title: 'At',
          task_title: 'T',
          sector_title: 'S',
          assigned_collaborator_id: COLLAB_A,
          assigned_collaborator_name: 'João',
          assigned_team_id: null,
          planned_date: '2026-08-25',
          planned_order: 1,
          planned_minutes: 420,
          status: 'PLANNED',
          notes: null,
          realized_minutes: 0,
          activity_operational_status: null,
          conveyor_operational_plan_item_id: null,
        },
      ],
      weekdayDates: ['2026-08-24', '2026-08-25'],
      collaboratorIds: [COLLAB_A],
    })
    const mon = out.find((r) => r.date === '2026-08-24')
    const tue = out.find((r) => r.date === '2026-08-25')
    expect(mon?.capacityMinutes).toBe(480)
    expect(mon?.plannedMinutes).toBe(0)
    expect(tue?.capacityMinutes).toBe(360)
    expect(tue?.plannedMinutes).toBe(420)
  })

  it('inclui colaborador presente só nos itens mesmo fora da lista ativa', async () => {
    const out = await buildCapacityByCollaboratorDay({} as pg.Pool, {
      items: [
        {
          id: '1',
          conveyor_id: 'c',
          conveyor_title: 'E',
          activity_node_id: 'a',
          activity_title: 'At',
          task_title: 'T',
          sector_title: 'S',
          assigned_collaborator_id: COLLAB_B,
          assigned_collaborator_name: 'Maria',
          assigned_team_id: null,
          planned_date: '2026-08-25',
          planned_order: 1,
          planned_minutes: 60,
          status: 'PLANNED',
          notes: null,
          realized_minutes: 0,
          activity_operational_status: null,
          conveyor_operational_plan_item_id: null,
        },
      ],
      weekdayDates: ['2026-08-25'],
      collaboratorIds: [COLLAB_A],
    })
    expect(out.map((r) => r.collaboratorId).sort()).toEqual([COLLAB_A, COLLAB_B])
  })
})
