import type { Request, Response } from 'express'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import {
  conveyorIdParamSchema,
  conveyorOperationalPlanIdParamSchema,
  conveyorOperationalPlanItemIdParamSchema,
  createConveyorOperationalPlanBodySchema,
  createConveyorOperationalPlanItemBodySchema,
  generateConveyorOperationalPlanItemsBodySchema,
  patchConveyorOperationalPlanItemBodySchema,
  previewConveyorOperationalPlanGenerationBodySchema,
} from './conveyor-operational-plan.schemas.js'
import {
  serviceApproveConveyorOperationalPlan,
  serviceCreateConveyorOperationalPlan,
  serviceCreateConveyorOperationalPlanItem,
  serviceGenerateConveyorOperationalPlanItems,
  serviceGetConveyorOperationalPlan,
  servicePatchConveyorOperationalPlanItem,
  servicePreviewConveyorOperationalPlanGeneration,
  serviceSendConveyorOperationalPlanToFactory,
} from './conveyor-operational-plan.service.js'

export async function getConveyorOperationalPlan(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const { conveyorId } = conveyorIdParamSchema.parse(req.params)
  const data = await serviceGetConveyorOperationalPlan(pool, conveyorId)
  res.status(200).json(ok(data, { hasPlan: data !== null }))
}

export async function postConveyorOperationalPlan(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const { conveyorId } = conveyorIdParamSchema.parse(req.params)
  const body = createConveyorOperationalPlanBodySchema.parse(req.body ?? {})
  const data = await serviceCreateConveyorOperationalPlan(pool, conveyorId, body)
  res.status(201).json(ok(data, { hasPlan: true }))
}

export async function postConveyorOperationalPlanItem(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const { conveyorId, planId } = conveyorOperationalPlanIdParamSchema.parse(req.params)
  const body = createConveyorOperationalPlanItemBodySchema.parse(req.body)
  const data = await serviceCreateConveyorOperationalPlanItem(pool, conveyorId, planId, body)
  res.status(201).json(ok(data, { hasPlan: true }))
}

export async function patchConveyorOperationalPlanItem(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const { conveyorId, planId, itemId } = conveyorOperationalPlanItemIdParamSchema.parse(req.params)
  const body = patchConveyorOperationalPlanItemBodySchema.parse(req.body)
  const data = await servicePatchConveyorOperationalPlanItem(
    pool,
    conveyorId,
    planId,
    itemId,
    body,
  )
  res.status(200).json(ok(data, { hasPlan: true }))
}

export async function postConveyorOperationalPlanApprove(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const uid = req.authUser?.id
  if (!uid) {
    throw new AppError('Sessão não autenticada.', 401, ErrorCodes.UNAUTHORIZED)
  }
  const { conveyorId, planId } = conveyorOperationalPlanIdParamSchema.parse(req.params)
  const data = await serviceApproveConveyorOperationalPlan(pool, conveyorId, planId, uid)
  res.status(200).json(ok(data, { hasPlan: true }))
}

export async function postConveyorOperationalPlanGenerateItemsPreview(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const { conveyorId, planId } = conveyorOperationalPlanIdParamSchema.parse(req.params)
  const body = previewConveyorOperationalPlanGenerationBodySchema.parse(req.body ?? {})
  const data = await servicePreviewConveyorOperationalPlanGeneration(
    pool,
    conveyorId,
    planId,
    body,
  )
  res.status(200).json(ok(data))
}

export async function postConveyorOperationalPlanGenerateItems(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const uid = req.authUser?.id
  if (!uid) {
    throw new AppError('Sessão não autenticada.', 401, ErrorCodes.UNAUTHORIZED)
  }
  const { conveyorId, planId } = conveyorOperationalPlanIdParamSchema.parse(req.params)
  const body = generateConveyorOperationalPlanItemsBodySchema.parse(req.body ?? {})
  const { response, generationMeta } = await serviceGenerateConveyorOperationalPlanItems(
    pool,
    conveyorId,
    planId,
    body,
    uid,
  )
  res.status(200).json(
    ok(response, {
      hasPlan: true,
      dailyCapacityMinutesUsed: generationMeta.dailyCapacityMinutesUsed,
      dailyCapacitySource: generationMeta.dailyCapacitySource,
    }),
  )
}

export async function postConveyorOperationalPlanSendToFactory(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const { conveyorId, planId } = conveyorOperationalPlanIdParamSchema.parse(req.params)
  const data = await serviceSendConveyorOperationalPlanToFactory(pool, conveyorId, planId)
  res.status(200).json(ok(data, { hasPlan: true }))
}
