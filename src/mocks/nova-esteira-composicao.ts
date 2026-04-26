/**
 * Regras explícitas de composição da Nova Esteira — domínio mockado centralizado.
 */

import { getBaseEsteira } from './bases-esteira-catalog'
import { getBaseTarefa } from './bases-tarefa-catalog'
import {
  getBlocoOperacionalDef,
  nomeExibicaoBlocoOperacional,
  subopcaoLabel,
} from './blocos-operacionais-catalog'
import { getNovaEsteiraBlocosMock } from './nova-esteira-blocos-catalog'
import {
  futureExtensionsNeutros,
  type NovaEsteiraBlocoContextoAvaliacao,
  type NovaEsteiraBlocoOperacional,
  type NovaEsteiraBlocoStatus,
  type NovaEsteiraComposicaoResultado,
  type NovaEsteiraComposicaoStatus,
  type NovaEsteiraMontagem,
} from './nova-esteira-bloco-contrato'
import {
  type LinhaBlocoOperacionalDraft,
  type NovaEsteiraEstruturaOrigem,
  type TarefaBlocoDraft,
} from './nova-esteira-domain'
import { linhaBlocoEstaConfigurada } from './nova-esteira-materialize'
import { mensagemBaseAplicada, MSG } from './nova-esteira-mensagens'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'
import type { NovaEsteiraOpcaoDraft } from './nova-esteira-jornada-draft'
import { estruturaOpcoesMinimaValida } from './nova-esteira-opcoes-helpers'

/** @deprecated Prefer NovaEsteiraComposicaoStatus via resultado.montagem.statusGeral */
export type EstadoMontagemAgregado =
  | 'incompleto'
  | 'invalido'
  | 'dependente'
  | 'pronto_para_materializar'

export type NovaEsteiraDraft = EntradaComposicao

export type EntradaComposicao = {
  dados: NovaEsteiraDadosIniciais
  estruturaOrigem: NovaEsteiraEstruturaOrigem | null
  linhasManual: LinhaBlocoOperacionalDraft[]
  tarefas: TarefaBlocoDraft[]
  baseEsteiraAplicadaId: string | null
  /** Hierarquia opcional → área → etapa (evolução; Fase 1 pode ficar vazia). */
  opcoes?: NovaEsteiraOpcaoDraft[]
}

export type SnapshotComposicaoMontagem = {
  estadoAgregado: EstadoMontagemAgregado
  blocos: NovaEsteiraBlocoOperacional[]
  mensagens: string[]
  resultado: NovaEsteiraComposicaoResultado
}

function impactoPadraoSetores(setores: string[]): string[] {
  if (setores.length === 0) return ['Sem setores definidos no mock']
  return [`Aciona: ${setores.join(', ')}`]
}

function impactosBlocoConfigurado(
  def: NonNullable<ReturnType<typeof getBlocoOperacionalDef>>,
  setoresBase: string[],
): string[] {
  const base = impactoPadraoSetores(setoresBase)
  const op = def.operacional
  const extras = op?.impactosExtras
  if (!extras?.length) return base
  if (op?.manterImpactoSetores === false) return [...extras]
  return [...base, ...extras]
}

/**
 * Sugestões não bloqueantes — só quando a montagem já materializa.
 * Centralizado no domínio (não em componente).
 */
function coletarRecomendacoesLeves(
  statusGeral: NovaEsteiraComposicaoStatus,
  activeCatalogIds: string[],
): string[] {
  if (statusGeral !== 'valida') return []
  const ids = new Set(activeCatalogIds)
  const out: string[] = []
  if (ids.has('bo-limpeza') && !ids.has('bo-registro-entrada')) {
    out.push(
      'Sugestão: registro fotográfico de entrada reforça rastreabilidade (bloco opcional).',
    )
  }
  if (
    ids.has('bo-limpeza') &&
    !ids.has('bo-mascaramento') &&
    (ids.has('bo-painel') || ids.has('bo-desmontagem'))
  ) {
    out.push(
      'Sugestão: mascaramento protege painel e vidros quando há desmontagem ou painel no pedido.',
    )
  }
  if (ids.has('bo-montagem-final') && !ids.has('bo-revisao-final')) {
    out.push(
      'Sugestão: incluir revisão final antes da entrega — reforça conferência de acabamento.',
    )
  }
  if (ids.has('bo-revisao-final') && !ids.has('bo-checkpoint-entrega')) {
    out.push(
      'Sugestão: checkpoint de entrega fecha o ciclo com liberação explícita para expedição.',
    )
  }
  if (ids.has('bo-desmontagem') && ids.has('bo-volante') && !ids.has('bo-painel')) {
    out.push(
      'Sugestão: com volante no pedido, alinhar protocolo elétrico com painel no chão.',
    )
  }
  if (ids.has('bo-carpete') && ids.has('bo-console-cambio')) {
    out.push(
      'Sugestão: validar ordem console/carpete com montagem — evita desmontagem dupla.',
    )
  }
  return out
}

