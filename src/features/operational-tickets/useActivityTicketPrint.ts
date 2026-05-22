import { useCallback, useEffect, useState } from 'react'
import type { ActivityTicketPrintModel } from './activityTicketPrintModel'

export function useActivityTicketPrint() {
  const [tickets, setTickets] = useState<ActivityTicketPrintModel[] | null>(null)

  const requestPrint = useCallback((models: readonly ActivityTicketPrintModel[]) => {
    if (models.length === 0) return
    setTickets([...models])
  }, [])

  const clearPrint = useCallback(() => {
    setTickets(null)
  }, [])

  useEffect(() => {
    if (!tickets?.length) return

    const frameId = requestAnimationFrame(() => {
      window.print()
    })

    return () => cancelAnimationFrame(frameId)
  }, [tickets])

  useEffect(() => {
    const onAfterPrint = () => {
      setTickets(null)
    }
    window.addEventListener('afterprint', onAfterPrint)
    return () => window.removeEventListener('afterprint', onAfterPrint)
  }, [])

  return {
    tickets,
    requestPrint,
    clearPrint,
  }
}
