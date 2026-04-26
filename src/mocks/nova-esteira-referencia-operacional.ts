/**
 * Projeção operacional única da referência (Base de Tarefa no mock).
 * Montagem, revisão e materialização resolvem via esta camada — `sourceBaseTarefaId` é a chave.
 */

import { getBaseTarefa, type BaseTarefaCatalogItem } from './bases-tarefa-catalog'
import type { NovaEsteiraEstruturaOrigem, TarefaBlocoDraft } from './nova-esteira-domain'

/** Atividade tal como a fonte expõe (sem setor por linha — ver `NovaEsteiraReferenciaOperacional`). */
export type NovaEsteiraReferenciaAtividade = {
  id: string
  nome: string
  ordem: number
  descricaoCurta?: string
  origemReferencia: string
  estimativaMin: number
  metadata?: Record<string, unknown>
}

export type NovaEsteiraReferenciaResumo = {
  id: string
  nome: string
  quantidadeAtividades: number
  origemBibliografica: string
}

export type NovaEsteiraReferenciaOperacional = {
  id: string
  nome: string
  descricao?: string
  /** Mesmo campo do catálogo (`referenciaOrigem`) — rastreabilidade da fonte. */
  origem: string
  atividades: NovaEsteiraReferenciaAtividade[]
  quantidadeAtividades: number
  resumoOperacional: string
  /** Setores no nível do pacote (a fonte não define setor por atividade). */
  setoresPacote: string[]
  metadata?: Record<string, unknown>
}

function mapCatalogToOperacional(bt: BaseTarefaCatalogItem): NovaEsteiraReferenciaOperacional {
  const atividades: NovaEsteiraReferenciaAtividade[] = bt.atividades.map((a, i) => ({
    id: a.id,
    nome: a.nome,
    ordem: i + 1,
    origemReferencia: bt.referenciaOrigem,
    estimativaMin: a.estimativaMin,
  }))
  return {
    id: bt.id,
    nome: bt.nome,
    descricao: bt.observacoes,
    origem: bt.referenciaOrigem,
    atividades,
    quantidadeAtividades: atividades.length,
    setoresPacote: [...bt.setores],
    resumoOperacional: `${bt.nome} · ${atividades.length} atividade(s) · ${bt.referenciaOrigem}`,
  }
}

/** Resolve a referência pelo id do catálogo; única projeção estrutural consumível pela Nova Esteira. */
export function getNovaEsteiraReferenciaOperacionalById(
  id: string,
): NovaEsteiraReferenciaOperacional | undefined {
  const bt = getBaseTarefa(id)
  if (!bt) return undefined
  return mapCatalogToOperacional(bt)
}

/** Atividades em ordem estável (mesma ordem do array no catálogo). */
export function listarAtividadesOrdenadasDaReferencia(id: string): NovaEsteiraReferenciaAtividade[] {
  const op = getNovaEsteiraReferenciaOperacionalById(id)
  return op ? [...op.atividades] : []
}

export function buildNovaEsteiraReferenciaResumo(id: string): NovaEsteiraReferenciaResumo | undefined {
  const op = getNovaEsteiraReferenciaOperacionalById(id)
  if (!op) return undefined
  return {
    id: op.id,
    nome: op.nome,
    quantidadeAtividades: op.quantidadeAtividades,
    origemBibliografica: op.origem,
  }
}

/** Indica se o catálogo declara zero atividades (estado explícito, não ausência de dados). */
export function referenciaDeclaradaSemAtividades(id: string): boolean {
  const op = getNovaEsteiraReferenciaOperacionalById(id)
  return !!op && op.quantidadeAtividades === 0
}

/**
 * Classifica como a referência entrou na composição (duas semânticas oficiais + ausência).
 */
export type SemanticaReferenciaNaComposicao =
  | { tipo: 'BIBLIOTECA_BASE_TAREFA'; quantidadeBlocosComReferencia: number }
  | { tipo: 'MANUAL_COM_REFERENCIA'; quantidadeBlocosComReferencia: number }
  | { tipo: 'SEM_REFERENCIA_CATALOGO' }

export function classificarSemanticaReferenciaNaComposicao(
  estruturaOrigem: NovaEsteiraEstruturaOrigem,
  tarefasEfetivas: TarefaBlocoDraft[],
): SemanticaReferenciaNaComposicao {
  const comFonte = tarefasEfetivas.filter((t) => Boolean(t.sourceBaseTarefaId))
  const n = comFonte.length
  if (estruturaOrigem === 'BASE_TAREFA' && n > 0) {
    return { tipo: 'BIBLIOTECA_BASE_TAREFA', quantidadeBlocosComReferencia: n }
  }
  const manualComRef = tarefasEfetivas.filter(
    (t) => t.modoMontagem === 'REFERENCIA' && t.sourceBaseTarefaId,
  )
  if (
    (estruturaOrigem === 'MANUAL' || estruturaOrigem === 'MONTAGEM_UNIFICADA') &&
    manualComRef.length > 0
  ) {
    return { tipo: 'MANUAL_COM_REFERENCIA', quantidadeBlocosComReferencia: manualComRef.length }
  }
  return { tipo: 'SEM_REFERENCIA_CATALOGO' }
}

export function linhasSemanticaReferenciaParaRevisao(
  sem: SemanticaReferenciaNaComposicao,
): string[] {
  if (sem.tipo === 'BIBLIOTECA_BASE_TAREFA') {
    return [
      `Origem estrutural: montagem por blocos de referência (biblioteca) — ${sem.quantidadeBlocosComReferencia} bloco(s) com pacote do catálogo.`,
    ]
  }
  if (sem.tipo === 'MANUAL_COM_REFERENCIA') {
    return [
      `Origem estrutural: montagem manual com modo «Usar referência» — ${sem.quantidadeBlocosComReferencia} bloco(s) operacional(is) amparados por pacote do catálogo (distinto de só montar pela biblioteca).`,
    ]
  }
  return []
}
