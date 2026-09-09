import { describe, expect, it } from 'vitest'
import {
  PLANNING_SUMMARY_HIDDEN_KPI_LABELS,
  PLANNING_SUMMARY_KPI_GRID_CLASS,
  PLANNING_SUMMARY_KPI_LABELS,
  PLANNING_SUMMARY_SYNC_CARD_CLASS,
} from './planningSummaryKpis'

describe('planningSummaryKpis (apresentação Planejamento)', () => {
  it('mantém os três indicadores de resumo em uso', () => {
    expect([...PLANNING_SUMMARY_KPI_LABELS]).toEqual([
      'Minutos planejados',
      'Atividades planejadas',
      'Colaboradores no plano',
    ])
  })

  it('não inclui Aguardando encaixe nem Fora do planejado nos KPIs visíveis', () => {
    for (const hidden of PLANNING_SUMMARY_HIDDEN_KPI_LABELS) {
      expect(PLANNING_SUMMARY_KPI_LABELS).not.toContain(hidden)
    }
    expect([...PLANNING_SUMMARY_HIDDEN_KPI_LABELS]).toEqual([
      'Aguardando encaixe',
      'Fora do planejado',
    ])
  })

  it('usa grid de três colunas no desktop sem reservar coluna do quarto card', () => {
    expect(PLANNING_SUMMARY_KPI_GRID_CLASS).toContain('lg:grid-cols-3')
    expect(PLANNING_SUMMARY_KPI_GRID_CLASS).not.toContain('lg:grid-cols-4')
    expect(PLANNING_SUMMARY_SYNC_CARD_CLASS).toContain('lg:col-span-3')
    expect(PLANNING_SUMMARY_SYNC_CARD_CLASS).not.toContain('lg:col-span-4')
  })
})
