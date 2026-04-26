/**
 * Monta a árvore oficial de matrix_nodes (ITEM→TASK→SECTOR→ACTIVITY) para a matriz
 * "Tapeçaria automotiva · Bravo", concatenando as tarefas das esteiras legadas et-001…et-005
 * na mesma ordem usada pelos mocks oficiais.
 *
 * Os UUIDs são determinísticos (hash) para permanecerem estáveis entre builds do bundle.
 */

import type { MatrixNodeTreeApi, MatrixNodeType } from '../domain/operation-matrix/operation-matrix.types'
import { hashDeterministic } from './nova-esteira-deterministic'
import type { EsteiraAtividadeMock, EsteiraTarefaMock } from './esteira-detalhe-types'
import {
  LEGACY_ESTEIRA_ET001,
  LEGACY_ESTEIRA_ET002,
  LEGACY_ESTEIRA_ET003,
  LEGACY_ESTEIRA_ET004,
  LEGACY_ESTEIRA_ET005,
} from './esteira-official-legacy'

const BRAVO_SEED = 'bravo-matrix-v1'

/** Nome canônico do ITEM raiz — alinhado ao tipo de matriz cadastrada no backend. */
export const BRAVO_MATRIX_DISPLAY_NAME = 'Tapeçaria automotiva · Bravo'

const COLAB_BY_NAME: Record<string, string> = {
  João: 'colab-joao',
  Ana: 'colab-ana',
  Carlos: 'colab-carlos',
  Juliana: 'colab-juliana',
  Marcos: 'colab-marcos',
  Pedro: 'colab-pedro',
}

function deterministicUuid(parts: string[]): string {
  const h = hashDeterministic([BRAVO_SEED, ...parts])
  const h2 = hashDeterministic([BRAVO_SEED, ...parts, 'x'])
  const h3 = hashDeterministic([BRAVO_SEED, ...parts, 'y'])
  const combined = (h + h2 + h3).padStart(32, '0').slice(0, 32)
  return `${combined.slice(0, 8)}-${combined.slice(8, 12)}-4${combined.slice(13, 16)}-a${combined.slice(17, 20)}-${combined.slice(20, 32)}`
}

function nodeBase(p: {
  id: string
  parent_id: string | null
  root_id: string
  node_type: MatrixNodeType
  name: string
  order_index: number
  level_depth: number
  planned_minutes?: number | null
  default_responsible_id?: string | null
}): MatrixNodeTreeApi {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: p.id,
    parent_id: p.parent_id,
    root_id: p.root_id,
    node_type: p.node_type,
    code: null,
    name: p.name,
    description: null,
    order_index: p.order_index,
    level_depth: p.level_depth,
    is_active: true,
    planned_minutes: p.planned_minutes ?? null,
    default_responsible_id: p.default_responsible_id ?? null,
    team_ids: [],
    required: true,
    source_key: null,
    metadata_json: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    children: [],
  }
}

function resolveDefaultResponsible(a: EsteiraAtividadeMock): string | null {
  const id = COLAB_BY_NAME[a.responsavel.trim()]
  return id ?? null
}

/**
 * Uma área (SECTOR) por macrobloco da esteira legada — espelha a granularidade esperada
 * pelo detalhe mock (um bloco = uma TASK + uma ÁREA operacional).
 */
function buildActivityNodes(
  rootId: string,
  sectorId: string,
  activities: EsteiraAtividadeMock[],
  pathPrefix: string[],
): MatrixNodeTreeApi[] {
  return activities.map((a, i) => {
    const id = deterministicUuid([...pathPrefix, 'ACTIVITY', a.id])
    return {
      ...nodeBase({
        id,
        parent_id: sectorId,
        root_id: rootId,
        node_type: 'ACTIVITY',
        name: a.nome,
        order_index: i,
        level_depth: 3,
        planned_minutes: a.estimativaMin,
        default_responsible_id: resolveDefaultResponsible(a),
      }),
      children: [],
    }
  })
}

function buildTaskBranch(
  rootId: string,
  tarefa: EsteiraTarefaMock,
  orderIndex: number,
  pathPrefix: string[],
): MatrixNodeTreeApi {
  const taskId = deterministicUuid([...pathPrefix, 'TASK', tarefa.id])
  const sectorName = 'Operação'
  const sectorId = deterministicUuid([...pathPrefix, 'SECTOR', tarefa.id, sectorName])

  const sectorNode: MatrixNodeTreeApi = {
    ...nodeBase({
      id: sectorId,
      parent_id: taskId,
      root_id: rootId,
      node_type: 'SECTOR',
      name: sectorName,
      order_index: 0,
      level_depth: 2,
    }),
    children: buildActivityNodes(rootId, sectorId, tarefa.atividades, [
      ...pathPrefix,
      tarefa.id,
    ]),
  }

  return {
    ...nodeBase({
      id: taskId,
      parent_id: rootId,
      root_id: rootId,
      node_type: 'TASK',
      name: tarefa.nome,
      order_index: orderIndex,
      level_depth: 1,
    }),
    children: [sectorNode],
  }
}

export function listBravoLegacyTarefasInOrder(): EsteiraTarefaMock[] {
  return [
    ...LEGACY_ESTEIRA_ET001.tarefas,
    ...LEGACY_ESTEIRA_ET002.tarefas,
    ...LEGACY_ESTEIRA_ET003.tarefas,
    ...LEGACY_ESTEIRA_ET004.tarefas,
    ...LEGACY_ESTEIRA_ET005.tarefas,
  ]
}

let cachedTree: MatrixNodeTreeApi | null = null

/**
 * Árvore completa matrix_nodes para a matriz oficial Bravo (15 TASKs após concatenação).
 */
export function buildOfficialBravoMatrixTreeMock(): MatrixNodeTreeApi {
  if (cachedTree) return cachedTree

  const rootId = deterministicUuid(['ITEM', 'root'])
  const tarefas = listBravoLegacyTarefasInOrder()
  const children = tarefas.map((tf, i) =>
    buildTaskBranch(rootId, tf, i, ['slot', String(i), tf.id]),
  )

  cachedTree = {
    ...nodeBase({
      id: rootId,
      parent_id: null,
      root_id: rootId,
      node_type: 'ITEM',
      name: BRAVO_MATRIX_DISPLAY_NAME,
      order_index: 0,
      level_depth: 0,
    }),
    children,
  }
  return cachedTree
}

export function getOfficialBravoMatrixRootId(): string {
  return buildOfficialBravoMatrixTreeMock().id
}

export type MatrixTotalsFromTree = {
  totalOptions: number
  totalAreas: number
  totalSteps: number
  totalPlannedMinutes: number
}

export function aggregateMatrixTotals(tree: MatrixNodeTreeApi): MatrixTotalsFromTree {
  let totalOptions = 0
  let totalAreas = 0
  let totalSteps = 0
  let totalPlannedMinutes = 0

  for (const task of tree.children) {
    if (task.node_type !== 'TASK') continue
    totalOptions += 1
    for (const area of task.children) {
      if (area.node_type !== 'SECTOR') continue
      totalAreas += 1
      for (const step of area.children) {
        if (step.node_type !== 'ACTIVITY') continue
        totalSteps += 1
        totalPlannedMinutes += step.planned_minutes ?? 0
      }
    }
  }

  return { totalOptions, totalAreas, totalSteps, totalPlannedMinutes }
}
