/**
 * Histórico mock da atividade — eventos plausíveis, modos oficiais de apontamento,
 * separação leve entre operação e gestão.
 *
 * Composição única: seed (BASE) + runtime de gestão (RUNTIME) + apontamentos
 * operacionais (repositório central), ordenados por data.
 */
import { formatMinutosHumanos } from '../lib/formatters'
import {
  listarApontamentosPorAtividade,
  resolverEsteiraIdDaAtividadeNaProjecao,
  type ApontamentoOperacional,
} from './apontamentos-repository'

export type HistoricoModoApontamento = 'guiado' | 'manual'

/** Origem do registro para UI — ambos modos de apontamento são oficiais. */
export type HistoricoCategoria = 'operacional' | 'gestao' | 'sistema'

export type HistoricoTipoEvento =
  | 'criacao'
  | 'atribuicao'
  | 'iniciada'
  | 'pausada'
  | 'retomada'
  | 'concluida'
  | 'horas_manuais'
  | 'observacao'
  | 'bloqueio'
  | 'desbloqueio'
  | 'status_ajuste'
  | 'prioridade_ajuste'
  | 'observacao_gestor'

export type HistoricoEvento = {
  id: string
  /** ISO 8601 */
  at: string
  tipo: HistoricoTipoEvento
  /** Frase curta em linguagem humana (não jargão de sistema). */
  label: string
  usuario: string
  minutosLancados?: number
  observacao?: string
  /**
   * Execução guiada vs lançamento manual — só quando fizer sentido;
   * eventos de gestão/sistema costumam omitir.
   */
  modo?: HistoricoModoApontamento
  categoria: HistoricoCategoria
  /** Ex.: "Pendente → Em execução" */
  impactoStatus?: string
}

