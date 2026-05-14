import type { MatrixNodeApi, MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import type {
  CreateMatrixNodeInput,
  PatchMatrixNodeInput,
} from '../../services/operation-matrix/operationMatrixApiService'
import {
  collectActivityFieldDiffs,
  collectPreviewStructureDeletions,
  collectStructureNameDiffs,
  normalizePreviewStructureNodeName,
} from './operationMatrixPreviewEdits'
import { computeOrderPatches, snapshotOrderMap } from './matrixStructureReorder'
import {
  collectPreviewPendingCreateNodes,
  isPreviewPendingNodeId,
} from './operationMatrixPreviewStructureCreate'
import { normalizeMatrixTeamIds } from './matrixTreeAggregates'

export type PreviewPersistIdMap = Map<string, string>

export type PreviewApiPersistClient = {
  createNode: (input: CreateMatrixNodeInput) => Promise<MatrixNodeApi>
  patchNode: (id: string, input: PatchMatrixNodeInput) => Promise<MatrixNodeApi>
  deleteNode: (id: string) => Promise<unknown>
}

export type PreviewApiPersistCall =
  | { kind: 'create'; pendingId: string; input: CreateMatrixNodeInput }
  | { kind: 'patch'; id: string; input: PatchMatrixNodeInput }
  | { kind: 'delete'; id: string }

export function remapPreviewPersistNodeId(id: string, idMap: PreviewPersistIdMap): string {
  return idMap.get(id) ?? id
}

export function toCreateMatrixNodeInput(
  node: MatrixNodeTreeApi,
  parentId: string,
): CreateMatrixNodeInput {
  const input: CreateMatrixNodeInput = {
    nodeType: node.node_type as 'TASK' | 'SECTOR' | 'ACTIVITY',
    parentId,
    name: normalizePreviewStructureNodeName(node.name),
    orderIndex: node.order_index,
    isActive: node.is_active,
  }
  if (node.node_type === 'ACTIVITY') {
    input.plannedMinutes = node.planned_minutes ?? null
    input.teamIds = normalizeMatrixTeamIds(node.team_ids).slice(0, 1)
    input.required = node.required
  }
  return input
}

export function planOperationMatrixPreviewApiPersist(
  baseline: MatrixNodeTreeApi,
  working: MatrixNodeTreeApi,
): PreviewApiPersistCall[] {
  const idMap: PreviewPersistIdMap = new Map()
  const calls: PreviewApiPersistCall[] = []

  for (const node of collectPreviewPendingCreateNodes(working)) {
    if (!node.parent_id) {
      throw new Error(`Nó pendente sem pai: ${node.id}`)
    }
    const parentId = remapPreviewPersistNodeId(node.parent_id, idMap)
    if (isPreviewPendingNodeId(parentId)) {
      throw new Error(`Pai pendente sem mapeamento: ${node.parent_id}`)
    }
    calls.push({
      kind: 'create',
      pendingId: node.id,
      input: toCreateMatrixNodeInput(node, parentId),
    })
    idMap.set(node.id, `created:${node.id}`)
  }

  for (const { id, name } of collectStructureNameDiffs(baseline, working)) {
    if (isPreviewPendingNodeId(id)) continue
    calls.push({
      kind: 'patch',
      id: remapPreviewPersistNodeId(id, idMap),
      input: { name },
    })
  }

  for (const { id, patch } of collectActivityFieldDiffs(baseline, working)) {
    if (isPreviewPendingNodeId(id)) continue
    calls.push({
      kind: 'patch',
      id: remapPreviewPersistNodeId(id, idMap),
      input: {
        plannedMinutes: patch.planned_minutes,
        teamIds: patch.team_ids,
      },
    })
  }

  for (const { id, orderIndex } of computeOrderPatches(working, snapshotOrderMap(baseline))) {
    if (isPreviewPendingNodeId(id) && !idMap.has(id)) continue
    calls.push({
      kind: 'patch',
      id: remapPreviewPersistNodeId(id, idMap),
      input: { orderIndex },
    })
  }

  for (const id of collectPreviewStructureDeletions(baseline, working)) {
    if (isPreviewPendingNodeId(id)) continue
    calls.push({ kind: 'delete', id: remapPreviewPersistNodeId(id, idMap) })
  }

  return calls
}

export async function persistOperationMatrixPreviewToApi(
  baseline: MatrixNodeTreeApi,
  working: MatrixNodeTreeApi,
  api: PreviewApiPersistClient,
): Promise<PreviewPersistIdMap> {
  const idMap: PreviewPersistIdMap = new Map()

  for (const node of collectPreviewPendingCreateNodes(working)) {
    if (!node.parent_id) {
      throw new Error(`Nó pendente sem pai: ${node.id}`)
    }
    const parentId = remapPreviewPersistNodeId(node.parent_id, idMap)
    if (isPreviewPendingNodeId(parentId)) {
      throw new Error(`Pai pendente sem mapeamento: ${node.parent_id}`)
    }
    const created = await api.createNode(toCreateMatrixNodeInput(node, parentId))
    idMap.set(node.id, created.id)
  }

  for (const { id, name } of collectStructureNameDiffs(baseline, working)) {
    if (isPreviewPendingNodeId(id)) continue
    await api.patchNode(remapPreviewPersistNodeId(id, idMap), { name })
  }

  for (const { id, patch } of collectActivityFieldDiffs(baseline, working)) {
    if (isPreviewPendingNodeId(id)) continue
    await api.patchNode(remapPreviewPersistNodeId(id, idMap), {
      plannedMinutes: patch.planned_minutes,
      teamIds: patch.team_ids,
    })
  }

  for (const { id, orderIndex } of computeOrderPatches(working, snapshotOrderMap(baseline))) {
    if (isPreviewPendingNodeId(id) && !idMap.has(id)) continue
    await api.patchNode(remapPreviewPersistNodeId(id, idMap), { orderIndex })
  }

  for (const id of collectPreviewStructureDeletions(baseline, working)) {
    if (isPreviewPendingNodeId(id)) continue
    await api.deleteNode(remapPreviewPersistNodeId(id, idMap))
  }

  return idMap
}
