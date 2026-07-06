import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { ActivityTicketPrintModel } from './activityTicketPrintModel'
import { PRINT_AGENT_FALLBACK_NOTICE } from './activityTicketPrintCopy'
import type { ThermalActivityPrintItem } from './buildConveyorActivityTicketPrintModels'
import {
  advanceThermalTicketPrintQueue,
  createThermalTicketPrintQueue,
  getThermalTicketPrintProgress,
  getThermalTicketSheetAt,
  type ThermalTicketPrintProgress,
} from './thermalTicketPrintQueue'
import {
  groupPrintItemsIntoSheets,
  ticketModelsToPrintItems,
  type ThermalTicketPrintSheet,
} from './thermalTicketPrintSheets'
import { tryPrintThermalTicketIfDomReady } from './thermalTicketPrintDomGuards'
import type { PrintAgentUiStatus } from './ThermalPrintAgentControls'
import {
  checkPrintAgentHealth,
  printActivityTicketsBatchWithAgent,
  printTestTicketWithAgent,
} from '../../services/printing/localPrintAgentService'

export type { ThermalActivityPrintItem }

const PRINT_BODY_CLASS = 'thermal-ticket-print-active'
const AGENT_HEALTH_POLL_MS = 30_000

function normalizePrintPayload(
  payload: readonly ActivityTicketPrintModel[] | readonly ThermalActivityPrintItem[],
): ThermalActivityPrintItem[] {
  if (payload.length === 0) return []
  const first = payload[0] as ActivityTicketPrintModel | ThermalActivityPrintItem
  if ('shortCode' in first) {
    return ticketModelsToPrintItems(payload as ActivityTicketPrintModel[])
  }
  return [...(payload as ThermalActivityPrintItem[])]
}

function clearPrintSession(
  setCurrentSheet: (sheet: ThermalTicketPrintSheet | null) => void,
  setPrintProgress: (progress: ThermalTicketPrintProgress | null) => void,
) {
  setCurrentSheet(null)
  setPrintProgress(null)
  document.body.classList.remove(PRINT_BODY_CLASS)
}

function startBrowserPrintQueue(
  sheets: ThermalTicketPrintSheet[],
  queueRef: MutableRefObject<ReturnType<typeof createThermalTicketPrintQueue>>,
  cancelledRef: MutableRefObject<boolean>,
  setCurrentSheet: (sheet: ThermalTicketPrintSheet | null) => void,
  setPrintProgress: (progress: ThermalTicketPrintProgress | null) => void,
): void {
  const queue = createThermalTicketPrintQueue(sheets)
  if (!queue) return

  cancelledRef.current = false
  queueRef.current = queue

  const sheet = getThermalTicketSheetAt(queue)
  if (!sheet) return

  setCurrentSheet(sheet)
  setPrintProgress(getThermalTicketPrintProgress(queue))
}

