/**
 * Contrato operacional único: projeção sobre o detalhe da esteira (oficial + materializada ne-…)
 * e base para futuros apontamentos. Regras de apontabilidade ficam aqui, não na UI.
 *
 * Futuros apontamentos: usar esteiraId, atividadeId (= id da atividade na projeção),
 * setorId (derivado de esteira + nome do setor na materialização), responsável da linha.
 */

import { BACKLOG_MOCK_ROWS, type BacklogRow } from './backlog'
import type { NovaEsteiraEstruturaOrigem } from './nova-esteira-domain'
import { hashDeterministic } from './nova-esteira-deterministic'
import type {
  AtividadeStatusDetalhe,
  EsteiraAtividadeMock,
  EsteiraDetalheMock,
  EsteiraStatusGeral,
  TarefaStatusAgregado,
} from './esteira-detalhe'
import { OFFICIAL_ESTEIRA_IDS, getEsteiraDetalheMock } from './esteira-detalhe'
import { mergeEsteiraDetalhe } from './esteira-gestao-runtime'
import { getEsteirasExtraSnapshot } from './runtime-esteiras'
import { listMaterializadaEsteiraIds } from './esteira-materializada-registry'
import {
  resolveColaboradorNaLinhaAtividade,
  type GapResponsavelColaborador,
} from './colaboradores-operacionais'
import type { StepAnaliticoDetalhe } from '../domain/esteiras/step-analitico.types'
import { buildStepAnaliticoMock } from './esteira-step-analitico-mock'

export type ApontabilidadeAtividade = {
  apontavel: boolean
  motivoNaoApontavel?: string
}

/** Estados operacionais da atividade na esteira (espelha o domínio do detalhe + pronta). */
export type EstadoOperacionalAtividade = AtividadeStatusDetalhe

export type OrigemMaterializacaoAtividade =
  | 'seed_oficial'
  | 'nova_esteira_materializada'

export type EsteiraAtividadeOperacional = EsteiraAtividadeMock & {
  atividadeId: string
  setorId: string
  setorNome: string
  ordemGlobal: number
  ordemNoBloco: number
  apontabilidade: ApontabilidadeAtividade
  origemMaterializacao: OrigemMaterializacaoAtividade
  tarefaBlocoId: string
  matrixActivityNodeId?: string
  colaboradorNome: string
  colaboradorCodigo?: string
  /** Cadastro inativo na fonte; linha histórica continua legível. */
  colaboradorRegistroInativo?: boolean
  responsavelResolvido: boolean
  gapResponsavel?: GapResponsavelColaborador
  colaboradorChaveAgregacao: string
  /** Equipe + apontamentos analíticos por STEP (mock: builder; real: adapter na UI). */
  stepAnalitico?: StepAnaliticoDetalhe
}

export type EsteiraResumoOperacional = {
  totalTarefas: number
  totalAtividades: number
  estimativaTotalMin: number
  realizadoTotalMin: number
  progressoPct: number
  concluidas: number
  emExecucao: number
  pausadas: number
  pendentes: number
  prontas: number
  bloqueadas: number
  apontaveis: number
  setoresDistintos: number
}

export type EsteiraBlocoOperacional = {
  id: string
  nome: string
  ordem: number
  statusAgregado: TarefaStatusAgregado
  estimativaMin: number
  realizadoMin: number
  quantidadeAtividades: number
  quantidadeApontaveis: number
  quantidadeConcluidas: number
  atividades: EsteiraAtividadeOperacional[]
  /** Opção (TASK) / área (SECTOR) quando o detalhe veio da matriz oficial mockada. */
  opcaoNome?: string
  areaNome?: string
  matrixTaskNodeId?: string
  matrixSectorNodeId?: string
}

export type EsteiraOperacionalDetalhe = {
  id: string
  esteiraId: string
  ref: string
  codigoOs: string
  nome: string
  veiculo: string
  origemLabel: string
  statusGeral: EsteiraStatusGeral
  prioridade: EsteiraDetalheMock['prioridade']
  responsavelPrincipal: string
  enteredAt?: string
  prazoTexto: string
  observacaoCurta?: string
  estruturaOrigem?: NovaEsteiraEstruturaOrigem
  resumoOperacional: EsteiraResumoOperacional
  quantidadeSetores: number
  quantidadeAtividades: number
  quantidadeApontaveis: number
  quantidadeConcluidas: number
  quantidadeBloqueadas: number
  blocos: EsteiraBlocoOperacional[]
}

export function stableSetorId(esteiraId: string, setorNome: string): string {
  const n = setorNome.trim() || '—'
  return `st-${hashDeterministic([esteiraId, 'setor', n])}`
}

function isMaterializadaId(esteiraId: string): boolean {
  return esteiraId.startsWith('ne-')
}

export type ContextoApontabilidadeEsteira = {
  statusGeralEsteira: EsteiraStatusGeral
}

