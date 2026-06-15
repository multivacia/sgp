import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PLANNED_QUANTITY,
  formatUnitAndTotalMinutes,
  normalizeExecutedQuantityInput,
  resolveActivityPlannedQuantity,
  resolveInitialConveyorStepPlannedQuantity,
  resolveActivityPlannedTotalMinutes,
  resolveActualMinutesPerUnit,
  sumExecutedQuantityFromEntries,
} from '../shared/activityOperationalQuantity.js'

describe('activityOperationalQuantity', () => {
  it('atividades existentes assumem plannedQuantity = 1', () => {
    expect(resolveActivityPlannedQuantity(null)).toBe(DEFAULT_PLANNED_QUANTITY)
    expect(resolveActivityPlannedQuantity(undefined)).toBe(1)
  })

  it('plannedTotalMinutes = unit × quantity', () => {
    expect(resolveActivityPlannedTotalMinutes(15, 10)).toBe(150)
    expect(resolveActivityPlannedTotalMinutes(30, 1)).toBe(30)
  })

  it('resolveInitialConveyorStepPlannedQuantity ignora payload na criação', () => {
    expect(resolveInitialConveyorStepPlannedQuantity()).toBe(1)
  })

  it('quantidade 1 mantém equivalência de tempo total', () => {
    expect(resolveActivityPlannedTotalMinutes(45, 1)).toBe(45)
    expect(resolveActivityPlannedTotalMinutes(45, null)).toBe(45)
  })

  it('sumExecutedQuantity ignora null (legado)', () => {
    expect(
      sumExecutedQuantityFromEntries([
        { executedQuantity: 2 },
        { executedQuantity: null },
        { executedQuantity: 1 },
      ]),
    ).toBe(3)
    expect(sumExecutedQuantityFromEntries([{ executedQuantity: null }])).toBe(0)
  })

  it('actualMinutesPerUnit não divide por zero', () => {
    expect(resolveActualMinutesPerUnit(80, 0)).toBeNull()
    expect(resolveActualMinutesPerUnit(80, 4)).toBe(20)
  })

  it('executedQuantity rejeita negativo', () => {
    expect(normalizeExecutedQuantityInput(0)).toBe(0)
    expect(normalizeExecutedQuantityInput(3)).toBe(3)
    expect(() => normalizeExecutedQuantityInput(-1)).toThrow()
  })

  it('formatUnitAndTotalMinutes — qty > 1 vs qty = 1', () => {
    expect(formatUnitAndTotalMinutes(40, 3, (m) => `${m}m`)).toContain('3 un.')
    expect(formatUnitAndTotalMinutes(40, 1, (m) => `${m}m`)).toBe('40m')
  })
})
