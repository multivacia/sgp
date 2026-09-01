import { useCallback, useMemo, useState } from 'react'
import {
  detectPlanningCapacityExceededAlerts,
  type PlanningCapacityDraftItemRef,
  type PlanningCapacityExceededAlert,
  type PlanningCapacityRowRef,
} from './planningCapacityExceededDetect'

/**
 * Estado do modal informativo de capacidade.
 * Chamar `notifyIfNeeded` apenas após mutações explícitas do usuário no rascunho
 * (nunca em hidratação, save, publish ou remoção).
 */
export function usePlanningCapacityExceededAlert(
  capacityRows: readonly PlanningCapacityRowRef[],
  collaboratorNameById: Map<string, string> | Readonly<Record<string, string>>,
) {
  const [alerts, setAlerts] = useState<PlanningCapacityExceededAlert[]>([])

  const close = useCallback(() => {
    setAlerts([])
  }, [])

  const notifyIfNeeded = useCallback(
    (
      previousItems: readonly PlanningCapacityDraftItemRef[],
      nextItems: readonly PlanningCapacityDraftItemRef[],
    ) => {
      const found = detectPlanningCapacityExceededAlerts({
        previousItems,
        nextItems,
        capacityRows,
        collaboratorNameById,
      })
      if (found.length > 0) setAlerts(found)
    },
    [capacityRows, collaboratorNameById],
  )

  const open = alerts.length > 0

  return useMemo(
    () => ({ open, alerts, close, notifyIfNeeded }),
    [open, alerts, close, notifyIfNeeded],
  )
}