/** Regra central de apontabilidade — usar na projeção e em testes. */
export function computeApontabilidadeAtividade(
  status: AtividadeStatusDetalhe,
  ctx: ContextoApontabilidadeEsteira,
): ApontabilidadeAtividade {
  if (ctx.statusGeralEsteira === 'no_backlog') {
    return {
      apontavel: false,
      motivoNaoApontavel:
        'Esteira ainda no backlog operacional — encaminhar para execução antes de apontar.',
    }
  }
  if (ctx.statusGeralEsteira === 'concluida') {
    return {
      apontavel: false,
      motivoNaoApontavel: 'Esteira concluída.',
    }
  }
  if (ctx.statusGeralEsteira === 'pausada') {
    return {
      apontavel: false,
      motivoNaoApontavel: 'Esteira pausada.',
    }
  }
  if (status === 'concluida') {
    return { apontavel: false, motivoNaoApontavel: 'Atividade concluída.' }
  }
  if (status === 'bloqueada') {
    return { apontavel: false, motivoNaoApontavel: 'Atividade bloqueada.' }
  }
  return { apontavel: true }
}

export function isAtividadeApontavel(
  atividade: Pick<EsteiraAtividadeOperacional, 'status' | 'apontabilidade'>,
): boolean {
  return atividade.apontabilidade.apontavel
}

function getBacklogRowForEsteira(esteiraId: string): BacklogRow | undefined {
  return (
    BACKLOG_MOCK_ROWS.find((r) => r.esteiraId === esteiraId) ??
    getEsteirasExtraSnapshot().find((r) => r.esteiraId === esteiraId)
  )
}

function findBacklogRowByEsteiraId(
  esteiraId: string,
): Pick<BacklogRow, 'enteredAt' | 'estruturaOrigem'> | undefined {
  const r = getBacklogRowForEsteira(esteiraId)
  if (!r) return undefined
  return { enteredAt: r.enteredAt, estruturaOrigem: r.estruturaOrigem }
}

function buildResumoFromAtividades(
  atividades: EsteiraAtividadeOperacional[],
  totalTarefas: number,
): EsteiraResumoOperacional {
  const estimativaTotalMin = atividades.reduce((s, a) => s + a.estimativaMin, 0)
  const realizadoTotalMin = atividades.reduce((s, a) => s + a.realizadoMin, 0)
  const progressoPct =
    estimativaTotalMin > 0
      ? Math.round((realizadoTotalMin / estimativaTotalMin) * 1000) / 10
      : 0
  const concluidas = atividades.filter((a) => a.status === 'concluida').length
  const emExecucao = atividades.filter((a) => a.status === 'em_execucao').length
  const pausadas = atividades.filter((a) => a.status === 'pausada').length
  const pendentes = atividades.filter((a) => a.status === 'pendente').length
  const prontas = atividades.filter((a) => a.status === 'pronta').length
  const bloqueadas = atividades.filter((a) => a.status === 'bloqueada').length
  const apontaveis = atividades.filter((a) => a.apontabilidade.apontavel).length
  const setores = new Set(atividades.map((a) => a.setorId))

  return {
    totalTarefas,
    totalAtividades: atividades.length,
    estimativaTotalMin,
    realizadoTotalMin,
    progressoPct,
    concluidas,
    emExecucao,
    pausadas,
    pendentes,
    prontas,
    bloqueadas,
    apontaveis,
    setoresDistintos: setores.size,
  }
}

/**
 * Projeta o detalhe operacional a partir do mock de detalhe já unificado (gestão aplicada).
 */
