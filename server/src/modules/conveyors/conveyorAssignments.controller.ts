import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import {
  assigneeScopedParamsSchema,
  conveyorStepParamsSchema,
  deleteTimeEntryBodySchema,
  postAssigneeBodySchema,
  postTimeEntryBodySchema,
  postTimeEntryOnBehalfBodySchema,
  timeEntryScopedParamsSchema,
} from './conveyorAssignments.schemas.js'
import {
  serviceCreateConveyorNodeAssignee,
  serviceCreateConveyorTimeEntryForAppUser,
  serviceCreateConveyorTimeEntryOnBehalf,
  serviceDeleteConveyorNodeAssignee,
  serviceDeleteConveyorTimeEntryAsAppUser,
  serviceListConveyorNodeAssignees,
  serviceListConveyorTimeEntries,
} from './conveyorAssignments.service.js'

export async function postConveyorStepAssignee(
  req: Request,
  res: Response,
): Promise<void> {
  const params = conveyorStepParamsSchema.parse(req.params)
  const body = postAssigneeBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const created = await serviceCreateConveyorNodeAssignee(pool, {
    conveyorId: params.conveyorId,
    conveyorNodeId: params.stepNodeId,
    type: body.type,
    collaboratorId: body.collaboratorId,
    teamId: body.teamId,
    isPrimary: body.isPrimary ?? false,
    assignmentOrigin: body.assignmentOrigin,
    orderIndex: body.orderIndex,
  })
  res.status(201).json(ok(created))
}

export async function getConveyorStepAssignees(
  req: Request,
  res: Response,
): Promise<void> {
  const params = conveyorStepParamsSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  const data = await serviceListConveyorNodeAssignees(
    pool,
    params.conveyorId,
    params.stepNodeId,
  )
  res.json(ok(data))
}

export async function deleteConveyorStepAssignee(
  req: Request,
  res: Response,
): Promise<void> {
  const params = assigneeScopedParamsSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  const result = await serviceDeleteConveyorNodeAssignee(
    pool,
    params.conveyorId,
    params.stepNodeId,
    params.assigneeId,
  )
  res.json(ok(result))
}

export async function postConveyorStepTimeEntry(
  req: Request,
  res: Response,
): Promise<void> {
  const params = conveyorStepParamsSchema.parse(req.params)
  const body = postTimeEntryBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool

  let entryAt: Date | undefined
  if (body.entryAt !== undefined) {
    entryAt = new Date(body.entryAt)
  }

  const created = await serviceCreateConveyorTimeEntryForAppUser(pool, {
    appUserId: req.authUser!.id,
    conveyorId: params.conveyorId,
    conveyorNodeId: params.stepNodeId,
    entryAt,
    minutes: body.minutes,
    notes: body.notes,
    entryMode: body.entryMode,
  })
  res.status(201).json(ok(created))
}

export async function postConveyorStepTimeEntryOnBehalf(
  req: Request,
  res: Response,
): Promise<void> {
  const params = conveyorStepParamsSchema.parse(req.params)
  const body = postTimeEntryOnBehalfBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool

  let entryAt: Date | undefined
  if (body.entryAt !== undefined) {
    entryAt = new Date(body.entryAt)
  }

  const created = await serviceCreateConveyorTimeEntryOnBehalf(pool, {
    actorAppUserId: req.authUser!.id,
    conveyorId: params.conveyorId,
    conveyorNodeId: params.stepNodeId,
    targetCollaboratorId: body.targetCollaboratorId,
    entryAt,
    minutes: body.minutes,
    notes: body.notes,
    reason: body.reason,
  })
  res.status(201).json(ok(created))
}

export async function getConveyorStepTimeEntries(
  req: Request,
  res: Response,
): Promise<void> {
  const params = conveyorStepParamsSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  const data = await serviceListConveyorTimeEntries(
    pool,
    params.conveyorId,
    params.stepNodeId,
  )
  res.json(ok(data))
}

export async function deleteConveyorStepTimeEntry(
  req: Request,
  res: Response,
): Promise<void> {
  const params = timeEntryScopedParamsSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  const body = deleteTimeEntryBodySchema.parse(
    req.body && typeof req.body === 'object' ? req.body : {},
  )
  const result = await serviceDeleteConveyorTimeEntryAsAppUser(pool, {
    appUserId: req.authUser!.id,
    conveyorId: params.conveyorId,
    conveyorNodeId: params.stepNodeId,
    timeEntryId: params.timeEntryId,
    reason: body.reason,
  })
  res.json(ok(result))
}
