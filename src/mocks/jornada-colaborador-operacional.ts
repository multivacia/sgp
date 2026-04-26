/**
 * Jornada operacional do colaborador — agregação única a partir da projeção da esteira
 * (`getEsteiraOperacionalDetalheMock`) e dos apontamentos no repositório central.
 *
 * A chave de agregação vem de `colaboradorChaveAgregacao` na projeção (id forte, fallback
 * textual ou buckets explícitos — ver `resolveColaboradorNaLinhaAtividade`).
 */

import {
  RESPONSAVEL_LINHA_VAZIA_CHAVE,
  ROTULO_EQUIPE_CHAVE,
  ROTULO_EQUIPE_NOME,
  type GapResponsavelColaborador,
} from './colaboradores-operacionais'
import { obterHistoricoAgregadoAtividade } from './apontamentos-repository'
import type { AtividadePrioridade, AtividadeStatusDetalhe } from './esteira-detalhe'
import {
  getEsteiraOperacionalDetalheMock,
  listEsteiraIdsParaApontamento,
  type EsteiraAtividadeOperacional,
  type EsteiraOperacionalDetalhe,
} from './esteira-operacional'

/** Bucket explícito quando `responsavel` está vazio na projeção (não inventa pessoa). */
export const RESPONSAVEL_AUSENTE_CHAVE = RESPONSAVEL_LINHA_VAZIA_CHAVE

export const RESPONSAVEL_AUSENTE_LABEL = 'Sem responsável na linha'

export type CarteiraAtividadeColaborador = {
  esteiraId: string
  atividadeId: string
  setorId: string
  esteiraRef: string
  esteiraNome: string
  atividadeNome: string
  setorNome: string
  status: AtividadeStatusDetalhe
  apontavel: boolean
  motivoNaoApontavel?: string
  responsavel: string
  colaboradorId?: string
  colaboradorNome: string
  colaboradorCodigo?: string
  colaboradorRegistroInativo?: boolean
  responsavelResolvido: boolean
  gapResponsavel?: GapResponsavelColaborador
  colaboradorChaveAgregacao: string
  prioridade?: AtividadePrioridade
  estimativaMin: number
  minutosApontados: number
  quantidadeApontamentos: number
  ultimoApontamentoEm?: string
}

export type JornadaColaboradorOperacional = {
  colaboradorId?: string
  responsavelNome: string
  responsavelChaveAgregacao: string
  quantidadeAtividades: number
  quantidadeApontaveis: number
  quantidadePendentes: number
  quantidadeProntas: number
  quantidadeEmExecucao: number
  quantidadePausadas: number
  quantidadeBloqueadas: number
  quantidadeConcluidas: number
  quantidadeComApontamento: number
  minutosApontados: number
  ultimoApontamentoEm?: string
  temAmbiguidadeIdentidade: boolean
  observacoesDeFonte?: string[]
  estimativaTotalMin: number
  carteira: CarteiraAtividadeColaborador[]
}

export type JornadaColaboradorAgregado = {
  porResponsavel: JornadaColaboradorOperacional[]
  totais: {
    responsaveis: number
    atividades: number
    minutosApontados: number
    estimativaTotalMin: number
  }
  fonteGaps: string[]
}

export type JornadaColaboradorFiltros = {
  responsavelChave?: string
  esteiraId?: string
  statusAtividade?: AtividadeStatusDetalhe
  somenteApontaveis?: boolean
  somenteComApontamento?: boolean
  buscaTexto?: string
}

export function normalizarChaveResponsavel(raw: string): string {
  const t = raw.trim()
  return t.length > 0 ? t : RESPONSAVEL_AUSENTE_CHAVE
}

export function rotuloResponsavel(raw: string): string {
  const t = raw.trim()
  return t.length > 0 ? t : RESPONSAVEL_AUSENTE_LABEL
}

function maxIso(dates: (string | undefined)[]): string | undefined {
  const ok = dates.filter((d): d is string => Boolean(d))
  if (!ok.length) return undefined
  return ok.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
}

