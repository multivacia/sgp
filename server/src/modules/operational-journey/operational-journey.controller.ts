import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { uuidParamSchema } from '../collaborators/collaborators.schemas.js'
import { serviceGetOperationalJourney } from './operational-journey.service.js'
import { operationalJourneyQuerySchema } from './operational-journey.schemas.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getOperationalJourney(req: Request, res: Response): Promise<void> {
  const collaboratorId = uuidParamSchema.parse(req.params.collaboratorId)
  const pool = req.app.locals.pool as pg.Pool
  const q = operationalJourneyQuerySchema.parse({
    periodPreset: queryString(req.query.periodPreset),
    from: queryString(req.query.from),
    to: queryString(req.query.to),
    limit: queryString(req.query.limit),
    conveyorId: queryString(req.query.conveyorId),
  })
  const data = await serviceGetOperationalJourney(pool, { collaboratorId, query: q })
  res.json(ok(data))
}