function sortBlocosPorOrdem(b: NovaEsteiraBlocoOperacional[]): NovaEsteiraBlocoOperacional[] {
  return [...b].sort((a, b) => a.ordem - b.ordem)
}

function mapComposicaoStatusParaAgregado(s: NovaEsteiraComposicaoStatus): EstadoMontagemAgregado {
  const m: Record<NovaEsteiraComposicaoStatus, EstadoMontagemAgregado> = {
    vazia: 'incompleto',
    incompleta: 'incompleto',
    valida: 'pronto_para_materializar',
    invalida: 'invalido',
    bloqueada: 'dependente',
  }
  return m[s]
}

function aplicarIncompatibilidades(
  blocos: NovaEsteiraBlocoOperacional[],
  activeCatalogIds: string[],
): NovaEsteiraBlocoOperacional[] {
  const ativos = new Set(activeCatalogIds)
  return blocos.map((b) => {
    const cid = b.metadata?.catalogoId as string | undefined
    if (!cid) return b
    const def = getBlocoOperacionalDef(cid)
    const inc = def?.novaEsteira.incompatibilidadesCatalogoIds
    if (!inc?.length) return b
    const conflitos = inc.filter((x) => ativos.has(x) && x !== cid)
    if (conflitos.length === 0) return b
    const labels = conflitos.map((id) => getBlocoOperacionalDef(id)?.nomeLista ?? id)
    return {
      ...b,
      status: 'invalido' as const,
      configurado: false,
      pendencias: [
        ...(b.pendencias ?? []),
        MSG.conflitoIncompatibilidade(labels.join(' · ')),
      ],
    }
  })
}

function classificarLinhaManual(
  linha: LinhaBlocoOperacionalDraft,
  index: number,
  catalogosAntes: string[],
): NovaEsteiraBlocoOperacional {
  const def = getBlocoOperacionalDef(linha.catalogoId)
  const nomeBase = def
    ? nomeExibicaoBlocoOperacional(linha.catalogoId, linha.subopcaoId)
    : linha.catalogoId
  const preReq = def?.preRequisitosCatalogoIds ?? []
  const faltamPre = preReq.filter((pid) => !catalogosAntes.includes(pid))
  const dependente = faltamPre.length > 0

  let status: NovaEsteiraBlocoStatus
  let pendencias: string[] = []
  if (!def) {
    status = 'invalido'
    pendencias.push(MSG.catalogoNaoEncontrado)
  } else if (dependente) {
    status = 'bloqueado'
    const nomes = faltamPre.map((id) => getBlocoOperacionalDef(id)?.nomeLista ?? id).join(' · ')
    pendencias.push(MSG.requerAntesNaEsteira(nomes))
  } else if (!linhaBlocoEstaConfigurada(linha)) {
    status = 'incompleto'
    if (def.subopcoes?.length && !linha.subopcaoId) {
      pendencias.push('Escolha o detalhe do bloco')
    }
    if (linha.modo === null) pendencias.push('Defina o modo de montagem')
    if (linha.modo === 'REFERENCIA' && !linha.referenciaId) {
      pendencias.push('Escolha a base de tarefa de referência')
    }
  } else {
    status = 'configurado'
  }

  const sub = def ? subopcaoLabel(def, linha.subopcaoId) : undefined
  const resumoBase = def
    ? `${def.nomeLista}${sub ? ` · ${sub}` : ''} · ordem ${index + 1}`
    : nomeBase
  const resumoOperacional =
    def?.operacional?.resumoLinha && status === 'configurado'
      ? `${resumoBase} · ${def.operacional.resumoLinha}`
      : resumoBase

  let impactos: string[] | undefined
  if (status === 'configurado' && def) {
    if (linha.modo === 'REFERENCIA' && linha.referenciaId) {
      const ref = getBaseTarefa(linha.referenciaId)
      const setores = ref ? ref.setores : def.basico.setores
      impactos = impactosBlocoConfigurado(def, setores)
    } else if (linha.modo === 'BASICO') {
      impactos = impactosBlocoConfigurado(def, def.basico.setores)
    } else if (linha.modo === 'MANUAL') {
      impactos = impactosBlocoConfigurado(def, def.manualPadrao.setores)
    } else {
      impactos = impactosBlocoConfigurado(def, def.basico.setores)
    }
  }

  const tipo = def?.novaEsteira.tipo ?? 'fluxo'

  return {
    id: linha.instanceId,
    code: linha.catalogoId,
    nome: nomeBase,
    tipo,
    ordem: index + 1,
    ativo: true,
    configurado: status === 'configurado',
    obrigatorio: def?.novaEsteira.obrigatorioMontagem,
    preRequisitos: [...preReq],
    incompatibilidades: def?.novaEsteira.incompatibilidadesCatalogoIds,
    dependenciasOpcionais: def?.novaEsteira.dependenciasOpcionaisCatalogoIds,
    pendencias,
    impactos,
    resumoOperacional,
    status,
    metadata: {
      catalogoId: linha.catalogoId,
      modo: linha.modo,
      instanceId: linha.instanceId,
    },
  }
}

