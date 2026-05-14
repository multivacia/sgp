import { describe, expect, it } from 'vitest'
import { revisaoAlterarMatrizPendencias } from './operationMatrixEditorRevision'

describe('revisaoAlterarMatrizPendencias', () => {
  it('retorna lista vazia quando nada pendente', () => {
    expect(
      revisaoAlterarMatrizPendencias({
        matrixStructureDirty: false,
        matrixEditorHasUnsavedChanges: false,
        activitiesWithoutDefaultTeam: 0,
        activitiesWithOrphanDefaultTeam: 0,
      }),
    ).toEqual([])
  })

  it('inclui aviso quando a ordem estrutural mudou localmente', () => {
    const p = revisaoAlterarMatrizPendencias({
      matrixStructureDirty: true,
      matrixEditorHasUnsavedChanges: false,
      activitiesWithoutDefaultTeam: 0,
      activitiesWithOrphanDefaultTeam: 0,
    })
    expect(p.some((x) => x.includes('ordem'))).toBe(true)
  })

  it('inclui aviso quando o formulário do nó tem alterações não salvas', () => {
    expect(
      revisaoAlterarMatrizPendencias({
        matrixStructureDirty: false,
        matrixEditorHasUnsavedChanges: true,
        activitiesWithoutDefaultTeam: 0,
        activitiesWithOrphanDefaultTeam: 0,
      }).length,
    ).toBe(1)
  })

  it('acumula avisos sobre atividades sem equipe padrão ou com equipe órfã', () => {
    expect(
      revisaoAlterarMatrizPendencias({
        matrixStructureDirty: false,
        matrixEditorHasUnsavedChanges: false,
        activitiesWithoutDefaultTeam: 2,
        activitiesWithOrphanDefaultTeam: 1,
      }).length,
    ).toBe(2)
  })
})
