import {
  formatPlanningMinutes,
  resolvePlanningCapacityState,
  sumPlanningItemMinutes,
  type PlanningSummaryItemRef,
} from './planningBoardHelpers'

/** Linha de capacidade já resolvida pelo backend (capacityByCollaboratorDay). */
export type PlanningCapacityRowRef = {
  collaboratorId: string
  date: string
  capacityMinutes: number
}

export type PlanningCapacityDraftItemRef = PlanningSummaryItemRef & {
  assignedCollaboratorId?: string | null
  assignedCollaboratorName?: string | null
}

export type PlanningCapacityExceededAlert = {
  collaboratorId: string
  collaboratorName: string
  date: string
  capacityMinutes: number
  plannedMinutes: number
  excessMinutes: number
}

function normalizeDateKey(date: string): string {
  const t = date.trim()
  return t.length >= 10 ? t.slice(0, 10) : t
}

function cellKey(collaboratorId: string, date: string): string {
  return `${collaboratorId}|${normalizeDateKey(date)}`
}

function plannedMinutesByCollaboratorDay(
  items: readonly PlanningCapacityDraftItemRef[],
): Map<string, number> {
  const byCell = new Map<string, PlanningCapacityDraftItemRef[]>()
  for (const item of items) {
    const cid = item.assignedCollaboratorId?.trim()
    const date = item.plannedDate ? normalizeDateKey(item.plannedDate) : ''
    if (!cid || !date) continue
    const key = cellKey(cid, date)
    const list = byCell.get(key)
    if (list) list.push(item)
    else byCell.set(key, [item])
  }
  const out = new Map<string, number>()
  for (const [key, list] of byCell) {
    out.set(key, sumPlanningItemMinutes(list))
  }
  return out
}

function resolveCollaboratorName(
  collaboratorId: string,
  items: readonly PlanningCapacityDraftItemRef[],
  nameById?: Map<string, string> | Readonly<Record<string, string>>,
): string {
  for (const item of items) {
    if (item.assignedCollaboratorId?.trim() !== collaboratorId) continue
    const n = item.assignedCollaboratorName?.trim()
    if (n) return n
  }
  // `Map` (não `ReadonlyMap`): `instanceof Map` elimina o braço do Map e
  // estreita o `else` para Record, permitindo indexação tipada sem assertion.
  if (nameById instanceof Map) {
    const n = nameById.get(collaboratorId)?.trim()
    if (n) return n
  } else if (nameById) {
    const n = nameById[collaboratorId]?.trim()
    if (n) return n
  }
  return collaboratorId
}

/**
 * Detecta células cujo total planejado no rascunho ultrapassou a capacidade
 * após uma ação do usuário (carga aumentou e ficou acima do limite).
 *
 * O total por colaborador/data considera o rascunho completo: atividades já
 * salvas no plano + itens adicionados/movidos no draft (soma via
 * sumPlanningItemMinutes). Não dispara em hidratação, remoção, redução de
 * carga ou reordenação (quando o total da célula não aumenta).
 */
export function detectPlanningCapacityExceededAlerts(input: {
  previousItems: readonly PlanningCapacityDraftItemRef[]
  nextItems: readonly PlanningCapacityDraftItemRef[]
  capacityRows: readonly PlanningCapacityRowRef[]
  collaboratorNameById?: Map<string, string> | Readonly<Record<string, string>>
}): PlanningCapacityExceededAlert[] {
  const prevByCell = plannedMinutesByCollaboratorDay(input.previousItems)
  const nextByCell = plannedMinutesByCollaboratorDay(input.nextItems)
  const seen = new Set<string>()
  const alerts: PlanningCapacityExceededAlert[] = []

  for (const row of input.capacityRows) {
    const cid = row.collaboratorId?.trim()
    const date = row.date ? normalizeDateKey(row.date) : ''
    if (!cid || !date) continue
    const key = cellKey(cid, date)
    if (seen.has(key)) continue
    seen.add(key)

    const capacityMinutes = row.capacityMinutes
    if (capacityMinutes == null || !Number.isFinite(capacityMinutes)) continue

    const previousPlanned = prevByCell.get(key) ?? 0
    const nextPlanned = nextByCell.get(key) ?? 0

    if (nextPlanned <= previousPlanned) continue
    if (resolvePlanningCapacityState(nextPlanned, capacityMinutes) !== 'over_capacity') continue

    const excessMinutes = Math.max(0, nextPlanned - Math.max(0, Math.floor(capacityMinutes)))
    alerts.push({
      collaboratorId: cid,
      collaboratorName: resolveCollaboratorName(cid, input.nextItems, input.collaboratorNameById),
      date,
      capacityMinutes: Math.max(0, Math.floor(capacityMinutes)),
      plannedMinutes: nextPlanned,
      excessMinutes,
    })
  }

  alerts.sort(
    (a, b) => a.date.localeCompare(b.date) || a.collaboratorName.localeCompare(b.collaboratorName, 'pt-BR'),
  )
  return alerts
}

export function formatPlanningCapacityDatePtBr(dateIso: string): string {
  const key = normalizeDateKey(dateIso)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key
  const d = new Date(`${key}T12:00:00`)
  if (Number.isNaN(d.getTime())) return key
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatPlanningCapacityAlertSummary(alert: PlanningCapacityExceededAlert): string {
  return `O planejamento de ${alert.collaboratorName} em ${formatPlanningCapacityDatePtBr(alert.date)} ultrapassou a capacidade operacional disponível para o dia.`
}

export function formatPlanningCapacityAlertDetailLine(alert: PlanningCapacityExceededAlert): {
  capacity: string
  planned: string
  excess: string
} {
  return {
    capacity: formatPlanningMinutes(alert.capacityMinutes),
    planned: formatPlanningMinutes(alert.plannedMinutes),
    excess: formatPlanningMinutes(alert.excessMinutes),
  }
}
