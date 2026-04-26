import type pg from 'pg'
import type { CollaboratorApi, CollaboratorRow } from './collaborators.dto.js'
import { rowToCollaboratorApi } from './collaborators.dto.js'

const baseSelect = `
  SELECT
    c.id,
    c.code,
    c.registration_code,
    c.nickname,
    c.full_name,
    c.email,
    c.phone,
    c.job_title,
    c.avatar_url,
    c.sector_id,
    c.role_id,
    c.status,
    c.is_active,
    c.notes,
    c.created_at,
    c.updated_at,
    s.name AS sector_name,
    r.name AS role_name
  FROM collaborators c
  LEFT JOIN sectors s ON s.id = c.sector_id
  LEFT JOIN app_roles r ON r.id = c.role_id
`

export type ListFilters = {
  status?: string
  sector_id?: string
  search?: string
}

function buildWhere(filters: ListFilters): { sql: string; values: unknown[] } {
  const parts: string[] = ['c.deleted_at IS NULL']
  const values: unknown[] = []
  let n = 1

  const st = filters.status?.trim()?.toUpperCase()
  if (st === 'ACTIVE' || st === 'INACTIVE') {
    parts.push(`c.status = $${n}`)
    values.push(st)
    n += 1
  }

  const sid = filters.sector_id?.trim()
  if (sid && sid.toUpperCase() !== 'ALL') {
    parts.push(`c.sector_id = $${n}::uuid`)
    values.push(sid)
    n += 1
  }

  const q = filters.search?.trim()
  if (q) {
    parts.push(
      `(
        c.full_name ILIKE $${n} OR
        COALESCE(c.code,'') ILIKE $${n} OR
        COALESCE(c.email,'') ILIKE $${n} OR
        COALESCE(c.nickname,'') ILIKE $${n} OR
        COALESCE(c.registration_code,'') ILIKE $${n} OR
        COALESCE(c.job_title,'') ILIKE $${n} OR
        COALESCE(s.name,'') ILIKE $${n} OR
        COALESCE(r.name,'') ILIKE $${n}
      )`,
    )
    values.push(`%${q}%`)
    n += 1
  }

  return { sql: parts.join(' AND '), values }
}

const countFrom = `
  FROM collaborators c
  LEFT JOIN sectors s ON s.id = c.sector_id
  LEFT JOIN app_roles r ON r.id = c.role_id
`

export async function countCollaborators(
  pool: pg.Pool,
  filters: ListFilters,
): Promise<number> {
  const { sql, values } = buildWhere(filters)
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c ${countFrom} WHERE ${sql}`,
    values,
  )
  return Number(r.rows[0]?.c ?? 0)
}

export async function listCollaborators(
  pool: pg.Pool,
  filters: ListFilters,
): Promise<CollaboratorApi[]> {
  const { sql, values } = buildWhere(filters)
  const r = await pool.query<CollaboratorRow>(
    `${baseSelect} WHERE ${sql} ORDER BY c.full_name ASC`,
    values,
  )
  return r.rows.map(rowToCollaboratorApi)
}

export async function findCollaboratorById(
  pool: pg.Pool,
  id: string,
): Promise<CollaboratorApi | null> {
  const r = await pool.query<CollaboratorRow>(
    `${baseSelect} WHERE c.id = $1::uuid AND c.deleted_at IS NULL`,
    [id],
  )
  const row = r.rows[0]
  return row ? rowToCollaboratorApi(row) : null
}

export type InsertInput = {
  full_name: string
  code?: string | null
  registration_code?: string | null
  nickname?: string | null
  email?: string | null
  phone?: string | null
  job_title?: string | null
  avatar_url?: string | null
  sector_id?: string | null
  role_id?: string | null
  notes?: string | null
  status?: string
}

export async function insertCollaborator(
  pool: pg.Pool,
  input: InsertInput,
): Promise<CollaboratorApi> {
  const status = input.status ?? 'ACTIVE'
  const r = await pool.query<{ id: string }>(
    `INSERT INTO collaborators (
      full_name, code, registration_code, nickname, email, phone, job_title,
      avatar_url, sector_id, role_id, notes, status, is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    ) RETURNING id`,
    [
      input.full_name,
      input.code ?? null,
      input.registration_code ?? null,
      input.nickname ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.job_title ?? null,
      input.avatar_url ?? null,
      input.sector_id ?? null,
      input.role_id ?? null,
      input.notes ?? null,
      status,
      status === 'ACTIVE',
    ],
  )
  const id = r.rows[0]?.id
  if (!id) throw new Error('insert failed')
  const found = await findCollaboratorById(pool, id)
  if (!found) throw new Error('insert fetch failed')
  return found
}

export type PatchInput = Partial<InsertInput>

export async function updateCollaborator(
  pool: pg.Pool,
  id: string,
  patch: PatchInput,
): Promise<CollaboratorApi | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let n = 1

  const push = (col: string, val: unknown) => {
    sets.push(`${col} = $${n}`)
    values.push(val)
    n += 1
  }

  if (patch.full_name !== undefined) push('full_name', patch.full_name)
  if (patch.code !== undefined) push('code', patch.code)
  if (patch.registration_code !== undefined) {
    push('registration_code', patch.registration_code)
  }
  if (patch.nickname !== undefined) push('nickname', patch.nickname)
  if (patch.email !== undefined) push('email', patch.email)
  if (patch.phone !== undefined) push('phone', patch.phone)
  if (patch.job_title !== undefined) push('job_title', patch.job_title)
  if (patch.avatar_url !== undefined) push('avatar_url', patch.avatar_url)
  if (patch.sector_id !== undefined) push('sector_id', patch.sector_id)
  if (patch.role_id !== undefined) push('role_id', patch.role_id)
  if (patch.notes !== undefined) push('notes', patch.notes)
  if (patch.status !== undefined) {
    push('status', patch.status)
    push('is_active', patch.status === 'ACTIVE')
  }

  if (sets.length === 0) {
    return findCollaboratorById(pool, id)
  }

  sets.push(`updated_at = now()`)
  values.push(id)
  const idParam = `$${values.length}`

  const q = `
    UPDATE collaborators
    SET ${sets.join(', ')}
    WHERE id = ${idParam}::uuid AND deleted_at IS NULL
    RETURNING id
  `
  const r = await pool.query(q, values)
  if (r.rowCount === 0) return null
  return findCollaboratorById(pool, id)
}

export async function setCollaboratorStatus(
  pool: pg.Pool,
  id: string,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<CollaboratorApi | null> {
  const r = await pool.query(
    `UPDATE collaborators
     SET status = $2::varchar,
         is_active = ($2::varchar = 'ACTIVE'),
         updated_at = now()
     WHERE id = $1::uuid AND deleted_at IS NULL
     RETURNING id`,
    [id, status],
  )
  if (r.rowCount === 0) return null
  return findCollaboratorById(pool, id)
}
