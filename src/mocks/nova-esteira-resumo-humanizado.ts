/**
 * Textos de leitura executiva para revisão da montagem (determinísticos, sem IA).
 */

import { formatMinutosHumanos } from '../lib/formatters'
import type { SnapshotComposicaoMontagem } from './nova-esteira-composicao'
import {
  computeResumoDrafts,
  labelEstruturaOrigem,
  type NovaEsteiraEstruturaOrigem,
  type TarefaBlocoDraft,
} from './nova-esteira-domain'
import {
  classificarSemanticaReferenciaNaComposicao,
  linhasSemanticaReferenciaParaRevisao,
} from './nova-esteira-referencia-operacional'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'

export type LinhaMaterializacaoMock = { label: string; valor: string }

/** Linhas curtas para “o que nasce” — dados do domínio já agregados em `computeResumoDrafts`. */
export function linhasMaterializacaoMock(p: {
  dados: NovaEsteiraDadosIniciais
  estruturaOrigem: NovaEsteiraEstruturaOrigem
  tarefasEfetivas: TarefaBlocoDraft[]
}): LinhaMaterializacaoMock[] {
  const r = computeResumoDrafts(p.tarefasEfetivas)
  const nome = p.dados.nome.trim() || '(sem nome)'
  return [
    { label: 'Nome', valor: nome },
    { label: 'Origem', valor: labelEstruturaOrigem(p.estruturaOrigem) },
    { label: 'Blocos na estrutura', valor: String(r.totalTarefas) },
    { label: 'Atividades (soma)', valor: String(r.totalAtividades) },
    { label: 'Tempo estimado', valor: formatMinutosHumanos(r.estimativaTotalMin) },
    {
      label: 'Prioridade',
      valor: p.dados.prioridade ? String(p.dados.prioridade) : 'média (padrão)',
    },
    {
      label: 'Setores',
      valor: r.setores.length ? r.setores.join(', ') : 'a definir no chão',
    },
  ]
}

/** Bullets executivos para revisão — evita parágrafo longo; prioriza leitura operacional. */
export function bulletsResumoExecutivoRevisao(p: {
  dados: NovaEsteiraDadosIniciais
  estruturaOrigem: NovaEsteiraEstruturaOrigem
  tarefasEfetivas: TarefaBlocoDraft[]
  snap: SnapshotComposicaoMontagem
}): string[] {
  const nome = p.dados.nome.trim() || 'esta esteira'
  const r = computeResumoDrafts(p.tarefasEfetivas)
  const m = p.snap.resultado.montagem
  const semanticaRef = classificarSemanticaReferenciaNaComposicao(
    p.estruturaOrigem,
    p.tarefasEfetivas,
  )
  const linhasSemRef = linhasSemanticaReferenciaParaRevisao(semanticaRef)
  const linhas: string[] = [
    `«${nome}» · ${labelEstruturaOrigem(p.estruturaOrigem)}`,
    ...linhasSemRef,
    `${r.totalTarefas} bloco(s) · ${r.totalAtividades} atividades · ${formatMinutosHumanos(r.estimativaTotalMin)}`,
  ]
  if (m.blocosValidos.length > 0) {
    linhas.push(`Ordem: ${m.blocosValidos.map((b) => b.nome).join(' → ')}`)
  }
  const porTipo = m.blocosValidos.reduce(
    (acc, b) => {
      acc[b.tipo] = (acc[b.tipo] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const perfil = Object.entries(porTipo)
    .map(([t, n]) => `${t} ${n}`)
    .join(' · ')
  if (perfil) {
    linhas.push(`Composição: ${perfil}`)
  }
  const controles = m.blocosValidos.filter((b) => b.tipo === 'controle')
  if (controles.length > 0) {
    linhas.push(`Controles na esteira: ${controles.map((b) => b.nome).join(' → ')}`)
  }
  const apoio = m.blocosValidos.filter((b) => b.tipo === 'apoio')
  if (apoio.length > 0 && m.blocosValidos.length > 3) {
    linhas.push(
      `Apoio (${apoio.length}): ${apoio.map((b) => b.nome).join(', ')} — não trava fluxo principal`,
    )
  }
  return linhas
}

export function paragrafoMontagemExecutiva(p: {
  dados: NovaEsteiraDadosIniciais
  estruturaOrigem: NovaEsteiraEstruturaOrigem
  tarefasEfetivas: TarefaBlocoDraft[]
  snap: SnapshotComposicaoMontagem
}): string {
  return bulletsResumoExecutivoRevisao(p).join(' ')
}

export function linhaOQueNasceNaOperacao(p: {
  dados: NovaEsteiraDadosIniciais
  estruturaOrigem: NovaEsteiraEstruturaOrigem
  tarefasEfetivas: TarefaBlocoDraft[]
}): string {
  const r = computeResumoDrafts(p.tarefasEfetivas)
  const nome = p.dados.nome.trim() || '(sem nome)'
  return `No mock, confirmação cria a esteira «${nome}» com ${r.totalTarefas} bloco(s), ${r.totalAtividades} atividades e prioridade «${p.dados.prioridade || 'média'}», visível no backlog.`
}
