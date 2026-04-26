/**
 * Contratos da jornada Nova Esteira (draft) — Fase 1 espinha dorsal.
 * Hierarquia opcional → área → etapa evolui nas próximas fases; composição mock atual
 * continua em linhasManual + tarefas + estruturaOrigem.
 */

export type NovaEsteiraPontoPartidaMacro = 'base' | 'montagem'

export type NovaEsteiraNoOrigem = 'manual' | 'reaproveitada' | 'base'

export type NovaEsteiraEtapaDraft = {
  id: string
  titulo: string
  tempoEstimadoMin: number
  origem: NovaEsteiraNoOrigem
  ordem: number
}

export type NovaEsteiraAreaDraft = {
  id: string
  titulo: string
  origem: NovaEsteiraNoOrigem
  ordem: number
  etapas: NovaEsteiraEtapaDraft[]
}

export type NovaEsteiraOpcaoDraft = {
  id: string
  titulo: string
  origem: NovaEsteiraNoOrigem
  ordem: number
  areas: NovaEsteiraAreaDraft[]
}

export type NovaEsteiraResumoLeitura = {
  totalOpcoes: number
  totalAreas: number
  totalEtapas: number
  totalMinutos: number
  situacao: string
  impeditivoPrincipal: string
  prontaParaRevisao: boolean
  prontaParaRegistrar: boolean
}

export type NovaEsteiraBloqueiosJornada = {
  dadosIniciaisOk: boolean
  estruturaMinimaOk: boolean
  podeIrParaEstrutura: boolean
  podeIrParaRevisao: boolean
  podeRegistrar: boolean
}

/** Estado de UI local da mesa de montagem (não persistido). */
export type NovaEsteiraUiState = {
  opcaoSelecionadaId: string | null
  areaDestaqueId: string | null
}
