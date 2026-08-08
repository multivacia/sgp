import type { Request, Response } from 'express'
import type pg from 'pg'
import { serviceListTimeEntryCandidates } from '../my-activities/my-activities.service.js'
import { timeEntryCandidatesQuerySchema } from '../my-activities/my-activities.schemas.js'
import { ok } from '../../shared/http/ok.js'

function queryString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

export async function getProductionTimeEntryCandidates(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const collaboratorId = req.productionSession!.collaboratorId
  const parsed = timeEntryCandidatesQuerySchema.parse({
    q: queryString(req.query.q),
    limit: queryString(req.query.limit),
    includeUnassigned:
      typeof req.query.includeUnassigned === 'boolean'
        ? req.query.includeUnassigned
        : queryString(req.query.includeUnassigned),
  })
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
