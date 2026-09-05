/**
 * Fatos canônicos e resolvedor de responsável/time efetivo para sugestão
 * no planejamento semanal. Fonte: conveyor_node_assignees + team_members.
 * Nunca consulta a Matriz.
 */

export type PlanningSuggestionMember = {
  id: string
  code: string | null
  fullName: string
  isPrimary: boolean
  suggestionOrder: number
}

export type PlanningSuggestionContext = {
  responsibleCollaboratorId: string | null
  responsibleCollaboratorCode: string | null
  responsibleCollaboratorFullName: string | null
  effectiveTeamId: string | null
  effectiveTeamName: string | null
  members: PlanningSuggestionMember[]
  multipleTeamsAssigned: boolean
}

export type DirectAssigneeFact = {
  id: string
  code: string | null
  fullName: string
  isPrimary: boolean
  orderIndex: number
  createdAt: string
  isEligible: boolean
}

export type TeamAssigneeFact = {
  id: string
  name: string
  isPrimary: boolean
  orderIndex: number
  createdAt: string
  isEligible: boolean
}

export type TeamMemberFact = {
  teamId: string
  id: string
  code: string | null
  fullName: string
  isPrimary: boolean
  suggestionOrder: number
  isEligible: boolean
}

export function isCollaboratorRowEligible(input: {
  deleted_at: Date | string | null | undefined
  is_active: boolean
  status: string | null | undefined
}): boolean {
  if (input.deleted_at != null) return false
  if (!input.is_active) return false
  return String(input.status ?? '').toUpperCase() === 'ACTIVE'
}

export function compareCollaboratorCodeThenId(
  a: { code: string | null; id: string },
  b: { code: string | null; id: string },
): number {
  const ac = (a.code ?? '').trim()
  const bc = (b.code ?? '').trim()
  const aEmpty = ac === ''
  const bEmpty = bc === ''
  if (aEmpty !== bEmpty) return aEmpty ? 1 : -1
  if (!aEmpty && ac !== bc) return ac < bc ? -1 : ac > bc ? 1 : 0
  if (a.id < b.id) return -1
  if (a.id > b.id) return 1
  return 0
}

export function compareAssigneeOrder(
  a: { id: string; isPrimary: boolean; orderIndex: number; createdAt: string },
  b: { id: string; isPrimary: boolean; orderIndex: number; createdAt: string },
): number {
  if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
  if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex
  if (a.createdAt < b.createdAt) return -1
  if (a.createdAt > b.createdAt) return 1
  if (a.id < b.id) return -1
  if (a.id > b.id) return 1
  return 0
}

export function compareTeamMemberSequence(
  a: PlanningSuggestionMember,
  b: PlanningSuggestionMember,
): number {
  if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
  if (!a.isPrimary && !b.isPrimary && a.suggestionOrder !== b.suggestionOrder) {
    return a.suggestionOrder - b.suggestionOrder
  }
  return compareCollaboratorCodeThenId(a, b)
}

export function emptyPlanningSuggestionContext(): PlanningSuggestionContext {
  return {
    responsibleCollaboratorId: null,
    responsibleCollaboratorCode: null,
    responsibleCollaboratorFullName: null,
    effectiveTeamId: null,
    effectiveTeamName: null,
    members: [],
    multipleTeamsAssigned: false,
  }
}

export function buildPlanningSuggestionContext(input: {
  directAssignees: readonly DirectAssigneeFact[]
  teamAssignees: readonly TeamAssigneeFact[]
  membersByTeamId: ReadonlyMap<string, readonly TeamMemberFact[]>
}): PlanningSuggestionContext {
  const eligibleDirect = [...input.directAssignees]
    .filter((a) => a.isEligible)
    .sort(compareAssigneeOrder)

  const eligibleTeams = [...input.teamAssignees]
    .filter((t) => t.isEligible)
    .sort(compareAssigneeOrder)

  const effectiveTeam = eligibleTeams[0] ?? null
  const multipleTeamsAssigned = eligibleTeams.length > 1

  const rawMembers = effectiveTeam
    ? (input.membersByTeamId.get(effectiveTeam.id) ?? [])
    : []
  const members: PlanningSuggestionMember[] = rawMembers
    .filter((m) => m.isEligible && m.teamId === (effectiveTeam?.id ?? ''))
    .map((m) => ({
      id: m.id,
      code: m.code,
      fullName: m.fullName,
      isPrimary: m.isPrimary,
      suggestionOrder: Math.max(1, Math.floor(m.suggestionOrder)),
    }))
    .sort(compareTeamMemberSequence)

  const primaryDirect = eligibleDirect.find((a) => a.isPrimary) ?? null
  const firstDirect = eligibleDirect[0] ?? null
  const teamPrimary = members.find((m) => m.isPrimary) ?? null
  const firstMember = members[0] ?? null

  const responsible =
    primaryDirect ?? firstDirect ?? teamPrimary ?? firstMember ?? null

  return {
    responsibleCollaboratorId: responsible?.id ?? null,
    responsibleCollaboratorCode: responsible?.code ?? null,
    responsibleCollaboratorFullName: responsible?.fullName ?? null,
    effectiveTeamId: effectiveTeam?.id ?? null,
    effectiveTeamName: effectiveTeam?.name ?? null,
    members,
    multipleTeamsAssigned,
  }
}

export function buildPlanningSuggestionContextMap(
  activityNodeIds: readonly string[],
  factsByNode: ReadonlyMap<
    string,
    {
      directAssignees: DirectAssigneeFact[]
      teamAssignees: TeamAssigneeFact[]
    }
  >,
  membersByTeamId: ReadonlyMap<string, readonly TeamMemberFact[]>,
): Map<string, PlanningSuggestionContext> {
  const out = new Map<string, PlanningSuggestionContext>()
  for (const nodeId of activityNodeIds) {
    const facts = factsByNode.get(nodeId)
    out.set(
      nodeId,
      buildPlanningSuggestionContext({
        directAssignees: facts?.directAssignees ?? [],
        teamAssignees: facts?.teamAssignees ?? [],
        membersByTeamId,
      }),
    )
  }
  return out
}
