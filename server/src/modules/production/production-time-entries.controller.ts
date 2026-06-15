import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { productionTimeEntryBodySchema } from './production-time-entries.schemas.js'
import { serviceCreateProductionTimeEntry } from './production-time-entries.service.js'

export async function postProductionTimeEntry(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const session = req.productionSession!
  const body = productionTimeEntryBodySchema.parse(req.body)

  const created = await serviceCreateProductionTimeEntry(pool, {
    collaboratorId: session.collaboratorId,
    conveyorId: body.conveyorId,
    stepNodeId: body.stepNodeId,
    minutes: body.minutes,
    executedQuantity: body.executedQuantity,
    note: body.note ?? null,
    sessionCompletionPct: body.sessionCompletionPct ?? null,
    markAsDone: body.markAsDone ?? false,
    outOfSequenceJustification: body.outOfSequenceJustification ?? null,
  })

  res.status(201).json(ok(created))
}