export function useActivityTicketPrint() {
  const [currentSheet, setCurrentSheet] = useState<ThermalTicketPrintSheet | null>(null)
  const [printProgress, setPrintProgress] = useState<ThermalTicketPrintProgress | null>(null)
  const [agentStatus, setAgentStatus] = useState<PrintAgentUiStatus>('checking')
  const [agentFallbackNotice, setAgentFallbackNotice] = useState<string | null>(null)
  const [testPrintLoading, setTestPrintLoading] = useState(false)

  const queueRef = useRef<ReturnType<typeof createThermalTicketPrintQueue>>(null)
  const cancelledRef = useRef(false)
  const agentStatusRef = useRef<PrintAgentUiStatus>('checking')

  useEffect(() => {
    agentStatusRef.current = agentStatus
  }, [agentStatus])

  const refreshAgentStatus = useCallback(async () => {
    const available = await checkPrintAgentHealth()
    setAgentStatus(available ? 'available' : 'unavailable')
    return available
  }, [])

  useEffect(() => {
    let alive = true

    const run = async () => {
      const available = await checkPrintAgentHealth()
      if (!alive) return
      setAgentStatus(available ? 'available' : 'unavailable')
    }

    void run()
    const intervalId = window.setInterval(() => {
      void run()
    }, AGENT_HEALTH_POLL_MS)

    return () => {
      alive = false
      window.clearInterval(intervalId)
    }
  }, [])

  const clearAgentFallbackNotice = useCallback(() => {
    setAgentFallbackNotice(null)
  }, [])

  const cancelPrint = useCallback(() => {
    cancelledRef.current = true
    queueRef.current = null
    clearPrintSession(setCurrentSheet, setPrintProgress)
  }, [])

  const requestPrint = useCallback(
    (payload: readonly ActivityTicketPrintModel[] | readonly ThermalActivityPrintItem[]) => {
      const items = normalizePrintPayload(payload)
      const sheets = groupPrintItemsIntoSheets(items)
      if (sheets.length === 0) return

      void (async () => {
        let useAgent = agentStatusRef.current === 'available'
        if (agentStatusRef.current === 'checking') {
          useAgent = await refreshAgentStatus()
        }

        if (useAgent) {
          setPrintProgress({ current: 0, total: sheets.length })
          try {
            const response = await printActivityTicketsBatchWithAgent(sheets)
            setPrintProgress(null)

            if (response.success) {
              setAgentFallbackNotice(null)
              return
            }

            const failedIndexes = new Set(
              response.results.filter((result) => !result.success).map((result) => result.index),
            )
            const sheetsForBrowser =
              failedIndexes.size > 0
                ? sheets.filter((_, index) => failedIndexes.has(index))
                : sheets

            const firstError = response.results.find((result) => !result.success)?.message
            if (response.successCount > 0 && sheetsForBrowser.length < sheets.length) {
              setAgentFallbackNotice(
                firstError
                  ? `Alguns tickets falharam no agente (${firstError}). Repetindo ${sheetsForBrowser.length} pelo navegador.`
                  : `Alguns tickets falharam no agente. Repetindo ${sheetsForBrowser.length} pelo navegador.`,
              )
            } else {
              setAgentFallbackNotice(
                firstError
                  ? `Falha no agente local (${firstError}). Usando impressão pelo navegador.`
                  : PRINT_AGENT_FALLBACK_NOTICE,
              )
            }

            startBrowserPrintQueue(
              sheetsForBrowser,
              queueRef,
              cancelledRef,
              setCurrentSheet,
              setPrintProgress,
            )
            return
          } catch {
            setPrintProgress(null)
            setAgentFallbackNotice(PRINT_AGENT_FALLBACK_NOTICE)
          }
        } else {
          setAgentFallbackNotice(PRINT_AGENT_FALLBACK_NOTICE)
        }

        startBrowserPrintQueue(
          sheets,
          queueRef,
          cancelledRef,
          setCurrentSheet,
          setPrintProgress,
        )
      })()
    },
    [refreshAgentStatus],
  )

  const testThermalPrinter = useCallback(async () => {
    setTestPrintLoading(true)
    try {
      const available = await refreshAgentStatus()
      if (!available) {
        setAgentFallbackNotice(PRINT_AGENT_FALLBACK_NOTICE)
        return { success: false, message: PRINT_AGENT_FALLBACK_NOTICE }
      }

      const result = await printTestTicketWithAgent()
      if (!result.success) {
        setAgentFallbackNotice(result.message)
      }
      return result
    } finally {
      setTestPrintLoading(false)
    }
  }, [refreshAgentStatus])

  useEffect(() => {
    if (!currentSheet || cancelledRef.current) return

    document.body.classList.add(PRINT_BODY_CLASS)

    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const TIMEOUT_MS = 2000

    let rafA: number | null = null
    let rafB: number | null = null

    const attemptPrint = () => {
      if (cancelledRef.current) return

      const result = tryPrintThermalTicketIfDomReady({
        currentSheet,
        document,
        window,
        bodyClassName: PRINT_BODY_CLASS,
      })

      if (result.printed) return

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      if (now - startedAt >= TIMEOUT_MS) {
        cancelPrint()
        return
      }

      rafA = window.requestAnimationFrame(attemptPrint)
    }

    // Duas trocas de frame reduzem race portal/host antes do print.
    rafA = window.requestAnimationFrame(() => {
      rafB = window.requestAnimationFrame(attemptPrint)
    })

    return () => {
      if (rafA != null) window.cancelAnimationFrame(rafA)
      if (rafB != null) window.cancelAnimationFrame(rafB)
    }
  }, [currentSheet, cancelPrint])

  useEffect(() => {
    const onAfterPrint = () => {
      if (cancelledRef.current) return

      const queue = queueRef.current
      if (!queue) return

      const nextQueue = advanceThermalTicketPrintQueue(queue)
      if (!nextQueue) {
        queueRef.current = null
        clearPrintSession(setCurrentSheet, setPrintProgress)
        return
      }

      queueRef.current = nextQueue
      const nextSheet = getThermalTicketSheetAt(nextQueue)
      if (!nextSheet) {
        queueRef.current = null
        clearPrintSession(setCurrentSheet, setPrintProgress)
        return
      }

      setCurrentSheet(nextSheet)
      setPrintProgress(getThermalTicketPrintProgress(nextQueue))
    }

    window.addEventListener('afterprint', onAfterPrint)
    return () => window.removeEventListener('afterprint', onAfterPrint)
  }, [])

  return {
    currentSheet,
    printProgress,
    isPrinting: currentSheet !== null,
    agentStatus,
    agentFallbackNotice,
    testPrintLoading,
    requestPrint,
    cancelPrint,
    clearAgentFallbackNotice,
    testThermalPrinter,
    refreshAgentStatus,
  }
}
