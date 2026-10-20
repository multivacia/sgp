import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import {
  executiveDashboardQuerySchema,
  operationalDashboardQuerySchema,
} from './dashboard.schemas.js'
import {
  serviceExecutiveDashboard,
  serviceOperationalDashboard,
} from './dashboard.service.js'
import { resolveDashboardPeriod } from './dashboard.period.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getOperationalDashboard(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = operationalDashboardQuerySchema.parse({
    startDate: queryString(req.query.startDate),
    endDate: queryString(req.query.endDate),
    realizedPeriodPreset: queryString(req.query.realizedPeriodPreset),
  })
  const period = resolveDashboardPeriod(q.startDate, q.endDate)
  const data = await serviceOperationalDashboard(pool, {
    period,
    realizedPeriodPreset: period ? undefined : q.realizedPeriodPreset,
  })
  res.json(ok(data))
}

export async function getExecutiveDashboard(
  req: Request,
  res: Response,
): Promise<void> {
  const startDate = queryString(req.query.startDate)
  const endDate = queryString(req.query.endDate)
  const hasPeriod = Boolean(startDate?.trim() || endDate?.trim())
  const q = executiveDashboardQuerySchema.parse({
    startDate,
    endDate,
    // Com datas, `days` (legado) é ignorado — não valida nem interfere.
    days: hasPeriod ? undefined : queryString(req.query.days),
  })
  const period = resolveDashboardPeriod(q.startDate, q.endDate)
  const pool = req.app.locals.pool as pg.Pool
  const data = await serviceExecutiveDashboard(
    pool,
    period ? { period } : { completedWithinDays: q.days },
  )
  res.json(ok(data))
}
