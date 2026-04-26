import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMatrixNode } from '../../../services/operation-matrix/operationMatrixApiService'
import { createManualOpcoesUnderItem } from './createManualMatrixStructure'

vi.mock('../../../services/operation-matrix/operationMatrixApiService', () => ({
  createMatrixNode: vi.fn(),
}))

describe('createManualOpcoesUnderItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia teamIds na criação de ACTIVITY', async () => {
    const mockedCreate = vi.mocked(createMatrixNode)
    mockedCreate.mockResolvedValueOnce({
      id: 'task-id',
    } as never)
    mockedCreate.mockResolvedValueOnce({
      id: 'sector-id',
    } as never)
    mockedCreate.mockResolvedValueOnce({
      id: 'activity-id',
    } as never)

    await createManualOpcoesUnderItem('item-id', [
      {
        id: 'op1',
        name: 'Opção',
        description: '',
        areas: [
          {
            id: 'a1',
            name: 'Área',
            etapas: [
              {
                id: 'e1',
                name: 'Etapa',
                plannedMinutes: 15,
                teamIds: ['team-1', 'team-2'],
                collaboratorIds: ['col-1'],
                primaryCollaboratorId: 'col-1',
              },
            ],
          },
        ],
      },
    ])

    expect(mockedCreate).toHaveBeenCalledTimes(3)
    expect(mockedCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nodeType: 'ACTIVITY',
        teamIds: ['team-1', 'team-2'],
        defaultResponsibleId: 'col-1',
      }),
    )
  })
})
