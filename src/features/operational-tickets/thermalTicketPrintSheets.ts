import type { ActivityTicketPrintModel } from './activityTicketPrintModel'
import type { ThermalActivityPrintItem } from './buildConveyorActivityTicketPrintModels'

export type ThermalTicketPrintSheet = {
  groupHeaderLabel?: string
  model: ActivityTicketPrintModel
}

/** Agrupa cabecalhos de tarefa/responsavel com o primeiro ticket do bloco (mesma folha logica). */
export function groupPrintItemsIntoSheets(
  items: readonly ThermalActivityPrintItem[],
): ThermalTicketPrintSheet[] {
  const sheets: ThermalTicketPrintSheet[] = []
  let pendingHeader: string | undefined

  for (const item of items) {
    if (item.kind === 'header') {
      pendingHeader = item.label
      continue
    }
    sheets.push({
      groupHeaderLabel: pendingHeader,
      model: item.model,
    })
    pendingHeader = undefined
  }

  return sheets
}

export function ticketModelsToPrintItems(
  models: readonly ActivityTicketPrintModel[],
): ThermalActivityPrintItem[] {
  return models.map((model) => ({ kind: 'ticket', model }))
}