function classificarTarefaDraft(
  t: TarefaBlocoDraft,
  index: number,
  tipo: NovaEsteiraBlocoOperacional['tipo'],
): NovaEsteiraBlocoOperacional {
  const ok =
    t.nome.trim().length > 0 &&
    t.ordem > 0 &&
    (t.atividadesCount > 0 || t.estimativaMin >= 0)
  const status: NovaEsteiraBlocoStatus = ok ? 'configurado' : 'incompleto'
  const cid = t.blocoOperacionalCatalogoId
  const def = cid ? getBlocoOperacionalDef(cid) : undefined
  return {
    id: t.id,
    code: cid,
    nome: t.nome,
    tipo: def?.novaEsteira.tipo ?? tipo,
    ordem: index + 1,
    ativo: true,
    configurado: ok,
    obrigatorio: def?.novaEsteira.obrigatorioMontagem,
    preRequisitos: def?.preRequisitosCatalogoIds,
    incompatibilidades: def?.novaEsteira.incompatibilidadesCatalogoIds,
    dependenciasOpcionais: def?.novaEsteira.dependenciasOpcionaisCatalogoIds,
    pendencias: ok ? [] : ['Dados do bloco incompletos'],
    impactos: impactoPadraoSetores(t.setores),
    resumoOperacional: `${t.nome} · ${t.atividadesCount} atividades · ordem ${t.ordem}`,
    status,
    metadata: {
      sourceBaseTarefaId: t.sourceBaseTarefaId,
      blocoOperacionalCatalogoId: t.blocoOperacionalCatalogoId,
    },
  }
}

function coletarObrigatoriosFaltando(
  draft: { estruturaOrigem: NovaEsteiraEstruturaOrigem | null; opcoes?: NovaEsteiraOpcaoDraft[] },
  catalogIdsAtivosConfigurados: Set<string>,
): string[] {
  const estruturaOrigem = draft.estruturaOrigem
  if (estruturaOrigem !== 'MANUAL' && estruturaOrigem !== 'MONTAGEM_UNIFICADA')
    return []
  if (
    draft.opcoes &&
    draft.opcoes.length > 0 &&
    estruturaOpcoesMinimaValida(draft.opcoes)
  ) {
    return []
  }
  const out: string[] = []
  for (const def of getNovaEsteiraBlocosMock()) {
    if (!def.obrigatorio) continue
    const cid = def.metadata?.catalogoId as string | undefined
    if (!cid) continue
    if (!catalogIdsAtivosConfigurados.has(cid)) {
      out.push(MSG.obrigatorioFaltando(def.nome, cid))
    }
  }
  return out
}

function baseMinimaDefinida(e: EntradaComposicao): boolean {
  if (!e.estruturaOrigem) return false
  if (!e.dados.nome.trim()) return false
  if (e.estruturaOrigem === 'MANUAL') {
    if (e.linhasManual.length === 0) {
      return false
    }
    return true
  }
  if (e.estruturaOrigem === 'BASE_ESTEIRA') {
    if (!e.baseEsteiraAplicadaId) return false
    if (e.tarefas.length === 0) return false
    return true
  }
  if (e.estruturaOrigem === 'BASE_TAREFA') {
    if (e.tarefas.length === 0) return false
    return true
  }
  if (e.estruturaOrigem === 'MONTAGEM_UNIFICADA') {
    if (!e.dados.nome.trim()) return false
    if (
      e.opcoes &&
      e.opcoes.length > 0 &&
      estruturaOpcoesMinimaValida(e.opcoes)
    ) {
      return true
    }
    if (e.linhasManual.length === 0 && e.tarefas.length === 0) return false
    return true
  }
  return false
}

