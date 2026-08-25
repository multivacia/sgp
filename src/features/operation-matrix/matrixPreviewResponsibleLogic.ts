import type { TeamMember } from '../../domain/teams/team.types'
import { isEligibleActiveTeamMember } from './matrixTreeAggregates'

export type PreviewTeamMembersState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; members: TeamMember[] }
  | { status: 'error' }

export function eligibleResponsibleIdsFromMembers(
  members: ReadonlyArray<TeamMember>,
): Set<string> {
  return new Set(
    members.filter(isEligibleActiveTeamMember).map((m) => m.collaboratorId),
  )
}

export function collaboratorNameMapFromMembers(
  members: ReadonlyArray<TeamMember>,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const m of members) {
    map.set(m.collaboratorId, m.collaboratorFullName)
  }
  return map
}

/**
 * Resolve equipe + responsável após alteração de equipe no preview.
 *
 * Qualquer troca efetiva de equipe (incluindo limpar equipe) zera o responsável
 * imediatamente — mesmo que o colaborador também integre a nova equipe.
 * A limpeza não depende do carregamento dos membros.
 */
export function resolveActivityTeamAndResponsiblePatch(input: {
  previousTeamId: string | null
  nextTeamId: string | null
  currentResponsibleId: string | null
}): {
  teamIds: string[]
  defaultResponsibleId: string | null
} {
  const previousTeamId = input.previousTeamId?.trim() || null
  const nextTeamId = input.nextTeamId?.trim() || null
  const teamIds = nextTeamId ? [nextTeamId] : []

  if (previousTeamId !== nextTeamId) {
    return { teamIds, defaultResponsibleId: null }
  }

  return {
    teamIds,
    defaultResponsibleId: input.currentResponsibleId,
  }
}

/**
 * Após membros da equipe ficarem `ready`, limpa responsável incompatível
 * (defesa para estados legados / race). Não reintroduz responsável.
 */
export function reconcileResponsibleWhenMembersReady(input: {
  teamId: string | null
  currentResponsibleId: string | null
  eligibleMemberIds: ReadonlySet<string>
}): string | null {
  if (!input.currentResponsibleId) return null
  if (!input.teamId) return null
  return input.eligibleMemberIds.has(input.currentResponsibleId)
    ? input.currentResponsibleId
    : null
}

export function previewResponsibleSelectEnabled(input: {
  teamId: string | null
  membersState: PreviewTeamMembersState
}): boolean {
  return Boolean(input.teamId) && input.membersState.status === 'ready'
}
