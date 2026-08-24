import { describe, expect, it } from 'vitest'
import { stepAbortReasonDisplayLabel } from './stepAbortReasons'

describe('stepAbortReasonDisplayLabel', () => {
  it('prioriza snapshot sobre código', () => {
    expect(
      stepAbortReasonDisplayLabel({
        code: 'OUTRO',
        labelSnapshot: 'Outro (histórico)',
      }),
    ).toBe('Outro (histórico)')
  })

  it('usa reasonLabel do evento quando sem snapshot do nó', () => {
    expect(
      stepAbortReasonDisplayLabel({
        code: 'CUSTOM',
        eventReasonLabel: 'Motivo custom',
      }),
    ).toBe('Motivo custom')
  })

  it('fallback seguro para código legado sem snapshot', () => {
    expect(stepAbortReasonDisplayLabel({ code: 'NAO_MAIS_NECESSARIA' })).toBe(
      'NAO_MAIS_NECESSARIA',
    )
  })
})
