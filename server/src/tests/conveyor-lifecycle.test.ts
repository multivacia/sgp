import { describe, expect, it } from 'vitest'
import {
  canConveyorAcceptTimeEntry,
  CONVEYOR_TIME_ENTRY_ALLOWED_STATUSES,
  isConveyorVisibleToProduction,
} from '../modules/conveyors/conveyorOperationalStatus.js'

describe('conveyor lifecycle rules (apontamento e visibilidade)', () => {
  it('apontamento permitido somente em A_INICIAR e EM_ANDAMENTO', () => {
    expect(CONVEYOR_TIME_ENTRY_ALLOWED_STATUSES).toEqual(['A_INICIAR', 'EM_ANDAMENTO'])
    for (const st of [
      'EM_ELABORACAO',
      'AGUARDANDO_PLANEJAMENTO',
      'EM_PLANEJAMENTO',
      'FINALIZADA',
      'CANCELADA',
    ] as const) {
      expect(canConveyorAcceptTimeEntry(st)).toBe(false)
    }
  })

  it('rascunhos não são visíveis para produção', () => {
    expect(isConveyorVisibleToProduction('EM_ELABORACAO')).toBe(false)
    expect(isConveyorVisibleToProduction('AGUARDANDO_PLANEJAMENTO')).toBe(true)
  })
})
