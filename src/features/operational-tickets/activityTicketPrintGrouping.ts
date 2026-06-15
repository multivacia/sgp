import type { ActivityTicketPrintModelInput } from './activityTicketPrintModel'
import type { ConveyorActivityTicketSource } from './activityTicketConveyorSource'

export type ActivityTicketPrintGroupingMode = 'structure' | 'task' | 'responsible'

export type ActivityTicketPrintSlot =
  | { kind: 'header'; label: string }
  | { kind: 'source'; source: ConveyorActivityTicketSource }

const NO_TASK_LABEL = 'Sem tarefa'
const NO_RESPONSIBLE_LABEL = 'Sem responsável'

export function resolveResponsibleGroupKey(
  source: Pick<ActivityTicketPrintModelInput, 'responsibleName' | 'teamName'>,
): string {
  const responsible = source.responsibleName?.trim()
  if (responsible) return responsible

  const team = source.teamName?.trim()
  if (team) return `Equipe: ${team}`

  return NO_RESPONSIBLE_LABEL
}

export function formatTaskGroupHeader(taskTitle: string): string {
  return `TAREFA: ${taskTitle.trim().toUpperCase()}`
}

export function formatSectorGroupHeader(sectorTitle: string): string {
  return `SETOR: ${sectorTitle.trim().toUpperCase()}`
}

export function formatResponsibleGroupHeader(groupKey: string): string {
  if (groupKey === NO_RESPONSIBLE_LABEL) return NO_RESPONSIBLE_LABEL.toUpperCase()
  if (groupKey.startsWith('Equipe: ')) return groupKey.toUpperCase()
  return `RESP.: ${groupKey.toUpperCase()}`
}

function compareStructureOrder(
  a: ConveyorActivityTicketSource,
  b: ConveyorActivityTicketSource,
): number {
  const taskCmp = a.sortTaskOrder - b.sortTaskOrder
  if (taskCmp !== 0) return taskCmp
  const areaCmp = a.sortAreaOrder - b.sortAreaOrder
  if (areaCmp !== 0) return areaCmp
  return a.sortStepOrder - b.sortStepOrder
}

function groupByStructure(sources: readonly ConveyorActivityTicketSource[]): ActivityTicketPrintSlot[] {
  const sorted = [...sources].sort(compareStructureOrder)
  const slots: ActivityTicketPrintSlot[] = []
  let lastTaskKey = ''
  let lastSectorKey = ''

  for (const source of sorted) {
    const taskKey = source.taskTitle?.trim() || NO_TASK_LABEL
    const sectorKey = source.sectorTitle?.trim() || 'Sem setor'

    if (taskKey !== lastTaskKey) {
      slots.push({ kind: 'header', label: formatTaskGroupHeader(taskKey) })
      lastTaskKey = taskKey
      lastSectorKey = ''
    }

    if (sectorKey !== lastSectorKey) {
      slots.push({ kind: 'header', label: formatSectorGroupHeader(sectorKey) })
      lastSectorKey = sectorKey
    }

    slots.push({ kind: 'source', source })
  }

  return slots
}

function groupByTask(sources: readonly ConveyorActivityTicketSource[]): ActivityTicketPrintSlot[] {
  const sorted = [...sources].sort(compareStructureOrder)
  const groupOrder: string[] = []
  const buckets = new Map<string, ConveyorActivityTicketSource[]>()

  for (const source of sorted) {
    const key = source.taskTitle?.trim() || NO_TASK_LABEL
    if (!buckets.has(key)) {
      groupOrder.push(key)
      buckets.set(key, [])
    }
    buckets.get(key)!.push(source)
  }

  const slots: ActivityTicketPrintSlot[] = []
  for (const key of groupOrder) {
    slots.push({ kind: 'header', label: formatTaskGroupHeader(key) })
    for (const source of buckets.get(key) ?? []) {
      slots.push({ kind: 'source', source })
    }
  }

  return slots
}

function groupByResponsible(
  sources: readonly ConveyorActivityTicketSource[],
): ActivityTicketPrintSlot[] {
  const sorted = [...sources].sort(compareStructureOrder)
  const groupOrder: string[] = []
  const buckets = new Map<string, ConveyorActivityTicketSource[]>()

  for (const source of sorted) {
    const key = resolveResponsibleGroupKey(source)
    if (!buckets.has(key)) {
      groupOrder.push(key)
      buckets.set(key, [])
    }
    buckets.get(key)!.push(source)
  }

  const slots: ActivityTicketPrintSlot[] = []
  for (const key of groupOrder) {
    slots.push({ kind: 'header', label: formatResponsibleGroupHeader(key) })
    for (const source of buckets.get(key) ?? []) {
      slots.push({ kind: 'source', source })
    }
  }

  return slots
}

export function groupConveyorActivityTicketSources(
  sources: readonly ConveyorActivityTicketSource[],
  mode: ActivityTicketPrintGroupingMode,
): ActivityTicketPrintSlot[] {
  if (sources.length === 0) return []

  switch (mode) {
    case 'structure':
      return groupByStructure(sources)
    case 'task':
      return groupByTask(sources)
    case 'responsible':
      return groupByResponsible(sources)
    default:
      return groupByStructure(sources)
  }
}
