import { describe, expect, it } from 'vitest'
import {
  backlogChipBusca,
  backlogChipJanelaDias,
  backlogChipPrioridade,
  backlogChipResponsavel,
  backlogChipSituacaoPrefixed,
  backlogFilterDetailConcluidasWindow,
  backlogFiltersSituationLine,
  backlogHeaderSemanticLine,
  backlogKpiDeckIntro,
  backlogKpiHints,
  backlogSituationChipLabel,
  backlogTotalsVsTableFiltered,
} from './backlogCopy'

describe('backlogCopy', () => {
  it('expõe textos estáveis do header e dos KPIs', () => {
    expect(backlogHeaderSemanticLine).toContain('mesma regra operacional')
    expect(backlogKpiDeckIntro).toContain('lista carregada')
    expect(backlogTotalsVsTableFiltered).toContain('tabela abaixo')
    expect(backlogKpiHints.emAtraso).toContain('Prazo estimado')
  })

  it('linha de situação cobre recortes principais', () => {
    expect(backlogFiltersSituationLine('ativas')).toContain('não concluídas')
    expect(backlogFiltersSituationLine('em_atraso')).toContain('hoje')
    expect(backlogFiltersSituationLine('concluidas')).toContain('completed_at')
    expect(backlogFiltersSituationLine('')).toContain('Situação')
  })

  it('chips legíveis', () => {
    expect(backlogChipJanelaDias(30)).toBe('Janela: 30 dias')
    expect(backlogSituationChipLabel('ativas')).toBe('Ativas')
    expect(backlogChipSituacaoPrefixed('em_atraso')).toBe('Situação: Em atraso')
    expect(backlogChipSituacaoPrefixed('ativas')).toBeNull()
    expect(backlogChipBusca('OS 123')).toContain('Busca:')
    expect(backlogChipPrioridade('alta')).toBe('Prioridade: Alta')
    expect(backlogChipResponsavel('Maria')).toBe('Responsável: Maria')
  })

  it('janela de concluídas menciona completed_at', () => {
    expect(backlogFilterDetailConcluidasWindow(7)).toContain('completed_at')
    expect(backlogFilterDetailConcluidasWindow(7)).toContain('days=7')
  })
})
