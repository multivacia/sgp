import { useCallback, useMemo, useState } from 'react'
import {
  filterPlanningActivityTicketSources,
  type ActivityTicketPlanningSource,
} from './activityTicketPlanningSource'
import { buildPlanningGroupedTicketPrintItems } from './buildPlanningGroupedTicketPrintItems'
import type { PlanningWeekTicketsPrintDialogOptions } from './PlanningWeekTicketsPrintDialog'
import { resolveWeekPlanningItemsForTicketPrint } from './resolvePlanningItemsForTicketBatch'
import type { ThermalActivityPrintItem } from './buildConveyorActivityTicketPrintModels'
import type { ActivityTicketPrintModel } from './activityTicketPrintModel'

type RequestPlanningWeekTicketPrintFn = (
  payload: readonly ActivityTicketPrintModel[] | readonly ThermalActivityPrintItem[],
) => void

export function usePlanningWeekTicketsPrint(options: {
  draftItems: readonly ActivityTicketPlanningSource[]
  backlogExecutionLookup: ReadonlyMap<string, number>
  requestPrint: RequestPlanningWeekTicketPrintFn
}) {
  const { draftItems, backlogExecutionLookup, requestPrint } = options
  const [weekTicketsPrintOpen, setWeekTicketsPrintOpen] = useState(false)

  const weekTicketSources = useMemo(
    () => resolveWeekPlanningItemsForTicketPrint(draftItems),
    [draftItems],
  )

  const weekPrintableTicketCount = useMemo(
    () => filterPlanningActivityTicketSources(weekTicketSources, false).length,
    [weekTicketSources],
  )

  const openWeekTicketsPrintDialog = useCallback(() => {
    setWeekTicketsPrintOpen(true)
  }, [])

  const closeWeekTicketsPrintDialog = useCallback(() => {
    setWeekTicketsPrintOpen(false)
  }, [])

  const handleWeekTicketsPrint = useCallback(
    (printOptions: PlanningWeekTicketsPrintDialogOptions) => {
      const items = buildPlanningGroupedTicketPrintItems(weekTicketSources, {
        grouping: printOptions.grouping,
        includeCompleted: printOptions.includeCompleted,
        backlogExecutionLookup,
      })
      if (!items.some((item) => item.kind === 'ticket')) return
      requestPrint(items)
      setWeekTicketsPrintOpen(false)
    },
    [weekTicketSources, backlogExecutionLookup, requestPrint],
  )

  return {
    weekTicketsPrintOpen,
    weekTicketSources,
    weekPrintableTicketCount,
    openWeekTicketsPrintDialog,
    closeWeekTicketsPrintDialog,
    handleWeekTicketsPrint,
  }
}
