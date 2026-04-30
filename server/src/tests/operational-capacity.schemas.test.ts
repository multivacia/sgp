import { describe, expect, it } from 'vitest'
import {
  upsertCollaboratorCapacityOverrideBodySchema,
  upsertOperationalCapacityBodySchema,
} from '../modules/operational-settings/operational-settings.schemas.js'

describe('operational capacity schemas', () => {
  it('aceita defaultDailyMinutes válido', () => {
    const out = upsertOperationalCapacityBodySchema.parse({ defaultDailyMinutes: 480 })
    expect(out.defaultDailyMinutes).toBe(480)
  })

  it('rejeita defaultDailyMinutes <= 0', () => {
    expect(() =>
      upsertOperationalCapacityBodySchema.parse({ defaultDailyMinutes: 0 }),
    ).toThrow()
  })

  it('rejeita defaultDailyMinutes > 1440', () => {
    expect(() =>
      upsertOperationalCapacityBodySchema.parse({ defaultDailyMinutes: 1441 }),
    ).toThrow()
  })

  it('rejeita janela inválida effectiveTo < effectiveFrom', () => {
    expect(() =>
      upsertCollaboratorCapacityOverrideBodySchema.parse({
        dailyMinutes: 300,
        effectiveFrom: '2026-05-01',
        effectiveTo: '2026-04-30',
      }),
    ).toThrow()
  })
})

