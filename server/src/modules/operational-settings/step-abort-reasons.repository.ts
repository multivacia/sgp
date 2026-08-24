import type pg from 'pg'

export type StepAbortReasonRow = {
  code: string
  label: string
  description: string | null
  requires_complement: boolean
  sort_order: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

const SELECT_COLS = `code, label, description, requires_complement, sort_order, is_active, created_at, updated_at`

export async function listStepAbortReasons(
  pool: pg.Pool,
  input: { q?: string; status: 'active' | 'inactive' | 'all' },
): Promise<StepAbortReasonRow[]> {
  const where: string[] = ['1=1']
  const vals: unknown[] = []
  let n = 1

  if (input.status === 'active') where.push('is_active = true')
  if (input.status === 'inactive') where.push('is_active = false')
  if (input.q) {
    where.push(`(code ILIKE $${n} OR label ILIKE $${n})`)
    vals.push(`%${input.q}%`)
    n += 1
  }

  const r = await pool.query<StepAbortReasonRow>(
    `SELECT ${SELECT_COLS}
     FROM conveyor_step_abort_reasons
     WHERE ${where.join(' AND ')}
     ORDER BY sort_order ASC, label ASC`,
    vals,
  )
  return r.rows
}

export async function listActiveStepAbortReasonsForSelection(
  pool: pg.Pool | pg.PoolClient,
): Promise<StepAbortReasonRow[]> {
  const r = await pool.query<StepAbortReasonRow>(
    `SELECT ${SELECT_COLS}
     FROM conveyor_step_abort_reasons
     WHERE is_active = true
     ORDER BY sort_order ASC, label ASC`,
  )
  return r.rows
}

export async function findStepAbortReasonByCode(
  pool: pg.Pool | pg.PoolClient,
  code: string,
): Promise<StepAbortReasonRow | null> {
  const r = await pool.query<StepAbortReasonRow>(
    `SELECT ${SELECT_COLS}
     FROM conveyor_step_abort_reasons
     WHERE code = $1::varchar`,
    [code],
  )
  return r.rows[0] ?? null
}

export async function findActiveStepAbortReasonByCode(
  pool: pg.Pool | pg.PoolClient,
  code: string,
): Promise<StepAbortReasonRow | null> {
  const r = await pool.query<StepAbortReasonRow>(
    `SELECT ${SELECT_COLS}
     FROM conveyor_step_abort_reasons
     WHERE code = $1::varchar
       AND is_active = true`,
    [code],
  )
  return r.rows[0] ?? null
}

export async function insertStepAbortReason(
  pool: pg.Pool,
  input: {
    code: string
    label: string
    description: string | null
    requiresComplement: boolean
    sortOrder: number
    isActive: boolean
  },
): Promise<StepAbortReasonRow> {
  const r = await pool.query<StepAbortReasonRow>(
    `INSERT INTO conveyor_step_abort_reasons (
       code, label, description, requires_complement, sort_order, is_active
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${SELECT_COLS}`,
    [
      input.code,
      input.label,
      input.description,
      input.requiresComplement,
      input.sortOrder,
      input.isActive,
    ],
  )
  const row = r.rows[0]
  if (!row) throw new Error('insert step abort reason failed')
  return row
}

export async function updateStepAbortReason(
  pool: pg.Pool,
  code: string,
  patch: {
    label?: string
    description?: string | null
    requiresComplement?: boolean
    sortOrder?: number
    isActive?: boolean
  },
): Promise<StepAbortReasonRow | null> {
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
  if (patch.requiresComplement !== undefined) {
    sets.push(`requires_complement = $${n}`)
    vals.push(patch.requiresComplement)
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

  vals.push(code)
  const r = await pool.query<StepAbortReasonRow>(
    `UPDATE conveyor_step_abort_reasons
     SET ${sets.join(', ')}
     WHERE code = $${n}::varchar
     RETURNING ${SELECT_COLS}`,
    vals,
  )
  return r.rows[0] ?? null
}
