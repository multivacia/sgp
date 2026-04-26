import { describe, expect, it } from 'vitest'
import {
  ATIVIDADE_STATUS_DETALHE_LABELS,
  BACKLOG_STATUS_LABELS,
  ESTEIRA_STATUS_GERAL_LABELS,
  labelAtividadeStatusDetalhe,
  labelBacklogStatus,
  labelEsteiraStatusGeral,
} from './sgp-semantica-labels'

describe('sgp-semantica-labels', () => {
  it('expõe rótulos para todos os enums usados na espinha dorsal', () => {
    expect(labelBacklogStatus('em_producao')).toBe('Em produção')
    expect(labelEsteiraStatusGeral('em_execucao')).toBe('Em execução')
    expect(labelAtividadeStatusDetalhe('em_execucao')).toBe('Em execução')
    expect(BACKLOG_STATUS_LABELS.no_backlog.length).toBeGreaterThan(0)
    expect(Object.keys(ESTEIRA_STATUS_GERAL_LABELS).length).toBe(4)
    expect(Object.keys(ATIVIDADE_STATUS_DETALHE_LABELS).length).toBe(6)
  })
})
