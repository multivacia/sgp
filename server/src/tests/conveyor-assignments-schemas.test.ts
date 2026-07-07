import { describe, expect, it } from 'vitest'
import { patchConveyorStepCompletionBodySchema } from '../modules/conveyors/conveyorAssignments.schemas.js'

describe('patchConveyorStepCompletionBodySchema', () => {
  it('aceita COMPLETE e REOPEN', () => {
    expect(patchConveyorStepCompletionBodySchema.parse({ action: 'COMPLETE' })).toEqual({
      action: 'COMPLETE',
    })
    expect(
      patchConveyorStepCompletionBodySchema.parse({ action: 'REOPEN', note: 'x' }),
    ).toEqual({ action: 'REOPEN', note: 'x' })
  })

  it('rejeita action inválida', () => {
    expect(() =>
      patchConveyorStepCompletionBodySchema.parse({ action: 'INVALID' }),
    ).toThrow()
  })

  it('aceita COMPLETE com justificativa estruturada', () => {
    expect(
      patchConveyorStepCompletionBodySchema.parse({
        action: 'COMPLETE',
        outOfSequenceJustification: 'Atividade anterior pendente de outro colaborador',
        justificationId: '11111111-1111-1111-1111-111111111111',
        justificationComplement: 'Detalhe',
      }),
    ).toMatchObject({
      action: 'COMPLETE',
      justificationId: '11111111-1111-1111-1111-111111111111',
    })
  })
})
