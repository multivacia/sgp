import type {
  ExecutiveDashboardData,
  OperationalDashboardData,
} from '../../domain/dashboard/dashboard.types'
import type { DashboardDateRange } from '../../lib/dashboard/dashboardDateRange'
import { requestJson } from '../../lib/api/client'

const BASE = '/api/v1'

function periodQuery(range: DashboardDateRange): string {
  const q = new URLSearchParams()
  q.set('startDate', range.startDate)
  q.set('endDate', range.endDate)
  return q.toString()
}

/** GET /api/v1/dashboard/operational — horas apontadas no período (Data inicial a Data final). */
export async function fetchOperationalDashboard(
  range: DashboardDateRange,
): Promise<OperationalDashboardData> {
  return requestJson<OperationalDashboardData>(
    'GET',
    `${BASE}/dashboard/operational?${periodQuery(range)}`,
  )
}

/** GET /api/v1/dashboard/executive — esteiras concluídas no período (Data inicial a Data final). */
export async function fetchExecutiveDashboard(
  range: DashboardDateRange,
): Promise<ExecutiveDashboardData> {
  return requestJson<ExecutiveDashboardData>(
    'GET',
    `${BASE}/dashboard/executive?${periodQuery(range)}`,
  )
}
