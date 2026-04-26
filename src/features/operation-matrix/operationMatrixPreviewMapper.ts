import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import type { MatrixTreeGlobalStats } from './matrixTreeAggregates'

export type MacroActivityRow = {
  id: string
  name: string
  plannedMinutes: number | null
  responsibleLabel: string | null
  required: boolean
}

export type MacroSectorBlock = {
  id: string
  name: string
  activities: MacroActivityRow[]
}

export type MacroTaskBlock = {
  id: string
  name: string
  description: string | null
  code: string | null
  isActive: boolean
  sectors: MacroSectorBlock[]
}

export type OperationMatrixMacroPreviewModel = {
  item: {
    name: string
    description: string | null
    code: string | null
    isActive: boolean
  }
  executiveSummary: MatrixTreeGlobalStats
  tasks: MacroTaskBlock[]
}

function sortByOrder(a: MatrixNodeTreeApi, b: MatrixNodeTreeApi): number {
  return a.order_index - b.order_index
}

/**
 * View model macro para preview read-only (sem JSX da tela operacional).
 */
export function buildOperationMatrixMacroPreviewModel(
  tree: MatrixNodeTreeApi,
  global: MatrixTreeGlobalStats,
  collaboratorIdToName: ReadonlyMap<string, string>,
): OperationMatrixMacroPreviewModel {
  const root = tree.node_type === 'ITEM' ? tree : null
  if (!root) {
    return {
      item: {
        name: tree.name,
        description: tree.description,
        code: tree.code,
        isActive: tree.is_active,
      },
      executiveSummary: global,
      tasks: [],
    }
  }

  const tasks = root.children
    .filter((c) => c.node_type === 'TASK')
    .slice()
    .sort(sortByOrder)
    .map((task): MacroTaskBlock => {
      const sectors = task.children
        .filter((c) => c.node_type === 'SECTOR')
        .slice()
        .sort(sortByOrder)
        .map((sector): MacroSectorBlock => {
          const activities = sector.children
            .filter((c) => c.node_type === 'ACTIVITY')
            .slice()
            .sort(sortByOrder)
            .map((act): MacroActivityRow => {
              const dr = act.default_responsible_id
              const responsibleLabel =
                dr && dr.trim() !== ''
                  ? collaboratorIdToName.get(dr) ?? dr
                  : null
              return {
                id: act.id,
                name: act.name,
                plannedMinutes: act.planned_minutes,
                responsibleLabel,
                required: act.required,
              }
            })
          return {
            id: sector.id,
            name: sector.name,
            activities,
          }
        })
      return {
        id: task.id,
        name: task.name,
        description: task.description,
        code: task.code,
        isActive: task.is_active,
        sectors,
      }
    })

  return {
    item: {
      name: root.name,
      description: root.description,
      code: root.code,
      isActive: root.is_active,
    },
    executiveSummary: global,
    tasks,
  }
}
