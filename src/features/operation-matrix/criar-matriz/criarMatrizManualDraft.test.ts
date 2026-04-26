import { describe, expect, it } from 'vitest'
import {
  manualStructureIsNonEmpty,
  reconcileEtapaCollaborators,
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

  it('exige nome da opção', () => {
    expect(
      validateManualOpcoesForSubmit([baseOp({ name: '   ' })]),
    ).toMatch(/opção/i)
  })

  it('exige nome da área', () => {
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
    ).toMatch(/área/i)
  })

  it('exige nome da etapa', () => {
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
    ).toMatch(/etapa/i)
  })

  it('valida opção com área e etapa nomeadas', () => {
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

  it('exige principal quando há mais do que um colaborador na etapa', () => {
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
    ).toMatch(/principal/i)
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
