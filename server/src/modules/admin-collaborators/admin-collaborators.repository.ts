import type pg from 'pg'
import type {
  AdminCollaboratorListItem,
  AdminCollaboratorListRow,
} from './admin-collaborators.dto.js'
import { rowToAdminCollaboratorListItem } from './admin-collaborators.dto.js'
import type { ListAdminCollaboratorsQuery } from './admin-collaborators.schemas.js'

const baseFrom = `
  FROM collaborators c
  LEFT JOIN sectors s ON s.id = c.sector_id
  LEFT JOIN app_roles r ON r.id = c.role_id
  LEFT JOIN app_users au ON au.collaborator_id = c.id AND au.deleted_at IS NULL
`

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
    c.deleted_at,
    c.created_at,
    c.updated_at,
    s.name AS sector_name,
    r.name AS role_name,
    au.id::text AS linked_user_id,
    au.email AS linked_user_email
`

export function buildAdminListWhere(
  filters: Pick<
    ListAdminCollaboratorsQuery,
    'search' | 'sector_id' | 'role_id' | 'status' | 'linked_user' | 'deleted'
  >,
): { sql: string; values: unknown[] } {
  const parts: string[] = []
  const values: unknown[] = []
  let n = 1

  const del = filters.deleted ?? 'exclude'
  if (del === 'exclude') {
    parts.push('c.deleted_at IS NULL')
  } else if (del === 'only') {
    parts.push('c.deleted_at IS NOT NULL')
  }

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

  const roleF = filters.role_id?.trim()
  if (roleF) {
    parts.push(`c.role_id = $${n}::uuid`)
    values.push(roleF)
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

  const linked = filters.linked_user ?? 'all'
  if (linked === 'linked') {
    parts.push('au.id IS NOT NULL')
  } else if (linked === 'unlinked') {
    parts.push('au.id IS NULL')
  }

  if (parts.length === 0) {
    return { sql: 'TRUE', values: [] }
  }
  return { sql: parts.join(' AND '), values }
}

export async function countAdminCollaborators(
  pool: pg.Pool,
  filters: ListAdminCollaboratorsQuery,
): Promise<number> {
  const { sql, values } = buildAdminListWhere(filters)
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c ${baseFrom} WHERE ${sql}`,
    values,
  )
  return Number(r.rows[0]?.c ?? 0)
}

export async function listAdminCollaborators(
  pool: pg.Pool,
  filters: ListAdminCollaboratorsQuery,
): Promise<AdminCollaboratorListItem[]> {
  const { sql, values } = buildAdminListWhere(filters)
  const lim = filters.limit
  const off = filters.offset
  const q = `
    ${baseSelect}
    ${baseFrom}
    WHERE ${sql}
    ORDER BY lower(btrim(c.full_name)) ASC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `
  const r = await pool.query<AdminCollaboratorListRow>(q, [...values, lim, off])
  return r.rows.map(rowToAdminCollaboratorListItem)
}

export async function findAdminCollaboratorById(
  pool: pg.Pool,
  id: string,
): Promise<AdminCollaboratorListItem | null> {
  const r = await pool.query<AdminCollaboratorListRow>(
    `${baseSelect} ${baseFrom} WHERE c.id = $1::uuid`,
    [id],
  )
  const row = r.rows[0]
  return row ? rowToAdminCollaboratorListItem(row) : null
}

export async function softDeleteCollaborator(
  pool: pg.Pool,
  id: string,
): Promise<AdminCollaboratorListItem | null> {
  const r = await pool.query(
    `UPDATE collaborators
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1::uuid AND deleted_at IS NULL
     RETURNING id`,
    [id],
  )
  if (r.rowCount === 0) return null
  return findAdminCollaboratorById(pool, id)
}

export async function restoreCollaborator(
  pool: pg.Pool,
  id: string,
): Promise<AdminCollaboratorListItem | null> {
  const r = await pool.query(
    `UPDATE collaborators
     SET deleted_at = NULL, updated_at = now()
     WHERE id = $1::uuid AND deleted_at IS NOT NULL
     RETURNING id`,
    [id],
  )
  if (r.rowCount === 0) return null
  return findAdminCollaboratorById(pool, id)
}
