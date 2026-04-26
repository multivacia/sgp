import { describe, expect, it } from 'vitest'
import { executiveDashboardCopy } from './operationalSemantics'

describe('executiveDashboardCopy', () => {
  it('expõe o mapa estável de copy do dashboard gerencial (V1.5)', () => {
    expect(executiveDashboardCopy.headerMicrocopyExecutive).toBe(
      'Visão executiva (agregados operacionais)',
    )
    expect(executiveDashboardCopy.participacaoAtrasoTitulo).toBe(
      'Participação de atraso (ativas)',
    )
    expect(executiveDashboardCopy.participacaoAtrasoHint).toBe(
      'Razão entre esteiras no bucket em_atraso e esteiras ativas. Indicador derivado.',
    )
    expect(executiveDashboardCopy.secaoAgregadaTitulo).toBe(
      'Previsto estrutural e minutos apontados',
    )
    expect(executiveDashboardCopy.listaAtrasoTitulo).toBe(
      'Esteiras em atraso (amostra)',
    )
    expect(executiveDashboardCopy.pizzaTitulo).toBe(
      'Ativas · Concluídas · Em atraso (esteiras)',
    )
    expect(executiveDashboardCopy.pieTooltipValueLabel).toBe(
      'Contagem (esteiras)',
    )
    expect(executiveDashboardCopy.barSeriesName).toBe(
      'Totais em minutos (por métrica no eixo)',
    )
    expect(executiveDashboardCopy.barTooltipValueCaption.length).toBeGreaterThan(20)
  })
})