export function buildEsteiraOperacionalDetalhe(
  merged: EsteiraDetalheMock,
  meta?: { enteredAt?: string; estruturaOrigem?: NovaEsteiraEstruturaOrigem },
): EsteiraOperacionalDetalhe {
  const esteiraId = merged.id
  const ctxAp: ContextoApontabilidadeEsteira = {
    statusGeralEsteira: merged.statusGeral,
  }

  const origemMat: OrigemMaterializacaoAtividade = isMaterializadaId(esteiraId)
    ? 'nova_esteira_materializada'
    : 'seed_oficial'

  let ordemGlobal = 0
  const blocos: EsteiraBlocoOperacional[] = merged.tarefas.map((t) => {
    const atividades: EsteiraAtividadeOperacional[] = t.atividades.map(
      (a, idxBloco) => {
        ordemGlobal += 1
        const setorNome = a.setor.trim() || '—'
        const setorId = stableSetorId(esteiraId, setorNome)
        const apontabilidade = computeApontabilidadeAtividade(a.status, ctxAp)
        const colab = resolveColaboradorNaLinhaAtividade({
          colaboradorId: a.colaboradorId,
          responsavel: a.responsavel,
        })
        const base: EsteiraAtividadeOperacional = {
          ...a,
          setor: setorNome,
          atividadeId: a.id,
          setorId,
          setorNome,
          ordemGlobal,
          ordemNoBloco: idxBloco + 1,
          apontabilidade,
          origemMaterializacao: origemMat,
          tarefaBlocoId: t.id,
          matrixActivityNodeId: a.matrixActivityNodeId,
          colaboradorId: colab.colaboradorId ?? a.colaboradorId,
          colaboradorNome: colab.colaboradorNome,
          colaboradorCodigo: colab.colaboradorCodigo,
          colaboradorRegistroInativo: colab.colaboradorRegistroInativo,
          responsavelResolvido: colab.responsavelResolvido,
          gapResponsavel: colab.gapResponsavel,
          colaboradorChaveAgregacao: colab.chaveAgregacao,
        }
        return {
          ...base,
          stepAnalitico: buildStepAnaliticoMock({
            esteiraId,
            atividadeId: a.id,
            matrixActivityNodeId: a.matrixActivityNodeId,
            estimativaMin: a.estimativaMin,
            realizadoMinLinha: a.realizadoMin,
            colaboradorId: base.colaboradorId,
            colaboradorNome: base.colaboradorNome,
            colaboradorCodigo: base.colaboradorCodigo,
          }),
        }
      },
    )

    const estimativaMin = atividades.reduce((s, x) => s + x.estimativaMin, 0)
    const realizadoMin = atividades.reduce((s, x) => s + x.realizadoMin, 0)
    const quantidadeApontaveis = atividades.filter(
      (x) => x.apontabilidade.apontavel,
    ).length
    const quantidadeConcluidas = atividades.filter(
      (x) => x.status === 'concluida',
    ).length

    return {
      id: t.id,
      nome: t.nome,
      ordem: t.ordem,
      statusAgregado: t.status,
      estimativaMin,
      realizadoMin,
      quantidadeAtividades: atividades.length,
      quantidadeApontaveis,
      quantidadeConcluidas,
      atividades,
      opcaoNome: t.opcaoNome,
      areaNome: t.areaNome,
      matrixTaskNodeId: t.matrixTaskNodeId,
      matrixSectorNodeId: t.matrixSectorNodeId,
    }
  })

  const flat = blocos.flatMap((b) => b.atividades)
  const resumoOperacional = buildResumoFromAtividades(flat, blocos.length)

  const rowMeta = meta ?? findBacklogRowByEsteiraId(esteiraId)

  return {
    id: esteiraId,
    esteiraId,
    ref: merged.referenciaOs,
    codigoOs: merged.referenciaOs,
    nome: merged.nome,
    veiculo: merged.veiculo,
    origemLabel: merged.tipoOrigem,
    statusGeral: merged.statusGeral,
    prioridade: merged.prioridade,
    responsavelPrincipal: inferResponsavelPrincipal(merged),
    enteredAt: rowMeta?.enteredAt,
    prazoTexto: merged.prazoTexto,
    observacaoCurta: merged.observacaoCurta,
    estruturaOrigem: rowMeta?.estruturaOrigem,
    resumoOperacional,
    quantidadeSetores: resumoOperacional.setoresDistintos,
    quantidadeAtividades: resumoOperacional.totalAtividades,
    quantidadeApontaveis: resumoOperacional.apontaveis,
    quantidadeConcluidas: resumoOperacional.concluidas,
    quantidadeBloqueadas: resumoOperacional.bloqueadas,
    blocos,
  }
}

function inferResponsavelPrincipal(e: EsteiraDetalheMock): string {
  const row = getBacklogRowForEsteira(e.id)
  if (row?.responsible?.trim()) return row.responsible.trim()
  const first = e.tarefas[0]?.atividades[0]?.responsavel?.trim()
  if (first) return first
  return '—'
}

/**
 * Fonte única para detalhe operacional: resolve et-…, ne-… via registry e aplica gestão mock.
 */
export function getEsteiraOperacionalDetalheMock(
  id: string,
): EsteiraOperacionalDetalhe | undefined {
  const base = getEsteiraDetalheMock(id)
  if (!base) return undefined
  const merged = mergeEsteiraDetalhe(base)
  const meta = findBacklogRowByEsteiraId(id)
  return buildEsteiraOperacionalDetalhe(merged, meta)
}

export function findAtividadeOperacionalNaEsteira(
  op: EsteiraOperacionalDetalhe,
  activityId: string,
): { bloco: EsteiraBlocoOperacional; atividade: EsteiraAtividadeOperacional } | undefined {
  for (const b of op.blocos) {
    const atividade = b.atividades.find((a) => a.id === activityId)
    if (atividade) return { bloco: b, atividade }
  }
  return undefined
}

/** Ids de esteira a considerar ao resolver apontamento vindo do detalhe (oficiais + materializadas na sessão). */
export function listEsteiraIdsParaApontamento(): string[] {
  return [...OFFICIAL_ESTEIRA_IDS, ...listMaterializadaEsteiraIds()]
}
