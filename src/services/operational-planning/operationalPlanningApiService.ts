import type {
  OperationalPlanningBacklogPayload,
  OperationalPlanningFactoryIntakePayload,
  OperationalPlanningPeriodItemsPayload,
  OperationalPlanningWeekActivityPayload,
  OperationalPlanningWeekPayload,
  SaveOperationalWeekPlanInput,
} from '../../domain/operational-planning/operational-planning.types'
import { requestJson } from '../../lib/api/client'
import { ApiError, parseErrorEnvelope } from '../../lib/api/apiErrors'
import { getApiBaseUrl } from '../../lib/api/env'

const BASE = '/api/v1'

export const EXPORT_OPERATIONAL_PLANNING_WEEK_FAIL_MESSAGE =
  'Não foi possível exportar o Excel do planejamento.'

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1])
    } catch {
      return utfMatch[1]
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header)
  if (quoted?.[1]) return quoted[1]
  const plain = /filename=([^;]+)/i.exec(header)
  const raw = plain?.[1]?.trim()
  return raw ? raw.replace(/^"|"$/g, '') : null
}

/** Baixa o `.xlsx` do planejamento semanal salvo (draft ?? published), ignorando filtros visuais. */
export async function exportOperationalPlanningWeekToExcel(weekStart: string): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const pathPart = `${BASE}/operational-planning/week/export.xlsx?weekStart=${encodeURIComponent(weekStart)}`
  const url = baseUrl ? `${baseUrl}${pathPart}` : pathPart

  let res: Response
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include' })
  } catch (e) {
    throw new ApiError(EXPORT_OPERATIONAL_PLANNING_WEEK_FAIL_MESSAGE, 503, {
      code: 'NETWORK_ERROR',
      cause: e,
    })
  }

  if (!res.ok) {
    let parsed: unknown = null
    try {
      const text = await res.text()
      parsed = text ? JSON.parse(text) : null
    } catch {
      // Corpo não-JSON: segue com mensagem padrão pelo status.
    }
    const { message, code, errorRef, correlationId, category, severity, details } =
      parseErrorEnvelope(parsed, res.status)
    throw new ApiError(message, res.status, {
      code,
      errorRef,
      correlationId,
      category,
      severity,
      details,
    })
  }

  const blob = await res.blob()
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
    `planejamento-semanal-${weekStart}.xlsx`
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export const EXPORT_OPERATIONAL_PLANNING_WEEKLY_VIEW_FAIL_MESSAGE =
  'Não foi possível exportar a visão semanal do planejamento.'

/** Baixa o `.xlsx` da "Visão semanal" (draft ?? published), ignorando filtros visuais. */
export async function exportOperationalPlanningWeeklyViewToExcel(weekStart: string): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const pathPart = `${BASE}/operational-planning/week/export-weekly-view.xlsx?weekStart=${encodeURIComponent(weekStart)}`
  const url = baseUrl ? `${baseUrl}${pathPart}` : pathPart

  let res: Response
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include' })
  } catch (e) {
    throw new ApiError(EXPORT_OPERATIONAL_PLANNING_WEEKLY_VIEW_FAIL_MESSAGE, 503, {
      code: 'NETWORK_ERROR',
      cause: e,
    })
  }

  if (!res.ok) {
    let parsed: unknown = null
    try {
      const text = await res.text()
      parsed = text ? JSON.parse(text) : null
    } catch {
      // Corpo não-JSON: segue com mensagem padrão pelo status.
    }
    const { message, code, errorRef, correlationId, category, severity, details } =
      parseErrorEnvelope(parsed, res.status)
    throw new ApiError(message, res.status, {
      code,
      errorRef,
      correlationId,
      category,
      severity,
      details,
    })
  }

  const blob = await res.blob()
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
    `planejamento-semanal-visao-${weekStart}.xlsx`
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export async function getOperationalPlanningWeek(
  weekStartDate: string,
): Promise<OperationalPlanningWeekPayload> {
  const qs = new URLSearchParams()
  qs.set('weekStart', weekStartDate)
  return requestJson<OperationalPlanningWeekPayload>(
    'GET',
    `${BASE}/operational-planning/week?${qs.toString()}`,
  )
}

export async function saveOperationalPlanningWeek(
  body: SaveOperationalWeekPlanInput,
): Promise<OperationalPlanningWeekPayload> {
  return requestJson<OperationalPlanningWeekPayload>('POST', `${BASE}/operational-planning/week`, {
    body,
  })
}

export async function patchOperationalPlanningWeek(
  planId: string,
  body: SaveOperationalWeekPlanInput,
): Promise<OperationalPlanningWeekPayload> {
  return requestJson<OperationalPlanningWeekPayload>(
    'PATCH',
    `${BASE}/operational-planning/week/${encodeURIComponent(planId)}`,
    { body },
  )
}

