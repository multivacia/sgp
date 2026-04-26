import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import {
  createMatrixNode,
  type CreateMatrixNodeInput,
} from '../../../services/operation-matrix/operationMatrixApiService'

function sortChildren(node: MatrixNodeTreeApi): MatrixNodeTreeApi[] {
  return [...node.children].sort((a, b) => a.order_index - b.order_index)
}

function buildCreatePayload(
  parentId: string,
  node: MatrixNodeTreeApi,
): CreateMatrixNodeInput {
  const shared = {
    parentId,
    name: node.name,
    code: node.code,
    description: node.description,
    orderIndex: node.order_index,
    isActive: node.is_active,
    required: node.required,
    sourceKey: node.source_key,
    metadataJson: node.metadata_json ?? undefined,
  }

  if (node.node_type === 'ACTIVITY') {
    return {
      ...shared,
      nodeType: 'ACTIVITY',
      plannedMinutes: node.planned_minutes,
      defaultResponsibleId: node.default_responsible_id,
      teamIds: [...(node.team_ids ?? [])],
    }
  }

  if (node.node_type === 'TASK' || node.node_type === 'SECTOR') {
    return {
      ...shared,
      nodeType: node.node_type,
    }
  }

  throw new Error(
    `Tipo de nó inesperado na clonagem: ${(node as MatrixNodeTreeApi).node_type}`,
  )
}

/**
 * Replica a subárvore de uma opção (`TASK`) sob o novo item raiz, preservando ordem relativa.
 */
export async function cloneTaskSubtreeUnderItem(
  newItemId: string,
  taskRoot: MatrixNodeTreeApi,
): Promise<void> {
  if (taskRoot.node_type !== 'TASK') {
    throw new Error('cloneTaskSubtreeUnderItem: raiz deve ser TASK')
  }

  async function dfs(parentId: string, n: MatrixNodeTreeApi): Promise<void> {
    const created = await createMatrixNode(buildCreatePayload(parentId, n))
    for (const ch of sortChildren(n)) {
      await dfs(created.id, ch)
    }
  }

  await dfs(newItemId, taskRoot)
}
