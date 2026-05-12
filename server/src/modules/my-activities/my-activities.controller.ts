import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { findCollaboratorIdByAppUserId } from '../auth/auth.repository.js'
import { serviceGetOperationalJourney } from '../operational-journey/operational-journey.service.js'
import { operationalJourneyQuerySchema } from '../operational-journey/operational-journey.schemas.js'
import {
  serviceListMyActivities,
  serviceListTimeEntryCandidates,
} from './my-activities.service.js'
import { timeEntryCandidatesQuerySchema } from './my-activities.schemas.js'
import {
  getMyExtraTimeEntries as getMyExtraTimeEntriesController,
  getMyExtraTimeEntryDescriptions as getMyExtraTimeEntryDescriptionsController,
  postMyExtraTimeEntry as postMyExtraTimeEntryController,
} from './extra-time-entries.controller.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getTimeEntryCandidates(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const auth = req.authUser!
  const parsed = timeEntryCandidatesQuerySchema.parse({
    q: queryString(req.query.q),
    limit: queryString(req.query.limit),
    includeUnassigned:
      typeof req.query.includeUnassigned === 'boolean'
        ? req.query.includeUnassigned
        : queryString(req.query.includeUnassigned),
  })
  const collaboratorId = await findCollaboratorIdByAppUserId(pool, auth.id)
  const result = await serviceListTimeEntryCandidates(pool, {
    collaboratorId,
    q: parsed.q?.trim() ? parsed.q.trim() : null,
    limit: parsed.limit,
    includeUnassigned: Boolean(parsed.includeUnassigned),
  })
  res.json(
    ok(result.items, {
      collaboratorId: result.collaboratorId,
      unavailableReason: result.unavailableReason,
    }),
  )
}

export async function getMyActivities(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const auth = req.authUser!
  const { items, resolvedCollaboratorId } = await serviceListMyActivities(pool, {
    userId: auth.id,
  })
  res.json(
    ok(items, {
      collaboratorId: resolvedCollaboratorId,
    }),
  )
}

/**
 * Mesma carga que GET /collaborators/:id/operational-journey, mas o colaborador
 * vem exclusivamente da sessão (sem path/query de id).
 */
export async function getMyOperationalJourney(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const auth = req.authUser!
  const collaboratorId = await findCollaboratorIdByAppUserId(pool, auth.id)
  if (!collaboratorId) {
    throw new AppError(
      'Operação indisponível: o seu utilizador não tem colaborador operacional vinculado (app_users.collaborator_id). Peça ao administrador de governança para associar o seu acesso a um colaborador.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  const q = operationalJourneyQuerySchema.parse({
    periodPreset: queryString(req.query.periodPreset),
    from: queryString(req.query.from),
    to: queryString(req.query.to),
    limit: queryString(req.query.limit),
    conveyorId: queryString(req.query.conveyorId),
  })
  const data = await serviceGetOperationalJourney(pool, { collaboratorId, query: q })
  res.json(ok(data))
}

export const getMyExtraTimeEntryDescriptions =
  getMyExtraTimeEntryDescriptionsController
export const getMyExtraTimeEntries = getMyExtraTimeEntriesController
export const postMyExtraTimeEntry = postMyExtraTimeEntryController