function buildCarteiraLinha(
  op: EsteiraOperacionalDetalhe,
  a: EsteiraAtividadeOperacional,
  hist: ReturnType<typeof obterHistoricoAgregadoAtividade>,
): CarteiraAtividadeColaborador {
  return {
    esteiraId: op.esteiraId,
    atividadeId: a.atividadeId,
    setorId: a.setorId,
    esteiraRef: op.ref,
    esteiraNome: op.nome,
    atividadeNome: a.nome,
    setorNome: a.setorNome,
    status: a.status,
    apontavel: a.apontabilidade.apontavel,
    motivoNaoApontavel: a.apontabilidade.motivoNaoApontavel,
    responsavel: a.responsavel,
    colaboradorId: a.colaboradorId,
    colaboradorNome: a.colaboradorNome,
    colaboradorCodigo: a.colaboradorCodigo,
    colaboradorRegistroInativo: a.colaboradorRegistroInativo,
    responsavelResolvido: a.responsavelResolvido,
    gapResponsavel: a.gapResponsavel,
    colaboradorChaveAgregacao: a.colaboradorChaveAgregacao,
    prioridade: a.prioridade,
    estimativaMin: a.estimativaMin,
    minutosApontados: hist.totalMinutos,
    quantidadeApontamentos: hist.quantidade,
    ultimoApontamentoEm: hist.ultimo?.createdAt,
  }
}

function contarPorStatus(
  linhas: CarteiraAtividadeColaborador[],
  st: AtividadeStatusDetalhe,
): number {
  return linhas.filter((l) => l.status === st).length
}

function resumoFromCarteira(
  linhas: CarteiraAtividadeColaborador[],
  responsavelNome: string,
  responsavelChaveAgregacao: string,
  temAmbiguidadeIdentidade: boolean,
  observacoesDeFonte: string[] | undefined,
): JornadaColaboradorOperacional {
  const estimativaTotalMin = linhas.reduce((s, l) => s + l.estimativaMin, 0)
  const minutosApontados = linhas.reduce((s, l) => s + l.minutosApontados, 0)
  const colaboradorId = linhas[0]?.colaboradorId
  return {
    colaboradorId,
    responsavelNome,
    responsavelChaveAgregacao,
    quantidadeAtividades: linhas.length,
    quantidadeApontaveis: linhas.filter((l) => l.apontavel).length,
    quantidadePendentes: contarPorStatus(linhas, 'pendente'),
    quantidadeProntas: contarPorStatus(linhas, 'pronta'),
    quantidadeEmExecucao: contarPorStatus(linhas, 'em_execucao'),
    quantidadePausadas: contarPorStatus(linhas, 'pausada'),
    quantidadeBloqueadas: contarPorStatus(linhas, 'bloqueada'),
    quantidadeConcluidas: contarPorStatus(linhas, 'concluida'),
    quantidadeComApontamento: linhas.filter((l) => l.quantidadeApontamentos > 0)
      .length,
    minutosApontados,
    ultimoApontamentoEm: maxIso(linhas.map((l) => l.ultimoApontamentoEm)),
    temAmbiguidadeIdentidade,
    observacoesDeFonte,
    estimativaTotalMin,
    carteira: linhas.slice().sort((x, y) => {
      const c = x.esteiraNome.localeCompare(y.esteiraNome, 'pt-BR')
      if (c !== 0) return c
      return x.atividadeNome.localeCompare(y.atividadeNome, 'pt-BR')
    }),
  }
}

type GrupoAcumulado = {
  linhas: CarteiraAtividadeColaborador[]
  esteiraIds: Set<string>
}

/**
 * Agregação central: percorre todas as esteiras da projeção (et-… e ne-…),
 * achata atividades e agrupa por chave estrutural da projeção (`colaboradorChaveAgregacao`).
 * Minutos apontados vêm exclusivamente de `obterHistoricoAgregadoAtividade` (repositório).
 */