function buildMotivosQueImpedemMaterializacao(
  draft: NovaEsteiraDraft,
  ctx: {
    statusGeral: NovaEsteiraComposicaoStatus
    podeMaterializar: boolean
    temInvalido: boolean
    temBloqueado: boolean
    obrigatoriosPend: string[]
  },
): string[] {
  if (ctx.podeMaterializar) return []
  const out: string[] = []
  if (!draft.dados.nome.trim()) out.push(MSG.faltaNomeEsteira)
  if (!draft.estruturaOrigem) out.push(MSG.faltaBaseOperacional)
  if (draft.estruturaOrigem === 'MANUAL' && draft.linhasManual.length === 0) {
    out.push(MSG.faltaBlocoNoPedido)
  }
  if (draft.estruturaOrigem === 'BASE_ESTEIRA') {
    if (!draft.baseEsteiraAplicadaId) out.push(MSG.apliqueBaseEsteira)
    else if (draft.tarefas.length === 0) out.push(MSG.baseSemTarefas)
  }
  if (draft.estruturaOrigem === 'BASE_TAREFA' && draft.tarefas.length === 0) {
    out.push(MSG.faltaBlocoReferencia)
  }
  if (
    draft.estruturaOrigem === 'MONTAGEM_UNIFICADA' &&
    !(draft.opcoes && draft.opcoes.length > 0 && estruturaOpcoesMinimaValida(draft.opcoes)) &&
    draft.linhasManual.length === 0 &&
    draft.tarefas.length === 0
  ) {
    out.push(MSG.faltaBlocoNoPedido)
  }
  out.push(...ctx.obrigatoriosPend)
  if (ctx.temInvalido) out.push(MSG.blocosInvalidosImpedem)
  if (ctx.temBloqueado) out.push(MSG.bloqueadosPorPrereq)
  if (
    ctx.statusGeral === 'incompleta' &&
    !ctx.temInvalido &&
    !ctx.temBloqueado &&
    ctx.obrigatoriosPend.length === 0
  ) {
    out.push(MSG.revisePendentes)
  }
  return [...new Set(out)]
}

/**
 * Avaliação central da composição — função pura (exceto leitura de catálogos mock).
 */
