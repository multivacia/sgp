import type {
  OperationalJourneyData,
  OperationalPeriodPreset,
} from '../../domain/operational-journey/operational-journey.types'
import { requestJson } from '../../lib/api/client'

const BASE = '/api/v1'

export type OperationalJourneyQuery = {
  periodPreset?: OperationalPeriodPreset
  from?: string
  to?: string
  limit?: number
  conveyorId?: string
}

function operationalJourneyQueryString(query?: OperationalJourneyQuery): string {
  const qs = new URLSearchParams()
  if (query?.periodPreset) qs.set('periodPreset', query.periodPreset)
  if (query?.from?.trim()) qs.set('from', query.from.trim())
  if (query?.to?.trim()) qs.set('to', query.to.trim())
  if (query?.limit !== undefined) qs.set('limit', String(query.limit))
  if (query?.conveyorId?.trim()) qs.set('conveyorId', query.conveyorId.trim())
  return qs.toString()
}

export async function fetchOperationalJourney(
  collaboratorId: string,
  query?: OperationalJourneyQuery,
): Promise<OperationalJourneyData> {
  const q = operationalJourneyQueryString(query)
  const path = `${BASE}/collaborators/${encodeURIComponent(collaboratorId)}/operational-journey${
    q ? `?${q}` : ''
  }`
  return requestJson<OperationalJourneyData>('GET', path)
}

/** Jornada do colaborador logado — mesmo contrato que a jornada gerencial. */
export async function fetchMyOperationalJourney(
  query?: OperationalJourneyQuery,
): Promise<OperationalJourneyData> {
  const q = operationalJourneyQueryString(query)
  return requestJson<OperationalJourneyData>(
    'GET',
    `${BASE}/my-operational-journey${q ? `?${q}` : ''}`,
  )
}
