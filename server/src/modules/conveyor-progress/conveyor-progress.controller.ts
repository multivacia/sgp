import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { conveyorProgressQuerySchema } from './conveyor-progress.schemas.js'
import { serviceConveyorProgress } from './conveyor-progress.service.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getConveyorProgress(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = conveyorProgressQuerySchema.parse({
    search: queryString(req.query.search),
    operationalStatus: queryString(req.query.operationalStatus),
    timeEntryFrom: queryString(req.query.timeEntryFrom),
    timeEntryTo: queryString(req.query.timeEntryTo),
    collaboratorId: queryString(req.query.collaboratorId),
    onlyExceeded: queryString(req.query.onlyExceeded),
  })
  const data = await serviceConveyorProgress(pool, q)
  res.json(ok(data))
}
