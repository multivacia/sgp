import type { Request, Response } from 'express'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import {
  serviceArchiveConveyor,
  serviceUnarchiveConveyor,
} from './conveyor-panel-archive.service.js'
import { conveyorIdParamSchema } from './conveyors.schemas.js'

export async function postConveyorArchive(req: Request, res: Response): Promise<void> {
  const id = conveyorIdParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const data = await serviceArchiveConveyor(pool, id, {
    actorUserId: req.authUser?.id ?? null,
  })
  if (!data) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  res.status(200).json(ok(data))
}

export async function postConveyorUnarchive(req: Request, res: Response): Promise<void> {
  const id = conveyorIdParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const data = await serviceUnarchiveConveyor(pool, id, {
    actorUserId: req.authUser?.id ?? null,
  })
  if (!data) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  res.status(200).json(ok(data))
}
