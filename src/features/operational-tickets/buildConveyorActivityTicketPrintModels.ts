import type { ConveyorDetail } from '../../domain/conveyors/conveyor.types'
import type { ConveyorNodeWorkload } from '../../domain/conveyors/conveyorNodeWorkload.types'
import {
  collectConveyorActivityTicketSources,
  filterConveyorActivityTicketSources,
} from './activityTicketConveyorSource'
import {
  buildActivityTicketPrintModel,
  type ActivityTicketPrintModel,
} from './activityTicketPrintModel'
import {
  groupConveyorActivityTicketSources,
  type ActivityTicketPrintGroupingMode,
  type ActivityTicketPrintSlot,
} from './activityTicketPrintGrouping'

export type ThermalActivityPrintItem =
  | { kind: 'header'; label: string }
  | { kind: 'ticket'; model: ActivityTicketPrintModel }

export type BuildConveyorTicketPrintOptions = {
  grouping: ActivityTicketPrintGroupingMode
  includeCompleted?: boolean
  printedAt?: string
}

export function buildConveyorActivityTicketPrintModels(
  detail: ConveyorDetail,
  workload: ConveyorNodeWorkload | null | undefined,
  options: BuildConveyorTicketPrintOptions,
): ActivityTicketPrintModel[] {
  return buildConveyorGroupedTicketPrintItems(detail, workload, options)
    .filter((item): item is Extract<ThermalActivityPrintItem, { kind: 'ticket' }> => item.kind === 'ticket')
    .map((item) => item.model)
}

export function buildConveyorGroupedTicketPrintItems(
  detail: ConveyorDetail,
  workload: ConveyorNodeWorkload | null | undefined,
  options: BuildConveyorTicketPrintOptions,
): ThermalActivityPrintItem[] {
  const includeCompleted = options.includeCompleted ?? false
  const printedAt = options.printedAt ?? new Date().toISOString()

  const allSources = collectConveyorActivityTicketSources(detail, workload)
  const filtered = filterConveyorActivityTicketSources(allSources, includeCompleted)
  const slots = groupConveyorActivityTicketSources(filtered, options.grouping)

  return slotsToPrintItems(slots, printedAt)
}

function slotsToPrintItems(
  slots: readonly ActivityTicketPrintSlot[],
  printedAt: string,
): ThermalActivityPrintItem[] {
  const items: ThermalActivityPrintItem[] = []

  for (const slot of slots) {
    if (slot.kind === 'header') {
      items.push({ kind: 'header', label: slot.label })
      continue
    }
    items.push({
      kind: 'ticket',
      model: buildActivityTicketPrintModel(slot.source, { printedAt }),
    })
  }

  return items
}
