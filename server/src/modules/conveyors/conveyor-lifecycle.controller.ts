import type { Request, Response } from 'express'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import {
  serviceReturnConveyorToBacklog,
  serviceReturnConveyorToPlanning,
} from './conveyor-lifecycle.service.js'
import {
  conveyorIdParamSchema,
  conveyorReturnToBacklogBodySchema,
  conveyorReturnToPlanningBodySchema,
} from './conveyors.schemas.js'

export async function postConveyorReturnToBacklog(
  req: Request,
  res: Response,
): Promise<void> {
  const id = conveyorIdParamSchema.parse(req.params.id)
  const body = conveyorReturnToBacklogBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const data = await serviceReturnConveyorToBacklog(pool, id, body.reason, {
    actorUserId: req.authUser?.id ?? null,
  })
  if (!data) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  res.status(200).json(ok(data))
}

export async function postConveyorReturnToPlanning(
  req: Request,
  res: Response,
): Promise<void> {
  const id = conveyorIdParamSchema.parse(req.params.id)
  const body = conveyorReturnToPlanningBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const data = await serviceReturnConveyorToPlanning(pool, id, body.reason, {
    actorUserId: req.authUser?.id ?? null,
  })
  if (!data) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  res.status(200).json(ok(data))
}
