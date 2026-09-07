import type { Request, Response } from 'express'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import {
  conveyorIdParamSchema,
  patchConveyorDadosBodySchema,
  patchConveyorStructureBodySchema,
} from './conveyors.schemas.js'
import { servicePatchConveyorDados } from './conveyors.service.js'
import {
  parseIdempotencyKeyHeader,
  serviceApplyConveyorStructureDiff,
} from './conveyor-structure-diff.service.js'

export async function patchConveyorDados(
  req: Request,
  res: Response,
): Promise<void> {
  const id = conveyorIdParamSchema.parse(req.params.id)
  const body = patchConveyorDadosBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const data = await servicePatchConveyorDados(pool, id, body)
  if (!data) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  res.status(200).json(ok(data))
}

/**
 * PATCH /conveyors/:id/structure — diff incremental (insert/update/soft-delete),
 * preserva ids, funciona em qualquer status. Exige header `Idempotency-Key`.
 */
export async function patchConveyorStructure(
  req: Request,
  res: Response,
): Promise<void> {
  const id = conveyorIdParamSchema.parse(req.params.id)
  const body = patchConveyorStructureBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const idempotencyKey = parseIdempotencyKeyHeader(
    typeof req.headers['idempotency-key'] === 'string'
      ? req.headers['idempotency-key']
      : Array.isArray(req.headers['idempotency-key'])
        ? req.headers['idempotency-key'][0]
        : null,
  )
  const out = await serviceApplyConveyorStructureDiff(pool, {
    conveyorId: id,
    actorAppUserId: req.authUser!.id,
    idempotencyKey,
    body,
  })
  res.status(200).json(
    ok(out.detail, {
      structureUpdateIdempotent: out.idempotent,
      insertCount: out.summary.insertCount,
      updateCount: out.summary.updateCount,
      removeCount: out.summary.removeCount,
      reorderCount: out.summary.reorderCount,
    }),
  )
}
