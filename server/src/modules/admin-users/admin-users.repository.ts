import type { DbExecutor } from '../../shared/db/dbExecutor.js'
import type { AdminUserListItem, EligibleCollaboratorOption } from './admin-users.types.js'

export type AdminUserListFilters = {
  search?: string
  roleId?: string
  limit: number
  offset: number
}

type ListRow = {
  id: string
  email: string
  role_id: string | null
  role_code: string | null
  role_name: string | null
  collaborator_id: string | null
  collaborator_full_name: string | null
  display_name: string
  is_active: boolean
  avatar_url: string | null
  last_login_at: Date | null
  must_change_password: boolean
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

function rowToItem(row: ListRow): AdminUserListItem {
  return {
    id: row.id,
    email: row.email,
    roleId: row.role_id,
    roleCode: row.role_code,
    roleName: row.role_name,
    collaboratorId: row.collaborator_id,
    collaboratorName: row.collaborator_full_name,
    displayName: row.display_name,
    isActive: row.is_active,
    avatarUrl: row.avatar_url,
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    mustChangePassword: row.must_change_password,
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

const listSelect = `
  SELECT
    u.id::text,
    u.email,
    u.role_id::text,
    r.code AS role_code,
    r.name AS role_name,
    u.collaborator_id::text,
    c.full_name AS collaborator_full_name,
    COALESCE(NULLIF(TRIM(BOTH FROM c.full_name), ''), split_part(lower(u.email::text), '@', 1)) AS display_name,
    u.is_active,
    u.avatar_url,
    u.last_login_at,
    u.must_change_password,
    u.deleted_at,
    u.created_at,
    u.updated_at
  FROM app_users u
  LEFT JOIN app_roles r ON r.id = u.role_id
  LEFT JOIN collaborators c ON c.id = u.collaborator_id
`

function buildListWhere(
  filters: AdminUserListFilters,
): { sql: string; values: unknown[] } {
  const parts: string[] = ['1=1']
  const values: unknown[] = []
  let n = 1

  // Padrão fixo da listagem: ocultar removidos logicamente.
  parts.push('u.deleted_at IS NULL')

  const rid = filters.roleId?.trim()
  if (rid) {
    parts.push(`u.role_id = $${n}::uuid`)
    values.push(rid)
    n += 1
  }

  const q = filters.search?.trim()
  if (q) {
    parts.push(
      `(
        u.email ILIKE $${n} OR
        COALESCE(c.full_name, '') ILIKE $${n} OR
        COALESCE(c.nickname, '') ILIKE $${n}
      )`,
    )
    values.push(`%${q}%`)
    n += 1
  }

  return { sql: parts.join(' AND '), values }
}

/**
 * Contas ativas, não apagadas, sem `collaborator_id` (pendência de vínculo operacional).
 */
export async function countActiveUsersWithoutCollaboratorLink(
  db: DbExecutor,
): Promise<number> {
  const r = await db.query<{ c: string }>(
    `
    SELECT COUNT(*)::text AS c
    FROM app_users u
    WHERE u.deleted_at IS NULL
      AND u.is_active = true
      AND u.collaborator_id IS NULL
    `,
  )
  return Number(r.rows[0]?.c ?? 0)
}

export async function countAdminUsers(
  db: DbExecutor,
  filters: AdminUserListFilters,
): Promise<number> {
  const { sql, values } = buildListWhere(filters)
  const r = await db.query<{ c: string }>(
    `
    SELECT COUNT(*)::text AS c
    FROM app_users u
    LEFT JOIN collaborators c ON c.id = u.collaborator_id
    WHERE ${sql}
    `,
    values,
  )
  return Number(r.rows[0]?.c ?? 0)
}

export async function listAdminUsers(
  db: DbExecutor,
  filters: AdminUserListFilters,
): Promise<AdminUserListItem[]> {
  const { sql, values } = buildListWhere(filters)
  const limit = filters.limit
  const offset = filters.offset
  const r = await db.query<ListRow>(
    `
    ${listSelect}
    WHERE ${sql}
    ORDER BY u.deleted_at NULLS FIRST, lower(u.email) ASC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    [...values, limit, offset],
  )
  return r.rows.map(rowToItem)
}

export async function findAdminUserById(
  db: DbExecutor,
  id: string,
): Promise<AdminUserListItem | null> {
  const r = await db.query<ListRow>(
    `${listSelect} WHERE u.id = $1::uuid`,
    [id],
  )
  const row = r.rows[0]
  return row ? rowToItem(row) : null
}

export type InsertAppUserInput = {
  email: string
  password_hash: string
  role_id: string
  collaborator_id: string | null
  avatar_url: string | null
  is_active: boolean
  must_change_password: boolean
  created_by: string
}

export async function insertAppUser(
  db: DbExecutor,
  input: InsertAppUserInput,
): Promise<string> {
  const r = await db.query<{ id: string }>(
    `
    INSERT INTO app_users (
      email,
      password_hash,
      role_id,
      collaborator_id,
      avatar_url,
      is_active,
      must_change_password,
      password_changed_at,
      created_by,
      updated_by
    )
    VALUES (
      lower(btrim($1::text)),
      $2,
      $3::uuid,
      $4::uuid,
      $5,
      $6,
      $7,
      CASE WHEN $7 THEN NULL ELSE now() END,
      $8::uuid,
      $8::uuid
    )
    RETURNING id::text
    `,
    [
      input.email,
      input.password_hash,
      input.role_id,
      input.collaborator_id,
      input.avatar_url,
      input.is_active,
      input.must_change_password,
      input.created_by,
    ],
  )
  return r.rows[0]!.id
}

export type PatchAppUserInput = {
  email?: string
  role_id?: string | null
  collaborator_id?: string | null
  avatar_url?: string | null
  is_active?: boolean
  must_change_password?: boolean
  updated_by: string
}

export async function patchAppUser(
  db: DbExecutor,
  id: string,
  patch: PatchAppUserInput,
): Promise<boolean> {
  const sets: string[] = ['updated_at = now()', `updated_by = $1::uuid`]
  const vals: unknown[] = [patch.updated_by]
  let n = 2

  if (patch.email !== undefined) {
    sets.push(`email = lower(btrim($${n}::text))`)
    vals.push(patch.email)
    n += 1
  }
  if (patch.role_id !== undefined) {
    if (patch.role_id === null) {
      sets.push('role_id = NULL')
    } else {
      sets.push(`role_id = $${n}::uuid`)
      vals.push(patch.role_id)
      n += 1
    }
  }
  if (patch.collaborator_id !== undefined) {
    if (patch.collaborator_id === null) {
      sets.push('collaborator_id = NULL')
    } else {
      sets.push(`collaborator_id = $${n}::uuid`)
      vals.push(patch.collaborator_id)
      n += 1
    }
  }
  if (patch.avatar_url !== undefined) {
    sets.push(`avatar_url = $${n}`)
    vals.push(patch.avatar_url)
    n += 1
  }
  if (patch.is_active !== undefined) {
    sets.push(`is_active = $${n}`)
    vals.push(patch.is_active)
    n += 1
  }
  if (patch.must_change_password !== undefined) {
    sets.push(`must_change_password = $${n}`)
    vals.push(patch.must_change_password)
    n += 1
  }

  const r = await db.query(
    `
    UPDATE app_users
    SET ${sets.join(', ')}
    WHERE id = $${n}::uuid
    `,
    [...vals, id],
  )
  return (r.rowCount ?? 0) > 0
}

export async function setUserActive(
  db: DbExecutor,
  id: string,
  isActive: boolean,
  updatedBy: string,
): Promise<boolean> {
  const r = await db.query(
    `
    UPDATE app_users
    SET is_active = $2, updated_at = now(), updated_by = $3::uuid
    WHERE id = $1::uuid AND deleted_at IS NULL
    `,
    [id, isActive, updatedBy],
  )
  return (r.rowCount ?? 0) > 0
}

export async function softDeleteUser(
  db: DbExecutor,
  id: string,
  updatedBy: string,
): Promise<boolean> {
  const r = await db.query(
    `
    UPDATE app_users
    SET
      deleted_at = now(),
      is_active = false,
      updated_at = now(),
      updated_by = $2::uuid
    WHERE id = $1::uuid AND deleted_at IS NULL
    `,
    [id, updatedBy],
  )
  return (r.rowCount ?? 0) > 0
}

export async function restoreUser(
  db: DbExecutor,
  id: string,
  updatedBy: string,
): Promise<boolean> {
  const r = await db.query(
    `
    UPDATE app_users
    SET
      deleted_at = NULL,
      updated_at = now(),
      updated_by = $2::uuid
    WHERE id = $1::uuid AND deleted_at IS NOT NULL
    `,
    [id, updatedBy],
  )
  return (r.rowCount ?? 0) > 0
}

export async function setForcePasswordChange(
  db: DbExecutor,
  id: string,
  updatedBy: string,
): Promise<boolean> {
  const r = await db.query(
    `
    UPDATE app_users
    SET must_change_password = true, updated_at = now(), updated_by = $2::uuid
    WHERE id = $1::uuid AND deleted_at IS NULL
    `,
    [id, updatedBy],
  )
  return (r.rowCount ?? 0) > 0
}

/** Redefine hash, obriga troca no próximo acesso e limpa bloqueio por tentativas. */
export async function resetAdminUserPasswordHash(
  db: DbExecutor,
  id: string,
  passwordHash: string,
  updatedBy: string,
): Promise<boolean> {
  const r = await db.query(
    `
    UPDATE app_users
    SET
      password_hash = $2,
      password_changed_at = now(),
      must_change_password = true,
      failed_login_count = 0,
      locked_until = NULL,
      updated_at = now(),
      updated_by = $3::uuid
    WHERE id = $1::uuid AND deleted_at IS NULL
    `,
    [id, passwordHash, updatedBy],
  )
  return (r.rowCount ?? 0) > 0
}

/**
 * Senha definida explicitamente pelo administrador (formulário).
 * Não força troca no próximo acesso; limpa bloqueio por tentativas.
 */
export async function setAppUserPasswordExplicit(
  db: DbExecutor,
  id: string,
  passwordHash: string,
  updatedBy: string,
): Promise<boolean> {
  const r = await db.query(
    `
    UPDATE app_users
    SET
      password_hash = $2,
      password_changed_at = now(),
      must_change_password = false,
      failed_login_count = 0,
      locked_until = NULL,
      updated_at = now(),
      updated_by = $3::uuid
    WHERE id = $1::uuid AND deleted_at IS NULL
    `,
    [id, passwordHash, updatedBy],
  )
  return (r.rowCount ?? 0) > 0
}

export async function assertCollaboratorEligibleForLink(
  db: DbExecutor,
  collaboratorId: string,
  excludeUserId: string | null,
): Promise<boolean> {
  const r = await db.query<{ ok: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM collaborators c
      WHERE c.id = $1::uuid
        AND c.deleted_at IS NULL
        AND c.status = 'ACTIVE'
        AND c.is_active = true
    ) AS ok
    `,
    [collaboratorId],
  )
  if (!r.rows[0]?.ok) return false

  const taken = await db.query<{ n: string }>(
    `
    SELECT u.id::text AS n
    FROM app_users u
    WHERE u.collaborator_id = $1::uuid
      AND ($2::uuid IS NULL OR u.id <> $2::uuid)
    LIMIT 1
    `,
    [collaboratorId, excludeUserId],
  )
  return taken.rows.length === 0
}

export async function listEligibleCollaboratorsForLink(
  db: DbExecutor,
  excludeUserId: string | null,
): Promise<EligibleCollaboratorOption[]> {
  const r = await db.query<{
    id: string
    full_name: string
    email: string | null
    code: string | null
  }>(
    `
    SELECT
      c.id::text,
      c.full_name,
      c.email,
      c.code
    FROM collaborators c
    WHERE c.deleted_at IS NULL
      AND c.status = 'ACTIVE'
      AND c.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM app_users u
        WHERE u.collaborator_id = c.id
          AND ($1::uuid IS NULL OR u.id <> $1::uuid)
      )
    ORDER BY c.full_name ASC
    `,
    [excludeUserId],
  )
  return r.rows.map((x) => ({
    id: x.id,
    fullName: x.full_name,
    email: x.email,
    code: x.code,
  }))
}

export async function roleExists(db: DbExecutor, roleId: string): Promise<boolean> {
  const r = await db.query<{ ok: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM app_roles WHERE id = $1::uuid) AS ok`,
    [roleId],
  )
  return r.rows[0]?.ok === true
}
