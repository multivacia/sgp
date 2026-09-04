import type { Request, Response } from 'express'
import type pg from 'pg'
import { operationalPlanningWeekQuerySchema } from './operational-planning.schemas.js'
import { serviceExportOperationalPlanningWeeklyViewXlsx } from './operational-planning.weekly-view.service.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getOperationalPlanningWeekExportWeeklyViewXlsx(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = operationalPlanningWeekQuerySchema.parse({
    weekStart: queryString(req.query.weekStart),
  })
  const { buffer, filename } = await serviceExportOperationalPlanningWeeklyViewXlsx(
    pool,
    q.weekStart,
  )
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  )
  res.send(buffer)
}