export function buildJornadaColaboradorOperacional(): JornadaColaboradorAgregado {
  const grupos = new Map<string, GrupoAcumulado>()

  for (const eid of listEsteiraIdsParaApontamento()) {
    const op = getEsteiraOperacionalDetalheMock(eid)
    if (!op) continue
    for (const b of op.blocos) {
      for (const a of b.atividades) {
        const hist = obterHistoricoAgregadoAtividade(op.esteiraId, a.id)
        const linha = buildCarteiraLinha(op, a, hist)
        const chave = a.colaboradorChaveAgregacao
        let g = grupos.get(chave)
        if (!g) {
          g = { linhas: [], esteiraIds: new Set() }
          grupos.set(chave, g)
        }
        g.linhas.push(linha)
        g.esteiraIds.add(op.esteiraId)
      }
    }
  }

  const fonteGaps: string[] = [
    'Identidade forte: quando a linha resolve na fonte oficial de colaboradores, a agregação usa `colaboradorId`.',
    'Fallback textual ou ambiguidade permanecem visíveis quando o nome não corresponde unicamente à fonte.',
  ]

  const porResponsavel: JornadaColaboradorOperacional[] = []

  for (const [chave, g] of grupos) {
    const first = g.linhas[0]
    const nome =
      chave === RESPONSAVEL_AUSENTE_CHAVE
        ? RESPONSAVEL_AUSENTE_LABEL
        : chave === ROTULO_EQUIPE_CHAVE
          ? ROTULO_EQUIPE_NOME
          : first?.colaboradorNome ?? '—'
    const temAmbiguidadeIdentidade = g.esteiraIds.size > 1
    const observacoes: string[] = []
    if (chave === RESPONSAVEL_AUSENTE_CHAVE) {
      observacoes.push(
        'Há atividades sem responsável na linha — apontamento operacional continua bloqueado até definir responsável na projeção.',
      )
    }
    if (chave === ROTULO_EQUIPE_CHAVE) {
      observacoes.push(
        'Rótulo operacional “Equipe” — não representa colaborador individual na fonte oficial.',
      )
    }
    if (temAmbiguidadeIdentidade) {
      if (first?.colaboradorId && first.responsavelResolvido) {
        observacoes.push(
          'Mesmo colaborador (identidade forte) aparece em mais de uma esteira.',
        )
      } else {
        observacoes.push(
          'Mesmo agrupamento aparece em mais de uma esteira — possível homônimo ou nome ainda não distinguido na fonte.',
        )
      }
    }
    porResponsavel.push(
      resumoFromCarteira(
        g.linhas,
        nome,
        chave,
        temAmbiguidadeIdentidade,
        observacoes.length ? observacoes : undefined,
      ),
    )
  }

  porResponsavel.sort((x, y) =>
    x.responsavelNome.localeCompare(y.responsavelNome, 'pt-BR'),
  )

  const atividades = porResponsavel.reduce((s, r) => s + r.quantidadeAtividades, 0)
  const minutosApontados = porResponsavel.reduce((s, r) => s + r.minutosApontados, 0)
  const estimativaTotalMin = porResponsavel.reduce(
    (s, r) => s + r.estimativaTotalMin,
    0,
  )

  return {
    porResponsavel,
    totais: {
      responsaveis: porResponsavel.length,
      atividades,
      minutosApontados,
      estimativaTotalMin,
    },
    fonteGaps,
  }
}

/**
 * Restringe a jornada às esteiras indicadas, recomputando resumos por responsável.
 * Usado pelo dashboard operacional para filtros sobre o agregado já construído.
 */
export function refiltrarJornadaAgregadoPorEsteiraIds(
  agregado: JornadaColaboradorAgregado,
  esteiraIds: Set<string>,
): JornadaColaboradorAgregado {
  const porResponsavel: JornadaColaboradorOperacional[] = []

  for (const r of agregado.porResponsavel) {
    const filtrada = r.carteira.filter((l) => esteiraIds.has(l.esteiraId))
    if (filtrada.length === 0) continue
    const idsDist = new Set(filtrada.map((l) => l.esteiraId))
    const temAmbiguidadeIdentidade = idsDist.size > 1
    porResponsavel.push(
      resumoFromCarteira(
        filtrada,
        r.responsavelNome,
        r.responsavelChaveAgregacao,
        temAmbiguidadeIdentidade,
        r.observacoesDeFonte,
      ),
    )
  }

  porResponsavel.sort((x, y) =>
    x.responsavelNome.localeCompare(y.responsavelNome, 'pt-BR'),
  )

  const atividades = porResponsavel.reduce((s, r) => s + r.quantidadeAtividades, 0)
  const minutosApontados = porResponsavel.reduce((s, r) => s + r.minutosApontados, 0)
  const estimativaTotalMin = porResponsavel.reduce(
    (s, r) => s + r.estimativaTotalMin,
    0,
  )

  return {
    porResponsavel,
    totais: {
      responsaveis: porResponsavel.length,
      atividades,
      minutosApontados,
      estimativaTotalMin,
    },
    fonteGaps: agregado.fonteGaps,
  }
}

