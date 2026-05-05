import { describe, expect, it } from 'vitest'
import {
  createExtraTimeEntryBodySchema,
  listExtraTimeEntriesQuerySchema,
} from '../modules/my-activities/extra-time-entries.schemas.js'

describe('extra-time-entries schemas', () => {
  it('schema de criação válido', () => {
    const out = createExtraTimeEntryBodySchema.parse({
      descriptionId: '11111111-1111-1111-1111-111111111111',
      minutes: 30,
      notes: '  teste  ',
    })
    expect(out.minutes).toBe(30)
    expect(out.notes).toBe('teste')
  })

  it('minutes inválido bloqueado', () => {
    expect(() =>
      createExtraTimeEntryBodySchema.parse({
        descriptionId: '11111111-1111-1111-1111-111111111111',
        minutes: 0,
      }),
    ).toThrow()
  })

  it('descriptionId obrigatório', () => {
    expect(() =>
      createExtraTimeEntryBodySchema.parse({
        minutes: 20,
      }),
    ).toThrow()
  })

  it('list query aplica default de limit', () => {
    expect(listExtraTimeEntriesQuerySchema.parse({})).toEqual({ limit: 10 })
  })
})