const BASE: Record<string, HistoricoEvento[]> = {
  /** Reforma bancos — em execução — histórico rico e coerente */
  't3-a4': [
    {
      id: 't34-10',
      at: '2026-03-30T10:12:00',
      tipo: 'observacao',
      label: 'Observação no apontamento',
      usuario: 'Pedro',
      observacao:
        'Estrutura do encosto OK; falta revisar fixação inferior antes de seguir.',
      categoria: 'operacional',
      modo: 'guiado',
    },
    {
      id: 't34-9',
      at: '2026-03-30T09:40:00',
      tipo: 'horas_manuais',
      label: 'Registrou 30 min manualmente',
      usuario: 'Pedro',
      minutosLancados: 30,
      modo: 'manual',
      categoria: 'operacional',
      observacao: 'Retomada após reunião rápida de alinhamento.',
    },
    {
      id: 't34-8',
      at: '2026-03-30T09:05:00',
      tipo: 'pausada',
      label: 'Pausou a execução',
      usuario: 'Pedro',
      modo: 'guiado',
      categoria: 'operacional',
    },
    {
      id: 't34-7',
      at: '2026-03-30T08:15:00',
      tipo: 'retomada',
      label: 'Retomou a execução',
      usuario: 'Pedro',
      modo: 'guiado',
      categoria: 'operacional',
      impactoStatus: 'Em execução',
    },
    {
      id: 't34-6',
      at: '2026-03-29T17:45:00',
      tipo: 'pausada',
      label: 'Pausou a execução ao final do turno',
      usuario: 'Pedro',
      modo: 'guiado',
      categoria: 'operacional',
    },
    {
      id: 't34-5',
      at: '2026-03-29T14:20:00',
      tipo: 'iniciada',
      label: 'Iniciou a execução',
      usuario: 'Pedro',
      modo: 'guiado',
      categoria: 'operacional',
      impactoStatus: 'Em execução',
    },
    {
      id: 't34-4',
      at: '2026-03-26T11:30:00',
      tipo: 'observacao_gestor',
      label: 'Observação do gestor',
      usuario: 'Marcos',
      observacao:
        'Priorizar acabamento quando a espuma do assento estiver homogênea.',
      categoria: 'gestao',
    },
    {
      id: 't34-3',
      at: '2026-03-24T09:15:00',
      tipo: 'prioridade_ajuste',
      label: 'Prioridade da atividade ajustada',
      usuario: 'Marcos',
      categoria: 'gestao',
      observacao: 'Alinhado à entrega do cliente — Alta.',
      impactoStatus: 'Prioridade: alta',
    },
    {
      id: 't34-2',
      at: '2026-03-22T14:05:00',
      tipo: 'atribuicao',
      label: 'Responsável atribuído',
      usuario: 'Sistema',
      observacao: 'Pedro · Tapeçaria',
      categoria: 'sistema',
    },
    {
      id: 't34-1',
      at: '2026-03-22T14:00:00',
      tipo: 'criacao',
      label: 'Atividade criada no fluxo da esteira',
      usuario: 'Sistema',
      categoria: 'sistema',
    },
  ],
  /** Teto — execução com mix guiado + manual */
  't4-a3': [
    {
      id: 't43-4',
      at: '2026-03-29T18:00:00',
      tipo: 'horas_manuais',
      label: 'Registrou 1 h 20 manualmente',
      usuario: 'Carlos',
      minutosLancados: 80,
      modo: 'manual',
      categoria: 'operacional',
      observacao: 'Trabalho contínuo após almoço — lançamento consolidado.',
    },
    {
      id: 't43-3',
      at: '2026-03-29T14:00:00',
      tipo: 'iniciada',
      label: 'Iniciou a execução',
      usuario: 'Carlos',
      modo: 'guiado',
      categoria: 'operacional',
      impactoStatus: 'Em execução',
    },
    {
      id: 't43-2',
      at: '2026-03-28T10:30:00',
      tipo: 'atribuicao',
      label: 'Responsável confirmado',
      usuario: 'Sistema',
      observacao: 'Carlos · Tapeçaria',
      categoria: 'sistema',
    },
    {
      id: 't43-1',
      at: '2026-03-28T10:25:00',
      tipo: 'criacao',
      label: 'Atividade criada no fluxo da esteira',
      usuario: 'Sistema',
      categoria: 'sistema',
    },
  ],
  /** Pendente — só observação inicial */
  't3-a5': [
    {
      id: 't35-1',
      at: '2026-03-28T11:00:00',
      tipo: 'observacao',
      label: 'Observação no planejamento',
      usuario: 'Ana',
      observacao: 'Aguardando corte do tecido aprovado pelo cliente.',
      categoria: 'operacional',
      modo: 'manual',
    },
  ],
  /** Bloqueada — material */
  't5-a1': [
    {
      id: 't51-4',
      at: '2026-03-27T09:00:00',
      tipo: 'bloqueio',
      label: 'Bloqueio registrado',
      usuario: 'Marcos',
      observacao: 'Falta definição de material do carpete (amostra pendente).',
      categoria: 'gestao',
      impactoStatus: 'Bloqueada',
    },
    {
      id: 't51-3',
      at: '2026-03-26T16:20:00',
      tipo: 'observacao_gestor',
      label: 'Observação do gestor',
      usuario: 'Marcos',
      observacao: 'Não iniciar corte até confirmação do cliente no grupo.',
      categoria: 'gestao',
    },
    {
      id: 't51-2',
      at: '2026-03-25T08:30:00',
      tipo: 'status_ajuste',
      label: 'Status ajustado',
      usuario: 'Marcos',
      categoria: 'gestao',
      impactoStatus: 'Pendente → Bloqueada',
    },
    {
      id: 't51-1',
      at: '2026-03-22T11:00:00',
      tipo: 'criacao',
      label: 'Atividade criada no fluxo da esteira',
      usuario: 'Sistema',
      categoria: 'sistema',
    },
  ],
  /** ET-002 — banco passageiro em execução */
  'et2-t3-a2': [
    {
      id: 'e232-2',
      at: '2026-03-30T08:30:00',
      tipo: 'iniciada',
      label: 'Iniciou a execução',
      usuario: 'Pedro',
      modo: 'guiado',
      categoria: 'operacional',
      impactoStatus: 'Em execução',
    },
    {
      id: 'e232-1',
      at: '2026-03-29T16:00:00',
      tipo: 'criacao',
      label: 'Atividade criada no fluxo da esteira',
      usuario: 'Sistema',
      categoria: 'sistema',
    },
  ],
  /** ET-003 — teto ainda no backlog */
  'et3-t1-a1': [
    {
      id: 'e311-1',
      at: '2026-03-30T09:20:00',
      tipo: 'observacao',
      label: 'Observação no planejamento',
      usuario: 'João',
      observacao: 'Aguardando liberação da OS no backlog para iniciar desmontagem.',
      categoria: 'operacional',
      modo: 'manual',
    },
  ],
}

