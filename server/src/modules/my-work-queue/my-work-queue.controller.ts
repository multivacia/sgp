import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { myWorkQueueQuerySchema } from './my-work-queue.schemas.js'
import { serviceGetMyWorkQueue } from './my-work-queue.service.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getMyWorkQueue(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const auth = req.authUser!
  const q = myWorkQueueQuerySchema.parse({
    date: queryString(req.query.date),
    includePastDue:
      typeof req.query.includePastDue === 'boolean'
        ? req.query.includePastDue
        : queryString(req.query.includePastDue),
  })
  const result = await serviceGetMyWorkQueue(pool, {
    userId: auth.id,
    date: q.date ?? null,
    includePastDue: q.includePastDue,
  })
  res.status(200).json(ok(result.data, result.meta))
}
