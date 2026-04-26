/**
 * Camada analítica por STEP (ACTIVITY) no mock — multi-responsável + apontamentos agregados.
 *
 * Tipo neutro: `StepAnaliticoDetalhe` em `domain/esteiras/step-analitico.types.ts`.
 */

import {
  computeStatusLeituraApontamento,
  type ApontamentoAnaliticoItem,
  type FonteTotalMinutosStep,
  type StepAnaliticoDetalhe,
  type StepEquipeDetalhe,
  type StepResponsavelDetalhe,
} from '../domain/esteiras/step-analitico.types'
import { listColaboradoresOperacionaisAtivosParaSelecao } from './colaboradores-operacionais-repository'
import { listarApontamentosPorAtividade } from './apontamentos-store'
import type { ApontamentoOperacional } from './apontamentos-types'
import { hashDeterministic } from './nova-esteira-deterministic'

/** @deprecated use types from domain/esteiras/step-analitico.types */
export type StepResponsavelMock = StepResponsavelDetalhe
/** @deprecated use StepEquipeDetalhe */
export type StepEquipeMock = StepEquipeDetalhe
/** @deprecated */
export type ApontamentoAnaliticoMock = ApontamentoAnaliticoItem
/** @deprecated */
export type StepAnaliticoMock = StepAnaliticoDetalhe

export type { FonteTotalMinutosStep } from '../domain/esteiras/step-analitico.types'
export type {
  StatusLeituraApontamentoStep,
  ResumoApontamentosStep,
} from '../domain/esteiras/step-analitico.types'

export { labelStatusLeituraApontamento } from '../domain/esteiras/step-analitico.types'

function stableResponsavelId(
  papel: 'principal' | 'apoio',
  esteiraId: string,
  atividadeId: string,
  colaboradorKey: string,
): string {
  return `sr-${hashDeterministic([papel, esteiraId, atividadeId, colaboradorKey])}`
}

function buildPrincipal(input: {
  esteiraId: string
  atividadeId: string
  colaboradorId?: string
  colaboradorNome: string
  colaboradorCodigo?: string
}): StepResponsavelDetalhe {
  const key = input.colaboradorId?.trim() ?? input.colaboradorNome.trim()
  return {
    id: stableResponsavelId('principal', input.esteiraId, input.atividadeId, key),
    colaboradorId: input.colaboradorId,
    nomeExibicao: input.colaboradorNome,
    codigo: input.colaboradorCodigo,
    papel: 'principal',
  }
}

function pickApoiosDeterministic(
  esteiraId: string,
  atividadeId: string,
  colaboradorPrincipalId: string | undefined,
): StepResponsavelDetalhe[] {
  const todos = listColaboradoresOperacionaisAtivosParaSelecao()
  const excluir = new Set(
    [colaboradorPrincipalId].filter(Boolean) as string[],
  )
  const candidatos = todos.filter((c) => !excluir.has(c.colaboradorId))
  const n =
    parseInt(hashDeterministic([esteiraId, atividadeId, 'apoio-n']), 16) % 3
  const qtd = n === 0 ? 0 : n === 1 ? 1 : 2
  const ordenados = [...candidatos].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR'),
  )
  const seed = parseInt(hashDeterministic([esteiraId, atividadeId, 'apoio-rot']), 16)
  const out: StepResponsavelDetalhe[] = []
  for (let i = 0; i < Math.min(qtd, ordenados.length); i++) {
    const c = ordenados[(seed + i) % ordenados.length]!
    if (out.some((x) => x.colaboradorId === c.colaboradorId)) continue
    out.push({
      id: stableResponsavelId('apoio', esteiraId, atividadeId, c.colaboradorId),
      colaboradorId: c.colaboradorId,
      nomeExibicao: c.nome,
      codigo: c.codigo,
      papel: 'apoio',
    })
  }
  return out
}

function apOperacionalParaAnalitico(
  ap: ApontamentoOperacional,
  conveyorId: string,
  stepNodeId: string,
  matrixActivityNodeId: string | undefined,
): ApontamentoAnaliticoItem {
  return {
    id: ap.id,
    conveyorId,
    stepNodeId,
    matrixActivityNodeId,
    colaboradorId: ap.colaboradorId,
    colaboradorNome: ap.colaboradorNome ?? ap.responsavel,
    minutos: ap.minutos,
    observacao: ap.observacao,
    createdAt: ap.createdAt,
    origem: 'mock_store',
  }
}

export type BuildStepAnaliticoInput = {
  esteiraId: string
  atividadeId: string
  matrixActivityNodeId?: string
  estimativaMin: number
  realizadoMinLinha: number
  colaboradorId?: string
  colaboradorNome: string
  colaboradorCodigo?: string
}

/**
 * Monta o pacote analítico do step a partir da projeção + store de apontamentos.
 */
export function buildStepAnaliticoMock(
  input: BuildStepAnaliticoInput,
): StepAnaliticoDetalhe {
  const { esteiraId, atividadeId, matrixActivityNodeId } = input
  const lista = listarApontamentosPorAtividade(esteiraId, atividadeId)
  const totalRepo = lista.reduce((s, x) => s + x.minutos, 0)
  const fonteTotalMinutos: FonteTotalMinutosStep =
    lista.length > 0 ? 'apontamentos_registrados' : 'linha_realizada'
  const totalMinutosApontados =
    lista.length > 0 ? totalRepo : input.realizadoMinLinha

  const ultimoChrono = lista.length
    ? [...lista].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0]
    : undefined

  const principal = buildPrincipal({
    esteiraId,
    atividadeId,
    colaboradorId: input.colaboradorId,
    colaboradorNome: input.colaboradorNome,
    colaboradorCodigo: input.colaboradorCodigo,
  })

  const apoios = pickApoiosDeterministic(
    esteiraId,
    atividadeId,
    principal.colaboradorId,
  )

  const saldoMinutos = totalMinutosApontados - input.estimativaMin
  const statusLeitura = computeStatusLeituraApontamento(
    input.estimativaMin,
    totalMinutosApontados,
  )

  const historicoPreview = [...lista]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 8)
    .map((ap) =>
      apOperacionalParaAnalitico(ap, esteiraId, atividadeId, matrixActivityNodeId),
    )

  return {
    conveyorId: esteiraId,
    stepNodeId: atividadeId,
    matrixActivityNodeId,
    equipe: { principal, apoios },
    apontamentos: {
      planejadoMin: input.estimativaMin,
      totalMinutosApontados,
      quantidadeLancamentos: lista.length,
      ultimoApontamentoAt: ultimoChrono?.createdAt,
      saldoMinutos,
      statusLeitura,
      fonteTotalMinutos,
    },
    historicoPreview,
    fonte: 'mock',
  }
}
