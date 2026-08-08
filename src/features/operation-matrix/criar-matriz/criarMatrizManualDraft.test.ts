import { describe, expect, it } from 'vitest'
import {
  manualStructureIsNonEmpty,
  reconcileEtapaCollaborators,
  reconcileManualOpcoesResponsiblesAgainstEligibility,
  reconcileResponsibleOnTeamChange,
  validateManualOpcoesForSubmit,
  type CriarMatrizManualOpcao,
} from './criarMatrizManualDraft'

const et = (name: string, over: Record<string, unknown> = {}) => ({
  id: 'e1',
  name,
  plannedMinutes: null as number | null,
  teamIds: [] as string[],
  collaboratorIds: [] as string[],
  primaryCollaboratorId: null as string | null,
  ...over,
})

const baseOp = (over: Partial<CriarMatrizManualOpcao> = {}): CriarMatrizManualOpcao => ({
  id: 'op-1',
  name: 'Opção A',
  description: '',
  areas: [],
  ...over,
})

describe('validateManualOpcoesForSubmit', () => {
  it('aceita lista vazia', () => {
    expect(validateManualOpcoesForSubmit([])).toBeNull()
  })

  it('exige nome da tarefa', () => {
    expect(
      validateManualOpcoesForSubmit([baseOp({ name: '   ' })]),
    ).toMatch(/tarefa/i)
  })

  it('exige nome do setor', () => {
    expect(
      validateManualOpcoesForSubmit([
        baseOp({
          areas: [
            {
              id: 'a1',
              name: '',
              etapas: [et('Etapa', { id: 'e1' })],
            },
          ],
        }),
      ]),
    ).toMatch(/setor/i)
  })

  it('exige nome da atividade', () => {
    expect(
      validateManualOpcoesForSubmit([
        baseOp({
          areas: [
            {
              id: 'a1',
              name: 'Área',
              etapas: [et('  ', { id: 'e1' })],
            },
          ],
        }),
      ]),
    ).toMatch(/atividade/i)
  })

  it('valida tarefa com setor e atividade nomeados', () => {
    expect(
      validateManualOpcoesForSubmit([
        baseOp({
          areas: [
            {
              id: 'a1',
              name: 'Área 1',
              etapas: [et('Etapa 1', { id: 'e1' })],
            },
          ],
        }),
      ]),
    ).toBeNull()
  })

  it('responsável (principal) opcional: vários colaboradores sem principal não bloqueia submit', () => {
    expect(
      validateManualOpcoesForSubmit([
        baseOp({
          areas: [
            {
              id: 'a1',
              name: 'Área',
              etapas: [
                et('Etapa', {
                  id: 'e1',
                  collaboratorIds: [
                    '11111111-1111-1111-1111-111111111111',
                    '22222222-2222-2222-2222-222222222222',
                  ],
                  primaryCollaboratorId: null,
                }),
              ],
            },
          ],
        }),
      ]),
    ).toBeNull()
  })

  it('aceita vários colaboradores com principal definido', () => {
    const pid = '11111111-1111-1111-1111-111111111111'
    expect(
      validateManualOpcoesForSubmit([
        baseOp({
          areas: [
            {
              id: 'a1',
              name: 'Área',
              etapas: [
                et('Etapa', {
                  id: 'e1',
                  collaboratorIds: [pid, '22222222-2222-2222-2222-222222222222'],
                  primaryCollaboratorId: pid,
                }),
              ],
            },
          ],
        }),
      ]),
    ).toBeNull()
  })
})

describe('reconcileEtapaCollaborators', () => {
  it('define o único colaborador como principal', () => {
    const id = '11111111-1111-1111-1111-111111111111'
    const r = reconcileEtapaCollaborators({
      id: 'e',
      name: 'E',
      plannedMinutes: null,
      teamIds: [],
      collaboratorIds: [id],
      primaryCollaboratorId: null,
    })
    expect(r.primaryCollaboratorId).toBe(id)
  })

  it('zera principal quando não há colaboradores', () => {
    const r = reconcileEtapaCollaborators({
      id: 'e',
      name: 'E',
      plannedMinutes: null,
      teamIds: [],
      collaboratorIds: [],
      primaryCollaboratorId: '11111111-1111-1111-1111-111111111111',
    })
    expect(r.primaryCollaboratorId).toBeNull()
    expect(r.collaboratorIds).toEqual([])
  })
})

