/**
 * Contratos de apontamento operacional — isolados para o store não depender do repositório.
 */
import type { AtividadeStatusDetalhe } from './esteira-detalhe-types'

export type TipoApontamentoOperacional = 'execucao' | 'pausa' | 'conclusao'

export type ApontamentoOrigemRegistro = 'manual_mock'

export type ApontamentoOperacional = {
  id: string
  esteiraId: string
  atividadeId: string
  setorId: string
  responsavel: string
  colaboradorId?: string
  colaboradorNome?: string
  colaboradorCodigo?: string
  tipoApontamento: TipoApontamentoOperacional
  minutos: number
  observacao?: string
  statusGerado: AtividadeStatusDetalhe
  createdAt: string
  origem: ApontamentoOrigemRegistro
  /** Rastreio futuro (jornada / API) — opcional no mock. */
  metadata?: { actor?: string }
}

export type ApontamentoOperacionalInput = {
  esteiraId: string
  atividadeId: string
  tipoApontamento: TipoApontamentoOperacional
  minutos: number
  observacao?: string
}

export type ApontamentoHistoricoAtividade = {
  quantidade: number
  totalMinutos: number
  ultimo: ApontamentoOperacional | undefined
  itens: ApontamentoOperacional[]
}

export type MotivoBloqueioApontamento =
  | 'esteira_nao_encontrada'
  | 'atividade_nao_encontrada'
  | 'nao_apontavel'
  | 'minutos_invalidos'
  | 'tipo_incompativel_estado'
  | 'contexto_insuficiente_responsavel'

export type ResultadoRegistroApontamento =
  | { ok: true; apontamento: ApontamentoOperacional }
  | {
      ok: false
      motivo: MotivoBloqueioApontamento
      mensagem: string
    }

export type ValidacaoRegistroApontamento =
  | { ok: true }
  | {
      ok: false
      motivo: MotivoBloqueioApontamento
      mensagem: string
    }
