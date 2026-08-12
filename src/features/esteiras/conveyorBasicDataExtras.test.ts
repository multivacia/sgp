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
  it('parseia início e fim do formato persistido', () => {
    const extras = parseWizardExtrasFromPersisted({
      prazoEstimado: 'Início previsto: 2026-04-01T08:00 · Fim previsto: 2026-04-10T18:00',
      observacoes: 'Contexto\n\n[Planeamento] Tempo total previsto: 480 min',
    })
    expect(extras.inicioPrevisto).toBe('2026-04-01')
    expect(extras.fimPrevisto).toBe('2026-04-10')
  })

  it('monta payload com placa e não grava tempo manual nas observações', () => {
    const first = buildDadosParaApi(baseDados, {
      inicioPrevisto: '2026-04-01T08:00',
      fimPrevisto: '',
    })
    expect(first.placa).toBe('ABC1D23')
    expect(first.modeloVersao).toBe('1.0')
    expect(first.prazoEstimado).toBe('Início previsto: 2026-04-01T08:00')
    expect(first.observacoes).not.toContain('[Planeamento]')
    expect(first.observacoes).toContain('Nota do gestor')

    const second = buildDadosParaApi(
      {
        ...baseDados,
        observacoes: 'Nota do gestor\n\n[Planeamento] Tempo total previsto: 150 min',
      },
      {
        inicioPrevisto: '2026-04-01T08:00',
        fimPrevisto: '',
      },
    )
    expect(second.observacoes).toBe('Nota do gestor')
    expect(second.observacoes).not.toContain('[Planeamento]')
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
      'Início previsto: 2026-04-01T00:00:01.000Z · Fim previsto: 2026-04-10T23:59:59.000Z',
    )

    expect(display).toEqual({
      inicioPrevisto: '01/04/2026',
      fimPrevisto: '10/04/2026',
      prazoLegado: null,
    })
  })

  it('mapeia prazo ISO legado para fim previsto na consulta', () => {
    const display = parseWizardPrazoForDisplay('2026-04-10T12:00:00.000Z')

    expect(display).toEqual({
      inicioPrevisto: null,
      fimPrevisto: '10/04/2026',
      prazoLegado: null,
    })
  })

  it('remove linha de planeamento das observações exibidas', () => {
    const raw = 'Pedido urgente\n\n[Planeamento] Tempo total previsto: 90 min'
    expect(stripWizardPlanningFromObservacoes(raw)).toBe('Pedido urgente')
    expect(displayUsuarioObservacoes(raw)).toBe('Pedido urgente')
    expect(extractWizardTempoTotalPrevistoMin(raw)).toBe(90)
  })
})
