import type pg from 'pg'

export type ExtraTimeEntryDescriptionRow = {
  id: string
  description: string
  normalized_description: string
  internal_note: string | null
  sort_order: number
  is_active: boolean
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export async function listExtraTimeEntryDescriptions(
  pool: pg.Pool,
  input: { q?: string; status: 'active' | 'inactive' | 'all' },
): Promise<ExtraTimeEntryDescriptionRow[]> {
  const where: string[] = ['deleted_at IS NULL']
  const vals: unknown[] = []
  let n = 1

  if (input.status === 'active') where.push('is_active = true')
  if (input.status === 'inactive') where.push('is_active = false')
  if (input.q) {
    where.push(`description ILIKE $${n}`)
    vals.push(`%${input.q}%`)
    n += 1
  }

  const r = await pool.query<ExtraTimeEntryDescriptionRow>(
    `SELECT id, description, normalized_description, internal_note, sort_order,
            is_active, created_at, updated_at, deleted_at
     FROM operational_extra_time_entry_descriptions
     WHERE ${where.join(' AND ')}
     ORDER BY sort_order ASC, description ASC`,
    vals,
  )
  return r.rows
}

export async function findExtraTimeEntryDescriptionById(
  pool: pg.Pool,
  id: string,
): Promise<ExtraTimeEntryDescriptionRow | null> {
  const r = await pool.query<ExtraTimeEntryDescriptionRow>(
    `SELECT id, description, normalized_description, internal_note, sort_order,
            is_active, created_at, updated_at, deleted_at
     FROM operational_extra_time_entry_descriptions
     WHERE id = $1::uuid
       AND deleted_at IS NULL`,
    [id],
  )
  return r.rows[0] ?? null
}

export async function findByNormalizedDescription(
  pool: pg.Pool,
  normalizedDescription: string,
  excludeId?: string,
): Promise<ExtraTimeEntryDescriptionRow | null> {
  const r = await pool.query<ExtraTimeEntryDescriptionRow>(
    excludeId
      ? `SELECT id, description, normalized_description, internal_note, sort_order,
                is_active, created_at, updated_at, deleted_at
         FROM operational_extra_time_entry_descriptions
         WHERE normalized_description = $1
           AND deleted_at IS NULL
           AND id <> $2::uuid
         LIMIT 1`
      : `SELECT id, description, normalized_description, internal_note, sort_order,
                is_active, created_at, updated_at, deleted_at
         FROM operational_extra_time_entry_descriptions
         WHERE normalized_description = $1
           AND deleted_at IS NULL
         LIMIT 1`,
    excludeId ? [normalizedDescription, excludeId] : [normalizedDescription],
  )
  return r.rows[0] ?? null
}

export async function insertExtraTimeEntryDescription(
  pool: pg.Pool,
  input: {
    description: string
    normalizedDescription: string
    internalNote: string | null
    sortOrder: number
    isActive: boolean
  },
): Promise<ExtraTimeEntryDescriptionRow> {
  const r = await pool.query<ExtraTimeEntryDescriptionRow>(
    `INSERT INTO operational_extra_time_entry_descriptions (
       description,
       normalized_description,
       internal_note,
       sort_order,
       is_active
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING id, description, normalized_description, internal_note, sort_order,
               is_active, created_at, updated_at, deleted_at`,
    [
      input.description,
      input.normalizedDescription,
      input.internalNote,
      input.sortOrder,
      input.isActive,
    ],
  )
  const row = r.rows[0]
  if (!row) throw new Error('insert extra time entry description failed')
  return row
}

export async function updateExtraTimeEntryDescription(
  pool: pg.Pool,
  id: string,
  patch: {
    description?: string
    normalizedDescription?: string
    internalNote?: string | null
    sortOrder?: number
    isActive?: boolean
  },
): Promise<ExtraTimeEntryDescriptionRow | null> {
  const sets: string[] = ['updated_at = now()']
  const vals: unknown[] = []
  let n = 1

  if (patch.description !== undefined) {
    sets.push(`description = $${n}`)
    vals.push(patch.description)
    n += 1
  }
  if (patch.normalizedDescription !== undefined) {
    sets.push(`normalized_description = $${n}`)
    vals.push(patch.normalizedDescription)
    n += 1
  }
  if (patch.internalNote !== undefined) {
    sets.push(`internal_note = $${n}`)
    vals.push(patch.internalNote)
    n += 1
  }
  if (patch.sortOrder !== undefined) {
    sets.push(`sort_order = $${n}`)
    vals.push(patch.sortOrder)
    n += 1
  }
  if (patch.isActive !== undefined) {
    sets.push(`is_active = $${n}`)
    vals.push(patch.isActive)
    n += 1
  }

  vals.push(id)
  const r = await pool.query<ExtraTimeEntryDescriptionRow>(
    `UPDATE operational_extra_time_entry_descriptions
     SET ${sets.join(', ')}
     WHERE id = $${n}::uuid
       AND deleted_at IS NULL
     RETURNING id, description, normalized_description, internal_note, sort_order,
               is_active, created_at, updated_at, deleted_at`,
    vals,
  )
  return r.rows[0] ?? null
}

export async function softDeleteExtraTimeEntryDescription(
  pool: pg.Pool,
  id: string,
): Promise<boolean> {
  const r = await pool.query(
    `UPDATE operational_extra_time_entry_descriptions
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1::uuid
       AND deleted_at IS NULL`,
    [id],
  )
  return (r.rowCount ?? 0) > 0
}
