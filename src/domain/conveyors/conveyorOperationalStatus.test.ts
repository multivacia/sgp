import { describe, expect, it } from 'vitest'
import {
  CONVEYOR_OPERATIONAL_STATUS_LABELS,
  CONVEYOR_STATUS_TRANSITION_ACTIONS,
} from './conveyorOperationalStatus'
import type { ConveyorOperationalStatus } from './conveyor.types'

describe('conveyorOperationalStatus (frontend)', () => {
  it('expõe labels oficiais sem status legado', () => {
    const labels = Object.values(CONVEYOR_OPERATIONAL_STATUS_LABELS)
    expect(labels).not.toContain('Em backlog')
    expect(labels).not.toContain('Em revisão')
    expect(CONVEYOR_OPERATIONAL_STATUS_LABELS.EM_ELABORACAO).toBe(
      'Rascunho / Em elaboração',
    )
  })

  it('não inclui status legado nas ações', () => {
    const keys = Object.keys(
      CONVEYOR_STATUS_TRANSITION_ACTIONS,
    ) as ConveyorOperationalStatus[]
    expect(keys).not.toContain('NO_BACKLOG' as ConveyorOperationalStatus)
    expect(CONVEYOR_STATUS_TRANSITION_ACTIONS.EM_ELABORACAO[0]?.target).toBe(
      'AGUARDANDO_PLANEJAMENTO',
    )
  })
})
