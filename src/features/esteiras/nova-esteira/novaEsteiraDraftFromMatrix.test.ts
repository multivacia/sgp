import { describe, expect, it } from 'vitest'
import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import {
  matrixActivityToInitialAllocRows,
  matrixItemTreeToManualOptions,
} from './novaEsteiraDraftFromMatrix'
import {
  buildManualConveyorInput,
  mapMatrixTreeToConveyorOptions,
  manualAssigneeRowsToApi,
  validateManualStepAssignees,
} from './matrixToConveyorCreateInput'

const TEAM_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

function activityNode(
  partial: Partial<MatrixNodeTreeApi> & Pick<MatrixNodeTreeApi, 'id' | 'name'>,
): MatrixNodeTreeApi {
  return {
    parent_id: null,
    root_id: 'root',
    node_type: 'ACTIVITY',
    code: null,
    description: null,
    order_index: 1,
    level_depth: 3,
    is_active: true,
    planned_minutes: 10,
    default_responsible_id: null,
    team_ids: [],
    required: true,
    source_key: null,
    metadata_json: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    children: [],
    ...partial,
  } as MatrixNodeTreeApi
}

function matrixTreeWithTeamActivity(): MatrixNodeTreeApi {
  return {
    id: 'item-1',
    node_type: 'ITEM',
    name: 'Base',
    order_index: 0,
    parent_id: null,
    root_id: 'item-1',
    code: null,
    description: null,
    level_depth: 0,
    is_active: true,
    planned_minutes: null,
    default_responsible_id: null,
    team_ids: [],
    required: true,
    source_key: null,
    metadata_json: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    children: [
      {
        id: 'task-1',
        node_type: 'TASK',
        name: 'Tarefa',
        order_index: 1,
        parent_id: 'item-1',
        root_id: 'item-1',
        code: null,
        description: null,
        level_depth: 1,
        is_active: true,
        planned_minutes: null,
        default_responsible_id: null,
        team_ids: [],
        required: true,
        source_key: null,
        metadata_json: null,
        created_at: '',
        updated_at: '',
        deleted_at: null,
        children: [
          {
            id: 'sector-1',
            node_type: 'SECTOR',
            name: 'Setor',
            order_index: 1,
            parent_id: 'task-1',
            root_id: 'item-1',
            code: null,
            description: null,
            level_depth: 2,
            is_active: true,
            planned_minutes: null,
            default_responsible_id: null,
            team_ids: [],
            required: true,
            source_key: null,
            metadata_json: null,
            created_at: '',
            updated_at: '',
            deleted_at: null,
            children: [
              activityNode({
                id: 'act-1',
                name: 'Aplicar cola no feltro',
                team_ids: [TEAM_ID],
              }),
            ],
          },
        ],
      },
    ],
  } as MatrixNodeTreeApi
}

describe('emptyStepFromActivity via matrixItemTreeToManualOptions', () => {
  it('materializa plannedQuantity 1 quando matriz tem planned_quantity 10', () => {
    const tree = {
      ...matrixTreeWithTeamActivity(),
      children: [
        {
          ...matrixTreeWithTeamActivity().children[0],
          children: [
            {
              ...matrixTreeWithTeamActivity().children[0].children[0],
              children: [
                activityNode({
                  id: 'act-qty',
                  name: 'Com quantidade na matriz',
                  planned_quantity: 10,
                }),
              ],
            },
          ],
        },
      ],
    } as MatrixNodeTreeApi
    const { options } = matrixItemTreeToManualOptions(tree, 'item-1')
    expect(options[0].areas[0].steps[0].plannedQuantity).toBe(1)
  })

  it('propaga sourceKey resolvida da atividade de origem', () => {
    const { options } = matrixItemTreeToManualOptions(matrixTreeWithTeamActivity(), 'item-1')
    expect(options[0].areas[0].steps[0].sourceKey).toBe('act-1')
  })
})

