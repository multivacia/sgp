import type pg from 'pg'

type DbClient = pg.Pool | pg.PoolClient
import type { ListTeamsQuery } from './teams.schemas.js'
import type { TeamListRow, TeamMemberRow, TeamRow } from './teams.dto.js'

const TEAM_MEMBER_SELECT = `
      tm.id,
      tm.team_id,
      tm.collaborator_id,
      tm.role,
      tm.is_primary,
      tm.suggestion_order,
      tm.is_active,
      tm.created_at,
      tm.updated_at,
      c.full_name AS collaborator_full_name,
      c.code AS collaborator_code,
      c.email AS collaborator_email,
      c.status AS collaborator_status,
      c.is_active AS collaborator_is_active,
      c.deleted_at AS collaborator_deleted_at
`

const TEAM_MEMBER_ORDER_BY = `
    ORDER BY tm.is_primary DESC,
             tm.suggestion_order ASC,
             CASE WHEN NULLIF(BTRIM(COALESCE(c.code, '')), '') IS NULL THEN 1 ELSE 0 END,
             c.code ASC NULLS LAST,
             c.id ASC
`

export function buildTeamListWhere(q: ListTeamsQuery): {
  sql: string
  values: unknown[]
} {
  const parts: string[] = [`t.deleted_at IS NULL`]
  const values: unknown[] = []
  let n = 1

  if (q.isActiveFilter === 'true') {
    parts.push(`t.is_active = true`)
  } else if (q.isActiveFilter === 'false') {
    parts.push(`t.is_active = false`)
  }

  const search = q.search?.trim()
  if (search) {
    parts.push(`t.name ILIKE $${n}`)
    values.push(`%${search}%`)
    n += 1
  }

  const where = parts.length ? `WHERE ${parts.join(' AND ')}` : ''
  return { sql: where, values }
}

