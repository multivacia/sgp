/**
 * Detalhe analítico por STEP — tipo neutro na borda (mock, API real, futuros adapters).
 *
 * Convergência HTTP esperada (servidor):
 * GET /api/v1/conveyors/:conveyorId/steps/:stepNodeId/assignees
 * GET /api/v1/conveyors/:conveyorId/steps/:stepNodeId/time-entries
 */

export type PapelResponsavelStep = 'principal' | 'apoio'

export type StepResponsavelDetalhe = {
  /** Id estável na lista (assignee id na API ou hash no mock). */
  id: string
  colaboradorId?: string
  nomeExibicao: string
  codigo?: string
  papel: PapelResponsavelStep
}

export type StepEquipeDetalhe = {
  principal: StepResponsavelDetalhe | null
  apoios: StepResponsavelDetalhe[]
}

export type ApontamentoAnaliticoOrigem = 'mock_store' | 'api' | 'linha_realizada_fallback'

export type ApontamentoAnaliticoItem = {
  id: string
  conveyorId: string
  stepNodeId: string
  matrixActivityNodeId?: string
  colaboradorId?: string
  colaboradorNome: string
  minutos: number
  observacao?: string
  /** ISO — na API costuma refletir entryAt. */
  createdAt: string
  origem: ApontamentoAnaliticoOrigem
}

export type FonteTotalMinutosStep = 'apontamentos_registrados' | 'linha_realizada'

export type StatusLeituraApontamentoStep = 'no_prazo' | 'atencao' | 'excedido'

export type ResumoApontamentosStep = {
  planejadoMin: number
  totalMinutosApontados: number
  quantidadeLancamentos: number
  ultimoApontamentoAt?: string
  saldoMinutos: number
  statusLeitura: StatusLeituraApontamentoStep
  fonteTotalMinutos: FonteTotalMinutosStep
}

export type StepAnaliticoDetalhe = {
  conveyorId: string
  /**
   * Id do nó STEP persistido (UUID) ou id operacional da linha no mock.
   * Deve bater com o path `:stepNodeId` nas rotas de assignees/time-entries no modo real.
   */
  stepNodeId: string
  /** Preencher só com fonte confiável (ex.: matriz); omitir no real até existir no contrato. */
  matrixActivityNodeId?: string
  equipe: StepEquipeDetalhe
  apontamentos: ResumoApontamentosStep
  historicoPreview: ApontamentoAnaliticoItem[]
  /** Falha parcial ao hidratar assignees/time-entries (não bloqueia o detalhe). */
  cargaParcial?: boolean
  /** Origem do pacote (telemetria / futuros toggles). */
  fonte?: 'mock' | 'api'
}

export function computeStatusLeituraApontamento(
  planejado: number,
  totalApontado: number,
): StatusLeituraApontamentoStep {
  if (planejado <= 0) return 'no_prazo'
  const ratio = totalApontado / planejado
  if (ratio > 1.02) return 'excedido'
  if (ratio >= 0.9) return 'atencao'
  return 'no_prazo'
}

export function labelStatusLeituraApontamento(
  s: StatusLeituraApontamentoStep,
): string {
  const m: Record<StatusLeituraApontamentoStep, string> = {
    no_prazo: 'No prazo',
    atencao: 'Atenção',
    excedido: 'Excedido',
  }
  return m[s]
}
