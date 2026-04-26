/**
 * Contexto da tela de Apontamento — exclusivamente a partir da projeção operacional
 * (`getEsteiraOperacionalDetalheMock` / `findAtividadeOperacionalNaEsteira`).
 */
import type { AtividadePrioridade } from './esteira-detalhe'
import type { AtividadeStatusDetalhe } from './esteira-detalhe'
import type { EsteiraOperacionalDetalhe } from './esteira-operacional'
import {
  findAtividadeOperacionalNaEsteira,
  getEsteiraOperacionalDetalheMock,
  listEsteiraIdsParaApontamento,
  type EsteiraAtividadeOperacional,
  type EsteiraBlocoOperacional,
} from './esteira-operacional'

export type ApontamentoOrigem = 'minhas_atividades' | 'esteira_detalhe'

export type ApontamentoContextStatus = 'a_fazer' | 'em_progresso' | 'concluida'

export type ApontamentoContextView = {
  id: string
  tituloAtividade: string
  tarefaNome: string
  esteiraNome: string
  esteiraId: string
  osRef: string
  setor: string
  setorId: string
  responsavel: string
  colaboradorId?: string
  colaboradorNome: string
  colaboradorCodigo?: string
  colaboradorRegistroInativo?: boolean
  responsavelResolvido: boolean
  estimativaH: number
  tempoRegistradoMin: number
  prioridade: 'alta' | 'media' | 'baixa'
  status: ApontamentoContextStatus
  janela: string
  origem: ApontamentoOrigem
  apontavel: boolean
  motivoNaoApontavel?: string
  bloqueada: boolean
  atividadeStatusDetalhe?: AtividadeStatusDetalhe
}

export type CarteiraLinhaView = {
  id: string
  titulo: string
  esteiraId: string
  esteiraNome: string
  osRef: string
  setor: string
  setorId: string
  responsavel: string
  colaboradorId?: string
  colaboradorNome: string
  colaboradorCodigo?: string
  colaboradorRegistroInativo?: boolean
  responsavelResolvido: boolean
  estimativaH: number
  tempoRegistradoMin: number
  prioridade: 'alta' | 'media' | 'baixa'
  status: ApontamentoContextStatus
  janela: string
  apontavel: boolean
  motivoNaoApontavel?: string
}

function mapEsteiraStatus(s: AtividadeStatusDetalhe): ApontamentoContextStatus {
  if (s === 'concluida') return 'concluida'
  if (s === 'em_execucao' || s === 'pausada') return 'em_progresso'
  return 'a_fazer'
}

function prioridadeLinhaParaView(
  p: AtividadePrioridade | undefined,
  fallback: EsteiraOperacionalDetalhe['prioridade'],
): 'alta' | 'media' | 'baixa' {
  if (p === 'critica' || p === 'alta') return 'alta'
  if (p === 'media') return 'media'
  if (p === 'baixa') return 'baixa'
  if (fallback === 'alta') return 'alta'
  if (fallback === 'media') return 'media'
  return 'baixa'
}

function buildContextView(
  op: EsteiraOperacionalDetalhe,
  bloco: EsteiraBlocoOperacional,
  a: EsteiraAtividadeOperacional,
  origem: ApontamentoOrigem,
): ApontamentoContextView {
  const bloqueada = a.status === 'bloqueada'
  const ap = a.apontabilidade
  return {
    id: a.id,
    tituloAtividade: a.nome,
    tarefaNome: bloco.nome,
    esteiraNome: op.nome,
    esteiraId: op.esteiraId,
    osRef: op.codigoOs,
    setor: a.setorNome,
    setorId: a.setorId,
    responsavel: a.responsavel,
    colaboradorId: a.colaboradorId,
    colaboradorNome: a.colaboradorNome,
    colaboradorCodigo: a.colaboradorCodigo,
    colaboradorRegistroInativo: a.colaboradorRegistroInativo,
    responsavelResolvido: a.responsavelResolvido,
    estimativaH: a.estimativaMin / 60,
    tempoRegistradoMin: a.realizadoMin,
    prioridade: prioridadeLinhaParaView(a.prioridade, op.prioridade),
    status: mapEsteiraStatus(bloqueada ? 'pendente' : a.status),
    janela: op.prazoTexto,
    origem,
    apontavel: ap.apontavel,
    motivoNaoApontavel: ap.motivoNaoApontavel,
    bloqueada,
    atividadeStatusDetalhe: a.status,
  }
}

