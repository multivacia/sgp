import type { Request, Response } from 'express'
import type pg from 'pg'
import { z } from 'zod'
import { ok } from '../../shared/http/ok.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { planningWeekRange, resolvePlanningRange } from './operational-planning.range.js'
import {
  serviceExportPlanningAiXlsx,
  serviceListPlanningPeriodItems,
} from './operational-planning.range.service.js'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

/** `from`/`to` (período, pontas opcionais) **ou** `weekStart` (semana do quadro). */
const planningRangeQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  weekStart: isoDate.optional(),
})

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

function parseRangeQuery(req: Request) {
  const q = planningRangeQuerySchema.parse({
    from: queryString(req.query.from),
    to: queryString(req.query.to),
    weekStart: queryString(req.query.weekStart),
  })
  const period = resolvePlanningRange(q.from, q.to)
  if (period) return { range: period, scope: 'PERIODO' as const }
  if (q.weekStart) return { range: planningWeekRange(q.weekStart), scope: 'SEMANA' as const }
  throw new AppError(
    'Informe o período (from/to) ou a semana (weekStart).',
    400,
    ErrorCodes.VALIDATION_ERROR,
  )
}

/** GET /operational-planning/period-items — itens planejados atravessando semanas. */
export async function getOperationalPlanningPeriodItems(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const { range } = parseRangeQuery(req)
  const data = await serviceListPlanningPeriodItems(pool, range)
  res.json(ok(data))
}

/** GET /operational-planning/export-ai.xlsx — Backlog + Planejado + Carga no recorte. */
export async function getOperationalPlanningAiExportXlsx(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const { range, scope } = parseRangeQuery(req)
  const { buffer, filename } = await serviceExportPlanningAiXlsx(pool, { range, scope })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  )
  res.send(buffer)
}
