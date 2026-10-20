import { describe, expect, it } from 'vitest'
import {
  dashboardConcluidasNoPeriodoLabel,
  dashboardHints,
  dashboardLabels,
  executiveDashboardCopy,
} from './operationalSemantics'

/** Termos técnicos que não podem aparecer em textos do Dashboard. */
const DASHBOARD_TECHNICAL_TERMS = [
  'step',
  'bucket',
  'snapshot',
  'preset',
  'entry_at',
  'completed_at',
  'total_planned_minutes',
  'em_atraso',
  'âmbito',
  'premir',
  'registad',
  'janela',
  'recorte executivo',
  'utc',
]

function technicalTermsIn(text: string): string[] {
  const lower = text.toLowerCase()
  return DASHBOARD_TECHNICAL_TERMS.filter((t) => lower.includes(t))
}

function allStrings(): string[] {
  return [
    ...Object.values(executiveDashboardCopy),
    ...Object.values(dashboardLabels),
    ...Object.values(dashboardHints).map((v) => (typeof v === 'function' ? v('01/10/2026 a 20/10/2026') : v)),
    dashboardConcluidasNoPeriodoLabel('01/10/2026 a 20/10/2026'),
  ]
}

describe('copy do Dashboard (pt-BR)', () => {
  it('rótulos principais', () => {
    expect(dashboardLabels.totalHorasApontadas).toBe('Total de horas apontadas')
    expect(dashboardLabels.horasApontadasPeriodo).toBe('Horas apontadas no período')
    expect(dashboardLabels.tempoPrevistoAtividades).toBe('Tempo previsto das atividades')
    expect(dashboardLabels.esteirasPorSituacao).toBe('Esteiras por situação operacional')
    expect(dashboardConcluidasNoPeriodoLabel('01/10/2026 a 20/10/2026')).toBe(
      'Esteiras concluídas — 01/10/2026 a 20/10/2026',
    )
    expect(executiveDashboardCopy.secaoAgregadaTitulo).toBe('Tempo previsto e horas apontadas')
  })

  it('nenhum texto do Dashboard usa termos técnicos', () => {
    for (const text of allStrings()) {
      expect(technicalTermsIn(text), text).toEqual([])
    }
  })
})
