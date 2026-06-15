import { describe, expect, it } from 'vitest'
import {
  CONVEYOR_DELETE_HAS_TIME_ENTRIES_MESSAGE,
  mapLegacyConveyorOperationalStatus,
} from '../modules/conveyors/conveyorOperationalStatus.js'

describe('conveyor status migration mapping', () => {
  it('mapeia Em backlog e Em revisão para novos status', () => {
    expect(mapLegacyConveyorOperationalStatus('NO_BACKLOG')).toBe('EM_ELABORACAO')
    expect(mapLegacyConveyorOperationalStatus('EM_REVISAO')).toBe(
      'AGUARDANDO_PLANEJAMENTO',
    )
  })

  it('mensagem de exclusão com apontamento', () => {
    expect(CONVEYOR_DELETE_HAS_TIME_ENTRIES_MESSAGE).toContain('apontamentos')
    expect(CONVEYOR_DELETE_HAS_TIME_ENTRIES_MESSAGE).toContain('Cancele ou finalize')
  })
})
