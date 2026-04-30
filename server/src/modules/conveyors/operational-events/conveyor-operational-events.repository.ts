import type pg from 'pg'
import type {
  ConveyorOperationalEventRow,
  InsertConveyorOperationalEventInput,
  ListConveyorOperationalEventsFilters,
} from './conveyor-operational-events.types.js'
import type { ConveyorStepCompletionStateInput } from './conveyor-step-completion-state.js'

function baseSelectSql(): string {
  return `SELECT
    id,
    conveyor_id,
    node_id,
    event_type,
    previous_value,
    new_value,
    reason,
    source,
    occurred_at,
    created_by,
    metadata_json,
    idempotency_key,
    created_at
  FROM conveyor_operational_events`
}

export async function insertConveyorOperationalEvent(
  pool: pg.Pool,
  input: InsertConveyorOperationalEventInput,
): Promise<ConveyorOperationalEventRow> {
  const r = await pool.query<ConveyorOperationalEventRow>(
    `INSERT INTO conveyor_operational_events (
      conveyor_id, node_id, event_type, previous_value, new_value, reason,
      source, occurred_at, created_by, metadata_json, idempotency_key
    ) VALUES (
      $1::uuid, $2::uuid, $3::varchar, $4::text, $5::text, $6::varchar,
      $7::varchar, $8::timestamptz, $9::uuid, $10::jsonb, $11::varchar
    )
    RETURNING id, conveyor_id, node_id, event_type, previous_value, new_value, reason,
      source, occurred_at, created_by, metadata_json, idempotency_key, created_at`,
    [
      input.conveyorId,
      input.nodeId ?? null,
      input.eventType,
      input.previousValue ?? null,
      input.newValue ?? null,
      input.reason ?? null,
      input.source,
      input.occurredAt,
      input.createdBy ?? null,
      input.metadataJson ?? null,
      input.idempotencyKey ?? null,
    ],
  )
  const row = r.rows[0]
  if (!row) throw new Error('insert conveyor_operational_events failed')
  return row
}

export async function listConveyorOperationalEvents(
  pool: pg.Pool,
  filters: ListConveyorOperationalEventsFilters,
): Promise<ConveyorOperationalEventRow[]> {
  const conditions: string[] = []
  const params: unknown[] = []
  let n = 1

  if (filters.conveyorId) {
    conditions.push(`conveyor_id = $${n}::uuid`)
    params.push(filters.conveyorId)
    n += 1
  }
  if (filters.nodeId) {
    conditions.push(`node_id = $${n}::uuid`)
    params.push(filters.nodeId)
    n += 1
  }
  if (filters.eventType) {
    conditions.push(`event_type = $${n}::varchar`)
    params.push(filters.eventType)
    n += 1
  }
  const limit = Number.isFinite(filters.limit) ? Math.max(1, Math.min(200, filters.limit ?? 50)) : 50
  params.push(limit)

  const r = await pool.query<ConveyorOperationalEventRow>(
    `${baseSelectSql()}
     ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY occurred_at DESC, created_at DESC
     LIMIT $${n}::int`,
    params,
  )
  return r.rows
}

export async function getLatestConveyorOperationalEvent(
  pool: pg.Pool,
  filters: Omit<ListConveyorOperationalEventsFilters, 'limit'>,
): Promise<ConveyorOperationalEventRow | null> {
  const rows = await listConveyorOperationalEvents(pool, { ...filters, limit: 1 })
  return rows[0] ?? null
}

export async function existsConveyorOperationalEventByIdempotencyKey(
  pool: pg.Pool,
  key: string,
): Promise<boolean> {
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM conveyor_operational_events
     WHERE idempotency_key = $1::varchar`,
    [key],
  )
  return Number(r.rows[0]?.c ?? 0) > 0
}

export async function getConveyorOperationalEventByIdempotencyKey(
  pool: pg.Pool,
  key: string,
): Promise<ConveyorOperationalEventRow | null> {
  const r = await pool.query<ConveyorOperationalEventRow>(
    `${baseSelectSql()}
     WHERE idempotency_key = $1::varchar
     ORDER BY created_at DESC
     LIMIT 1`,
    [key],
  )
  return r.rows[0] ?? null
}

export async function getStepCompletionFacts(
  pool: pg.Pool,
  conveyorId: string,
  stepNodeId: string,
): Promise<(ConveyorStepCompletionStateInput & { conveyorId: string; stepNodeId: string }) | null> {
  const r = await pool.query<{
    node_type: string | null
    planned_minutes: number | null
    realized_minutes: string | null
  }>(
    `SELECT
       n.node_type,
       n.planned_minutes,
       COALESCE(SUM(cte.minutes), 0)::text AS realized_minutes
     FROM conveyor_nodes n
     LEFT JOIN conveyor_time_entries cte
       ON cte.conveyor_node_id = n.id
      AND cte.conveyor_id = n.conveyor_id
      AND cte.deleted_at IS NULL
     WHERE n.id = $1::uuid
       AND n.conveyor_id = $2::uuid
       AND n.deleted_at IS NULL
     GROUP BY n.id, n.node_type, n.planned_minutes`,
    [stepNodeId, conveyorId],
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    conveyorId,
    stepNodeId,
    nodeType: row.node_type,
    plannedMinutes: row.planned_minutes,
    realizedMinutes: Number(row.realized_minutes ?? '0') || 0,
  }
}

