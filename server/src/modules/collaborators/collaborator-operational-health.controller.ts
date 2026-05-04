import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { uuidParamSchema } from './collaborators.schemas.js'
import { collaboratorOperationalHealthQuerySchema } from './collaborator-operational-health.schemas.js'
import { serviceGetCollaboratorOperationalHealthSnapshot } from './collaborator-operational-health.service.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

/**
 * Snapshot operacional do colaborador (fatos objetivos; interpretação ARGOS em sprint futura).
 *
 * TODO(RBAC): permissão fina `collaborator_health.view` (ou equivalente) — hoje apenas `requireAuth()`.
 */
export async function getCollaboratorOperationalHealthSnapshot(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const collaboratorId = uuidParamSchema.parse(req.params.collaboratorId)
  const q = collaboratorOperationalHealthQuerySchema.parse({
    referenceDate: queryString(req.query.referenceDate),
    recentDays: req.query.recentDays,
  })
  const snapshot = await serviceGetCollaboratorOperationalHealthSnapshot(pool, collaboratorId, q)
  res.json(ok(snapshot))
}
