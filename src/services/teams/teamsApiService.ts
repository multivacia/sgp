import type {
  Team,
  TeamCreateInput,
  TeamListParams,
  TeamMember,
  TeamMemberCreateInput,
  TeamMemberUpdateInput,
  TeamUpdateInput,
} from '../../domain/teams/team.types'
import { ApiError } from '../../lib/api/apiErrors'
import {
  teamCreateToApiBody,
  teamFromApiJson,
  teamMemberCreateToApiBody,
  teamMemberFromApiJson,
  teamMemberUpdateToApiBody,
  teamUpdateToApiBody,
} from '../../domain/teams/team.mappers'
import { fetchAdminEnvelope } from '../admin/adminUsersApiService'

const BASE = '/api/v1'

export async function listTeams(params: TeamListParams): Promise<{
  items: Team[]
  total: number
  limit: number
  offset: number
}> {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.isActive && params.isActive !== 'all') {
    qs.set('is_active', params.isActive)
  }
  if (params.limit !== undefined) qs.set('limit', String(params.limit))
  if (params.offset !== undefined) qs.set('offset', String(params.offset))
  const q = qs.toString()
  const path = `${BASE}/teams${q ? `?${q}` : ''}`
  const { data, meta } = await fetchAdminEnvelope<Team[]>('GET', path)
  const arr = Array.isArray(data) ? data : []
  return {
    items: arr.map((row) => teamFromApiJson(row)),
    total: Number(meta.total ?? 0),
    limit: Number(meta.limit ?? params.limit ?? 50),
    offset: Number(meta.offset ?? params.offset ?? 0),
  }
}

export async function getTeam(id: string): Promise<Team | null> {
  try {
    const { data } = await fetchAdminEnvelope<unknown>(
      'GET',
      `${BASE}/teams/${encodeURIComponent(id)}`,
    )
    return teamFromApiJson(data)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

export async function createTeam(input: TeamCreateInput): Promise<Team> {
  const { data } = await fetchAdminEnvelope<Team>('POST', `${BASE}/teams`, {
    body: teamCreateToApiBody(input),
  })
  return teamFromApiJson(data)
}

export async function patchTeam(id: string, input: TeamUpdateInput): Promise<Team> {
  const { data } = await fetchAdminEnvelope<Team>(
    'PATCH',
    `${BASE}/teams/${encodeURIComponent(id)}`,
    { body: teamUpdateToApiBody(input) },
  )
  return teamFromApiJson(data)
}

export async function deleteTeam(id: string): Promise<Team> {
  const { data } = await fetchAdminEnvelope<Team>(
    'DELETE',
    `${BASE}/teams/${encodeURIComponent(id)}`,
  )
  return teamFromApiJson(data)
}

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data } = await fetchAdminEnvelope<TeamMember[]>(
    'GET',
    `${BASE}/teams/${encodeURIComponent(teamId)}/members`,
  )
  const arr = Array.isArray(data) ? data : []
  return arr.map((row) => teamMemberFromApiJson(row))
}

export async function addTeamMember(
  teamId: string,
  input: TeamMemberCreateInput,
): Promise<TeamMember> {
  const { data } = await fetchAdminEnvelope<TeamMember>(
    'POST',
    `${BASE}/teams/${encodeURIComponent(teamId)}/members`,
    { body: teamMemberCreateToApiBody(input) },
  )
  return teamMemberFromApiJson(data)
}

export async function patchTeamMember(
  teamId: string,
  memberId: string,
  input: TeamMemberUpdateInput,
): Promise<TeamMember> {
  const { data } = await fetchAdminEnvelope<TeamMember>(
    'PATCH',
    `${BASE}/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
    { body: teamMemberUpdateToApiBody(input) },
  )
  return teamMemberFromApiJson(data)
}

export async function removeTeamMember(teamId: string, memberId: string): Promise<TeamMember> {
  const { data } = await fetchAdminEnvelope<TeamMember>(
    'DELETE',
    `${BASE}/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
  )
  return teamMemberFromApiJson(data)
}
