/**
 * Apontamentos operacionais — contrato + validação + registro.
 * Runtime em memória: `apontamentos-store.ts` (sem ciclo com `esteira-operacional`).
 */
import type { AtividadeStatusDetalhe } from './esteira-detalhe'
import type { EsteiraAtividadeMock } from './esteira-detalhe'
import { applyAtividadeOverride } from './esteira-gestao-runtime'
import {
  findAtividadeOperacionalNaEsteira,
  getEsteiraOperacionalDetalheMock,
  listEsteiraIdsParaApontamento,
  type EsteiraAtividadeOperacional,
} from './esteira-operacional'
import { hashDeterministic } from './nova-esteira-deterministic'
import {
  __resetApontamentosStoreForTests,
  getApontamentosVersion,
  listarApontamentosPorAtividade,
  listarApontamentosPorEsteira,
  listarTodosApontamentosOperacionais,
  nextSeq,
  obterHistoricoAgregadoAtividade,
  obterResumoApontamentosEsteira,
  pushApontamento,
  subscribeApontamentos,
} from './apontamentos-store'
import type {
  ApontamentoOperacional,
  ApontamentoOperacionalInput,
  MotivoBloqueioApontamento,
  ResultadoRegistroApontamento,
  TipoApontamentoOperacional,
  ValidacaoRegistroApontamento,
} from './apontamentos-types'

export type {
  ApontamentoHistoricoAtividade,
  ApontamentoOperacional,
  ApontamentoOperacionalInput,
  ApontamentoOrigemRegistro,
  MotivoBloqueioApontamento,
  ResultadoRegistroApontamento,
  TipoApontamentoOperacional,
  ValidacaoRegistroApontamento,
} from './apontamentos-types'

export {
  getApontamentosVersion,
  listarApontamentosPorAtividade,
  listarApontamentosPorEsteira,
  listarTodosApontamentosOperacionais,
  obterHistoricoAgregadoAtividade,
  obterResumoApontamentosEsteira,
  subscribeApontamentos,
}

function mensagemMotivo(
  motivo: MotivoBloqueioApontamento,
  extra?: string,
): string {
  const m: Record<MotivoBloqueioApontamento, string> = {
    esteira_nao_encontrada: 'Esteira não encontrada na projeção operacional.',
    atividade_nao_encontrada:
      'Atividade não existe nesta esteira na projeção operacional.',
    nao_apontavel:
      extra ?? 'Esta atividade não está apontável no estado atual.',
    minutos_invalidos: 'Informe minutos inteiros maiores ou iguais a zero.',
    tipo_incompativel_estado:
      extra ??
      'Este tipo de apontamento não se aplica ao estado atual da atividade.',
    contexto_insuficiente_responsavel:
      'Não há responsável definido na linha da atividade — corrija na operação.',
  }
  return m[motivo]
}

function minutosValidos(minutos: unknown): minutos is number {
  return (
    typeof minutos === 'number' &&
    Number.isFinite(minutos) &&
    Number.isInteger(minutos) &&
    minutos >= 0
  )
}

function contextoResponsavelBloqueiaApontamento(
  a: EsteiraAtividadeOperacional,
): boolean {
  if (!a.responsavel?.trim()) return true
  const g = a.gapResponsavel
  return (
    g === 'sem_responsavel_linha' ||
    g === 'rotulo_operacional_equipe' ||
    g === 'nome_ambiguo_na_fonte' ||
    g === 'id_inexistente_na_fonte'
  )
}

type EfeitoOk = {
  patch: Partial<EsteiraAtividadeMock>
  statusGerado: AtividadeStatusDetalhe
}

function computeEfeitoOperacional(
  a: EsteiraAtividadeOperacional,
  tipo: TipoApontamentoOperacional,
  minutos: number,
):
  | { ok: false; motivo: MotivoBloqueioApontamento; mensagem: string }
  | { ok: true; efeito: EfeitoOk } {
  const st = a.status
  const novoRealizado = a.realizadoMin + minutos

  if (tipo === 'pausa') {
    if (st !== 'em_execucao') {
      return {
        ok: false,
        motivo: 'tipo_incompativel_estado',
        mensagem: mensagemMotivo(
          'tipo_incompativel_estado',
          'Só é possível pausar com a atividade em execução.',
        ),
      }
    }
    return {
      ok: true,
      efeito: {
        patch: { status: 'pausada', realizadoMin: novoRealizado },
        statusGerado: 'pausada',
      },
    }
  }

  if (tipo === 'conclusao') {
    if (st === 'concluida') {
      return {
        ok: false,
        motivo: 'tipo_incompativel_estado',
        mensagem: mensagemMotivo(
          'tipo_incompativel_estado',
          'A atividade já está concluída.',
        ),
      }
    }
    return {
      ok: true,
      efeito: {
        patch: { status: 'concluida', realizadoMin: novoRealizado },
        statusGerado: 'concluida',
      },
    }
  }

  if (st === 'concluida') {
    return {
      ok: false,
      motivo: 'tipo_incompativel_estado',
      mensagem: mensagemMotivo(
        'tipo_incompativel_estado',
        'Não é possível registrar execução em atividade concluída.',
      ),
    }
  }
  const novoStatus: AtividadeStatusDetalhe = 'em_execucao'
  return {
    ok: true,
    efeito: {
      patch: { status: novoStatus, realizadoMin: novoRealizado },
      statusGerado: novoStatus,
    },
  }
}

