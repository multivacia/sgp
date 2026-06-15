import { describe, expect, it } from 'vitest'
import { resolveInitialConveyorStepPlannedQuantity } from '../shared/activityOperationalQuantity.js'

describe('resolveInitialConveyorStepPlannedQuantity', () => {
  it('sempre retorna 1 na criação/materialização inicial', () => {
    expect(resolveInitialConveyorStepPlannedQuantity()).toBe(1)
  })
})
