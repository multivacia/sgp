import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import { parseMatrixActivitySupportIds } from './matrixActivityCollaboratorsMeta'
import {
  reconcileEtapaCollaborators,
  type CriarMatrizManualEtapa,
} from './criarMatrizManualDraft'
import {
  type CatalogOpcaoDraftInstance,
  sortMatrixChildNodes,
} from './cloneCatalogTaskSubtreeForDraft'

function activityToEtapaReconciled(node: MatrixNodeTreeApi): CriarMatrizManualEtapa {
  const primary = node.default_responsible_id
  const support = parseMatrixActivitySupportIds(node.metadata_json)
  const collabIds = [
    ...new Set([
      ...(primary ? [primary] : []),
      ...support.filter((x) => x !== primary),
    ]),
  ]
  return reconcileEtapaCollaborators({
    id: node.id,
    name: node.name,
    plannedMinutes: node.planned_minutes,
    teamIds: [...(node.team_ids ?? [])],
    collaboratorIds: collabIds,
    primaryCollaboratorId: primary,
  })
}

/**
 * Valida regras alinhadas ao modo manual (principal vs vários colaboradores).
 */
export function validateCatalogOpcoesDraftForSubmit(
  instances: CatalogOpcaoDraftInstance[],
): string | null {
  for (const inst of instances) {
    const task = inst.draftRoot
    if (!task.name.trim()) {
      return 'Cada opção reaproveitada precisa de um nome.'
    }
    for (const sector of sortMatrixChildNodes(task)) {
      if (sector.node_type !== 'SECTOR') continue
      if (!sector.name.trim()) {
        return 'Cada área precisa de um nome.'
      }
      for (const act of sortMatrixChildNodes(sector)) {
        if (act.node_type !== 'ACTIVITY') continue
        if (!act.name.trim()) {
          return 'Cada etapa precisa de um nome.'
        }
        const r = activityToEtapaReconciled(act)
        if (
          r.primaryCollaboratorId &&
          !r.collaboratorIds.includes(r.primaryCollaboratorId)
        ) {
          return 'O colaborador principal tem de estar entre os selecionados na etapa.'
        }
        if (r.collaboratorIds.length > 1 && !r.primaryCollaboratorId) {
          return 'Quando há mais do que um colaborador na etapa, indique quem é o principal.'
        }
      }
    }
  }
  return null
}