function validarInterno(
  input: ApontamentoOperacionalInput,
):
  | { ok: false; motivo: MotivoBloqueioApontamento; mensagem: string }
  | { ok: true; atividade: EsteiraAtividadeOperacional; efeito: EfeitoOk } {
  const op = getEsteiraOperacionalDetalheMock(input.esteiraId)
  if (!op) {
    return {
      ok: false,
      motivo: 'esteira_nao_encontrada',
      mensagem: mensagemMotivo('esteira_nao_encontrada'),
    }
  }

  const found = findAtividadeOperacionalNaEsteira(op, input.atividadeId)
  if (!found) {
    return {
      ok: false,
      motivo: 'atividade_nao_encontrada',
      mensagem: mensagemMotivo('atividade_nao_encontrada'),
    }
  }

  const a = found.atividade
  if (contextoResponsavelBloqueiaApontamento(a)) {
    return {
      ok: false,
      motivo: 'contexto_insuficiente_responsavel',
      mensagem: mensagemMotivo('contexto_insuficiente_responsavel'),
    }
  }

  if (!a.apontabilidade.apontavel) {
    return {
      ok: false,
      motivo: 'nao_apontavel',
      mensagem: a.apontabilidade.motivoNaoApontavel ?? mensagemMotivo('nao_apontavel'),
    }
  }

  if (!minutosValidos(input.minutos)) {
    return {
      ok: false,
      motivo: 'minutos_invalidos',
      mensagem: mensagemMotivo('minutos_invalidos'),
    }
  }

  const efeito = computeEfeitoOperacional(
    a,
    input.tipoApontamento,
    input.minutos,
  )
  if (!efeito.ok) return efeito
  return { ok: true, atividade: a, efeito: efeito.efeito }
}

export function validarRegistroApontamento(
  input: ApontamentoOperacionalInput,
): ValidacaoRegistroApontamento {
  const r = validarInterno(input)
  if (!r.ok) return r
  return { ok: true }
}

export function canRegistrarApontamento(
  input: ApontamentoOperacionalInput,
): boolean {
  return validarRegistroApontamento(input).ok
}

export function registrarApontamentoOperacional(
  input: ApontamentoOperacionalInput,
): ResultadoRegistroApontamento {
  const r = validarInterno(input)
  if (!r.ok) return r

  const { atividade: a, efeito } = r
  const id = `ap-${hashDeterministic([
    input.esteiraId,
    input.atividadeId,
    String(nextSeq()),
    String(Date.now()),
  ])}`
  const createdAt = new Date().toISOString()
  const ap: ApontamentoOperacional = {
    id,
    esteiraId: input.esteiraId,
    atividadeId: input.atividadeId,
    setorId: a.setorId,
    responsavel: a.colaboradorNome.trim(),
    colaboradorId: a.colaboradorId,
    colaboradorNome: a.colaboradorNome,
    colaboradorCodigo: a.colaboradorCodigo,
    tipoApontamento: input.tipoApontamento,
    minutos: input.minutos,
    observacao: input.observacao?.trim() || undefined,
    statusGerado: efeito.statusGerado,
    createdAt,
    origem: 'manual_mock',
  }

  applyAtividadeOverride(input.atividadeId, efeito.patch)
  pushApontamento(ap)
  return { ok: true, apontamento: ap }
}

export function resolverEsteiraIdDaAtividadeNaProjecao(
  atividadeId: string,
): string | undefined {
  for (const eid of listEsteiraIdsParaApontamento()) {
    const op = getEsteiraOperacionalDetalheMock(eid)
    if (!op) continue
    if (findAtividadeOperacionalNaEsteira(op, atividadeId)) return op.esteiraId
  }
  return undefined
}

export function __resetApontamentosRuntimeForTests() {
  __resetApontamentosStoreForTests()
}
