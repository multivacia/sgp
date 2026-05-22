import type { Request, Response } from 'express'
import type pg from 'pg'
import { conveyorIdParamSchema } from './conveyors.schemas.js'
import { serviceDeleteConveyor } from './conveyors.service.js'

export async function deleteConveyor(
  req: Request,
  res: Response,
): Promise<void> {
  const conveyorId = conveyorIdParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  await serviceDeleteConveyor(pool, conveyorId)
  res.status(204).end()
}
