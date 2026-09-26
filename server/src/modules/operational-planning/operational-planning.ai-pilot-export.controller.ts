import type { Request, Response } from 'express'
import type pg from 'pg'
import { operationalPlanningAiPilotExportQuerySchema } from './operational-planning.schemas.js'
import { serviceExportAiPilotPlanningXlsx } from './operational-planning.ai-pilot-export.service.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getOperationalPlanningAiPilotExportXlsx(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = operationalPlanningAiPilotExportQuerySchema.parse({
    inicio: queryString(req.query.inicio),
    fim: queryString(req.query.fim),
  })
  const { buffer, filename } = await serviceExportAiPilotPlanningXlsx(pool, q)
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