const RUNTIME: Record<string, HistoricoEvento[]> = {}

let runtimeId = 0

export function appendHistoricoRuntime(
  activityId: string,
  partial: Omit<HistoricoEvento, 'id' | 'at'>,
): HistoricoEvento {
  const id = `rt-${activityId}-${++runtimeId}-${Date.now()}`
  const at = new Date().toISOString()
  const ev: HistoricoEvento = { ...partial, id, at }
  RUNTIME[activityId] = [...(RUNTIME[activityId] ?? []), ev]
  return ev
}

function apontamentoOperacionalParaEvento(
  ap: ApontamentoOperacional,
): HistoricoEvento {
  const modo: HistoricoModoApontamento = 'manual'
  if (ap.tipoApontamento === 'pausa') {
    return {
      id: ap.id,
      at: ap.createdAt,
      tipo: 'pausada',
      label: 'Pausou a execução (apontamento operacional)',
      usuario: ap.responsavel,
      minutosLancados: ap.minutos,
      observacao: ap.observacao,
      modo,
      categoria: 'operacional',
      impactoStatus: 'Pausada',
    }
  }
  if (ap.tipoApontamento === 'conclusao') {
    return {
      id: ap.id,
      at: ap.createdAt,
      tipo: 'concluida',
      label: 'Concluiu a atividade (apontamento operacional)',
      usuario: ap.responsavel,
      minutosLancados: ap.minutos,
      observacao: ap.observacao,
      modo,
      categoria: 'operacional',
      impactoStatus: 'Concluída',
    }
  }
  return {
    id: ap.id,
    at: ap.createdAt,
    tipo: 'horas_manuais',
    label:
      ap.minutos > 0
        ? `Registrou ${ap.minutos} min em execução (apontamento)`
        : 'Retomou ou iniciou execução (apontamento)',
    usuario: ap.responsavel,
    minutosLancados: ap.minutos,
    observacao: ap.observacao,
    modo,
    categoria: 'operacional',
    impactoStatus: 'Em execução',
  }
}

export function getHistoricoAtividadeMock(
  activityId: string,
): HistoricoEvento[] {
  const base = BASE[activityId] ?? []
  const extra = RUNTIME[activityId] ?? []
  const esteiraId = resolverEsteiraIdDaAtividadeNaProjecao(activityId)
  const apontamentos = esteiraId
    ? listarApontamentosPorAtividade(esteiraId, activityId).map(
        apontamentoOperacionalParaEvento,
      )
    : []
  const merged = [...base, ...extra, ...apontamentos]
  return merged.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )
}

export function eventoTipoLabel(t: HistoricoTipoEvento): string {
  const map: Record<HistoricoTipoEvento, string> = {
    criacao: 'Criação',
    atribuicao: 'Atribuição',
    iniciada: 'Início',
    pausada: 'Pausa',
    retomada: 'Retomada',
    concluida: 'Conclusão',
    horas_manuais: 'Lançamento manual',
    observacao: 'Observação',
    bloqueio: 'Bloqueio',
    desbloqueio: 'Desbloqueio',
    status_ajuste: 'Status',
    prioridade_ajuste: 'Prioridade',
    observacao_gestor: 'Gestor',
  }
  return map[t]
}

export function categoriaLabel(c: HistoricoCategoria): string {
  if (c === 'operacional') return 'Operação'
  if (c === 'gestao') return 'Gestão'
  return 'Fluxo'
}

/** Texto curto para chip de modo — reforça que manual e guiado são oficiais. */
export function modoLabel(m?: HistoricoModoApontamento) {
  if (!m) return null
  return m === 'guiado' ? 'Execução guiada' : 'Lançamento manual'
}

export function formatMinutosEvento(min?: number) {
  if (min == null) return '—'
  return formatMinutosHumanos(min)
}
