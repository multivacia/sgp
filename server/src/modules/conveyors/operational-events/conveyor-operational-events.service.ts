import type pg from 'pg'
import {
  getConveyorOperationalEventByIdempotencyKey,
  insertConveyorOperationalEvent,
  listConveyorOperationalEvents,
} from './conveyor-operational-events.repository.js'
import type {
  ConveyorOperationalEventSnapshotItem,
  ConveyorOperationalEventRow,
  InsertConveyorOperationalEventInput,
} from './conveyor-operational-events.types.js'

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string }
  return e.code === '23505'
}

export async function serviceCreateConveyorOperationalEvent(
  pool: pg.Pool,
  input: InsertConveyorOperationalEventInput,
): Promise<{ created: boolean; event: ConveyorOperationalEventRow }> {
  if (input.idempotencyKey) {
    const existing = await getConveyorOperationalEventByIdempotencyKey(
      pool,
      input.idempotencyKey,
    )
    if (existing) {
      return { created: false, event: existing }
    }
  }

  try {
    const event = await insertConveyorOperationalEvent(pool, input)
    return { created: true, event }
  } catch (error) {
    if (input.idempotencyKey && isUniqueViolation(error)) {
      const existing = await getConveyorOperationalEventByIdempotencyKey(
        pool,
        input.idempotencyKey,
      )
      if (existing) return { created: false, event: existing }
    }
    throw error
  }
}

export async function serviceListConveyorOperationalEvents(
  pool: pg.Pool,
  filters: { conveyorId: string; limit?: number },
): Promise<ConveyorOperationalEventRow[]> {
  return listConveyorOperationalEvents(pool, {
    conveyorId: filters.conveyorId,
    limit: filters.limit ?? 50,
  })
}

function normalizeUpper(value: string | null | undefined): string | null {
  const v = value?.trim()
  return v ? v.toUpperCase() : null
}

function toSnapshotItem(row: ConveyorOperationalEventRow): ConveyorOperationalEventSnapshotItem {
  return {
    eventId: row.id,
    conveyorId: row.conveyor_id,
    nodeId: row.node_id,
    eventType: normalizeUpper(row.event_type) as ConveyorOperationalEventSnapshotItem['eventType'],
    previousValue: row.previous_value,
    newValue: row.new_value,
    reason: normalizeUpper(row.reason),
    source: normalizeUpper(row.source) as ConveyorOperationalEventSnapshotItem['source'],
    occurredAt: row.occurred_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    metadataJson: row.metadata_json ?? null,
  }
}

export async function loadConveyorOperationalEventsForHealthSnapshot(
  pool: pg.Pool,
  conveyorId: string,
  options?: { limit?: number },
): Promise<ConveyorOperationalEventSnapshotItem[]> {
  const limit = Math.min(Math.max(1, Math.floor(options?.limit ?? 50)), 200)
  const rows = await listConveyorOperationalEvents(pool, { conveyorId, limit })
  return rows.map(toSnapshotItem)
}

