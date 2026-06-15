import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { serviceGetProductionWorkQueue } from './production-work-queue.service.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getProductionWorkQueue(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const session = req.productionSession!
  const date = queryString(req.query.date)

  const result = await serviceGetProductionWorkQueue(pool, {
    collaboratorId: session.collaboratorId,
    date: date ?? null,
    includePastDue: true,
  })

  res.status(200).json(ok(result))
}
