import type { Request, Response } from 'express'
import type pg from 'pg'
import { ZodError } from 'zod'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import type {
  PostConveyorStructureItemBody,
} from './conveyors.schemas.js'
import {
  conveyorIdParamSchema,
  postConveyorStructureItemBodySchema,
} from './conveyors.schemas.js'
import {
  parseIdempotencyKeyHeader,
  serviceAppendConveyorStructureItem,
} from './conveyor-structure-append.service.js'

export async function postConveyorStructureItem(
  req: Request,
  res: Response,
): Promise<void> {
  const id = conveyorIdParamSchema.parse(req.params.id)
  let body: PostConveyorStructureItemBody
  try {
    body = postConveyorStructureItemBodySchema.parse(
      req.body ?? {},
    ) as PostConveyorStructureItemBody
  } catch (e) {
    if (e instanceof ZodError) {
      throw new AppError(
        e.issues[0]?.message ?? 'Corpo inválido para inclusão de item na estrutura.',
        400,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    throw e
  }

  const idempotencyKey = parseIdempotencyKeyHeader(
    typeof req.headers['idempotency-key'] === 'string'
      ? req.headers['idempotency-key']
      : Array.isArray(req.headers['idempotency-key'])
        ? req.headers['idempotency-key'][0]
        : null,
  )

  const pool = req.app.locals.pool as pg.Pool
  const out = await serviceAppendConveyorStructureItem(pool, {
    conveyorId: id,
    actorAppUserId: req.authUser!.id,
    idempotencyKey,
    body,
  })

  res.status(200).json(
    ok(out.detail, {
      structureItemAppendIdempotent: out.structureItemAppendIdempotent,
      appendKind: out.appendKind,
      addedNodeId: out.addedNodeId,
      addedOptionId: out.addedOptionId,
      addedAreaId: out.addedAreaId,
      addedStepIds: out.addedStepIds,
    }),
  )
}
