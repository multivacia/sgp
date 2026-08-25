import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import {
  normalizeMatrixTeamIds,
  type MatrixTreeGlobalStats,
} from './matrixTreeAggregates'

export type MacroActivityRow = {
  id: string
  name: string
  plannedMinutes: number | null
  /** Equipe padrão (no máximo 1 id). */
  teamIds: string[]
  /** Nome da equipe para exibição; id sem cadastro aparece como texto cru. */
  teamsShortLabel: string | null
  /** Colaborador responsável opcional (`default_responsible_id`). */
  defaultResponsibleId: string | null
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
  teamIdToName: ReadonlyMap<string, string>,
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
              const teamIds = normalizeMatrixTeamIds(act.team_ids)
              const primary = teamIds[0]
              const teamsShortLabel = primary
                ? teamIdToName.get(primary) ?? primary
                : null
              return {
                id: act.id,
                name: act.name,
                plannedMinutes: act.planned_minutes,
                teamIds,
                teamsShortLabel,
                defaultResponsibleId: act.default_responsible_id ?? null,
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
