import type { Request, Response } from 'express'
import type pg from 'pg'
import { ZodError } from 'zod'
import { ok } from '../../shared/http/ok.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  assigneeScopedParamsSchema,
  conveyorStepParamsSchema,
  patchConveyorStepCompletionBodySchema,
  postAssigneeBodySchema,
  postConveyorStepAbortBodySchema,
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
import { serviceAnalyzeConveyorActivitySequence } from './conveyorActivitySequence.service.js'
import { findConveyorById } from './conveyors.repository.js'
import { mapWorkQueueSequenceForCollaborator } from '../my-work-queue/work-queue-sequence-for-collaborator.js'
import { servicePatchConveyorStepCompletion } from './conveyor-step-operational.service.js'
import {
  parseIdempotencyKeyHeader,
  serviceAbortConveyorStep,
  serviceRestoreAbortedConveyorStep,
} from './conveyor-step-abort.service.js'
import { findCollaboratorIdByAppUserId } from '../auth/auth.repository.js'

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
    executedQuantity: body.executedQuantity,
    notes: body.notes,
    entryMode: body.entryMode,
    exceptionJustification: body.exceptionJustification,
    exceptionJustificationId: body.exceptionJustificationId,
    exceptionJustificationComplement: body.exceptionJustificationComplement,
    outOfSequenceJustification: body.outOfSequenceJustification,
    outOfSequenceJustificationId: body.outOfSequenceJustificationId,
    outOfSequenceJustificationComplement: body.outOfSequenceJustificationComplement,
    voluntaryJustificationId: body.voluntaryJustificationId,
    voluntaryJustificationComplement: body.voluntaryJustificationComplement,
    markAsDone: body.markAsDone,
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
    executedQuantity: body.executedQuantity,
    notes: body.notes,
    reason: body.reason,
    outOfSequenceJustification: body.outOfSequenceJustification?.trim(),
    outOfSequenceJustificationId:
      body.outOfSequenceJustificationId ?? body.justificationId,
    outOfSequenceJustificationComplement:
      body.outOfSequenceJustificationComplement ?? body.justificationComplement ?? undefined,
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

/** GET …/sequence-check — pré-checagem de sequência operacional recomendada (S3). */
export async function getConveyorStepSequenceCheck(
  req: Request,
  res: Response,
): Promise<void> {
  const params = conveyorStepParamsSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  const userId = req.authUser?.id
  const collaboratorId = userId
    ? await findCollaboratorIdByAppUserId(pool, userId)
    : null
  const seq = await serviceAnalyzeConveyorActivitySequence(
    pool,
    params.conveyorId,
    params.stepNodeId,
    collaboratorId ?? undefined,
  )
  const conveyor = await findConveyorById(pool, params.conveyorId)
  const mapped = mapWorkQueueSequenceForCollaborator({
    seq,
    isActivityCompleted: false,
    conveyorOperationalStatus: conveyor?.operational_status ?? null,
  })
  const mapActivities = (items: typeof seq.allPreviousOpenActivities) =>
    items.slice(0, 10).map((a) => ({
      activityNodeId: a.activityNodeId,
      activityTitle: a.activityTitle,
      sectorTitle: a.sectorTitle,
      taskTitle: a.taskTitle,
      orderPath: a.orderPath,
    }))
  res.json(
    ok({
      targetFound: mapped.targetFound,
      isOutOfSequence: mapped.isOutOfSequence,
      hasPreviousPendingStep: mapped.hasPreviousPendingStep,
      sequenceWarningType: mapped.sequenceWarningType,
      sequenceWarningLabel: mapped.sequenceWarningLabel,
      requiresJustification: mapped.requiresOutOfSequenceJustification,
      previousOpenCount: mapped.previousOpenCount,
      previousOpenActivities: mapActivities(mapped.previousOpenActivities),
      allPreviousOpenActivities: mapActivities(mapped.allPreviousOpenActivities),
      awaitingPreviousActivities: mapActivities(mapped.awaitingPreviousActivities),
    }),
  )
}

export async function patchConveyorStepCompletion(
  req: Request,
  res: Response,
): Promise<void> {
  const params = conveyorStepParamsSchema.parse(req.params)
  const body = patchConveyorStepCompletionBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  // TODO: permissões finas `conveyor_steps.complete` / `conveyor_steps.reopen` (hoje: mesmo gate que demais mutações da esteira).
  const out = await servicePatchConveyorStepCompletion(pool, {
    conveyorId: params.conveyorId,
    stepNodeId: params.stepNodeId,
    actorAppUserId: req.authUser!.id,
    action: body.action,
    note: body.note,
    outOfSequenceJustification:
      body.outOfSequenceJustification === null ||
      body.outOfSequenceJustification === undefined
        ? undefined
        : body.outOfSequenceJustification.trim(),
    justificationId: body.justificationId,
    justificationComplement: body.justificationComplement?.trim() || undefined,
  })
  res.status(200).json(ok(out.detail, { stepCompletionIdempotent: out.idempotent }))
}

export async function postConveyorStepAbort(
  req: Request,
  res: Response,
): Promise<void> {
  const params = conveyorStepParamsSchema.parse(req.params)
  let body: ReturnType<typeof postConveyorStepAbortBodySchema.parse>
  try {
    body = postConveyorStepAbortBodySchema.parse(req.body ?? {})
  } catch (e) {
    if (e instanceof ZodError) {
      throw new AppError(
        e.issues[0]?.message ?? 'Corpo inválido para dispensa de atividade.',
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
  const out = await serviceAbortConveyorStep(pool, {
    conveyorId: params.conveyorId,
    stepNodeId: params.stepNodeId,
    actorAppUserId: req.authUser!.id,
    idempotencyKey,
    reasonCode: body.reasonCode,
    reasonText: body.reasonText,
  })
  res.status(200).json(ok(out.detail, { stepAbortIdempotent: out.idempotent }))
}

export async function postConveyorStepRestoreAborted(
  req: Request,
  res: Response,
): Promise<void> {
  const params = conveyorStepParamsSchema.parse(req.params)
  const idempotencyKey = parseIdempotencyKeyHeader(
    typeof req.headers['idempotency-key'] === 'string'
      ? req.headers['idempotency-key']
      : Array.isArray(req.headers['idempotency-key'])
        ? req.headers['idempotency-key'][0]
        : null,
  )
  const pool = req.app.locals.pool as pg.Pool
  const out = await serviceRestoreAbortedConveyorStep(pool, {
    conveyorId: params.conveyorId,
    stepNodeId: params.stepNodeId,
    actorAppUserId: req.authUser!.id,
    idempotencyKey,
  })
  res.status(200).json(ok(out.detail, { stepRestoreAbortedIdempotent: out.idempotent }))
}

export async function deleteConveyorStepTimeEntry(
  req: Request,
  res: Response,
): Promise<void> {
  const params = timeEntryScopedParamsSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  const result = await serviceDeleteConveyorTimeEntryAsAppUser(pool, {
    appUserId: req.authUser!.id,
    conveyorId: params.conveyorId,
    conveyorNodeId: params.stepNodeId,
    timeEntryId: params.timeEntryId,
  })
  res.json(ok(result))
}
