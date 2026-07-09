import { describe, expect, it } from 'vitest'
import { productionTimeEntryBodySchema } from '../modules/production/production-time-entries.schemas.js'

const baseBody = {
  conveyorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  stepNodeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
}

describe('productionTimeEntryBodySchema', () => {
  it('aceita minutes>0 sem markAsDone', () => {
    expect(
      productionTimeEntryBodySchema.parse({ ...baseBody, minutes: 30 }),
    ).toMatchObject({ minutes: 30 })
  })

  it('aceita minutes=0 quando markAsDone=true', () => {
    expect(
      productionTimeEntryBodySchema.parse({
        ...baseBody,
        minutes: 0,
        markAsDone: true,
      }),
    ).toMatchObject({ minutes: 0, markAsDone: true })
  })

  it('rejeita minutes=0 quando markAsDone=false ou ausente', () => {
    expect(() =>
      productionTimeEntryBodySchema.parse({ ...baseBody, minutes: 0 }),
    ).toThrow(/minutes deve ser maior que zero/i)
    expect(() =>
      productionTimeEntryBodySchema.parse({
        ...baseBody,
        minutes: 0,
        markAsDone: false,
      }),
    ).toThrow(/minutes deve ser maior que zero/i)
  })

  it('rejeita minutes negativo', () => {
    expect(() =>
      productionTimeEntryBodySchema.parse({ ...baseBody, minutes: -1 }),
    ).toThrow(/negativo/i)
  })
})
