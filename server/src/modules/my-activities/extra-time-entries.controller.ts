import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import {
  createExtraTimeEntryBodySchema,
  listExtraTimeEntriesQuerySchema,
} from './extra-time-entries.schemas.js'
import {
  serviceCreateMyExtraTimeEntry,
  serviceListExtraTimeEntryDescriptionOptions,
  serviceListMyRecentExtraTimeEntries,
} from './extra-time-entries.service.js'

function toOptionJson(row: { id: string; description: string }) {
  return {
    id: row.id,
    description: row.description,
  }
}

function toEntryJson(row: {
  id: string
  description_id: string
  description: string
  entry_date: string
  minutes: number
  notes: string | null
  created_at: Date
  updated_at: Date
}) {
  return {
    id: row.id,
    descriptionId: row.description_id,
    description: row.description,
    entryDate: row.entry_date,
    minutes: row.minutes,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function getMyExtraTimeEntryDescriptions(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const rows = await serviceListExtraTimeEntryDescriptionOptions(pool)
  const data = rows.map(toOptionJson)
  res.json(ok(data, { total: data.length }))
}

export async function getMyExtraTimeEntries(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const query = listExtraTimeEntriesQuerySchema.parse(req.query)
  const auth = req.authUser!
  const result = await serviceListMyRecentExtraTimeEntries(pool, {
    userId: auth.id,
    limit: query.limit,
  })
  res.json(
    ok(result.items.map(toEntryJson), {
      collaboratorId: result.collaboratorId,
      unavailableReason: result.unavailableReason,
    }),
  )
}

export async function postMyExtraTimeEntry(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const body = createExtraTimeEntryBodySchema.parse(req.body)
  const auth = req.authUser!
  const row = await serviceCreateMyExtraTimeEntry(pool, {
    userId: auth.id,
    body,
  })
  res.status(201).json(ok(toEntryJson(row)))
}
