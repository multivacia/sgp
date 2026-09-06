import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { productionUnassignedTimeEntryBodySchema } from './production-time-entries.schemas.js'
import { serviceCreateProductionUnassignedTimeEntry } from './production-unassigned-time-entries.service.js'

export async function postProductionUnassignedTimeEntry(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const session = req.productionSession!
  const body = productionUnassignedTimeEntryBodySchema.parse(req.body)

  const created = await serviceCreateProductionUnassignedTimeEntry(pool, {
    collaboratorId: session.collaboratorId,
    body,
  })

  res.status(201).json(ok(created))
}
