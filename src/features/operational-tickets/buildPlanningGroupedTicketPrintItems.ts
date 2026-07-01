import {
  buildActivityTicketInputFromPlanningSource,
  filterPlanningActivityTicketSources,
  type ActivityTicketPlanningSource,
} from './activityTicketPlanningSource'
import {
  groupPlanningActivityTicketSources,
  type PlanningActivityTicketPrintGroupingMode,
  type PlanningActivityTicketPrintSlot,
} from './activityTicketPlanningGrouping'
import { buildActivityTicketPrintModel } from './activityTicketPrintModel'
import type { ThermalActivityPrintItem } from './buildConveyorActivityTicketPrintModels'

export type BuildPlanningTicketPrintOptions = {
  grouping: PlanningActivityTicketPrintGroupingMode
  includeCompleted?: boolean
  printedAt?: string
  backlogExecutionLookup?: ReadonlyMap<string, number>
}

function slotsToPrintItems(
  slots: readonly PlanningActivityTicketPrintSlot[],
  backlogExecutionLookup: ReadonlyMap<string, number> | undefined,
  printedAt: string,
): ThermalActivityPrintItem[] {
  const items: ThermalActivityPrintItem[] = []

  for (const slot of slots) {
    if (slot.kind === 'header') {
      items.push({ kind: 'header', label: slot.label })
      continue
    }

    const input = buildActivityTicketInputFromPlanningSource(
      slot.source,
      backlogExecutionLookup,
    )
    items.push({
      kind: 'ticket',
      model: buildActivityTicketPrintModel(input, { printedAt }),
    })
  }

  return items
}

export function buildPlanningGroupedTicketPrintItems(
  sources: readonly ActivityTicketPlanningSource[],
  options: BuildPlanningTicketPrintOptions,
): ThermalActivityPrintItem[] {
  const includeCompleted = options.includeCompleted ?? false
  const printedAt = options.printedAt ?? new Date().toISOString()
  const filtered = filterPlanningActivityTicketSources(sources, includeCompleted)
  const slots = groupPlanningActivityTicketSources(filtered, options.grouping)

  return slotsToPrintItems(slots, options.backlogExecutionLookup, printedAt)
}
