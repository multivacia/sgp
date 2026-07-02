import { describe, expect, it } from 'vitest'
import type { ConveyorStructure } from '../../domain/conveyors/conveyor.types'
import {
  buildStructureBaselineFromApiDetail,
  hasPersistableStructureChanges,
  structureToManualRootsFromApiDetail,
  detailStructureToManualAloc,
} from './conveyorEditStructureSnapshot'

function sampleStructure(overrides?: Partial<ConveyorStructure>): ConveyorStructure {
  return {
    options: [
      {
        id: 'opt-1',
        name: 'Desmontagem',
        orderIndex: 1,
        areas: [
          {
            id: 'area-1',
            name: 'Funilaria',
            orderIndex: 1,
            steps: [
              {
                id: 'step-1',
                name: 'Remover bancos',
                orderIndex: 1,
                plannedMinutes: 45,
                operationalStatus: 'IN_PROGRESS',
                isCompleted: false,
                completedAt: null,
                completedByName: null,
                completionEventId: null,
                assignees: [
                  {
                    type: 'COLLABORATOR',
                    collaboratorId: 'colab-1',
                    collaboratorName: 'João',
                    teamId: null,
                    teamName: null,
                    isPrimary: true,
                    orderIndex: 0,
                  },
                  {
                    type: 'TEAM',
                    collaboratorId: null,
                    collaboratorName: null,
                    teamId: 'team-1',
                    teamName: 'Equipe A',
                    isPrimary: false,
                    orderIndex: 1,
                  },
                ],
              },
              {
                id: 'step-2',
                name: 'Remover carpete',
                orderIndex: 2,
                plannedMinutes: 30,
                operationalStatus: 'PENDING',
                isCompleted: false,
                completedAt: null,
                completedByName: null,
                completionEventId: null,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('conveyorEditStructureSnapshot', () => {
  it('abrir aba Estrutura sem editar não marca hasStructureChanges=true', () => {
    const structure = sampleStructure()
    const baseline = buildStructureBaselineFromApiDetail(structure)

    // Simula hidratação inicial (load) e re-leitura sem mutação do usuário.
    const reloadedRoots = structureToManualRootsFromApiDetail(structure)
    const reloadedAloc = detailStructureToManualAloc(structure)

    expect(
      hasPersistableStructureChanges(
        reloadedRoots,
        reloadedAloc,
        baseline.baselineStructureSig,
      ),
    ).toBe(false)
  })

  it('detecta alteração real de título de atividade', () => {
    const structure = sampleStructure()
    const baseline = buildStructureBaselineFromApiDetail(structure)
    const roots = structureToManualRootsFromApiDetail(structure)
    roots[0].areas[0].steps[0].titulo = 'Remover bancos (revisado)'

    expect(
      hasPersistableStructureChanges(roots, baseline.manualAloc, baseline.baselineStructureSig),
    ).toBe(true)
  })

  it('normaliza ordem de alocações sem falso positivo', () => {
    const structure = sampleStructure()
    const baseline = buildStructureBaselineFromApiDetail(structure)
    const aloc = detailStructureToManualAloc(structure)
    const stepId = structure.options[0].areas[0].steps[0].id
    const rows = aloc[stepId]
    if (!rows) throw new Error('fixture sem alocações')

    const permuted = [...rows].reverse()
    expect(
      hasPersistableStructureChanges(
        baseline.roots,
        { [stepId]: permuted },
        baseline.baselineStructureSig,
      ),
    ).toBe(false)
  })
})