export type ResolveApontamentoContextOptions = {
  /** Quando presente (ex.: query `esteiraId`), resolve primeiro nesta esteira. */
  esteiraIdHint?: string
  /** `esteira_detalhe` quando o fluxo veio do detalhe da esteira (query `from=esteira`). */
  origem?: ApontamentoOrigem
}

export function resolveApontamentoContext(
  rawId: string | undefined,
  opts?: ResolveApontamentoContextOptions,
): ApontamentoContextView | undefined {
  if (!rawId) return undefined

  const origem: ApontamentoOrigem =
    opts?.origem ??
    (opts?.esteiraIdHint ? 'esteira_detalhe' : 'minhas_atividades')

  const tryEsteira = (eid: string): ApontamentoContextView | undefined => {
    const op = getEsteiraOperacionalDetalheMock(eid)
    if (!op) return undefined
    const found = findAtividadeOperacionalNaEsteira(op, rawId)
    if (!found) return undefined
    return buildContextView(op, found.bloco, found.atividade, origem)
  }

  if (opts?.esteiraIdHint) {
    const direct = tryEsteira(opts.esteiraIdHint)
    if (direct) return direct
  }

  for (const eid of listEsteiraIdsParaApontamento()) {
    const v = tryEsteira(eid)
    if (v) return v
  }

  return undefined
}

/** Carteira derivada só da projeção — mesmos ids das atividades operacionais. */
export function listCarteiraOperacionalFromProjection(): CarteiraLinhaView[] {
  const rows: CarteiraLinhaView[] = []
  for (const eid of listEsteiraIdsParaApontamento()) {
    const op = getEsteiraOperacionalDetalheMock(eid)
    if (!op) continue
    for (const b of op.blocos) {
      for (const a of b.atividades) {
        const ap = a.apontabilidade
        rows.push({
          id: a.id,
          titulo: a.nome,
          esteiraId: op.esteiraId,
          esteiraNome: op.nome,
          osRef: op.codigoOs,
          setor: a.setorNome,
          setorId: a.setorId,
          responsavel: a.responsavel,
          colaboradorId: a.colaboradorId,
          colaboradorNome: a.colaboradorNome,
          colaboradorCodigo: a.colaboradorCodigo,
          colaboradorRegistroInativo: a.colaboradorRegistroInativo,
          responsavelResolvido: a.responsavelResolvido,
          estimativaH: a.estimativaMin / 60,
          tempoRegistradoMin: a.realizadoMin,
          prioridade: prioridadeLinhaParaView(a.prioridade, op.prioridade),
          status: mapEsteiraStatus(a.status),
          janela: op.prazoTexto,
          apontavel: ap.apontavel,
          motivoNaoApontavel: ap.motivoNaoApontavel,
        })
      }
    }
  }
  return rows.sort((x, y) => {
    const c = x.esteiraNome.localeCompare(y.esteiraNome, 'pt-BR')
    if (c !== 0) return c
    return x.titulo.localeCompare(y.titulo, 'pt-BR')
  })
}

/** Próxima atividade apontável na mesma esteira (ordem flatten da projeção operacional). */
export function getNextApontavelNaEsteira(
  esteiraId: string,
  activityId: string,
): { id: string; titulo: string } | undefined {
  const op = getEsteiraOperacionalDetalheMock(esteiraId)
  if (!op) return undefined
  const flat = op.blocos.flatMap((b) => b.atividades)
  const idx = flat.findIndex((a) => a.id === activityId)
  if (idx === -1) return undefined
  for (let i = idx + 1; i < flat.length; i++) {
    const a = flat[i]
    if (a.apontabilidade.apontavel) {
      return { id: a.id, titulo: a.nome }
    }
  }
  return undefined
}
