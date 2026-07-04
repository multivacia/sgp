import { useCallback, useEffect, useState } from 'react'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { OperationalPlanningWeekPayload } from '../../../domain/operational-planning/operational-planning.types'
import { reportClientError } from '../../../lib/errors'
import { createCollaboratorsApiService } from '../../../services/collaborators/collaboratorsApiService'
import { getOperationalPlanningWeek } from '../../../services/operational-planning/operationalPlanningApiService'
import { mondayOfWeekContainingLocal } from '../../operational-planning/operationalPlanningWeekRange'

const collaboratorsApi = createCollaboratorsApiService()

export function useWeeklyAgendaWeek() {
  const [weekMonday, setWeekMonday] = useState(() => mondayOfWeekContainingLocal(new Date()))
  const [weekPayload, setWeekPayload] = useState<OperationalPlanningWeekPayload | null>(null)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadWeek = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const week = await getOperationalPlanningWeek(weekMonday)
      setWeekPayload(week)
      setWeekMonday(week.week.weekStartDate)
    } catch (e) {
      reportClientError(e, { module: 'weekly-agenda', action: 'load_week' })
      setError('Não foi possível carregar o plano desta semana.')
      setWeekPayload(null)
    } finally {
      setLoading(false)
    }
  }, [weekMonday])

  useEffect(() => {
    void loadWeek()
  }, [loadWeek])

  useEffect(() => {
    void (async () => {
      try {
        const rows = await collaboratorsApi.listCollaborators({ status: 'active' })
        setCollaborators(rows)
      } catch (e) {
        reportClientError(e, { module: 'weekly-agenda', action: 'load_collaborators' })
      }
    })()
  }, [])

  return {
    weekMonday,
    setWeekMonday,
    weekPayload,
    collaborators,
    loading,
    error,
    reload: loadWeek,
  }
}