describe('mapMatrixTreeToConveyorOptions', () => {
  it('não herda plannedQuantity da matriz no POST direto', () => {
    const tree = {
      ...matrixTreeWithTeamActivity(),
      children: [
        {
          ...matrixTreeWithTeamActivity().children[0],
          children: [
            {
              ...matrixTreeWithTeamActivity().children[0].children[0],
              children: [
                activityNode({
                  id: 'act-qty',
                  name: 'Qtd matriz',
                  planned_quantity: 10,
                }),
              ],
            },
          ],
        },
      ],
    } as MatrixNodeTreeApi
    const options = mapMatrixTreeToConveyorOptions(tree, {})
    expect(options[0].areas[0].steps[0].plannedQuantity).toBe(1)
  })
})

describe('buildManualConveyorInput', () => {
  it('envia plannedQuantity 1 mesmo se o draft tiver outro valor', () => {
    const roots = [
      {
        key: 'op-1',
        titulo: 'Op',
        areas: [
          {
            key: 'ar-1',
            titulo: 'Área',
            steps: [
              {
                key: 'st-1',
                titulo: 'Etapa',
                plannedMinutes: 20,
                plannedQuantity: 10,
              },
            ],
          },
        ],
      },
    ]
    const input = buildManualConveyorInput(
      {
        nome: 'Teste',
        cliente: 'C',
        veiculo: 'V',
        modeloVersao: '',
        placa: '',
        observacoes: '',
        responsavel: '',
        prazoEstimado: '',
        prioridade: 'media',
        colaboradorId: null,
      },
      roots,
      {},
    )
    expect(input.options[0].areas[0].steps[0].plannedQuantity).toBe(1)
  })

  it('propaga sourceKey do draft para o POST', () => {
    const roots = [
      {
        key: 'op-1',
        titulo: 'Op',
        areas: [
          {
            key: 'ar-1',
            titulo: 'Área',
            steps: [
              {
                key: 'st-1',
                titulo: 'Etapa',
                plannedMinutes: 20,
                sourceKey: 'lineage-key',
              },
            ],
          },
        ],
      },
    ]
    const input = buildManualConveyorInput({ nome: 'Teste', prioridade: 'media' }, roots, {})
    expect(input.options[0].areas[0].steps[0].sourceKey).toBe('lineage-key')
  })
})

describe('matrixActivityToInitialAllocRows', () => {
  it('herda equipe da matriz com isPrimary false', () => {
    const rows = matrixActivityToInitialAllocRows(
      activityNode({
        id: 'act-1',
        name: 'Aplicar cola no feltro',
        team_ids: [TEAM_ID],
      }),
    )
    expect(rows).toEqual([
      { type: 'TEAM', teamId: TEAM_ID, isPrimary: false },
    ])
  })

  it('retorna vazio quando atividade não tem equipe padrão', () => {
    expect(
      matrixActivityToInitialAllocRows(
        activityNode({ id: 'act-2', name: 'Sem equipe' }),
      ),
    ).toEqual([])
  })
})

describe('matrixItemTreeToManualOptions + validação', () => {
  it('materializa esteira com TEAM sem colaborador e passa validateManualStepAssignees', () => {
    const { options, initialAllocations } = matrixItemTreeToManualOptions(
      matrixTreeWithTeamActivity(),
      'item-1',
    )
    expect(options).toHaveLength(1)
    expect(validateManualStepAssignees(options, initialAllocations)).toBeNull()

    const st = options[0]!.areas[0]!.steps[0]!
    const rows = initialAllocations[st.key] ?? []
    const assignMap = { [st.key]: manualAssigneeRowsToApi(rows) }

    const input = buildManualConveyorInput(
      { nome: 'OS teste', prioridade: 'media' },
      options,
      assignMap,
    )
    expect(input.options[0]!.areas[0]!.steps[0]!.assignees).toEqual([
      {
        type: 'TEAM',
        teamId: TEAM_ID,
        isPrimary: false,
        assignmentOrigin: 'manual',
        orderIndex: 0,
      },
    ])
  })
})
