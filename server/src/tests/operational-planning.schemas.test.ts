import { describe, expect, it } from 'vitest'
import {
  operationalPlanningBacklogQuerySchema,
  operationalPlanningWeekQuerySchema,
  saveOperationalWeekPlanBodySchema,
} from '../modules/operational-planning/operational-planning.schemas.js'

describe('operationalPlanningWeekQuerySchema', () => {
  it('aceita weekStart ISO', () => {
    expect(operationalPlanningWeekQuerySchema.parse({ weekStart: '2026-05-11' }).weekStart).toBe(
      '2026-05-11',
    )
  })

  it('rejeita formato inválido', () => {
    expect(() => operationalPlanningWeekQuerySchema.parse({ weekStart: '11-05-2026' })).toThrow()
  })
})

describe('saveOperationalWeekPlanBodySchema', () => {
  const base = {
    weekStartDate: '2026-05-11',
    weekEndDate: '2026-05-15',
    items: [
      {
        conveyorId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        activityNodeId: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
        assignedCollaboratorId: 'cccccccc-dddd-eeee-ffff-000000000000',
        plannedDate: '2026-05-12',
        plannedOrder: 0,
        plannedMinutes: 90,
        notes: null,
      },
    ],
  }

  it('aceita corpo mínimo', () => {
    const out = saveOperationalWeekPlanBodySchema.parse(base)
    expect(out.items[0]!.plannedMinutes).toBe(90)
  })

  it('aceita items vazio (rascunho sem atividades)', () => {
    const out = saveOperationalWeekPlanBodySchema.parse({
      weekStartDate: '2026-05-11',
      weekEndDate: '2026-05-15',
      items: [],
    })
    expect(out.items).toEqual([])
  })

  it('usa items [] quando a chave é omitida', () => {
    const out = saveOperationalWeekPlanBodySchema.parse({
      weekStartDate: '2026-05-11',
      weekEndDate: '2026-05-15',
    })
    expect(out.items).toEqual([])
  })

  it('rejeita plannedMinutes negativo', () => {
    expect(() =>
      saveOperationalWeekPlanBodySchema.parse({
        ...base,
        items: [{ ...base.items[0]!, plannedMinutes: -1 }],
      }),
    ).toThrow()
  })

  it('rejeita plannedOrder negativo', () => {
    expect(() =>
      saveOperationalWeekPlanBodySchema.parse({
        ...base,
        items: [{ ...base.items[0]!, plannedOrder: -1 }],
      }),
    ).toThrow()
  })
})

describe('operationalPlanningBacklogQuerySchema', () => {
  it('limit default 100 e máximo 100', () => {
    expect(operationalPlanningBacklogQuerySchema.parse({})).toMatchObject({ limit: 100 })
    expect(() => operationalPlanningBacklogQuerySchema.parse({ limit: 101 })).toThrow()
  })
})
