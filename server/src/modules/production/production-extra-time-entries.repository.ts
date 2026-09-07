import type pg from 'pg'
import type { ExtraTimeEntryWithDescriptionRow } from '../my-activities/extra-time-entries.repository.js'

export {
  listActiveExtraTimeEntryDescriptions,
  descriptionExistsActive,
  listRecentExtraTimeEntries,
  type ExtraTimeEntryDescriptionOptionRow,
  type ExtraTimeEntryWithDescriptionRow,
} from '../my-activities/extra-time-entries.repository.js'

export async function insertProductionExtraTimeEntry(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    descriptionId: string
    entryDate?: string
    minutes: number
    notes?: string | null
  },
): Promise<ExtraTimeEntryWithDescriptionRow> {
  const r = await pool.query<ExtraTimeEntryWithDescriptionRow>(
    `INSERT INTO operational_extra_time_entries (
       collaborator_id,
       created_by_collaborator_id,
       origin,
       description_id,
       entry_date,
       minutes,
       notes
     ) VALUES (
       $1::uuid,
       $1::uuid,
       'PRODUCTION',
       $2::uuid,
       COALESCE($3::date, current_date),
       $4::int,
       $5::text
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
      input.descriptionId,
      input.entryDate ?? null,
      input.minutes,
      input.notes ?? null,
    ],
  )
  const row = r.rows[0]
  if (!row) throw new Error('insert production extra time entry failed')
  return row
}
