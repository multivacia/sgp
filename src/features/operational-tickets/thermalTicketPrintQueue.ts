import type { ThermalTicketPrintSheet } from './thermalTicketPrintSheets'

export type ThermalTicketPrintQueue = {
  sheets: readonly ThermalTicketPrintSheet[]
  index: number
}

export type ThermalTicketPrintProgress = {
  current: number
  total: number
}

export function createThermalTicketPrintQueue(
  sheets: readonly ThermalTicketPrintSheet[],
): ThermalTicketPrintQueue | null {
  if (sheets.length === 0) return null
  return { sheets, index: 0 }
}

export function getThermalTicketPrintProgress(
  queue: ThermalTicketPrintQueue,
): ThermalTicketPrintProgress {
  return { current: queue.index + 1, total: queue.sheets.length }
}

export function getThermalTicketSheetAt(
  queue: ThermalTicketPrintQueue,
): ThermalTicketPrintSheet | undefined {
  return queue.sheets[queue.index]
}

export function advanceThermalTicketPrintQueue(
  queue: ThermalTicketPrintQueue,
): ThermalTicketPrintQueue | null {
  const nextIndex = queue.index + 1
  if (nextIndex >= queue.sheets.length) return null
  return { sheets: queue.sheets, index: nextIndex }
}

export function isBatchThermalTicketPrint(progress: ThermalTicketPrintProgress): boolean {
  return progress.total > 1
}
