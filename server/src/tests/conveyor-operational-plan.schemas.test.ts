import { describe, expect, it } from 'vitest'
import {
  createConveyorOperationalPlanBodySchema,
  createConveyorOperationalPlanItemBodySchema,
  generateConveyorOperationalPlanItemsBodySchema,
  patchConveyorOperationalPlanItemBodySchema,
} from '../modules/conveyor-operational-plan/conveyor-operational-plan.schemas.js'

describe('conveyor-operational-plan schemas', () => {
  it('accepts empty create plan body', () => {
    const out = createConveyorOperationalPlanBodySchema.parse({})
    expect(out.plannedStartDate).toBeUndefined()
  })

  it('validates item create with activityNodeId', () => {
    const out = createConveyorOperationalPlanItemBodySchema.parse({
      activityNodeId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      plannedOrder: 1,
    })
    expect(out.plannedOrder).toBe(1)
  })

  it('rejects empty patch body', () => {
    expect(() => patchConveyorOperationalPlanItemBodySchema.parse({})).toThrow()
  })

  it('accepts patch with allowed status', () => {
    const out = patchConveyorOperationalPlanItemBodySchema.parse({ status: 'CANCELLED' })
    expect(out.status).toBe('CANCELLED')
  })

  it('rejects negative plannedOrder on patch', () => {
    expect(() =>
      patchConveyorOperationalPlanItemBodySchema.parse({ plannedOrder: -1 }),
    ).toThrow()
  })

  it('accepts generate-items body with defaults', () => {
    const out = generateConveyorOperationalPlanItemsBodySchema.parse({
      plannedStartDate: '2026-06-01',
    })
    expect(out.overwrite).toBe(false)
  })
})
