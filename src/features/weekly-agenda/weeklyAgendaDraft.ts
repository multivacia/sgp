import type { OperationalPlanningPlanItem } from '../../domain/operational-planning/operational-planning.types'

export type DraftPlanItem = {
  localKey: string
  serverItemId?: string
  conveyorId: string
  activityNodeId: string
  conveyorTitle: string
  activityTitle: string
  taskTitle: string
  sectorTitle: string
  assignedCollaboratorId: string
  assignedCollaboratorName: string | null
  assignedTeamId?: string | null
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  notes: string | null
  isOutOfSequence?: boolean
  conveyorOperationalPlanItemId?: string | null
  realizedMinutes?: number | null
  activityOperationalStatus?: string | null
  syncStatus?: OperationalPlanningPlanItem['syncStatus']
  syncDifferences?: OperationalPlanningPlanItem['syncDifferences']
  status?: string | null
}

export function planItemToDraft(it: OperationalPlanningPlanItem): DraftPlanItem {
  return {
    localKey: it.id,
    serverItemId: it.id,
    conveyorId: it.conveyorId,
    activityNodeId: it.activityNodeId,
    conveyorTitle: it.conveyorTitle,
    activityTitle: it.activityTitle,
    taskTitle: it.taskTitle,
    sectorTitle: it.sectorTitle,
    assignedCollaboratorId: it.assignedCollaboratorId ?? '',
    assignedCollaboratorName: it.assignedCollaboratorName,
    plannedDate: it.plannedDate,
    plannedOrder: it.plannedOrder,
    plannedMinutes: it.plannedMinutes,
    notes: it.notes,
    realizedMinutes: it.realizedMinutes,
    activityOperationalStatus: it.activityOperationalStatus,
    conveyorOperationalPlanItemId: it.conveyorOperationalPlanItemId,
    syncStatus: it.syncStatus,
    syncDifferences: it.syncDifferences,
    status: it.status,
  }
}

export function recalculateOrders(items: DraftPlanItem[]): DraftPlanItem[] {
  const groups = new Map<string, DraftPlanItem[]>()
  for (const it of items) {
    const k = `${it.assignedCollaboratorId}|${it.plannedDate}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(it)
  }
  const out: DraftPlanItem[] = []
  for (const [, arr] of groups) {
    arr.sort((a, b) => a.plannedOrder - b.plannedOrder || a.localKey.localeCompare(b.localKey))
    arr.forEach((it, idx) => {
      out.push({ ...it, plannedOrder: idx })
    })
  }
  return out.sort((a, b) => {
    const dc = a.plannedDate.localeCompare(b.plannedDate)
    if (dc !== 0) return dc
    const cc = a.assignedCollaboratorId.localeCompare(b.assignedCollaboratorId)
    if (cc !== 0) return cc
    return a.plannedOrder - b.plannedOrder
  })
}

export function buildSavePayload(
  weekStartDate: string,
  weekEndDate: string,
  drafts: DraftPlanItem[],
) {
  const normalized = recalculateOrders([...drafts])
  return {
    weekStartDate,
    weekEndDate,
    items: normalized.map((it) => ({
      conveyorId: it.conveyorId,
      activityNodeId: it.activityNodeId,
      assignedCollaboratorId: it.assignedCollaboratorId,
      assignedTeamId: it.assignedTeamId ?? null,
      plannedDate: it.plannedDate,
      plannedOrder: it.plannedOrder,
      plannedMinutes: it.plannedMinutes,
      notes: it.notes,
      conveyorOperationalPlanItemId: it.conveyorOperationalPlanItemId ?? null,
    })),
  }
}

export function newLocalKey(): string {
  return globalThis.crypto.randomUUID()
}

export function removeDraftPlanItem(items: DraftPlanItem[], localKey: string): DraftPlanItem[] {
  return recalculateOrders(items.filter((p) => p.localKey !== localKey))
}

export function isWeeklyAgendaDraftDirty(
  draftItems: DraftPlanItem[],
  savedDraftJson: string,
): boolean {
  try {
    return JSON.stringify(draftItems) !== savedDraftJson
  } catch {
    return true
  }
}
