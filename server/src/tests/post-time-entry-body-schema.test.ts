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

  it('aceita executedQuantity >= 0', () => {
    expect(
      postTimeEntryBodySchema.parse({ minutes: 5, executedQuantity: 2 }),
    ).toMatchObject({ executedQuantity: 2 })
    expect(
      postTimeEntryBodySchema.parse({ minutes: 5, executedQuantity: 0 }),
    ).toMatchObject({ executedQuantity: 0 })
  })

  it('rejeita executedQuantity negativa', () => {
    expect(() =>
      postTimeEntryBodySchema.parse({ minutes: 5, executedQuantity: -1 }),
    ).toThrow()
  })

  it('aceita markAsDone opcional', () => {
    expect(
      postTimeEntryBodySchema.parse({ minutes: 20, markAsDone: true }),
    ).toMatchObject({ minutes: 20, markAsDone: true })
    expect(
      postTimeEntryBodySchema.parse({ minutes: 20 }),
    ).toMatchObject({ minutes: 20, markAsDone: false })
  })

  it('mapeia justificationId para voluntaryJustificationId', () => {
    const id = '11111111-1111-1111-1111-111111111111'
    expect(
      postTimeEntryBodySchema.parse({
        minutes: 10,
        justificationId: id,
        justificationComplement: '  detalhe  ',
      }),
    ).toMatchObject({
      voluntaryJustificationId: id,
      voluntaryJustificationComplement: 'detalhe',
    })
  })
})
