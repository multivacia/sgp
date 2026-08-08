import type {
  MatrixDuplicationWarning,
  MatrixNodeTreeApi,
} from '../../../domain/operation-matrix/operation-matrix.types'
import { resolveNodeSourceKey } from '../../../domain/operation-matrix/resolveNodeSourceKey'
import { matrixActivityPrimaryTeamId } from '../matrixTreeAggregates'
import { ApiError } from '../../../lib/api/apiErrors'
import {
  createMatrixNode,
  type CreateMatrixNodeInput,
} from '../../../services/operation-matrix/operationMatrixApiService'

/**
 * Mensagem devolvida pelo backend (`operation-matrix.service.ts`) quando
 * `defaultResponsibleId` de um `POST /operation-matrix/nodes` é inválido
 * (colaborador inativo, ou não é membro ativo da equipe informada).
 */
const RESPONSIBLE_INVALID_MESSAGE =
  'O colaborador responsável deve ser um colaborador ativo e membro ativo da equipe informada.'

function isInvalidDefaultResponsibleError(e: unknown): boolean {
  return (
    e instanceof ApiError &&
    e.status === 422 &&
    e.message === RESPONSIBLE_INVALID_MESSAGE
  )
}

function cloneResponsibleNotCopiedWarning(
  source: MatrixNodeTreeApi,
  createdActivityId: string,
  sourceResponsibleId: string,
): MatrixDuplicationWarning {
  return {
    code: 'MATRIX_ACTIVITY_RESPONSIBLE_NOT_COPIED',
    sourceActivityId: source.id,
    duplicatedActivityId: createdActivityId,
    activityName: source.name,
    sourceResponsibleId,
    reason: 'RESPONSIBLE_NOT_IN_TEAM',
    message:
      'A atividade foi clonada sem responsável porque o colaborador configurado não pertence mais à equipe ou está inativo. Revise a atividade e selecione um responsável válido.',
  }
}

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
    sourceKey: resolveNodeSourceKey(node),
    metadataJson: node.metadata_json ?? undefined,
  }

  if (node.node_type === 'ACTIVITY') {
    const tid = matrixActivityPrimaryTeamId(node)
    return {
      ...shared,
      nodeType: 'ACTIVITY',
      plannedMinutes: node.planned_minutes,
      teamIds: tid ? [tid] : [],
      defaultResponsibleId: node.default_responsible_id ?? null,
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

export type CloneTaskSubtreeResult = {
  warnings: MatrixDuplicationWarning[]
}

/**
 * Replica a subárvore de uma opção (`TASK`) sob o novo item raiz, preservando ordem relativa.
 *
 * Para `ACTIVITY` com `defaultResponsibleId`, se o backend rejeitar o responsável
 * (HTTP 422 — colaborador inativo ou fora da equipe enviada), a criação é repetida
 * uma vez sem o responsável, para não abortar a clonagem inteira da subárvore por
 * um único responsável inválido. O aviso resultante é coletado e devolvido ao
 * chamador (mesma forma de `MatrixDuplicationWarning` usada pelos endpoints de
 * duplicação).
 */
export async function cloneTaskSubtreeUnderItem(
  newItemId: string,
  taskRoot: MatrixNodeTreeApi,
): Promise<CloneTaskSubtreeResult> {
  if (taskRoot.node_type !== 'TASK') {
    throw new Error('cloneTaskSubtreeUnderItem: raiz deve ser TASK')
  }

  const warnings: MatrixDuplicationWarning[] = []

  async function dfs(parentId: string, n: MatrixNodeTreeApi): Promise<void> {
    const payload = buildCreatePayload(parentId, n)
    let created
    try {
      created = await createMatrixNode(payload)
    } catch (e) {
      if (
        n.node_type === 'ACTIVITY' &&
        payload.defaultResponsibleId &&
        isInvalidDefaultResponsibleError(e)
      ) {
        created = await createMatrixNode({
          ...payload,
          defaultResponsibleId: null,
        })
        warnings.push(
          cloneResponsibleNotCopiedWarning(
            n,
            created.id,
            payload.defaultResponsibleId,
          ),
        )
      } else {
        throw e
      }
    }
    for (const ch of sortChildren(n)) {
      await dfs(created.id, ch)
    }
  }

  await dfs(newItemId, taskRoot)
  return { warnings }
}
