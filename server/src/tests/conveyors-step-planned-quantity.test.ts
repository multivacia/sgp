import { describe, expect, it } from 'vitest'
import {
  resolveActivityPlannedTotalMinutes,
  resolveInitialConveyorStepPlannedQuantity,
} from '../shared/activityOperationalQuantity.js'

describe('resolveInitialConveyorStepPlannedQuantity', () => {
  it('sem quantidade informada na criação, assume 1', () => {
    expect(resolveInitialConveyorStepPlannedQuantity()).toBe(1)
    expect(resolveInitialConveyorStepPlannedQuantity(undefined)).toBe(1)
  })

  it('respeita a quantidade prevista informada na criação', () => {
    expect(resolveInitialConveyorStepPlannedQuantity(4)).toBe(4)
  })

  it('valores inválidos caem para 1 (mesma regra de planned_quantity)', () => {
    expect(resolveInitialConveyorStepPlannedQuantity(0)).toBe(1)
    expect(resolveInitialConveyorStepPlannedQuantity(-3)).toBe(1)
    expect(resolveInitialConveyorStepPlannedQuantity(2.7)).toBe(2)
  })

  it('total previsto = tempo unitário × quantidade informada na criação', () => {
    expect(
      resolveActivityPlannedTotalMinutes(15, resolveInitialConveyorStepPlannedQuantity(10)),
    ).toBe(150)
  })
})
