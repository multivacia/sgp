import { describe, expect, it } from 'vitest'
import { revisaoAlterarMatrizPendencias } from './operationMatrixEditorRevision'

describe('revisaoAlterarMatrizPendencias', () => {
  it('retorna lista vazia quando nada pendente', () => {
    expect(
      revisaoAlterarMatrizPendencias({
        matrixStructureDirty: false,
        matrixEditorHasUnsavedChanges: false,
        activitiesWithoutResponsible: 0,
        orphanResponsibleAssignments: 0,
      }),
    ).toEqual([])
  })

  it('inclui aviso quando a ordem estrutural mudou localmente', () => {
    const p = revisaoAlterarMatrizPendencias({
      matrixStructureDirty: true,
      matrixEditorHasUnsavedChanges: false,
      activitiesWithoutResponsible: 0,
      orphanResponsibleAssignments: 0,
    })
    expect(p.some((x) => x.includes('ordem'))).toBe(true)
  })

  it('inclui aviso quando o formulário do nó tem alterações não salvas', () => {
    expect(
      revisaoAlterarMatrizPendencias({
        matrixStructureDirty: false,
        matrixEditorHasUnsavedChanges: true,
        activitiesWithoutResponsible: 0,
        orphanResponsibleAssignments: 0,
      }).length,
    ).toBe(1)
  })

  it('acumula avisos sobre atividades sem responsável ou com responsável órfão', () => {
    expect(
      revisaoAlterarMatrizPendencias({
        matrixStructureDirty: false,
        matrixEditorHasUnsavedChanges: false,
        activitiesWithoutResponsible: 2,
        orphanResponsibleAssignments: 1,
      }).length,
    ).toBe(2)
  })
})
