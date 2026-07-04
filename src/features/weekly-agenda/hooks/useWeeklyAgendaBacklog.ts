import { useCallback, useEffect, useState } from 'react'
import type { OperationalPlanningBacklogItem } from '../../../domain/operational-planning/operational-planning.types'
import { reportClientError } from '../../../lib/errors'
import { listOperationalPlanningBacklog } from '../../../services/operational-planning/operationalPlanningApiService'

export function useWeeklyAgendaBacklog() {
  const [backlogItems, setBacklogItems] = useState<OperationalPlanningBacklogItem[]>([])
  const [backlogQ, setBacklogQ] = useState('')
  const [loading, setLoading] = useState(false)

  const loadBacklog = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await listOperationalPlanningBacklog({
        q: backlogQ,
        limit: 100,
      })
      setBacklogItems(payload.items)
    } catch (e) {
      reportClientError(e, { module: 'weekly-agenda', action: 'load_backlog' })
      setBacklogItems([])
    } finally {
      setLoading(false)
    }
  }, [backlogQ])

  useEffect(() => {
    void loadBacklog()
  }, [loadBacklog])

  return {
    backlogItems,
    backlogQ,
    setBacklogQ,
    loading,
    reloadBacklog: loadBacklog,
  }
}