function carteiraPassaFiltro(
  l: CarteiraAtividadeColaborador,
  f: JornadaColaboradorFiltros,
): boolean {
  if (f.esteiraId && l.esteiraId !== f.esteiraId) return false
  if (f.statusAtividade && l.status !== f.statusAtividade) return false
  if (f.somenteApontaveis && !l.apontavel) return false
  if (f.somenteComApontamento && l.quantidadeApontamentos === 0) return false
  if (f.buscaTexto) {
    const q = f.buscaTexto.trim().toLowerCase()
    if (!q) return true
    const blob = [
      l.atividadeNome,
      l.esteiraNome,
      l.setorNome,
      l.esteiraRef,
      l.colaboradorNome,
    ]
      .join(' ')
      .toLowerCase()
    if (!blob.includes(q)) return false
  }
  return true
}

/**
 * Filtra sobre o agregado já construído (sem segunda fonte).
 */
export function aplicarFiltrosJornada(
  agregado: JornadaColaboradorAgregado,
  filtros: JornadaColaboradorFiltros,
): JornadaColaboradorAgregado {
  let rows = agregado.porResponsavel

  if (filtros.responsavelChave) {
    rows = rows.filter((r) => r.responsavelChaveAgregacao === filtros.responsavelChave)
  }

  const temFiltroCarteira = Boolean(
    filtros.esteiraId ||
      filtros.statusAtividade ||
      filtros.somenteApontaveis ||
      filtros.somenteComApontamento ||
      (filtros.buscaTexto && filtros.buscaTexto.trim()),
  )

  const novoPor: JornadaColaboradorOperacional[] = []

  for (const r of rows) {
    const filtrada = temFiltroCarteira
      ? r.carteira.filter((l) => carteiraPassaFiltro(l, filtros))
      : r.carteira.slice()

    if (filtrada.length === 0) continue

    novoPor.push(
      resumoFromCarteira(
        filtrada,
        r.responsavelNome,
        r.responsavelChaveAgregacao,
        r.temAmbiguidadeIdentidade,
        r.observacoesDeFonte,
      ),
    )
  }

  const atividades = novoPor.reduce((s, r) => s + r.quantidadeAtividades, 0)
  const minutosApontados = novoPor.reduce((s, r) => s + r.minutosApontados, 0)
  const estimativaTotalMin = novoPor.reduce((s, r) => s + r.estimativaTotalMin, 0)

  return {
    porResponsavel: novoPor,
    totais: {
      responsaveis: novoPor.length,
      atividades,
      minutosApontados,
      estimativaTotalMin,
    },
    fonteGaps: agregado.fonteGaps,
  }
}

export function listJornadasColaboradorMock(): JornadaColaboradorOperacional[] {
  return buildJornadaColaboradorOperacional().porResponsavel
}

export function getJornadaColaboradorByChave(
  chave: string,
): JornadaColaboradorOperacional | undefined {
  return buildJornadaColaboradorOperacional().porResponsavel.find(
    (r) => r.responsavelChaveAgregacao === chave,
  )
}

/** Conjunto de chaves de agregação derivadas só da projeção — para testes de ausência de colaborador inventado. */
export function coletarChavesResponsavelProjecao(): Set<string> {
  const s = new Set<string>()
  for (const eid of listEsteiraIdsParaApontamento()) {
    const op = getEsteiraOperacionalDetalheMock(eid)
    if (!op) continue
    for (const b of op.blocos) {
      for (const a of b.atividades) {
        s.add(a.colaboradorChaveAgregacao)
      }
    }
  }
  return s
}
