import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { listAdminAuditEventsQuerySchema } from './admin-audit.schemas.js'
import { serviceListAdminAuditEvents } from './admin-audit.service.js'
import type { AdminAuditListFilters } from './admin-audit.repository.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getAdminAuditEvents(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = listAdminAuditEventsQuerySchema.parse({
    event_type: queryString(req.query.event_type),
    target_user_id: queryString(req.query.target_user_id),
    occurred_from: queryString(req.query.occurred_from),
    occurred_to: queryString(req.query.occurred_to),
    limit: queryString(req.query.limit),
    offset: queryString(req.query.offset),
  })
  const filters: AdminAuditListFilters = {
    eventType: q.eventType,
    targetUserId: q.targetUserId,
    occurredFrom: q.occurredFrom,
    occurredTo: q.occurredTo,
    limit: q.limit,
    offset: q.offset,
  }
  const { data, total } = await serviceListAdminAuditEvents(pool, filters)
  res.json(ok(data, { total, limit: q.limit, offset: q.offset }))
}
