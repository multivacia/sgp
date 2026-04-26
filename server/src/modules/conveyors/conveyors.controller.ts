import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { postConveyorBodySchema } from './conveyors.schemas.js'
import { serviceCreateConveyor } from './conveyors.service.js'

export async function postConveyor(req: Request, res: Response): Promise<void> {
  const body = postConveyorBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const created = await serviceCreateConveyor(pool, body)
  res.status(201).json(ok(created))
}
