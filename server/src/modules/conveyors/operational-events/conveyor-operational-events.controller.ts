import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../../shared/http/ok.js'
import {
  conveyorOperationalEventsByConveyorParamsSchema,
  listConveyorOperationalEventsQuerySchema,
} from './conveyor-operational-events.schemas.js'
import { serviceListConveyorOperationalEvents } from './conveyor-operational-events.service.js'

function toJson(row: {
  id: string
  conveyor_id: string
  node_id: string | null
  event_type: string
  previous_value: string | null
  new_value: string | null
  reason: string | null
  source: string
  occurred_at: Date
  created_by: string | null
  metadata_json: Record<string, unknown> | null
  idempotency_key: string | null
  created_at: Date
}) {
  return {
    eventId: row.id,
    conveyorId: row.conveyor_id,
    nodeId: row.node_id,
    eventType: row.event_type,
    previousValue: row.previous_value,
    newValue: row.new_value,
    reason: row.reason,
    source: row.source,
    occurredAt: row.occurred_at.toISOString(),
    metadataJson: row.metadata_json,
    createdAt: row.created_at.toISOString(),
  }
}

export async function getConveyorOperationalEvents(
  req: Request,
  res: Response,
): Promise<void> {
  const params = conveyorOperationalEventsByConveyorParamsSchema.parse(req.params)
  const query = listConveyorOperationalEventsQuerySchema.parse(req.query)
  const pool = req.app.locals.pool as pg.Pool
  const events = await serviceListConveyorOperationalEvents(pool, {
    conveyorId: params.id,
    limit: query.limit,
  })
  const data = events.map(toJson)
  res.json(ok(data, { total: data.length, limit: query.limit }))
}

