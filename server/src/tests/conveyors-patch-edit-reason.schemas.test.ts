import { describe, expect, it } from 'vitest'
import {
  conveyorUserReasonSchema,
  patchConveyorDadosBodySchema,
  patchConveyorStructureBodySchema,
} from '../modules/conveyors/conveyors.schemas.js'

describe('conveyors patch reason schemas', () => {
  it('aceita reason opcional 3..500 e rejeita curto/longo', () => {
    expect(conveyorUserReasonSchema.parse('  ok.  ')).toBe('ok.')
    expect(() => conveyorUserReasonSchema.parse('ab')).toThrow()
    expect(() => conveyorUserReasonSchema.parse('x'.repeat(501))).toThrow()
  })

  it('PATCH dados exige campo de dados; reason sozinho não basta', () => {
    expect(() => patchConveyorDadosBodySchema.parse({ reason: 'motivo válido' })).toThrow()
    const out = patchConveyorDadosBodySchema.parse({
      nome: 'Esteira',
      reason: '  ajuste cadastral  ',
    })
    expect(out.nome).toBe('Esteira')
    expect(out.reason).toBe('ajuste cadastral')
  })

  it('PATCH dados em EM_ELABORACAO path: body sem reason é válido', () => {
    const out = patchConveyorDadosBodySchema.parse({ nome: 'Sem motivo' })
    expect(out.reason).toBeUndefined()
  })

  it('PATCH structure aceita reason opcional', () => {
    const base = {
      originType: 'MANUAL' as const,
      options: [
        {
          titulo: 'Opção',
          orderIndex: 1,
          sourceOrigin: 'manual' as const,
          areas: [
            {
              titulo: 'Área',
              orderIndex: 1,
              sourceOrigin: 'manual' as const,
              steps: [
                {
                  titulo: 'Etapa',
                  orderIndex: 1,
                  plannedMinutes: 10,
                  sourceOrigin: 'manual' as const,
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    }
    expect(patchConveyorStructureBodySchema.parse(base).reason).toBeUndefined()
    expect(
      patchConveyorStructureBodySchema.parse({
        ...base,
        reason: 'Alteração estrutural justificada',
      }).reason,
    ).toBe('Alteração estrutural justificada')
  })
})