describe('manualStructureIsNonEmpty', () => {
  it('detecta opções', () => {
    expect(manualStructureIsNonEmpty([baseOp()])).toBe(true)
    expect(manualStructureIsNonEmpty([])).toBe(false)
  })
})

describe('reconcileManualOpcoesResponsiblesAgainstEligibility (equipe → responsável)', () => {
  const TEAM_A = 'a1111111-1111-1111-1111-111111111111'
  const TEAM_B = 'b2222222-2222-2222-2222-222222222222'
  const RESP = 'c3333333-3333-3333-3333-333333333333'

  function draftWithResponsible(teamId: string): CriarMatrizManualOpcao[] {
    return [
      baseOp({
        areas: [
          {
            id: 'a1',
            name: 'Área',
            etapas: [
              et('Etapa', {
                id: 'e1',
                teamIds: [teamId],
                collaboratorIds: [RESP],
                primaryCollaboratorId: RESP,
              }),
            ],
          },
        ],
      }),
    ]
  }

  it('reselecionar a mesma equipe (elegibilidade já conhecida) preserva o responsável', () => {
    const opcoes = draftWithResponsible(TEAM_A)
    const eligible = new Map([[TEAM_A, new Set([RESP])]])
    const out = reconcileManualOpcoesResponsiblesAgainstEligibility(opcoes, eligible)
    expect(out).toBe(opcoes)
    expect(out[0]!.areas[0]!.etapas[0]!.primaryCollaboratorId).toBe(RESP)
  })

  it('trocar de equipe de fato e o responsável não ser membro da nova equipe limpa a seleção', () => {
    const opcoes = draftWithResponsible(TEAM_B)
    const eligible = new Map([[TEAM_B, new Set(['outro-id'])]])
    const out = reconcileManualOpcoesResponsiblesAgainstEligibility(opcoes, eligible)
    expect(out).not.toBe(opcoes)
    expect(out[0]!.areas[0]!.etapas[0]!.primaryCollaboratorId).toBeNull()
  })

  it('equipe sem elegibilidade ainda carregada (mapa sem a chave) preserva o responsável até validar', () => {
    const opcoes = draftWithResponsible(TEAM_A)
    const out = reconcileManualOpcoesResponsiblesAgainstEligibility(opcoes, new Map())
    expect(out).toBe(opcoes)
    expect(out[0]!.areas[0]!.etapas[0]!.primaryCollaboratorId).toBe(RESP)
  })
})

describe('reconcileResponsibleOnTeamChange', () => {
  const RESP = 'c3333333-3333-3333-3333-333333333333'
  const TEAM_A = 'a1111111-1111-1111-1111-111111111111'
  const TEAM_B = 'b2222222-2222-2222-2222-222222222222'

  it('reselecionar a mesma equipe preserva o responsável', () => {
    const out = reconcileResponsibleOnTeamChange({
      previousTeamId: TEAM_A,
      nextTeamId: TEAM_A,
      currentResponsibleId: RESP,
      eligibleMemberIds: new Set(),
    })
    expect(out).toBe(RESP)
  })

  it('trocar de equipe de fato e responsável não elegível limpa a seleção', () => {
    const out = reconcileResponsibleOnTeamChange({
      previousTeamId: TEAM_A,
      nextTeamId: TEAM_B,
      currentResponsibleId: RESP,
      eligibleMemberIds: new Set(),
    })
    expect(out).toBeNull()
  })

  it('trocar de equipe de fato mas responsável continua elegível na nova equipe preserva', () => {
    const out = reconcileResponsibleOnTeamChange({
      previousTeamId: TEAM_A,
      nextTeamId: TEAM_B,
      currentResponsibleId: RESP,
      eligibleMemberIds: new Set([RESP]),
    })
    expect(out).toBe(RESP)
  })

  it('remover a equipe (sem equipe efetiva) limpa o responsável', () => {
    const out = reconcileResponsibleOnTeamChange({
      previousTeamId: TEAM_A,
      nextTeamId: null,
      currentResponsibleId: RESP,
      eligibleMemberIds: new Set([RESP]),
    })
    expect(out).toBeNull()
  })
})
