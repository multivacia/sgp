import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import {
  extraTimeEntryParamsSchema,
  patchExtraTimeEntryBodySchema,
  deleteExtraTimeEntryBodySchema,
} from './extra-time-entry-corrections.schemas.js'
import {
  servicePatchExtraTimeEntryAsManager,
  serviceDeleteExtraTimeEntryAsManager,
} from './extra-time-entry-corrections.service.js'

export async function patchExtraTimeEntry(req: Request, res: Response): Promise<void> {
  const { timeEntryId } = extraTimeEntryParamsSchema.parse(req.params)
  const body = patchExtraTimeEntryBodySchema.parse(req.body)
  const data = await servicePatchExtraTimeEntryAsManager(req.app.locals.pool as pg.Pool, {
    id: timeEntryId,
    actorId: req.authUser!.id,
    body,
  })
  res.json(ok(data))
}

export async function deleteExtraTimeEntry(req: Request, res: Response): Promise<void> {
  const { timeEntryId } = extraTimeEntryParamsSchema.parse(req.params)
  const body = deleteExtraTimeEntryBodySchema.parse(req.body)
  const data = await serviceDeleteExtraTimeEntryAsManager(req.app.locals.pool as pg.Pool, {
    id: timeEntryId,
    actorId: req.authUser!.id,
    body,
  })
  res.json(ok(data))
}
