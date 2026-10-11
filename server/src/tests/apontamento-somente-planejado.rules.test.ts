import { describe, expect, it } from 'vitest'
import type { MyWorkQueueRawRow } from '../modules/my-work-queue/my-work-queue.repository.js'
import type { MyWorkQueueItemApi } from '../modules/my-work-queue/my-work-queue.dto.js'
import { consolidateWorkQueueRowsByActivity } from '../modules/my-work-queue/work-queue-consolidation.js'
import { orderKioskQueueByDateBucket } from '../modules/my-work-queue/my-work-queue.service.js'
import { requiresExcessTimeJustification } from '../modules/operational-planning/planned-activity.service.js'

const STEP = '00000000-0000-0000-0000-0000000000a1'
const STEP_2 = '00000000-0000-0000-0000-0000000000a2'
const CONVEYOR = '00000000-0000-0000-0000-0000000000c1'

function row(overrides: Partial<MyWorkQueueRawRow>): MyWorkQueueRawRow {
  return {
    work_plan_id: 'plan',
    work_plan_item_id: 'item',
    planned_date: '2026-10-12',
    planned_order: 0,
    planned_minutes: 60,
    status: 'PLANNED',
    conveyor_id: CONVEYOR,
    conveyor_operational_status: 'EM_ANDAMENTO',
    conveyor_title: 'Esteira',
    client_name: null,
    vehicle_description: null,
    license_plate: null,
    activity_node_id: STEP,
    activity_title: 'Atividade',
    task_title: 'Tarefa',
    sector_title: 'Setor',
    activity_operational_status: 'PENDING',
    is_assigned_to_me: false,
    ...overrides,
  }
}

describe('Minha fila — um cartão por atividade', () => {
  it('sexta da semana passada + segunda desta semana: um cartão, data da sexta, 120 min', () => {
    // Recorte desta semana só contém a segunda; o resumo traz todos os itens do colaborador.
    const rows = [row({ work_plan_item_id: 'seg', planned_date: '2026-10-12', planned_minutes: 60 })]
    const summaries = new Map([[STEP, { firstPlannedDate: '2026-10-09', plannedMinutes: 120 }]])

    const cards = consolidateWorkQueueRowsByActivity(rows, summaries)

    expect(cards).toHaveLength(1)
    expect(cards[0]?.planned_date).toBe('2026-10-09')
    expect(cards[0]?.planned_minutes).toBe(120)
    expect(cards[0]?.is_assigned_to_me).toBe(true)
    // Os itens do recorte (base dos totais e da capacidade) continuam com 60 min.
    expect(rows.reduce((sum, r) => sum + (r.planned_minutes ?? 0), 0)).toBe(60)
  })

  it('dois itens da mesma atividade no recorte viram um cartão com a menor data', () => {
    const rows = [
      row({ work_plan_item_id: 'qua', planned_date: '2026-10-14', planned_order: 1 }),
      row({ work_plan_item_id: 'seg', planned_date: '2026-10-12', planned_order: 3 }),
      row({ work_plan_item_id: 'outra', activity_node_id: STEP_2, planned_date: '2026-10-13' }),
    ]
    const cards = consolidateWorkQueueRowsByActivity(rows, new Map())

    expect(cards.map((c) => c.work_plan_item_id).sort()).toEqual(['outra', 'seg'])
    expect(cards.find((c) => c.activity_node_id === STEP)?.planned_date).toBe('2026-10-12')
  })
})

describe('Excesso de tempo — previsto e realizado do próprio colaborador', () => {
  it('João e Maria com 60 min cada; Maria apontou 60; João aponta 30 → não exige', () => {
    // Realizado de João = 0 (só os apontamentos dele), previsto dele = 60.
    expect(
      requiresExcessTimeJustification({ plannedMinutes: 60, realizedMinutes: 0, minutesNovo: 30 }),
    ).toBe(false)
  })

  it('previsto somando todos os dias: 60 + 60, já apontou 100, aponta 30 → exige', () => {
    expect(
      requiresExcessTimeJustification({ plannedMinutes: 120, realizedMinutes: 100, minutesNovo: 30 }),
    ).toBe(true)
  })

  it('sem previsto não exige', () => {
    expect(
      requiresExcessTimeJustification({ plannedMinutes: null, realizedMinutes: 500, minutesNovo: 30 }),
    ).toBe(false)
  })
})

describe('Fila do Kiosk — atrasadas, hoje e futuras', () => {
  const today = '2026-10-08'
  function item(id: string, plannedDate: string, extra: Partial<MyWorkQueueItemApi> = {}) {
    return {
      workPlanItemId: id,
      plannedDate,
      isActivityCompleted: false,
      isNextRecommended: false,
      ...extra,
    } as MyWorkQueueItemApi
  }

  it('ordena atrasadas, hoje e futuras mantendo a ordem dentro de cada faixa', () => {
    const out = orderKioskQueueByDateBucket(
      [item('fut', '2026-10-20'), item('hoje', today), item('atr', '2026-10-01')],
      today,
    )
    expect(out.map((i) => i.workPlanItemId)).toEqual(['atr', 'hoje', 'fut'])
  })

  it('futura não é recomendada enquanto houver atividade de hoje ou atrasada', () => {
    const out = orderKioskQueueByDateBucket(
      [item('fut', '2026-10-20', { isNextRecommended: true }), item('hoje', today)],
      today,
    )
    expect(out.find((i) => i.workPlanItemId === 'fut')?.isNextRecommended).toBe(false)
  })

  it('só com futuras, a recomendação é preservada', () => {
    const out = orderKioskQueueByDateBucket(
      [item('fut', '2026-10-20', { isNextRecommended: true })],
      today,
    )
    expect(out[0]?.isNextRecommended).toBe(true)
  })
})
