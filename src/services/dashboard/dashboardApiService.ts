import type {
  ExecutiveDashboardData,
  OperationalDashboardData,
} from '../../domain/dashboard/dashboard.types'
import { requestJson } from '../../lib/api/client'

const BASE = '/api/v1'

export type OperationalDashboardFetchOpts = {
  realizedPeriodPreset?: '7d' | '15d' | '30d' | 'month'
}

export async function fetchOperationalDashboard(
  opts?: OperationalDashboardFetchOpts,
): Promise<OperationalDashboardData> {
  const qs = new URLSearchParams()
  if (opts?.realizedPeriodPreset) {
    qs.set('realizedPeriodPreset', opts.realizedPeriodPreset)
  }
  const q = qs.toString()
  return requestJson<OperationalDashboardData>(
    'GET',
    `${BASE}/dashboard/operational${q ? `?${q}` : ''}`,
  )
}

export async function fetchExecutiveDashboard(
  days = 30,
): Promise<ExecutiveDashboardData> {
  const q = new URLSearchParams()
  q.set('days', String(days))
  return requestJson<ExecutiveDashboardData>(
    'GET',
    `${BASE}/dashboard/executive?${q.toString()}`,
  )
}
