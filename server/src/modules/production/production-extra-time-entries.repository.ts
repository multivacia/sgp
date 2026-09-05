import type pg from 'pg'
import {
  descriptionExistsActive,
  listActiveExtraTimeEntryDescriptions,
  listRecentExtraTimeEntries,
  type ExtraTimeEntryDescriptionOptionRow,
  type ExtraTimeEntryWithDescriptionRow,
} from '../my-activities/extra-time-entries.repository.js'

/**
 * Leitura reaproveitada de `my-activities/extra-time-entries.repository.ts`:
 * são funções puras (recebem `collaboratorId`/`id` diretamente, sem depender de
 * `app_users`), por isso são seguras para o Modo Fábrica.
 */
export {
  listActiveExtraTimeEntryDescriptions as listActiveDescriptions,
  descriptionExistsActive,
  listRecentExtraTimeEntries as listRecentByCollaborator,
}
export type { ExtraTimeEntryDescriptionOptionRow, ExtraTimeEntryWithDescriptionRow }

export type ProductionExtraTimeEntryRow = {
  id: string
  collaborator_id: string
  created_by_collaborator_id: string
  origin: string
  description_id: string
  description: string
  entry_date: string
  minutes: number
  notes: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export async function insertProductionExtraTimeEntry(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    descriptionId: string
    entryDate?: string
    minutes: number
    notes?: string | null
  },
): Promise<ProductionExtraTimeEntryRow> {
  const r = await pool.query<ProductionExtraTimeEntryRow>(
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
       created_by_collaborator_id,
       origin,
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
