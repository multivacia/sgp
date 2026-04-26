/**
 * Bloqueios e resumo de leitura da jornada — derivados do draft + composição.
 */

import { avaliarComposicaoNovaEsteira } from './nova-esteira-composicao'
import type { NovaEsteiraDraft } from './nova-esteira-composicao'
import { computeResumoDrafts } from './nova-esteira-domain'
import { getMotivoPrincipalDeBloqueio } from './nova-esteira-estado-visual'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'
import type {
  NovaEsteiraBloqueiosJornada,
  NovaEsteiraResumoLeitura,
} from './nova-esteira-jornada-draft'
import type { TarefaBlocoDraft } from './nova-esteira-domain'
import {
  estruturaOpcoesMinimaValida,
  totaisOpcoes,
} from './nova-esteira-opcoes-helpers'
import {
  dadosCamposOkParaRegistro,
  impeditivoCamposDadosParaRegistro,
} from './nova-esteira-dados-validacao'

export function computeDadosIniciaisOk(dados: NovaEsteiraDadosIniciais): boolean {
  return dados.nome.trim().length > 0
}

function countHierarchy(draft: NovaEsteiraDraft): {
  opcoes: number
  areas: number
  etapas: number
} {
  const op = draft.opcoes ?? []
  if (op.length > 0) {
    const t = totaisOpcoes(op)
    return { opcoes: op.length, areas: t.areas, etapas: t.etapas }
  }
  return { opcoes: 0, areas: 0, etapas: 0 }
}

/** Mensagem principal quando a hierarquia opções ainda não fecha o gate. */
export function impeditivoEstruturaOpcoes(draft: NovaEsteiraDraft): string {
  const op = draft.opcoes ?? []
  if (op.length === 0) return 'Adicione pelo menos uma opção ao pedido.'
  for (const o of op) {
    if (!o.titulo.trim()) return 'Toda opção precisa de um título.'
    if (o.areas.length === 0)
      return `A opção «${o.titulo || 'sem nome'}» precisa de pelo menos uma área.`
    for (const a of o.areas) {
      if (!a.titulo.trim()) return 'Toda área precisa de um título.'
      if (a.etapas.length === 0)
        return `A área «${a.titulo || 'sem nome'}» precisa de pelo menos uma etapa.`
      for (const e of a.etapas) {
        if (!e.titulo.trim()) return 'Toda etapa precisa de um título.'
      }
    }
  }
  if (!estruturaOpcoesMinimaValida(op)) {
    return 'Complete a estrutura: opção → área → etapa com tempos válidos.'
  }
  return ''
}

function situacaoLeitura(
  draft: NovaEsteiraDraft,
  montagemPode: boolean,
  opcoesOk: boolean,
): string {
  const op = draft.opcoes ?? []
  if (op.length === 0) return 'Sem montagem de opções'
  if (!opcoesOk) return 'Montagem em andamento — estrutura incompleta'
  if (montagemPode) return 'Pronta para revisão'
  return 'Montagem em andamento'
}

export function computeResumoLeituraJornada(
  draft: NovaEsteiraDraft,
  tarefasEfetivas: TarefaBlocoDraft[],
): NovaEsteiraResumoLeitura {
  const { montagem } = avaliarComposicaoNovaEsteira(draft)
  const resumo = computeResumoDrafts(tarefasEfetivas)
  const hi = countHierarchy(draft)
  const op = draft.opcoes ?? []
  const opcoesOk = op.length > 0 && estruturaOpcoesMinimaValida(op)

  const totalOpcoes = hi.opcoes > 0 ? hi.opcoes : tarefasEfetivas.length > 0 ? 1 : 0
  const totalAreas =
    hi.areas > 0 ? hi.areas : tarefasEfetivas.length > 0 ? tarefasEfetivas.length : 0
  const totalEtapas =
    hi.etapas > 0 ? hi.etapas : resumo.totalAtividades > 0 ? resumo.totalAtividades : 0
  const totalMinutos =
    op.length > 0 && opcoesOk
      ? totaisOpcoes(op).minutos
      : resumo.estimativaTotalMin

  const impeditivoHierarquia = op.length > 0 ? impeditivoEstruturaOpcoes(draft) : ''
  const impeditivoComposicao =
    montagem.podeMaterializar || !draft.dados.nome.trim()
      ? ''
      : getMotivoPrincipalDeBloqueio(montagem)

  const impeditivoDadosRegistro = impeditivoCamposDadosParaRegistro(draft.dados)

  const impeditivoPrincipal =
    impeditivoDadosRegistro ||
    (op.length === 0
      ? impeditivoComposicao || 'Adicione pelo menos uma opção ao pedido.'
      : impeditivoHierarquia || impeditivoComposicao || '')

  const situacao = situacaoLeitura(draft, montagem.podeMaterializar, opcoesOk)

  const prontaRevisao =
    dadosCamposOkParaRegistro(draft.dados) && opcoesOk && montagem.podeMaterializar

  return {
    totalOpcoes,
    totalAreas,
    totalEtapas,
    totalMinutos,
    situacao,
    impeditivoPrincipal,
    prontaParaRevisao: prontaRevisao,
    prontaParaRegistrar: prontaRevisao,
  }
}

export function computeBloqueiosJornada(draft: NovaEsteiraDraft): NovaEsteiraBloqueiosJornada {
  const { montagem } = avaliarComposicaoNovaEsteira(draft)
  const dadosOk = computeDadosIniciaisOk(draft.dados)
  const dadosRegistroOk = dadosCamposOkParaRegistro(draft.dados)
  const op = draft.opcoes ?? []
  const opcoesOk = op.length > 0 && estruturaOpcoesMinimaValida(op)
  const estruturaOk = dadosRegistroOk && opcoesOk && montagem.podeMaterializar

  return {
    dadosIniciaisOk: dadosOk,
    estruturaMinimaOk: estruturaOk,
    podeIrParaEstrutura: dadosOk,
    podeIrParaRevisao: estruturaOk,
    podeRegistrar: estruturaOk,
  }
}
