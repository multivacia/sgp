import type { Request, Response } from 'express'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import {
  operationalPlanningBacklogQuerySchema,
  operationalPlanningPlanIdParamSchema,
  operationalPlanningWeekQuerySchema,
  saveOperationalWeekPlanBodySchema,
} from './operational-planning.schemas.js'
import {
  serviceGetOperationalPlanningWeek,
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
    conveyorId: q.conveyorId ?? null,
    collaboratorId: q.collaboratorId ?? null,
  })
  res.status(200).json(ok(data))
}
