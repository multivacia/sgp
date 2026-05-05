import { describe, expect, it } from 'vitest'
import { postTimeEntryBodySchema } from '../modules/conveyors/conveyorAssignments.schemas.js'

describe('postTimeEntryBodySchema', () => {
  it('mapeia description para notes quando notes omitido', () => {
    expect(
      postTimeEntryBodySchema.parse({
        minutes: 15,
        description: 'feito',
      }),
    ).toMatchObject({ minutes: 15, notes: 'feito' })
  })

  it('prioriza notes quando ambos presentes', () => {
    expect(
      postTimeEntryBodySchema.parse({
        minutes: 10,
        notes: 'a',
        description: 'b',
      }),
    ).toMatchObject({ minutes: 10, notes: 'a' })
  })

  it('rejeita minutes <= 0', () => {
    expect(() => postTimeEntryBodySchema.parse({ minutes: 0 })).toThrow()
  })
})
