import { describe, expect, it } from 'vitest'
import type { ConveyorDraftV1 } from '../../../domain/argos/draft-v1.types'
import {
  draftV1ToCreateConveyorInput,
  validateDraftForCreate,
} from './draftToCreateConveyorInput'

describe('draftV1ToCreateConveyorInput', () => {
  it('usa origem MANUAL e estrutura mínima quando não há opções no draft', () => {
    const d: ConveyorDraftV1 = {
      schemaVersion: '1.0.0',
      suggestedDados: { title: 'OS teste', clientName: 'Cliente X' },
      options: [],
    }
    const out = draftV1ToCreateConveyorInput(d)
    expect(out.originType).toBe('MANUAL')
    expect(out.matrixRootItemId).toBeNull()
    expect(out.options).toHaveLength(1)
    expect(out.options[0].areas[0].steps).toHaveLength(1)
    expect(out.dados.nome).toBe('OS teste')
    expect(out.dados.cliente).toBe('Cliente X')
  })

  it('validateDraftForCreate exige nome', () => {
    const d: ConveyorDraftV1 = {
      schemaVersion: '1.0.0',
      suggestedDados: { title: '   ' },
      options: [],
    }
    expect(validateDraftForCreate(d)).toMatch(/nome/i)
  })
})