export async function countTeams(pool: pg.Pool, q: ListTeamsQuery): Promise<number> {
  const { sql, values } = buildTeamListWhere(q)
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM teams t ${sql}`,
    values,
  )
  return Number(r.rows[0]?.c ?? 0)
}

export async function listTeams(
  pool: pg.Pool,
  q: ListTeamsQuery,
): Promise<TeamListRow[]> {
  const { sql, values } = buildTeamListWhere(q)
  const limit = q.limit
  const offset = q.offset
  const limIdx = values.length + 1
  const offIdx = values.length + 2
  const r = await pool.query<TeamListRow>(
    `
    SELECT
      t.id,
      t.name,
      t.description,
      t.is_active,
      t.created_at,
      t.updated_at,
      (
        SELECT COUNT(*)::text
        FROM team_members tm
        WHERE tm.team_id = t.id AND tm.is_active = true
      ) AS active_member_count
    FROM teams t
    ${sql}
    ORDER BY t.name ASC
    LIMIT $${limIdx}::int OFFSET $${offIdx}::int
    `,
    [...values, limit, offset],
  )
  return r.rows
}

export async function findTeamById(
  pool: pg.Pool,
  id: string,
): Promise<TeamRow | null> {
  const r = await pool.query<TeamRow>(
    `SELECT id, name, description, is_active, deleted_at, created_at, updated_at
     FROM teams
     WHERE id = $1::uuid AND deleted_at IS NULL`,
    [id],
  )
  return r.rows[0] ?? null
}

export async function insertTeam(
  pool: pg.Pool,
  input: { name: string; description: string | null; is_active: boolean },
): Promise<TeamRow> {
  const r = await pool.query<TeamRow>(
    `
    INSERT INTO teams (name, description, is_active, deleted_at)
    VALUES ($1, $2, $3, NULL)
    RETURNING id, name, description, is_active, deleted_at, created_at, updated_at
    `,
    [input.name, input.description, input.is_active],
  )
  return r.rows[0]!
}

export async function updateTeam(
  pool: pg.Pool,
  id: string,
  patch: { name?: string; description?: string | null; is_active?: boolean },
): Promise<TeamRow | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let n = 1
  if (patch.name !== undefined) {
    sets.push(`name = $${n}`)
    values.push(patch.name)
    n += 1
  }
  if (patch.description !== undefined) {
    sets.push(`description = $${n}`)
    values.push(patch.description)
    n += 1
  }
  if (patch.is_active !== undefined) {
    sets.push(`is_active = $${n}`)
    values.push(patch.is_active)
    n += 1
  }
  if (sets.length === 0) {
    return findTeamById(pool, id)
  }
  sets.push(`updated_at = now()`)
  values.push(id)
  const r = await pool.query<TeamRow>(
    `
    UPDATE teams
    SET ${sets.join(', ')}
    WHERE id = $${n}::uuid AND deleted_at IS NULL
    RETURNING id, name, description, is_active, deleted_at, created_at, updated_at
    `,
    values,
  )
  return r.rows[0] ?? null
}

export async function softDeleteTeam(
  pool: pg.Pool,
  id: string,
): Promise<TeamRow | null> {
  const r = await pool.query<TeamRow>(
    `
    UPDATE teams
    SET deleted_at = now(), updated_at = now()
    WHERE id = $1::uuid AND deleted_at IS NULL
    RETURNING id, name, description, is_active, deleted_at, created_at, updated_at
    `,
    [id],
  )
  return r.rows[0] ?? null
}

export async function listActiveMembersForTeam(
  pool: pg.Pool,
  teamId: string,
): Promise<TeamMemberRow[]> {
  const r = await pool.query<TeamMemberRow>(
    `
    SELECT
      ${TEAM_MEMBER_SELECT}
    FROM team_members tm
    INNER JOIN collaborators c ON c.id = tm.collaborator_id
    WHERE tm.team_id = $1::uuid AND tm.is_active = true
    ${TEAM_MEMBER_ORDER_BY}
    `,
    [teamId],
  )
  return r.rows
}

export async function findMemberById(
  pool: DbClient,
  teamId: string,
  memberId: string,
): Promise<TeamMemberRow | null> {
  const r = await pool.query<TeamMemberRow>(
    `
    SELECT
      ${TEAM_MEMBER_SELECT}
    FROM team_members tm
    INNER JOIN collaborators c ON c.id = tm.collaborator_id
    WHERE tm.team_id = $1::uuid AND tm.id = $2::uuid
    `,
    [teamId, memberId],
  )
  return r.rows[0] ?? null
}

export type CollaboratorEligibilityRow = {
  id: string
  status: string
  is_active: boolean
  deleted_at: Date | null
}

export async function findCollaboratorEligibility(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<CollaboratorEligibilityRow | null> {
  const r = await pool.query<CollaboratorEligibilityRow>(
    `SELECT id, status, is_active, deleted_at FROM collaborators WHERE id = $1::uuid`,
    [collaboratorId],
  )
  return r.rows[0] ?? null
}

export async function clearPrimaryForTeam(
  client: DbClient,
  teamId: string,
  exceptMemberId?: string,
): Promise<void> {
  if (exceptMemberId) {
    await client.query(
      `
      UPDATE team_members
      SET is_primary = false, updated_at = now()
      WHERE team_id = $1::uuid AND is_active = true AND id <> $2::uuid
      `,
      [teamId, exceptMemberId],
    )
  } else {
    await client.query(
      `
      UPDATE team_members
      SET is_primary = false, updated_at = now()
      WHERE team_id = $1::uuid AND is_active = true
      `,
      [teamId],
    )
  }
}

export async function maxSuggestionOrderForTeam(
  client: DbClient,
  teamId: string,
): Promise<number | null> {
  const r = await client.query<{ m: string | null }>(
    `
    SELECT MAX(suggestion_order)::text AS m
    FROM team_members
    WHERE team_id = $1::uuid
    `,
    [teamId],
  )
  const raw = r.rows[0]?.m
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? Math.floor(n) : null
}

export async function insertTeamMember(
  client: DbClient,
  input: {
    team_id: string
    collaborator_id: string
    role: string | null
    is_primary: boolean
    suggestion_order: number
  },
): Promise<TeamMemberRow> {
  const ins = await client.query<{ id: string }>(
    `
    INSERT INTO team_members (team_id, collaborator_id, role, is_primary, is_active, suggestion_order)
    VALUES ($1::uuid, $2::uuid, $3, $4, true, $5)
    RETURNING id
    `,
    [
      input.team_id,
      input.collaborator_id,
      input.role,
      input.is_primary,
      input.suggestion_order,
    ],
  )
  const id = ins.rows[0]!.id
  const r = await client.query<TeamMemberRow>(
    `
    SELECT
      ${TEAM_MEMBER_SELECT}
    FROM team_members tm
    INNER JOIN collaborators c ON c.id = tm.collaborator_id
    WHERE tm.id = $1::uuid
    `,
    [id],
  )
  return r.rows[0]!
}

export async function updateTeamMember(
  pool: DbClient,
  teamId: string,
  memberId: string,
  patch: {
    role?: string | null
    is_primary?: boolean
    is_active?: boolean
    suggestion_order?: number
  },
): Promise<TeamMemberRow | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let n = 1
  if (patch.role !== undefined) {
    sets.push(`role = $${n}`)
    values.push(patch.role)
    n += 1
  }
  if (patch.is_primary !== undefined) {
    sets.push(`is_primary = $${n}`)
    values.push(patch.is_primary)
    n += 1
  }
  if (patch.is_active !== undefined) {
    sets.push(`is_active = $${n}`)
    values.push(patch.is_active)
    n += 1
  }
  if (patch.suggestion_order !== undefined) {
    sets.push(`suggestion_order = $${n}`)
    values.push(patch.suggestion_order)
    n += 1
  }
  if (sets.length === 0) {
    return findMemberById(pool, teamId, memberId)
  }
  sets.push(`updated_at = now()`)
  values.push(teamId, memberId)
  const pTeam = n
  const pMember = n + 1
  await pool.query(
    `
    UPDATE team_members
    SET ${sets.join(', ')}
    WHERE team_id = $${pTeam}::uuid AND id = $${pMember}::uuid
    `,
    values,
  )
  return findMemberById(pool, teamId, memberId)
}

export async function softDeactivateTeamMember(
  pool: pg.Pool,
  teamId: string,
  memberId: string,
): Promise<TeamMemberRow | null> {
  await pool.query(
    `
    UPDATE team_members
    SET is_active = false, is_primary = false, updated_at = now()
    WHERE team_id = $1::uuid AND id = $2::uuid AND is_active = true
    `,
    [teamId, memberId],
  )
  return findMemberById(pool, teamId, memberId)
}
