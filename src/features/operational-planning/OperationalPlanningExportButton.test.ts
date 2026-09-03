import { describe, expect, it } from 'vitest'
import {
  isOperationalPlanningExportButtonDisabled,
  resolveOperationalPlanningExportButtonLabel,
} from './operationalPlanningExportFlow'

describe('resolveOperationalPlanningExportButtonLabel', () => {
  it('estado idle → "Exportar Excel"', () => {
    expect(resolveOperationalPlanningExportButtonLabel('idle')).toBe('Exportar Excel')
  })

  it('estado dirty → "Salvar e exportar"', () => {
    expect(resolveOperationalPlanningExportButtonLabel('dirty')).toBe('Salvar e exportar')
  })

  it('estado exporting → "Exportando..."', () => {
    expect(resolveOperationalPlanningExportButtonLabel('exporting')).toBe('Exportando...')
  })
})

describe('isOperationalPlanningExportButtonDisabled', () => {
  it('desabilitado quando disabled=true, independente do estado', () => {
    expect(isOperationalPlanningExportButtonDisabled({ disabled: true, state: 'idle' })).toBe(true)
  })

  it('desabilitado durante exporting mesmo com disabled=false — bloqueia clique duplo', () => {
    expect(
      isOperationalPlanningExportButtonDisabled({ disabled: false, state: 'exporting' }),
    ).toBe(true)
  })

  it('habilitado quando disabled=false e estado idle ou dirty', () => {
    expect(isOperationalPlanningExportButtonDisabled({ disabled: false, state: 'idle' })).toBe(
      false,
    )
    expect(isOperationalPlanningExportButtonDisabled({ disabled: false, state: 'dirty' })).toBe(
      false,
    )
  })
})
