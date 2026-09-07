import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { timeEntryCandidatesQuerySchema } from '../my-activities/my-activities.schemas.js'
import { serviceListTimeEntryCandidates } from '../my-activities/my-activities.service.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

/**
 * Candidatos apontáveis para "Outra Atividade" (Modo Fábrica) — mesma lógica de
 * `GET /me/time-entry-candidates`, resolvendo o colaborador direto da sessão de produção
 * (nunca via `app_users`).
 */
export async function getProductionTimeEntryCandidates(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const session = req.productionSession!
  const parsed = timeEntryCandidatesQuerySchema.parse({
    q: queryString(req.query.q),
    limit: queryString(req.query.limit),
    includeUnassigned:
      typeof req.query.includeUnassigned === 'boolean'
        ? req.query.includeUnassigned
        : queryString(req.query.includeUnassigned),
  })
  const result = await serviceListTimeEntryCandidates(pool, {
    collaboratorId: session.collaboratorId,
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
