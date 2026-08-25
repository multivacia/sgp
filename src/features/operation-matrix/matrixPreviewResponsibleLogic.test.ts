import { describe, expect, it } from 'vitest'
import type { TeamMember } from '../../domain/teams/team.types'
import {
  collaboratorNameMapFromMembers,
  eligibleResponsibleIdsFromMembers,
  previewResponsibleSelectEnabled,
  reconcileResponsibleWhenMembersReady,
  resolveActivityTeamAndResponsiblePatch,
} from './matrixPreviewResponsibleLogic'

function member(
  overrides: Partial<TeamMember> & Pick<TeamMember, 'collaboratorId'>,
): TeamMember {
  return {
    id: `m-${overrides.collaboratorId}`,
    teamId: 'team-1',
    collaboratorFullName: overrides.collaboratorFullName ?? 'Nome',
    collaboratorEmail: null,
    collaboratorStatus: 'ACTIVE',
    collaboratorIsActive: true,
    collaboratorDeletedAt: null,
    role: null,
    isPrimary: false,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('eligibleResponsibleIdsFromMembers', () => {
  it('inclui apenas membros elegíveis da equipe (ativos + vínculo ativo)', () => {
    const members = [
      member({ collaboratorId: 'c-ok', collaboratorFullName: 'Ok' }),
      member({
        collaboratorId: 'c-inactive-link',
        isActive: false,
        collaboratorFullName: 'Link inativo',
      }),
      member({
        collaboratorId: 'c-inactive-colab',
        collaboratorIsActive: false,
        collaboratorFullName: 'Colab inativo',
      }),
      member({
        collaboratorId: 'c-status',
        collaboratorStatus: 'INACTIVE',
        collaboratorFullName: 'Status inativo',
      }),
    ]
    expect([...eligibleResponsibleIdsFromMembers(members)].sort()).toEqual(['c-ok'])
  })

  it('não mistura colaboradores da equipe anterior com a nova', () => {
    const teamAnterior = [
      member({ collaboratorId: 'a1', teamId: 'team-a', collaboratorFullName: 'Ana' }),
    ]
    const teamNova = [
      member({ collaboratorId: 'b1', teamId: 'team-b', collaboratorFullName: 'Bruno' }),
    ]
    const elegiveisNova = eligibleResponsibleIdsFromMembers(teamNova)
    expect(elegiveisNova.has('a1')).toBe(false)
    expect(elegiveisNova.has('b1')).toBe(true)
    expect(eligibleResponsibleIdsFromMembers(teamAnterior).has('b1')).toBe(false)
  })
})

describe('resolveActivityTeamAndResponsiblePatch', () => {
  it('mesma equipe sem alteração preserva responsável', () => {
    const r = resolveActivityTeamAndResponsiblePatch({
      previousTeamId: 't1',
      nextTeamId: 't1',
      currentResponsibleId: 'c1',
    })
    expect(r.teamIds).toEqual(['t1'])
    expect(r.defaultResponsibleId).toBe('c1')
  })

  it('atividade com equipe e sem responsável permanece sem responsável', () => {
    const r = resolveActivityTeamAndResponsiblePatch({
      previousTeamId: 't1',
      nextTeamId: 't1',
      currentResponsibleId: null,
    })
    expect(r.teamIds).toEqual(['t1'])
    expect(r.defaultResponsibleId).toBeNull()
  })

  it('troca de equipe limpa imediatamente o responsável', () => {
    const r = resolveActivityTeamAndResponsiblePatch({
      previousTeamId: 't1',
      nextTeamId: 't2',
      currentResponsibleId: 'c-old',
    })
    expect(r.teamIds).toEqual(['t2'])
    expect(r.defaultResponsibleId).toBeNull()
  })

  it('troca de equipe limpa responsável mesmo se ele também pertence à nova equipe', () => {
    const r = resolveActivityTeamAndResponsiblePatch({
      previousTeamId: 't1',
      nextTeamId: 't2',
      currentResponsibleId: 'c-shared',
    })
    expect(r.teamIds).toEqual(['t2'])
    expect(r.defaultResponsibleId).toBeNull()
  })

  it('limpa responsável imediatamente mesmo sem membros carregados', () => {
    const r = resolveActivityTeamAndResponsiblePatch({
      previousTeamId: 't1',
      nextTeamId: 't2',
      currentResponsibleId: 'c1',
    })
    expect(r.defaultResponsibleId).toBeNull()
  })

  it('sem equipe limpa responsável', () => {
    const r = resolveActivityTeamAndResponsiblePatch({
      previousTeamId: 't1',
      nextTeamId: null,
      currentResponsibleId: 'c1',
    })
    expect(r.teamIds).toEqual([])
    expect(r.defaultResponsibleId).toBeNull()
  })

  it('selecionar equipe a partir de nenhuma limpa responsável (opcional)', () => {
    const r = resolveActivityTeamAndResponsiblePatch({
      previousTeamId: null,
      nextTeamId: 't2',
      currentResponsibleId: null,
    })
    expect(r.teamIds).toEqual(['t2'])
    expect(r.defaultResponsibleId).toBeNull()
  })
})

describe('reconcileResponsibleWhenMembersReady', () => {
  it('preserva responsável elegível após load assíncrono', () => {
    expect(
      reconcileResponsibleWhenMembersReady({
        teamId: 't1',
        currentResponsibleId: 'c1',
        eligibleMemberIds: new Set(['c1']),
      }),
    ).toBe('c1')
  })

  it('limpa responsável incompatível só após membros ready', () => {
    expect(
      reconcileResponsibleWhenMembersReady({
        teamId: 't1',
        currentResponsibleId: 'c-old',
        eligibleMemberIds: new Set(['c-new']),
      }),
    ).toBeNull()
  })
})

describe('previewResponsibleSelectEnabled', () => {
  it('desabilita sem equipe ou enquanto loading', () => {
    expect(
      previewResponsibleSelectEnabled({
        teamId: null,
        membersState: { status: 'ready', members: [] },
      }),
    ).toBe(false)
    expect(
      previewResponsibleSelectEnabled({
        teamId: 't1',
        membersState: { status: 'loading' },
      }),
    ).toBe(false)
    expect(
      previewResponsibleSelectEnabled({
        teamId: 't1',
        membersState: { status: 'ready', members: [] },
      }),
    ).toBe(true)
  })
})

describe('collaboratorNameMapFromMembers', () => {
  it('mapeia nomes para exibição no seletor', () => {
    const map = collaboratorNameMapFromMembers([
      member({ collaboratorId: 'c1', collaboratorFullName: 'Ana' }),
    ])
    expect(map.get('c1')).toBe('Ana')
  })
})
