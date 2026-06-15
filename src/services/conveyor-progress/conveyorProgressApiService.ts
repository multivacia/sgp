import type {
  ConveyorProgressFetchFilters,
  ConveyorProgressResponse,
} from '../../domain/conveyor-progress/conveyorProgress.types'
import { requestJson } from '../../lib/api/client'

const BASE = '/api/v1'

export async function fetchConveyorProgress(
  filters?: ConveyorProgressFetchFilters,
): Promise<ConveyorProgressResponse> {
  const qs = new URLSearchParams()
  if (filters?.search) qs.set('search', filters.search)
  if (filters?.operationalStatus) qs.set('operationalStatus', filters.operationalStatus)
  if (filters?.timeEntryFrom) qs.set('timeEntryFrom', filters.timeEntryFrom)
  if (filters?.timeEntryTo) qs.set('timeEntryTo', filters.timeEntryTo)
  if (filters?.collaboratorId) qs.set('collaboratorId', filters.collaboratorId)
  if (filters?.onlyExceeded) qs.set('onlyExceeded', 'true')
  const q = qs.toString()
  return requestJson<ConveyorProgressResponse>(
    'GET',
    `${BASE}/management/conveyor-progress${q ? `?${q}` : ''}`,
  )
}
