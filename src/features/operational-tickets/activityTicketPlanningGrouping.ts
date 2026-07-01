import type { ActivityTicketPlanningSource } from './activityTicketPlanningSource'
import {
  formatResponsibleGroupHeader,
  formatTaskGroupHeader,
  resolveResponsibleGroupKey,
} from './activityTicketPrintGrouping'

export type PlanningActivityTicketPrintGroupingMode = 'task' | 'responsible'

export type PlanningActivityTicketPrintSlot =
  | { kind: 'header'; label: string }
  | { kind: 'source'; source: ActivityTicketPlanningSource }

const NO_CONVEYOR_LABEL = 'Sem esteira'
const NO_TASK_LABEL = 'Sem tarefa'

export function formatConveyorGroupHeader(conveyorTitle: string): string {
  return `ESTEIRA: ${conveyorTitle.trim().toUpperCase()}`
}

export function comparePlanningTicketSources(
  a: ActivityTicketPlanningSource,
  b: ActivityTicketPlanningSource,
): number {
  const dateCmp = a.plannedDate.localeCompare(b.plannedDate)
  if (dateCmp !== 0) return dateCmp
  const orderCmp = a.plannedOrder - b.plannedOrder
  if (orderCmp !== 0) return orderCmp
  const conveyorCmp = (a.conveyorTitle ?? '').localeCompare(b.conveyorTitle ?? '', 'pt-BR')
  if (conveyorCmp !== 0) return conveyorCmp
  const taskCmp = (a.taskTitle ?? '').localeCompare(b.taskTitle ?? '', 'pt-BR')
  if (taskCmp !== 0) return taskCmp
  const sectorCmp = (a.sectorTitle ?? '').localeCompare(b.sectorTitle ?? '', 'pt-BR')
  if (sectorCmp !== 0) return sectorCmp
  return a.activityNodeId.localeCompare(b.activityNodeId)
}

function groupByConveyorAndTask(
  sources: readonly ActivityTicketPlanningSource[],
): PlanningActivityTicketPrintSlot[] {
  const sorted = [...sources].sort(comparePlanningTicketSources)
  const slots: PlanningActivityTicketPrintSlot[] = []
  let lastConveyorKey = ''
  let lastTaskKey = ''

  for (const source of sorted) {
    const conveyorKey = source.conveyorTitle?.trim() || NO_CONVEYOR_LABEL
    const taskKey = source.taskTitle?.trim() || NO_TASK_LABEL

    if (conveyorKey !== lastConveyorKey) {
      slots.push({ kind: 'header', label: formatConveyorGroupHeader(conveyorKey) })
      lastConveyorKey = conveyorKey
      lastTaskKey = ''
    }

    if (taskKey !== lastTaskKey) {
      slots.push({ kind: 'header', label: formatTaskGroupHeader(taskKey) })
      lastTaskKey = taskKey
    }

    slots.push({ kind: 'source', source })
  }

  return slots
}

function groupByResponsible(
  sources: readonly ActivityTicketPlanningSource[],
): PlanningActivityTicketPrintSlot[] {
  const sorted = [...sources].sort(comparePlanningTicketSources)
  const groupOrder: string[] = []
  const buckets = new Map<string, ActivityTicketPlanningSource[]>()

  for (const source of sorted) {
    const key = resolveResponsibleGroupKey({
      responsibleName: source.assignedCollaboratorName,
      teamName: source.assignedTeamName,
    })
    if (!buckets.has(key)) {
      groupOrder.push(key)
      buckets.set(key, [])
    }
    buckets.get(key)!.push(source)
  }

  const slots: PlanningActivityTicketPrintSlot[] = []
  for (const key of groupOrder) {
    slots.push({ kind: 'header', label: formatResponsibleGroupHeader(key) })
    for (const source of buckets.get(key) ?? []) {
      slots.push({ kind: 'source', source })
    }
  }

  return slots
}

export function groupPlanningActivityTicketSources(
  sources: readonly ActivityTicketPlanningSource[],
  mode: PlanningActivityTicketPrintGroupingMode,
): PlanningActivityTicketPrintSlot[] {
  if (sources.length === 0) return []

  switch (mode) {
    case 'task':
      return groupByConveyorAndTask(sources)
    case 'responsible':
      return groupByResponsible(sources)
    default:
      return groupByConveyorAndTask(sources)
  }
}
