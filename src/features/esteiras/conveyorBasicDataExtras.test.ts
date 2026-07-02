import { describe, expect, it } from 'vitest'
import {
  buildDadosParaApi,
  displayUsuarioObservacoes,
  extractWizardTempoTotalPrevistoMin,
  parseWizardExtrasFromPersisted,
  parseWizardPrazoForDisplay,
  stripWizardPlanningFromObservacoes,
} from './conveyorBasicDataExtras'
import type { CreateConveyorDados } from '../../domain/conveyors/conveyor.types'

const baseDados: CreateConveyorDados = {
  nome: 'OS 123',
  cliente: 'Cliente',
  veiculo: 'Gol',
  modeloVersao: '1.0',
  placa: 'ABC1D23',
  observacoes: 'Nota do gestor',
  responsavel: 'João',
  prazoEstimado: '',
  prioridade: 'media',
  colaboradorId: null,
}

describe('conveyorBasicDataExtras', () => {
  it('parseia início, fim e tempo do formato persistido', () => {
    const extras = parseWizardExtrasFromPersisted({
      prazoEstimado: 'Início previsto: 2026-04-01T08:00 · Fim previsto: 2026-04-10T18:00',
      observacoes: 'Contexto\n\n[Planeamento] Tempo total previsto: 480 min',
    })
    expect(extras.inicioPrevisto).toBe('2026-04-01T08:00')
    expect(extras.fimPrevisto).toBe('2026-04-10T18:00')
    expect(extras.tempoTotalPrevistoMin).toBe(480)
  })

  it('monta payload com placa e remove linha de planeamento antes de regravar', () => {
    const first = buildDadosParaApi(baseDados, {
      inicioPrevisto: '2026-04-01T08:00',
      fimPrevisto: '',
      tempoTotalPrevistoMin: 120,
    })
    expect(first.placa).toBe('ABC1D23')
    expect(first.modeloVersao).toBe('1.0')
    expect(first.prazoEstimado).toBe('Início previsto: 2026-04-01T08:00')
    expect(first.observacoes).toContain('[Planeamento] Tempo total previsto: 120 min')
    expect(first.observacoes).toContain('Nota do gestor')

    const second = buildDadosParaApi(
      { ...baseDados, observacoes: first.observacoes ?? '' },
      {
        inicioPrevisto: '2026-04-01T08:00',
        fimPrevisto: '',
        tempoTotalPrevistoMin: 150,
      },
    )
    expect(second.observacoes?.match(/\[Planeamento\]/g)?.length).toBe(1)
    expect(second.observacoes).toContain('Tempo total previsto: 150 min')
  })

  it('exibe prazo legado quando não está no formato wizard', () => {
    expect(parseWizardPrazoForDisplay('15 dias')).toEqual({
      inicioPrevisto: null,
      fimPrevisto: null,
      prazoLegado: '15 dias',
    })
  })

  it('separa início e fim na consulta com formatação pt-BR', () => {
    const display = parseWizardPrazoForDisplay(
      'Início previsto: 2026-04-01T08:00 · Fim previsto: 2026-04-10T18:00',
    )
    expect(display.inicioPrevisto).toMatch(/01\/04\/2026/)
    expect(display.fimPrevisto).toMatch(/10\/04\/2026/)
    expect(display.prazoLegado).toBeNull()
  })

  it('mapeia prazo ISO legado para fim previsto na consulta', () => {
    const display = parseWizardPrazoForDisplay('2026-04-10T12:00:00.000Z')
    expect(display.inicioPrevisto).toBeNull()
    expect(display.fimPrevisto).toMatch(/10\/04\/2026/)
    expect(display.prazoLegado).toBeNull()
  })

  it('remove linha de planeamento das observações exibidas', () => {
    const raw = 'Pedido urgente\n\n[Planeamento] Tempo total previsto: 90 min'
    expect(stripWizardPlanningFromObservacoes(raw)).toBe('Pedido urgente')
    expect(displayUsuarioObservacoes(raw)).toBe('Pedido urgente')
    expect(extractWizardTempoTotalPrevistoMin(raw)).toBe(90)
  })
})
