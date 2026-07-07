import { describe, expect, it } from 'vitest'
import type { ProductionWorkQueueItem } from '../../domain/production/production.types'
import { OPERATIONAL_JUSTIFICATION_MESSAGES } from '../../domain/operational/timeEntryJustificationField'
import { emptyJustificationValue } from '../shell/quickTimeEntryDrawerLogic'
import {
  buildProductionTimeEntryJustificationPayload,
  productionTimeEntryNeedsJustification,
  productionTimeEntryPreferredCategory,
  validateProductionTimeEntryJustification,
} from './productionTimeEntryDialogLogic'

const baseItem = {
  requiresOutOfSequenceJustification: true,
  hasPreviousPendingStep: true,
  isOutOfSequence: true,
} as ProductionWorkQueueItem

describe('productionTimeEntryDialogLogic', () => {
  it('não exige justificativa em apontamento normal', () => {
    expect(
      productionTimeEntryNeedsJustification({
        requiresOutOfSequenceJustification: false,
      } as ProductionWorkQueueItem),
    ).toBe(false)
  })

  it('sugere categoria SEQUENCE para pendência anterior', () => {
    expect(productionTimeEntryPreferredCategory(baseItem)).toBe('SEQUENCE')
  })

  it('exige seleção quando apontamento fora de sequência', () => {
    expect(
      validateProductionTimeEntryJustification({
        item: baseItem,
        justification: emptyJustificationValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(OPERATIONAL_JUSTIFICATION_MESSAGES.missingSelection)
  })

  it('monta payload com id da justificativa selecionada', () => {
    expect(
      buildProductionTimeEntryJustificationPayload(baseItem, {
        justificationId: 'seq-1',
        justificationComplement: '',
        legacyText: 'Atividade anterior pendente de outro colaborador',
      }),
    ).toEqual({
      outOfSequenceJustification: 'Atividade anterior pendente de outro colaborador',
      justificationId: 'seq-1',
    })
  })
})
