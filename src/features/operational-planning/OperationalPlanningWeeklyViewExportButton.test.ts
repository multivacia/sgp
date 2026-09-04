import { describe, expect, it } from 'vitest'
import {
  isOperationalPlanningWeeklyViewExportButtonDisabled,
  resolveOperationalPlanningWeeklyViewExportButtonLabel,
} from './operationalPlanningWeeklyViewExportFlow'

describe('resolveOperationalPlanningWeeklyViewExportButtonLabel', () => {
  it('estado idle → "Exportar visão semanal"', () => {
    expect(resolveOperationalPlanningWeeklyViewExportButtonLabel('idle')).toBe(
      'Exportar visão semanal',
    )
  })

  it('estado dirty → "Salvar e exportar visão semanal"', () => {
    expect(resolveOperationalPlanningWeeklyViewExportButtonLabel('dirty')).toBe(
      'Salvar e exportar visão semanal',
    )
  })

  it('estado exporting → "Exportando visão semanal..."', () => {
    expect(resolveOperationalPlanningWeeklyViewExportButtonLabel('exporting')).toBe(
      'Exportando visão semanal...',
    )
  })
})

describe('isOperationalPlanningWeeklyViewExportButtonDisabled', () => {
  it('desabilitado quando disabled=true, independente do estado', () => {
    expect(
      isOperationalPlanningWeeklyViewExportButtonDisabled({ disabled: true, state: 'idle' }),
    ).toBe(true)
  })

  it('desabilitado durante exporting mesmo com disabled=false — bloqueia clique duplo', () => {
    expect(
      isOperationalPlanningWeeklyViewExportButtonDisabled({ disabled: false, state: 'exporting' }),
    ).toBe(true)
  })

  it('habilitado quando disabled=false e estado idle ou dirty', () => {
    expect(
      isOperationalPlanningWeeklyViewExportButtonDisabled({ disabled: false, state: 'idle' }),
    ).toBe(false)
    expect(
      isOperationalPlanningWeeklyViewExportButtonDisabled({ disabled: false, state: 'dirty' }),
    ).toBe(false)
  })
})