export function avaliarComposicaoNovaEsteira(
  draft: NovaEsteiraDraft,
): NovaEsteiraComposicaoResultado {
  const mensagens: string[] = []
  let blocos: NovaEsteiraBlocoOperacional[] = []

  if (!draft.dados.nome.trim()) {
    mensagens.push(MSG.faltaNomeEsteira)
  }
  if (!draft.estruturaOrigem) {
    mensagens.push(MSG.faltaBaseOperacional)
  }

  if (draft.estruturaOrigem === 'MANUAL') {
    const catalogosAntes: string[] = []
    for (let i = 0; i < draft.linhasManual.length; i++) {
      const b = classificarLinhaManual(draft.linhasManual[i], i, catalogosAntes)
      blocos.push(b)
      catalogosAntes.push(draft.linhasManual[i].catalogoId)
    }
    if (draft.linhasManual.length === 0) {
      mensagens.push(MSG.faltaBlocoNoPedido)
    }
  } else if (draft.estruturaOrigem === 'MONTAGEM_UNIFICADA') {
    const catalogosAntes: string[] = []
    for (let i = 0; i < draft.linhasManual.length; i++) {
      const b = classificarLinhaManual(draft.linhasManual[i], i, catalogosAntes)
      blocos.push(b)
      catalogosAntes.push(draft.linhasManual[i].catalogoId)
    }
    const offset = draft.linhasManual.length
    for (let i = 0; i < draft.tarefas.length; i++) {
      blocos.push(classificarTarefaDraft(draft.tarefas[i], offset + i, 'estrutura'))
    }
    if (draft.linhasManual.length === 0 && draft.tarefas.length === 0) {
      mensagens.push(MSG.faltaBlocoNoPedido)
    }
  } else if (draft.estruturaOrigem === 'BASE_ESTEIRA') {
    if (!draft.baseEsteiraAplicadaId) {
      mensagens.push(MSG.apliqueBaseEsteira)
    } else {
      const be = getBaseEsteira(draft.baseEsteiraAplicadaId)
      if (be) {
        mensagens.push(mensagemBaseAplicada(be.nome, be.id))
      }
    }
    for (let i = 0; i < draft.tarefas.length; i++) {
      blocos.push(classificarTarefaDraft(draft.tarefas[i], i, 'fluxo'))
    }
    if (draft.tarefas.length === 0) {
      mensagens.push(MSG.baseSemTarefas)
    }
  } else if (draft.estruturaOrigem === 'BASE_TAREFA') {
    for (let i = 0; i < draft.tarefas.length; i++) {
      blocos.push(classificarTarefaDraft(draft.tarefas[i], i, 'estrutura'))
    }
    if (draft.tarefas.length === 0) {
      mensagens.push(MSG.faltaBlocoReferencia)
    }
  }

  const activeCatalogIds =
    draft.estruturaOrigem === 'MANUAL'
      ? draft.linhasManual.map((l) => l.catalogoId)
      : draft.estruturaOrigem === 'MONTAGEM_UNIFICADA'
        ? [
            ...draft.linhasManual.map((l) => l.catalogoId),
            ...draft.tarefas
              .map((t) => t.blocoOperacionalCatalogoId)
              .filter((x): x is string => Boolean(x)),
          ]
        : draft.tarefas
            .map((t) => t.blocoOperacionalCatalogoId)
            .filter((x): x is string => Boolean(x))

  blocos = aplicarIncompatibilidades(blocos, activeCatalogIds)

  const catalogIdsAtivosConfigurados = new Set<string>()
  for (const b of blocos) {
    if (b.status === 'configurado' && b.metadata?.catalogoId) {
      catalogIdsAtivosConfigurados.add(b.metadata.catalogoId as string)
    }
  }

  const obrigatoriosPend = coletarObrigatoriosFaltando(
    draft,
    catalogIdsAtivosConfigurados,
  )
  mensagens.push(...obrigatoriosPend)

  const temInvalido = blocos.some((b) => b.status === 'invalido')
  const temBloqueado = blocos.some((b) => b.status === 'bloqueado')
  const temIncompleto = blocos.some((b) => b.status === 'incompleto')
  const todosConfigurados =
    blocos.length > 0 && blocos.every((b) => b.status === 'configurado')

  const pendenciasCriticas = [
    ...obrigatoriosPend,
    ...(temInvalido ? [MSG.blocosInvalidosImpedem] : []),
    ...(temBloqueado ? [MSG.bloqueadosPorPrereq] : []),
  ]

  let statusGeral: NovaEsteiraComposicaoStatus
  if (!draft.estruturaOrigem && blocos.length === 0) {
    statusGeral = 'vazia'
  } else if (temInvalido) {
    statusGeral = 'invalida'
  } else if (temBloqueado) {
    statusGeral = 'bloqueada'
  } else if (
    !baseMinimaDefinida(draft) ||
    temIncompleto ||
    !todosConfigurados ||
    obrigatoriosPend.length > 0
  ) {
    statusGeral = 'incompleta'
  } else {
    statusGeral = 'valida'
  }

  const blocosOrdenados = sortBlocosPorOrdem(blocos)

  const blocosValidos = blocosOrdenados.filter((b) => b.status === 'configurado')
  const blocosIncompletos = blocosOrdenados.filter((b) => b.status === 'incompleto')
  const blocosDependentes = blocosOrdenados.filter((b) => b.status === 'bloqueado')
  const blocosInvalidos = blocosOrdenados.filter((b) => b.status === 'invalido')
  const blocosPendentes = blocosOrdenados.filter(
    (b) =>
      b.status === 'incompleto' ||
      b.status === 'bloqueado' ||
      b.status === 'nao_iniciado',
  )
  const blocosAtivos = blocosOrdenados.filter((b) => b.ativo)

  const disponiveis = getNovaEsteiraBlocosMock()

  const dependenciasNaoResolvidas = [
    ...new Set(
      blocosDependentes.flatMap((b) => b.pendencias ?? []),
    ),
  ]
  const inconsistencias = [
    ...new Set(blocosInvalidos.flatMap((b) => b.pendencias ?? [])),
  ]

  const pendenciasGerais = [...new Set([...mensagens.filter(Boolean), ...pendenciasCriticas])]

  const podeMaterializar = statusGeral === 'valida'

  const recomendacoesLeves = coletarRecomendacoesLeves(statusGeral, activeCatalogIds)

  const motivosQueImpedemMaterializacao = buildMotivosQueImpedemMaterializacao(
    draft,
    {
      statusGeral,
      podeMaterializar,
      temInvalido,
      temBloqueado,
      obrigatoriosPend,
    },
  )

  const baseSel =
    draft.estruturaOrigem === 'BASE_ESTEIRA' && draft.baseEsteiraAplicadaId
      ? getBaseEsteira(draft.baseEsteiraAplicadaId)?.nome ?? draft.baseEsteiraAplicadaId
      : draft.estruturaOrigem
        ? String(draft.estruturaOrigem)
        : null

  const contagemTipos = (() => {
    const m: Partial<Record<NovaEsteiraBlocoOperacional['tipo'], number>> = {}
    for (const b of blocosValidos) {
      m[b.tipo] = (m[b.tipo] ?? 0) + 1
    }
    return m
  })()
  const perfilTipos = Object.entries(contagemTipos)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${t}:${n}`)
    .join(' · ')

  const resumoOperacional = [
    baseSel ? `Base: ${baseSel}` : null,
    `${blocosAtivos.length} bloco(s) ativo(s)`,
    perfilTipos ? `Perfil: ${perfilTipos}` : null,
    blocosInvalidos.length ? `${blocosInvalidos.length} inválido(s)` : null,
    blocosPendentes.length ? `${blocosPendentes.length} pendente(s)` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const montagem: NovaEsteiraMontagem = {
    baseSelecionada: baseSel,
    blocosDisponiveis: disponiveis,
    blocosAtivos,
    blocosValidos,
    blocosIncompletos,
    blocosDependentes,
    blocosInvalidos,
    blocosPendentes,
    statusGeral,
    pendenciasGerais,
    pendenciasCriticas,
    dependenciasNaoResolvidas,
    inconsistencias,
    motivosQueImpedemMaterializacao,
    resumoOperacional,
    recomendacoesLeves: recomendacoesLeves.length ? recomendacoesLeves : undefined,
    podeMaterializar,
    futureExtensions: futureExtensionsNeutros(),
  }

  return {
    montagem,
    blocosOrdenados,
    mensagens,
  }
}

export function snapshotComposicaoMontagem(e: EntradaComposicao): SnapshotComposicaoMontagem {
  const resultado = avaliarComposicaoNovaEsteira(e)
  const estadoAgregado = mapComposicaoStatusParaAgregado(resultado.montagem.statusGeral)
  return {
    estadoAgregado,
    blocos: resultado.blocosOrdenados,
    mensagens: resultado.mensagens,
    resultado,
  }
}

export function montagemProntaParaMaterializar(s: SnapshotComposicaoMontagem): boolean {
  return s.resultado.montagem.podeMaterializar
}

export function getPendenciasDaComposicao(draft: NovaEsteiraDraft): string[] {
  return avaliarComposicaoNovaEsteira(draft).montagem.pendenciasGerais
}

export function getBlocosInvalidos(draft: NovaEsteiraDraft): NovaEsteiraBlocoOperacional[] {
  return avaliarComposicaoNovaEsteira(draft).montagem.blocosInvalidos
}

export function getBlocosPendentes(draft: NovaEsteiraDraft): NovaEsteiraBlocoOperacional[] {
  return avaliarComposicaoNovaEsteira(draft).montagem.blocosPendentes
}

export function canMaterializarNovaEsteira(draft: NovaEsteiraDraft): boolean {
  return avaliarComposicaoNovaEsteira(draft).montagem.podeMaterializar
}

export function avaliarStatusDoBloco(
  bloco: NovaEsteiraBlocoOperacional,
  contexto: NovaEsteiraBlocoContextoAvaliacao,
): NovaEsteiraBlocoStatus {
  const cid = bloco.metadata?.catalogoId as string | undefined
  if (!cid) return bloco.status
  const def = getBlocoOperacionalDef(cid)
  if (!def) return 'invalido'
  const pre = def.preRequisitosCatalogoIds ?? []
  const ordem = contexto.catalogIdsAtivosNaOrdem
  const idx = ordem.indexOf(cid)
  const antes = idx <= 0 ? [] : ordem.slice(0, idx)
  for (const p of pre) {
    if (!antes.includes(p) && !contexto.catalogIdsAtivosConfigurados.has(p)) {
      return 'bloqueado'
    }
  }
  return bloco.status
}
