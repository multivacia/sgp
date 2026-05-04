import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { collaboratorOperationalHealthSummaryQuerySchema } from './collaborator-operational-health.schemas.js'
import { serviceGetCollaboratorsOperationalHealthSummary } from './collaborator-operational-health-summary.service.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

/**
 * Resumo compacto da saúde operacional dos colaboradores (fatos objetivos).
 *
 * TODO(RBAC): permissão fina `collaborator_health.summary.view` — hoje apenas `requireAuth()`.
 */
export async function getCollaboratorsOperationalHealthSummary(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = collaboratorOperationalHealthSummaryQuerySchema.parse({
    referenceDate: queryString(req.query.referenceDate),
    recentDays: req.query.recentDays,
    limit: req.query.limit,
    includeInactive: req.query.includeInactive,
  })
  const { summary, meta } = await serviceGetCollaboratorsOperationalHealthSummary(pool, q)
  res.json(ok(summary, meta))
}
