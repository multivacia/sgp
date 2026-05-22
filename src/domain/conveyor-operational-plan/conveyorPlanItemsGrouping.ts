import type { ConveyorOperationalPlanItem } from './conveyor-operational-plan.types'

export const CONVEYOR_PLAN_UNDATED_GROUP_KEY = '__undated__' as const

export type ConveyorPlanItemsDateGroupKey = string | typeof CONVEYOR_PLAN_UNDATED_GROUP_KEY

export type ConveyorPlanItemsDateGroup = {
  dateKey: ConveyorPlanItemsDateGroupKey
  label: string
  items: ConveyorOperationalPlanItem[]
}

const WEEKDAY_NAMES_PT = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const

function localDateFromIso(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

export function formatConveyorPlanPlannedDateLabel(isoDate: string): string {
  const d = localDateFromIso(isoDate)
  const dayName = WEEKDAY_NAMES_PT[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dayName}, ${dd}/${mm}/${d.getFullYear()}`
}

export const CONVEYOR_PLAN_UNDATED_GROUP_LABEL = 'Sem data planejada'

function compareItemsByPlannedOrder(
  a: ConveyorOperationalPlanItem,
  b: ConveyorOperationalPlanItem,
): number {
  if (a.plannedOrder !== b.plannedOrder) return a.plannedOrder - b.plannedOrder
  return a.id.localeCompare(b.id)
}

export type GroupItemsByPlannedDateOptions = {
  includeCancelled?: boolean
}

export function groupItemsByPlannedDate(
  items: readonly ConveyorOperationalPlanItem[],
  options: GroupItemsByPlannedDateOptions = {},
): ConveyorPlanItemsDateGroup[] {
  const includeCancelled = options.includeCancelled ?? false
  const visible = includeCancelled
    ? [...items]
    : items.filter((i) => i.status !== 'CANCELLED')

  const byDate = new Map<ConveyorPlanItemsDateGroupKey, ConveyorOperationalPlanItem[]>()

  for (const item of visible) {
    const key: ConveyorPlanItemsDateGroupKey = item.plannedDate ?? CONVEYOR_PLAN_UNDATED_GROUP_KEY
    const bucket = byDate.get(key)
    if (bucket) bucket.push(item)
    else byDate.set(key, [item])
  }

  const datedKeys = [...byDate.keys()].filter(
    (k): k is string => k !== CONVEYOR_PLAN_UNDATED_GROUP_KEY,
  )
  datedKeys.sort((a, b) => a.localeCompare(b))

  const groups: ConveyorPlanItemsDateGroup[] = datedKeys.map((dateKey) => ({
    dateKey,
    label: formatConveyorPlanPlannedDateLabel(dateKey),
    items: [...(byDate.get(dateKey) ?? [])].sort(compareItemsByPlannedOrder),
  }))

  const undated = byDate.get(CONVEYOR_PLAN_UNDATED_GROUP_KEY)
  if (undated && undated.length > 0) {
    groups.push({
      dateKey: CONVEYOR_PLAN_UNDATED_GROUP_KEY,
      label: CONVEYOR_PLAN_UNDATED_GROUP_LABEL,
      items: [...undated].sort(compareItemsByPlannedOrder),
    })
  }

  return groups
}
