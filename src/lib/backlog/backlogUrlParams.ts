/**
 * Query params do painel `/app/backlog` (filtros via URL).
 *
 * - `situacao` — bucket operacional (`no_backlog` | `em_revisao` | … | `concluidas`) ou legado `ativas`.
 * - `scope=ativas` — recorte semântico preferido para “esteiras não concluídas” (equivalente ao donut/cards gerenciais).
 *   Se `scope=ativas` estiver presente, tem precedência sobre `situacao` em caso de conflito (normalização na página).
 * - `days` — janela temporal em dias; **aplica-se apenas** com `situacao=concluidas`, filtrando por `completed_at`
 *   dentro dos últimos N dias (alinhado ao dashboard gerencial).
 * - `completedWithinDays` — alias legado de `days` (mesma regra); se ambos existirem, `days` prevalece.
 * - `q` — texto para `GET /api/v1/conveyors?q=` (nome, código, cliente).
 * - `priority` — `alta` | `media` | `baixa`.
 * - `responsible` — texto (ILIKE no servidor no campo responsável da esteira).
 * - `page` / `pageSize` — paginação **apenas no cliente** (lista filtrada); não são enviados à API.
 */

import type {
  ConveyorOperationalStatus,
  ListConveyorsQuery,
} from '../../domain/conveyors/conveyor.types'
import {
  COLABS_DEFAULT_PAGE_SIZE,
  COLABS_PAGE_SIZE_OPTIONS,
} from '../admin/collaboratorsListUrlState'

const MAX_DAYS = 365

function parsePositiveInt(s: string | null, fallback: number): number {
  const n = Number.parseInt(s ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export type BacklogPriorityParam = 'alta' | 'media' | 'baixa'

/**
 * `situacao` / `scope` como interpretados no painel (valor do select “Situação”).
 * Buckets só no cliente: `ativas`, `em_andamento`, `em_atraso`.
 */
export type BacklogSituationFilterValue =
  | ''
  | 'ativas'
  | 'no_backlog'
  | 'em_revisao'
  | 'em_andamento'
  | 'em_atraso'
  | 'concluidas'

export function parseBacklogDaysWindow(sp: URLSearchParams): number {
  const preferDays = sp.get('days')
  const legacy = sp.get('completedWithinDays')
  const raw = preferDays ?? legacy
  const n = raw ? Number.parseInt(raw, 10) : NaN
  if (!Number.isFinite(n) || n < 1 || n > MAX_DAYS) return 0
  return n
}

export function backlogHasScopeAtivas(sp: URLSearchParams): boolean {
  if (sp.get('scope') === 'ativas') return true
  if (sp.get('situacao') === 'ativas') return true
  return false
}

export function parseBacklogQ(sp: URLSearchParams): string {
  return sp.get('q')?.trim() ?? ''
}

export function parseBacklogPriority(
  sp: URLSearchParams,
): '' | BacklogPriorityParam {
  const p = sp.get('priority')?.trim()
  if (p === 'alta' || p === 'media' || p === 'baixa') return p
  return ''
}

export function parseBacklogResponsible(sp: URLSearchParams): string {
  return sp.get('responsible')?.trim() ?? ''
}

/** Paginação só no cliente — mesmos defaults/opções que Colaboradores. */
export function parseBacklogPage(sp: URLSearchParams): number {
  return Math.max(1, parsePositiveInt(sp.get('page'), 1))
}

export function parseBacklogPageSize(sp: URLSearchParams): number {
  const n = Number.parseInt(sp.get('pageSize') ?? '', 10)
  return (COLABS_PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? n
    : COLABS_DEFAULT_PAGE_SIZE
}

/**
 * Situação do painel derivada da URL (`scope` / `situacao`), alinhada ao select.
 */
export function parseBacklogSituationFilter(
  sp: URLSearchParams,
): BacklogSituationFilterValue {
  if (backlogHasScopeAtivas(sp)) return 'ativas'
  const s = sp.get('situacao')?.trim()
  if (
    s === 'no_backlog' ||
    s === 'em_revisao' ||
    s === 'em_andamento' ||
    s === 'em_atraso' ||
    s === 'concluidas'
  ) {
    return s
  }
  return ''
}

/**
 * Só envia `operationalStatus` à API quando coincide com o enum persistido.
 * Buckets `ativas`, `em_andamento`, `em_atraso` e vazio → sem filtro de status na API.
 */
export function operationalStatusForConveyorsListApi(
  situation: BacklogSituationFilterValue,
): ConveyorOperationalStatus | undefined {
  if (situation === 'no_backlog') return 'NO_BACKLOG'
  if (situation === 'em_revisao') return 'EM_REVISAO'
  if (situation === 'concluidas') return 'CONCLUIDA'
  return undefined
}

/** Monta o query object do GET /api/v1/conveyors a partir da URL do backlog. */
export function listConveyorsQueryFromBacklogUrl(
  sp: URLSearchParams,
  situation: BacklogSituationFilterValue,
): ListConveyorsQuery {
  const out: ListConveyorsQuery = {}
  const q = parseBacklogQ(sp)
  if (q) out.q = q
  const pr = parseBacklogPriority(sp)
  if (pr) out.priority = pr
  const resp = parseBacklogResponsible(sp)
  if (resp) out.responsible = resp
  const os = operationalStatusForConveyorsListApi(situation)
  if (os) out.operationalStatus = os
  return out
}

/**
 * Aplica as mesmas regras de normalização que o painel de backlog usa na URL
 * (evita estados incoerentes e conflitos entre parâmetros).
 *
 * @returns cópia normalizada, ou `null` se nada mudou.
 */
export function normalizeBacklogSearchParams(
  input: URLSearchParams,
): URLSearchParams | null {
  const next = new URLSearchParams(input)
  let changed = false
  const scope = next.get('scope')
  const situacao = next.get('situacao')
  const dw = parseBacklogDaysWindow(next)

  if (scope === 'ativas') {
    if (situacao) {
      next.delete('situacao')
      changed = true
    }
    if (dw > 0) {
      next.delete('days')
      next.delete('completedWithinDays')
      changed = true
    }
  } else if (situacao && situacao !== 'concluidas' && dw > 0) {
    next.delete('days')
    next.delete('completedWithinDays')
    changed = true
  }

  const dPrimary = next.get('days')
  const dLegacy = next.get('completedWithinDays')
  if (dPrimary && dLegacy) {
    next.delete('completedWithinDays')
    changed = true
  }

  const qTrim = next.get('q')?.trim()
  if (next.has('q') && !qTrim) {
    next.delete('q')
    changed = true
  }

  const pri = next.get('priority')?.trim()
  if (
    pri &&
    pri !== 'alta' &&
    pri !== 'media' &&
    pri !== 'baixa'
  ) {
    next.delete('priority')
    changed = true
  } else if (next.has('priority') && !pri) {
    next.delete('priority')
    changed = true
  }

  const respTrim = next.get('responsible')?.trim()
  if (next.has('responsible') && !respTrim) {
    next.delete('responsible')
    changed = true
  }

  const psRaw = next.get('pageSize')
  if (psRaw) {
    const psNum = Number.parseInt(psRaw, 10)
    if (
      !Number.isFinite(psNum) ||
      !(COLABS_PAGE_SIZE_OPTIONS as readonly number[]).includes(psNum)
    ) {
      next.delete('pageSize')
      changed = true
    }
  }

  const pgRaw = next.get('page')
  if (pgRaw) {
    const pg = Number.parseInt(pgRaw, 10)
    if (!Number.isFinite(pg) || pg < 1) {
      next.delete('page')
      changed = true
    }
  }

  return changed ? next : null
}
