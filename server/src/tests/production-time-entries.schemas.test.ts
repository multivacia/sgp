import { describe, expect, it } from 'vitest'
import {
  productionTimeEntryBodySchema,
  productionUnassignedTimeEntryBodySchema,
} from '../modules/production/production-time-entries.schemas.js'

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

describe('productionUnassignedTimeEntryBodySchema', () => {
  it('aceita apontamento não alocado com justificativa por catálogo', () => {
    expect(
      productionUnassignedTimeEntryBodySchema.parse({
        ...baseBody,
        minutes: 30,
        exceptionJustificationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      }),
    ).toMatchObject({ minutes: 30 })
  })

  it('aceita apontamento não alocado com justificativa em texto livre', () => {
    expect(
      productionUnassignedTimeEntryBodySchema.parse({
        ...baseBody,
        minutes: 15,
        exceptionJustification: 'Cobrindo colega em pausa.',
      }),
    ).toMatchObject({ minutes: 15, exceptionJustification: 'Cobrindo colega em pausa.' })
  })

  it('aceita sem nenhuma justificativa no corpo (obrigatoriedade é regra de negócio no service)', () => {
    expect(
      productionUnassignedTimeEntryBodySchema.parse({ ...baseBody, minutes: 20 }),
    ).toMatchObject({ minutes: 20 })
  })

  it('rejeita minutos zerados', () => {
    expect(() =>
      productionUnassignedTimeEntryBodySchema.parse({ ...baseBody, minutes: 0 }),
    ).toThrow()
  })

  it('rejeita minutos negativos', () => {
    expect(() =>
      productionUnassignedTimeEntryBodySchema.parse({ ...baseBody, minutes: -5 }),
    ).toThrow()
  })

  it('rejeita conveyorId/stepNodeId inválidos', () => {
    expect(() =>
      productionUnassignedTimeEntryBodySchema.parse({
        conveyorId: 'not-a-uuid',
        stepNodeId: baseBody.stepNodeId,
        minutes: 10,
      }),
    ).toThrow()
  })
})
