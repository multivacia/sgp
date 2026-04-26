import type {
  Team,
  TeamCreateInput,
  TeamMember,
  TeamMemberCreateInput,
  TeamMemberUpdateInput,
  TeamUpdateInput,
} from './team.types'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function teamFromApiJson(raw: unknown): Team {
  if (!isRecord(raw)) {
    throw new Error('Resposta inválida: equipe.')
  }
  const activeMemberCount = raw.activeMemberCount
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    description:
      raw.description === undefined || raw.description === null
        ? null
        : String(raw.description),
    isActive: Boolean(raw.isActive),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    activeMemberCount:
      typeof activeMemberCount === 'number' ? activeMemberCount : undefined,
  }
}

export function teamMemberFromApiJson(raw: unknown): TeamMember {
  if (!isRecord(raw)) {
    throw new Error('Resposta inválida: membro da equipe.')
  }
  return {
    id: String(raw.id ?? ''),
    teamId: String(raw.teamId ?? ''),
    collaboratorId: String(raw.collaboratorId ?? ''),
    collaboratorFullName: String(raw.collaboratorFullName ?? ''),
    collaboratorEmail:
      raw.collaboratorEmail === undefined || raw.collaboratorEmail === null
        ? null
        : String(raw.collaboratorEmail),
    collaboratorStatus: String(raw.collaboratorStatus ?? ''),
    collaboratorIsActive: Boolean(raw.collaboratorIsActive),
    collaboratorDeletedAt:
      raw.collaboratorDeletedAt === undefined || raw.collaboratorDeletedAt === null
        ? null
        : String(raw.collaboratorDeletedAt),
    role: raw.role === undefined || raw.role === null ? null : String(raw.role),
    isPrimary: Boolean(raw.isPrimary),
    isActive: Boolean(raw.isActive),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  }
}

export function teamCreateToApiBody(input: TeamCreateInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
  }
  if (input.description !== undefined) body.description = input.description
  if (input.isActive !== undefined) body.isActive = input.isActive
  return body
}

export function teamUpdateToApiBody(input: TeamUpdateInput): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (input.name !== undefined) body.name = input.name.trim()
  if (input.description !== undefined) body.description = input.description
  if (input.isActive !== undefined) body.isActive = input.isActive
  return body
}

export function teamMemberCreateToApiBody(
  input: TeamMemberCreateInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    collaboratorId: input.collaboratorId,
  }
  if (input.role !== undefined) body.role = input.role
  if (input.isPrimary !== undefined) body.isPrimary = input.isPrimary
  return body
}

export function teamMemberUpdateToApiBody(
  input: TeamMemberUpdateInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (input.role !== undefined) body.role = input.role
  if (input.isPrimary !== undefined) body.isPrimary = input.isPrimary
  if (input.isActive !== undefined) body.isActive = input.isActive
  return body
}
