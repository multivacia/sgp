import { describe, expect, it } from 'vitest'
import {
  ATIVIDADE_STATUS_DETALHE_LABELS,
  BACKLOG_STATUS_LABELS,
  CONVEYOR_NODE_TYPE_LABELS,
  ESTEIRA_STATUS_GERAL_LABELS,
  labelAtividadeStatusDetalhe,
  labelBacklogStatus,
  labelConveyorNodeType,
  labelEsteiraStatusGeral,
} from './sgp-semantica-labels'

describe('sgp-semantica-labels', () => {
  it('expõe rótulos para todos os enums usados na espinha dorsal', () => {
    expect(labelBacklogStatus('em_andamento')).toBe('Em andamento')
    expect(labelEsteiraStatusGeral('em_execucao')).toBe('Em execução')
    expect(labelAtividadeStatusDetalhe('em_execucao')).toBe('Em execução')
    expect(BACKLOG_STATUS_LABELS.em_elaboracao.length).toBeGreaterThan(0)
    expect(Object.keys(ESTEIRA_STATUS_GERAL_LABELS).length).toBe(4)
    expect(Object.keys(ATIVIDADE_STATUS_DETALHE_LABELS).length).toBe(6)
  })

  it('traduz a hierarquia da esteira para o vocabulário do colaborador', () => {
    expect(labelConveyorNodeType('OPTION')).toBe('Tarefa')
    expect(labelConveyorNodeType('AREA')).toBe('Setor')
    expect(labelConveyorNodeType('STEP')).toBe('Atividade')
  })

  it('não expõe vocabulário de schema em nenhum rótulo da hierarquia', () => {
    const keys = Object.keys(CONVEYOR_NODE_TYPE_LABELS)
    expect(keys).toEqual(['OPTION', 'AREA', 'STEP'])
    for (const [key, label] of Object.entries(CONVEYOR_NODE_TYPE_LABELS)) {
      expect(label.trim().length).toBeGreaterThan(0)
      expect(label.toUpperCase()).not.toContain(key)
      expect(label.toLowerCase()).not.toContain('etapa')
    }
  })
})
