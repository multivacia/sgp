import type pg from 'pg'

export type ExtraTimeEntryDescriptionOptionRow = {
  id: string
  description: string
  sort_order: number
}

export type ExtraTimeEntryWithDescriptionRow = {
  id: string
  collaborator_id: string
  created_by_user_id: string
  description_id: string
  description: string
  entry_date: string
  minutes: number
  notes: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export async function listActiveExtraTimeEntryDescriptions(
  pool: pg.Pool,
): Promise<ExtraTimeEntryDescriptionOptionRow[]> {
  const r = await pool.query<ExtraTimeEntryDescriptionOptionRow>(
    `SELECT id, description, sort_order
     FROM operational_extra_time_entry_descriptions
     WHERE is_active = true
       AND deleted_at IS NULL
     ORDER BY sort_order ASC, description ASC`,
  )
  return r.rows
}

export async function descriptionExistsActive(
  pool: pg.Pool,
  id: string,
): Promise<boolean> {
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM operational_extra_time_entry_descriptions
     WHERE id = $1::uuid
       AND is_active = true
       AND deleted_at IS NULL`,
    [id],
  )
  return Number(r.rows[0]?.c ?? 0) > 0
}

export async function listRecentExtraTimeEntries(
  pool: pg.Pool,
  input: { collaboratorId: string; limit: number },
): Promise<ExtraTimeEntryWithDescriptionRow[]> {
  const r = await pool.query<ExtraTimeEntryWithDescriptionRow>(
    `SELECT
       e.id,
       e.collaborator_id,
       e.created_by_user_id,
       e.description_id,
       d.description,
       e.entry_date::text AS entry_date,
       e.minutes,
       e.notes,
       e.created_at,
       e.updated_at,
       e.deleted_at
     FROM operational_extra_time_entries e
     INNER JOIN operational_extra_time_entry_descriptions d
       ON d.id = e.description_id
     WHERE e.collaborator_id = $1::uuid
       AND e.deleted_at IS NULL
     ORDER BY e.entry_date DESC, e.created_at DESC
     LIMIT $2::int`,
    [input.collaboratorId, input.limit],
  )
  return r.rows
}

export async function insertExtraTimeEntry(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    createdByUserId: string
    descriptionId: string
    entryDate?: string
    minutes: number
    notes?: string | null
  },
): Promise<ExtraTimeEntryWithDescriptionRow> {
  const r = await pool.query<ExtraTimeEntryWithDescriptionRow>(
    `INSERT INTO operational_extra_time_entries (
       collaborator_id,
       created_by_user_id,
       description_id,
       entry_date,
       minutes,
       notes
     ) VALUES (
       $1::uuid,
       $2::uuid,
       $3::uuid,
       COALESCE($4::date, current_date),
       $5::int,
       $6::text
     )
     RETURNING
       id,
       collaborator_id,
       created_by_user_id,
       description_id,
       (
         SELECT d.description
         FROM operational_extra_time_entry_descriptions d
         WHERE d.id = description_id
       ) AS description,
       entry_date::text AS entry_date,
       minutes,
       notes,
       created_at,
       updated_at,
       deleted_at`,
    [
      input.collaboratorId,
      input.createdByUserId,
      input.descriptionId,
      input.entryDate ?? null,
      input.minutes,
      input.notes ?? null,
    ],
  )
  const row = r.rows[0]
  if (!row) throw new Error('insert extra time entry failed')
  return row
}
