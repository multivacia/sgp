import {
  computeOperationalPanelKpis,
  type OperationalPanelKpis,
} from '../lib/backlog/operationalBuckets'
import { computeResumoEsteira, getEsteiraDetalheMock } from './esteira-detalhe'
import type { NovaEsteiraEstruturaOrigem } from './nova-esteira-domain'
import type { BacklogPriority } from './backlog-priority'
import { normalizeBacklogPriority } from './backlog-priority'

export type BacklogOrigin = 'manual' | 'documento' | 'base' | 'hybrid'

export type BacklogStatus =
  | 'no_backlog'
  | 'em_revisao'
  | 'pronta_liberar'
  | 'em_producao'
  | 'concluida'

export type { BacklogPriority }
export { normalizeBacklogPriority }

export type { OperationalPanelKpis as BacklogKpis } from '../lib/backlog/operationalBuckets'

/** Única fonte para os cards do painel — mesma regra que a coluna Situação (`getOperationalBucket`). */
export function computeBacklogKpis(
  rows: BacklogRow[],
  now: Date = new Date(),
) {
  return computeOperationalPanelKpis(rows, now)
}

export type BacklogRow = {
  id: string
  ref: string
  name: string
  origin: BacklogOrigin
  activities: number
  responsible: string
  priority: BacklogPriority
  status: BacklogStatus
  enteredAt: string
  /** Detalhe da esteira (universo oficial). */
  esteiraId?: string
  /**
   * Como a estrutura foi montada na criação (Nova Esteira).
   * Independente de `origin` (entrada manual vs documento no backlog).
   */
  estruturaOrigem?: NovaEsteiraEstruturaOrigem
  /** Base de Esteira utilizada como ponto de partida (mock). */
  baseEsteiraId?: string
  /** Bases de Tarefa referenciadas na composição (mock). */
  basesTarefaIds?: string[]
  /** Preenchido quando status é concluída (API real). */
  completedAt?: string | null
  /** Prazo estimado ao nível da esteira (GET /conveyors) — atraso no painel. */
  estimatedDeadline?: string | null
  /** Texto auxiliar para busca (ex.: cliente da API). */
  clientName?: string
}

function countActivities(esteiraId: string): number {
  const e = getEsteiraDetalheMock(esteiraId)
  if (!e) return 0
  return computeResumoEsteira(e).totalAtividades
}

/**
 * Três esteiras oficiais — origem comum no backlog.
 * Estados coerentes com o detalhe: ET-001 em produção, ET-002 em revisão, ET-003 aguardando.
 */
export const BACKLOG_MOCK_ROWS: BacklogRow[] = [
  {
    id: 'row-et-001',
    ref: 'OS ET-001',
    name: 'Reforma completa da tapeçaria interna',
    origin: 'manual',
    activities: countActivities('et-001'),
    responsible: 'Carlos',
    priority: 'alta',
    status: 'em_producao',
    enteredAt: '2026-03-25T08:00:00',
    esteiraId: 'et-001',
    estimatedDeadline: '2026-04-10T12:00:00.000Z',
  },
  {
    id: 'row-et-002',
    ref: 'OS ET-002',
    name: 'Reforma dos bancos dianteiros',
    origin: 'manual',
    activities: countActivities('et-002'),
    responsible: 'Marcos',
    priority: 'media',
    status: 'em_revisao',
    enteredAt: '2026-03-28T14:20:00',
    esteiraId: 'et-002',
    estimatedDeadline: '2026-04-20T00:00:00.000Z',
  },
  {
    id: 'row-et-003',
    ref: 'OS ET-003',
    name: 'Reforma do teto',
    origin: 'documento',
    activities: countActivities('et-003'),
    responsible: 'João',
    priority: 'baixa',
    status: 'no_backlog',
    enteredAt: '2026-03-30T09:15:00',
    esteiraId: 'et-003',
    estimatedDeadline: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'row-et-004',
    ref: 'OS ET-004',
    name: 'Higienização de ar-condicionado e dutos',
    origin: 'manual',
    activities: countActivities('et-004'),
    responsible: 'Juliana',
    priority: 'media',
    status: 'em_producao',
    enteredAt: '2026-04-02T10:00:00',
    esteiraId: 'et-004',
    estimatedDeadline: '2026-04-30T18:00:00.000Z',
  },
  {
    id: 'row-et-005',
    ref: 'OS ET-005',
    name: 'Reforma do volante e acabamento do conjunto airbag',
    origin: 'base',
    activities: countActivities('et-005'),
    responsible: 'Ana',
    priority: 'baixa',
    status: 'no_backlog',
    enteredAt: '2026-04-04T15:30:00',
    esteiraId: 'et-005',
  },
]

/** Base estática (apenas linhas seed); a tela usa `computeBacklogKpis(allRows)`. */
export const BACKLOG_KPIS: OperationalPanelKpis =
  computeBacklogKpis(BACKLOG_MOCK_ROWS)
