import type pg from 'pg'

export type TimeEntryJustificationRow = {
  id: string
  label: string
  description: string | null
  category: string | null
  requires_complement: boolean
  usage_scope: string | null
  is_active: boolean
  sort_order: number
  created_at: Date
  updated_at: Date
}

export async function listTimeEntryJustifications(
  pool: pg.Pool,
  input: { q?: string; status: 'active' | 'inactive' | 'all' },
): Promise<TimeEntryJustificationRow[]> {
  const where: string[] = ['1=1']
  const vals: unknown[] = []
  let n = 1

  if (input.status === 'active') where.push('is_active = true')
  if (input.status === 'inactive') where.push('is_active = false')
  if (input.q) {
    where.push(`label ILIKE $${n}`)
    vals.push(`%${input.q}%`)
    n += 1
  }

  const r = await pool.query<TimeEntryJustificationRow>(
    `SELECT id, label, description, category, requires_complement, usage_scope,
            is_active, sort_order, created_at, updated_at
     FROM operational_time_entry_justifications
     WHERE ${where.join(' AND ')}
     ORDER BY sort_order ASC, label ASC`,
    vals,
  )
  return r.rows
}

export async function findActiveTimeEntryJustificationById(
  pool: pg.Pool,
  id: string,
): Promise<TimeEntryJustificationRow | null> {
  const r = await pool.query<TimeEntryJustificationRow>(
    `SELECT id, label, description, category, requires_complement, usage_scope,
            is_active, sort_order, created_at, updated_at
     FROM operational_time_entry_justifications
     WHERE id = $1::uuid
       AND is_active = true`,
    [id],
  )
  return r.rows[0] ?? null
}

export async function findTimeEntryJustificationById(
  pool: pg.Pool,
  id: string,
): Promise<TimeEntryJustificationRow | null> {
  const r = await pool.query<TimeEntryJustificationRow>(
    `SELECT id, label, description, category, requires_complement, usage_scope,
            is_active, sort_order, created_at, updated_at
     FROM operational_time_entry_justifications
     WHERE id = $1::uuid`,
    [id],
  )
  return r.rows[0] ?? null
}

export async function findByNormalizedLabel(
  pool: pg.Pool,
  normalizedLabel: string,
  excludeId?: string,
): Promise<TimeEntryJustificationRow | null> {
  const r = await pool.query<TimeEntryJustificationRow>(
    excludeId
      ? `SELECT id, label, description, category, requires_complement, usage_scope,
                is_active, sort_order, created_at, updated_at
         FROM operational_time_entry_justifications
         WHERE lower(trim(label)) = $1
           AND id <> $2::uuid
         LIMIT 1`
      : `SELECT id, label, description, category, requires_complement, usage_scope,
                is_active, sort_order, created_at, updated_at
         FROM operational_time_entry_justifications
         WHERE lower(trim(label)) = $1
         LIMIT 1`,
    excludeId ? [normalizedLabel, excludeId] : [normalizedLabel],
  )
  return r.rows[0] ?? null
}

export async function insertTimeEntryJustification(
  pool: pg.Pool,
  input: {
    label: string
    description: string | null
    category: string | null
    requiresComplement: boolean
    usageScope: string | null
    sortOrder: number
    isActive: boolean
  },
): Promise<TimeEntryJustificationRow> {
  const r = await pool.query<TimeEntryJustificationRow>(
    `INSERT INTO operational_time_entry_justifications (
       label, description, category, requires_complement, usage_scope, sort_order, is_active
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, label, description, category, requires_complement, usage_scope,
               is_active, sort_order, created_at, updated_at`,
    [
      input.label,
      input.description,
      input.category,
      input.requiresComplement,
      input.usageScope,
      input.sortOrder,
      input.isActive,
    ],
  )
  const row = r.rows[0]
  if (!row) throw new Error('insert time entry justification failed')
  return row
}

export async function updateTimeEntryJustification(
  pool: pg.Pool,
  id: string,
  patch: {
    label?: string
    description?: string | null
    category?: string | null
    requiresComplement?: boolean
    usageScope?: string | null
    sortOrder?: number
    isActive?: boolean
  },
): Promise<TimeEntryJustificationRow | null> {
  const sets: string[] = ['updated_at = now()']
  const vals: unknown[] = []
  let n = 1

  if (patch.label !== undefined) {
    sets.push(`label = $${n}`)
    vals.push(patch.label)
    n += 1
  }
  if (patch.description !== undefined) {
    sets.push(`description = $${n}`)
    vals.push(patch.description)
    n += 1
  }
  if (patch.category !== undefined) {
    sets.push(`category = $${n}`)
    vals.push(patch.category)
    n += 1
  }
  if (patch.requiresComplement !== undefined) {
    sets.push(`requires_complement = $${n}`)
    vals.push(patch.requiresComplement)
    n += 1
  }
  if (patch.usageScope !== undefined) {
    sets.push(`usage_scope = $${n}`)
    vals.push(patch.usageScope)
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
  const r = await pool.query<TimeEntryJustificationRow>(
    `UPDATE operational_time_entry_justifications
     SET ${sets.join(', ')}
     WHERE id = $${n}::uuid
     RETURNING id, label, description, category, requires_complement, usage_scope,
               is_active, sort_order, created_at, updated_at`,
    vals,
  )
  return r.rows[0] ?? null
}