export async function publishOperationalPlanningWeek(
  planId: string,
): Promise<OperationalPlanningWeekPayload> {
  return requestJson<OperationalPlanningWeekPayload>(
    'POST',
    `${BASE}/operational-planning/week/${encodeURIComponent(planId)}/publish`,
    {},
  )
}

export async function listOperationalPlanningBacklog(params: {
  q?: string
  limit?: number
  conveyorId?: string
  collaboratorId?: string
}): Promise<OperationalPlanningBacklogPayload> {
  const sp = new URLSearchParams()
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.conveyorId) sp.set('conveyorId', params.conveyorId)
  if (params.collaboratorId) sp.set('collaboratorId', params.collaboratorId)
  const s = sp.toString()
  return requestJson<OperationalPlanningBacklogPayload>(
    'GET',
    `${BASE}/operational-planning/backlog${s ? `?${s}` : ''}`,
  )
}

/** Itens do plano da esteira aguardando encaixe na fábrica (MVP: lista completa). */
export async function applyConveyorPlanValuesToWeekItem(
  workPlanItemId: string,
  body?: { fields?: Array<'plannedDate' | 'plannedMinutes' | 'assignedCollaboratorId' | 'assignedTeamId'> },
): Promise<OperationalPlanningWeekPayload> {
  return requestJson<OperationalPlanningWeekPayload>(
    'POST',
    `${BASE}/operational-planning/week-items/${encodeURIComponent(workPlanItemId)}/apply-conveyor-plan-values`,
    { body: body ?? {} },
  )
}

export async function getOperationalPlanningWeekActivity(
  weekStartDate: string,
  limit = 100,
): Promise<OperationalPlanningWeekActivityPayload> {
  const qs = new URLSearchParams()
  qs.set('weekStart', weekStartDate)
  qs.set('limit', String(limit))
  return requestJson<OperationalPlanningWeekActivityPayload>(
    'GET',
    `${BASE}/operational-planning/week-activity?${qs.toString()}`,
  )
}

export async function getFactoryIntakeItems(
  weekStart?: string,
): Promise<OperationalPlanningFactoryIntakePayload> {
  const sp = new URLSearchParams()
  if (weekStart) sp.set('weekStart', weekStart)
  const s = sp.toString()
  return requestJson<OperationalPlanningFactoryIntakePayload>(
    'GET',
    `${BASE}/operational-planning/factory-intake${s ? `?${s}` : ''}`,
  )
}

/** Recorte do Planejamento: período (`from`/`to`, pontas opcionais) ou semana do quadro. */
export type OperationalPlanningRangeScope =
  | { kind: 'period'; from?: string; to?: string }
  | { kind: 'week'; weekStart: string }

function planningRangeQuery(scope: OperationalPlanningRangeScope): string {
  const sp = new URLSearchParams()
  if (scope.kind === 'week') {
    sp.set('weekStart', scope.weekStart)
  } else {
    if (scope.from) sp.set('from', scope.from)
    if (scope.to) sp.set('to', scope.to)
  }
  return sp.toString()
}

/** GET /operational-planning/period-items — itens planejados atravessando semanas (data planejada). */
export async function getOperationalPlanningPeriodItems(
  from: string | undefined,
  to: string | undefined,
): Promise<OperationalPlanningPeriodItemsPayload> {
  return requestJson<OperationalPlanningPeriodItemsPayload>(
    'GET',
    `${BASE}/operational-planning/period-items?${planningRangeQuery({ kind: 'period', from, to })}`,
  )
}

export const EXPORT_OPERATIONAL_PLANNING_AI_FAIL_MESSAGE =
  'Não foi possível exportar a planilha de planejamento para IA.'

/** Baixa o `.xlsx` "Planejamento para IA" (Backlog, Planejado e Carga) do recorte informado. */
export async function exportOperationalPlanningAiToExcel(
  scope: OperationalPlanningRangeScope,
): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const pathPart = `${BASE}/operational-planning/export-ai.xlsx?${planningRangeQuery(scope)}`
  const url = baseUrl ? `${baseUrl}${pathPart}` : pathPart

  let res: Response
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include' })
  } catch (e) {
    throw new ApiError(EXPORT_OPERATIONAL_PLANNING_AI_FAIL_MESSAGE, 503, {
      code: 'NETWORK_ERROR',
      cause: e,
    })
  }

  if (!res.ok) {
    let parsed: unknown = null
    try {
      const text = await res.text()
      parsed = text ? JSON.parse(text) : null
    } catch {
      // Corpo não-JSON: segue com mensagem padrão pelo status.
    }
    const { message, code, errorRef, correlationId, category, severity, details } =
      parseErrorEnvelope(parsed, res.status)
    throw new ApiError(message, res.status, {
      code,
      errorRef,
      correlationId,
      category,
      severity,
      details,
    })
  }

  const blob = await res.blob()
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
    'planejamento-ia.xlsx'
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
