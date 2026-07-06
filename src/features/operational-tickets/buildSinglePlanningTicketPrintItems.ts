import type { ActivityTicketPlanningSource } from './activityTicketPlanningSource'
import {
  buildActivityTicketInputFromPlanningSource,
} from './activityTicketPlanningSource'
import {
  buildActivityTicketPrintModel,
  type ActivityTicketPrintModel,
  type ActivityTicketPrintModelInput,
} from './activityTicketPrintModel'

/**
 * Helper puro para impressão individual no planejamento:
 * sempre deve gerar exatamente 1 ticket printável.
 */
export function buildSinglePlanningTicketPrintItems(
  item: ActivityTicketPlanningSource,
  backlogExecutionLookup?: ReadonlyMap<string, number>,
): ActivityTicketPrintModel[] {
  const input: ActivityTicketPrintModelInput = buildActivityTicketInputFromPlanningSource(
    item,
    backlogExecutionLookup,
  )
  return [buildActivityTicketPrintModel(input)]
}

