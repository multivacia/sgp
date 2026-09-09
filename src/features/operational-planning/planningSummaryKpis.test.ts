import { describe, expect, it } from 'vitest'
import {
  PLANNING_INLINE_PRINT_HELP_HIDDEN_SNIPPETS,
  PLANNING_SUMMARY_HIDDEN_KPI_LABELS,
  PLANNING_SUMMARY_KPI_GRID_CLASS,
  PLANNING_SUMMARY_KPI_LABELS,
  PLANNING_SUMMARY_SYNC_CARD_CLASS,
} from './planningSummaryKpis'
import {
  PLANNING_OPERATIONAL_SUMMARY_HIDDEN_LABELS,
  PLANNING_OPERATIONAL_SUMMARY_VISIBLE_LABELS,
} from './PlanningWeekOperationalSummaryBar'
import {
  SHOW_PLANNING_INLINE_PRINT_AGENT_HELP,
  SHOW_PLANNING_PRINCIPAL_DEVIATIONS,
  SHOW_PLANNING_SECONDARY_TABS,
} from './planningUiFlags'

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

describe('Resumo operacional e ajuda de impressão (apresentação)', () => {
  it('mantém cards restantes do Resumo operacional e oculta Atenção / Fora do planejado', () => {
    expect([...PLANNING_OPERATIONAL_SUMMARY_VISIBLE_LABELS]).toEqual([
      'Planejado',
      'Realizado',
      'Concluídas',
      'Em andamento',
      'Sem apontamento',
    ])
    expect([...PLANNING_OPERATIONAL_SUMMARY_HIDDEN_LABELS]).toEqual([
      'Atenção',
      'Fora do planejado',
    ])
    for (const hidden of PLANNING_OPERATIONAL_SUMMARY_HIDDEN_LABELS) {
      expect(PLANNING_OPERATIONAL_SUMMARY_VISIBLE_LABELS).not.toContain(hidden)
    }
  })

  it('mantém bloco auxiliar de impressão oculto no corpo da página', () => {
    expect(SHOW_PLANNING_INLINE_PRINT_AGENT_HELP).toBe(false)
    expect([...PLANNING_INLINE_PRINT_HELP_HIDDEN_SNIPPETS]).toEqual([
      'Use os tickets como apoio físico na operação',
      'impressão silenciosa',
      'Agente local indisponível',
      'Testar impressora térmica',
    ])
  })

  it('preserva flags de abas secundárias e principais desvios ocultos', () => {
    expect(SHOW_PLANNING_SECONDARY_TABS).toBe(false)
    expect(SHOW_PLANNING_PRINCIPAL_DEVIATIONS).toBe(false)
  })
})
