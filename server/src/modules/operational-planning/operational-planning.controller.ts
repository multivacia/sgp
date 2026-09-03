import type { Request, Response } from 'express'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import {
  operationalPlanningBacklogQuerySchema,
  operationalPlanningFactoryIntakeQuerySchema,
  applyConveyorPlanToWeekItemBodySchema,
  operationalPlanningPlanIdParamSchema,
  operationalPlanningWeekActivityQuerySchema,
  operationalPlanningWeekQuerySchema,
  operationalPlanningWorkPlanItemIdParamSchema,
  saveOperationalWeekPlanBodySchema,
} from './operational-planning.schemas.js'
import {
  serviceApplyConveyorPlanValuesToWeekItem,
  serviceExportOperationalPlanningWeekXlsx,
  serviceGetOperationalPlanningWeek,
  serviceGetOperationalPlanningWeekActivity,
  serviceListFactoryIntakeItems,
  serviceListOperationalPlanningBacklog,
  servicePatchOperationalWeekPlan,
  servicePublishOperationalWeekPlan,
  serviceSaveOperationalWeekPlan,
} from './operational-planning.service.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getOperationalPlanningWeek(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = operationalPlanningWeekQuerySchema.parse({
    weekStart: queryString(req.query.weekStart),
  })
  const data = await serviceGetOperationalPlanningWeek(pool, q.weekStart)
  res.status(200).json(ok(data))
}

export async function getOperationalPlanningWeekExportXlsx(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = operationalPlanningWeekQuerySchema.parse({
    weekStart: queryString(req.query.weekStart),
  })
  const { buffer, filename } = await serviceExportOperationalPlanningWeekXlsx(pool, q.weekStart)
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  )
  res.send(buffer)
}

export async function getOperationalPlanningWeekActivity(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = operationalPlanningWeekActivityQuerySchema.parse({
    weekStart: queryString(req.query.weekStart),
    limit: queryString(req.query.limit),
  })
  const data = await serviceGetOperationalPlanningWeekActivity(pool, q.weekStart, q.limit)
  res.status(200).json(ok(data))
}

export async function postOperationalPlanningWeek(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const uid = req.authUser?.id
  if (!uid) {
    throw new AppError('Sessão não autenticada.', 401, ErrorCodes.UNAUTHORIZED)
  }
  const body = saveOperationalWeekPlanBodySchema.parse(req.body)
  const data = await serviceSaveOperationalWeekPlan(pool, uid, body)
  res.status(200).json(ok(data))
}

export async function patchOperationalPlanningWeek(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const uid = req.authUser?.id
  if (!uid) {
    throw new AppError('Sessão não autenticada.', 401, ErrorCodes.UNAUTHORIZED)
  }
  const { planId } = operationalPlanningPlanIdParamSchema.parse(req.params)
  const body = saveOperationalWeekPlanBodySchema.parse(req.body)
  const data = await servicePatchOperationalWeekPlan(pool, planId, uid, body)
  res.status(200).json(ok(data))
}

export async function postOperationalPlanningWeekPublish(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const uid = req.authUser?.id
  if (!uid) {
    throw new AppError('Sessão não autenticada.', 401, ErrorCodes.UNAUTHORIZED)
  }
  const { planId } = operationalPlanningPlanIdParamSchema.parse(req.params)
  const data = await servicePublishOperationalWeekPlan(pool, planId, uid)
  res.status(200).json(ok(data))
}

export async function getOperationalPlanningBacklog(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = operationalPlanningBacklogQuerySchema.parse({
    q: queryString(req.query.q),
    limit: queryString(req.query.limit),
    conveyorId: queryString(req.query.conveyorId),
    collaboratorId: queryString(req.query.collaboratorId),
  })
  const data = await serviceListOperationalPlanningBacklog(pool, {
    q: q.q?.trim() || null,
    limit: q.limit,
    collaboratorId: q.collaboratorId ?? null,
    conveyorId: q.conveyorId ?? null,
  })
  res.status(200).json(ok(data))
}

export async function postApplyConveyorPlanToWeekItem(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const { workPlanItemId } = operationalPlanningWorkPlanItemIdParamSchema.parse(req.params)
  const body = applyConveyorPlanToWeekItemBodySchema.parse(req.body ?? {})
  const data = await serviceApplyConveyorPlanValuesToWeekItem(pool, workPlanItemId, body)
  res.status(200).json(ok(data))
}

export async function getOperationalPlanningFactoryIntake(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = operationalPlanningFactoryIntakeQuerySchema.parse({
    weekStart: queryString(req.query.weekStart),
  })
  const data = await serviceListFactoryIntakeItems(pool, q.weekStart)
  res.status(200).json(ok(data))
}
