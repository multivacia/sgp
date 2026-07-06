import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import { resolveActivityPlannedTotalMinutes } from '../../../domain/operational/activityOperationalQuantity'
import type {
  ManualAreaDraft,
  ManualOptionDraft,
  NovaEsteiraAlocacaoLinha,
} from '../nova-esteira/matrixToConveyorCreateInput'
import {
  matrixActivityToInitialAllocRows,
} from '../nova-esteira/novaEsteiraDraftFromMatrix'
import type {
  AppliedMatrixBlock,
  LabActivityItem,
  LabActivityOverride,
  LabSectorGroup,
} from './laboratorioEsteiras.types'

function sortByOrder(children: MatrixNodeTreeApi[]): MatrixNodeTreeApi[] {
  return [...children].sort((a, b) => a.order_index - b.order_index)
}

function newKey() {
  return crypto.randomUUID()
}

export function listAllMatrixActivities(tree: MatrixNodeTreeApi): LabActivityItem[] {
  if (tree.node_type !== 'ITEM') return []
  const out: LabActivityItem[] = []
  const tasks = sortByOrder(tree.children.filter((c) => c.node_type === 'TASK'))
  for (const task of tasks) {
    const taskName = task.name.trim()
    const sectors = sortByOrder(task.children.filter((c) => c.node_type === 'SECTOR'))
    for (const sector of sectors) {
      const sectorName = sector.name.trim()
      const activities = sortByOrder(sector.children.filter((c) => c.node_type === 'ACTIVITY'))
      for (const act of activities) {
        out.push({
          id: act.id,
          name: act.name.trim(),
          plannedMinutes: Math.max(0, Math.floor(Number(act.planned_minutes ?? 0))),
          taskId: task.id,
          taskName,
          sectorId: sector.id,
          sectorName,
        })
      }
    }
  }
  return out
}

export function extractSectorGroupsFromMatrix(tree: MatrixNodeTreeApi): LabSectorGroup[] {
  const activities = listAllMatrixActivities(tree)
  const bySector = new Map<string, LabSectorGroup>()
  for (const act of activities) {
    const existing = bySector.get(act.sectorId)
    if (existing) {
      existing.activities.push(act)
      continue
    }
    bySector.set(act.sectorId, {
      sectorId: act.sectorId,
      sectorName: act.sectorName,
      taskId: act.taskId,
      taskName: act.taskName,
      activities: [act],
    })
  }
  return [...bySector.values()]
}

export function countActivitiesInTree(tree: MatrixNodeTreeApi | undefined): number {
  if (!tree) return 0
  return listAllMatrixActivities(tree).length
}

export function sumMinutesInTree(tree: MatrixNodeTreeApi | undefined): number {
  if (!tree) return 0
  return listAllMatrixActivities(tree).reduce((n, a) => n + a.plannedMinutes, 0)
}

export function sumMinutesForActivityIds(
  tree: MatrixNodeTreeApi,
  selectedIds: Set<string>,
): number {
  return listAllMatrixActivities(tree)
    .filter((a) => selectedIds.has(a.id))
    .reduce((n, a) => n + a.plannedMinutes, 0)
}

export function defaultSelectedActivityIds(tree: MatrixNodeTreeApi): Set<string> {
  return new Set(listAllMatrixActivities(tree).map((a) => a.id))
}

export function buildManualOptionsFromMatrixSelection(
  tree: MatrixNodeTreeApi,
  matrixId: string,
  selectedActivityIds: Set<string>,
  activityOverrides: Record<string, LabActivityOverride> = {},
): {
  options: ManualOptionDraft[]
  allocations: Record<string, NovaEsteiraAlocacaoLinha[]>
} {
  if (tree.node_type !== 'ITEM') {
    return { options: [], allocations: {} }
  }
  const tasks = sortByOrder(tree.children.filter((c) => c.node_type === 'TASK'))
  const options: ManualOptionDraft[] = []
  const allocations: Record<string, NovaEsteiraAlocacaoLinha[]> = {}

  for (const task of tasks) {
    const sectors = sortByOrder(task.children.filter((c) => c.node_type === 'SECTOR'))
    const areas: ManualAreaDraft[] = []

    for (const sector of sectors) {
      const activities = sortByOrder(
        sector.children.filter(
          (c) => c.node_type === 'ACTIVITY' && selectedActivityIds.has(c.id),
        ),
      )
      if (activities.length === 0) continue

      const steps = activities.map((act) => {
        const ov = activityOverrides[act.id]
        const step = {
          key: newKey(),
          titulo: (ov?.name ?? act.name).trim(),
          plannedMinutes: Math.max(
            0,
            Math.floor(Number(ov?.plannedMinutes ?? act.planned_minutes ?? 0)),
          ),
          plannedQuantity: 1,
        }
        const rows = matrixActivityToInitialAllocRows(act)
        if (rows.length > 0) allocations[step.key] = rows
        return step
      })

      areas.push({
        key: newKey(),
        titulo: sector.name.trim(),
        steps,
      })
    }

    if (areas.length === 0) continue
    options.push({
      key: newKey(),
      titulo: task.name.trim(),
      catalogSourceKey: `mroot:${matrixId}:task:${task.id}`,
      areas,
    })
  }

  return { options, allocations }
}

export function buildAppliedMatrixBlock(
  tree: MatrixNodeTreeApi,
  matrixId: string,
  matrixName: string,
  selectedActivityIds: Set<string>,
  blockId: string = newKey(),
  activityOverrides: Record<string, LabActivityOverride> = {},
): AppliedMatrixBlock | null {
  const { options, allocations } = buildManualOptionsFromMatrixSelection(
    tree,
    matrixId,
    selectedActivityIds,
    activityOverrides,
  )
  if (options.length === 0) return null
  return {
    blockId,
    matrixId,
    matrixName,
    selectedActivityIds: [...selectedActivityIds],
    options,
    allocations,
  }
}

export function countStepsInBlock(block: AppliedMatrixBlock): number {
  return block.options.reduce(
    (n, o) => n + o.areas.reduce((a, ar) => a + ar.steps.length, 0),
    0,
  )
}

export function sumMinutesInBlock(block: AppliedMatrixBlock): number {
  let total = 0
  for (const op of block.options) {
    for (const ar of op.areas) {
      for (const st of ar.steps) {
        total += resolveActivityPlannedTotalMinutes(st.plannedMinutes, st.plannedQuantity)
      }
    }
  }
  return total
}

export function summarizeAppliedBlocks(blocks: AppliedMatrixBlock[]): {
  matrixCount: number
  activityCount: number
  totalMinutes: number
} {
  return {
    matrixCount: blocks.length,
    activityCount: blocks.reduce((n, b) => n + countStepsInBlock(b), 0),
    totalMinutes: blocks.reduce((n, b) => n + sumMinutesInBlock(b), 0),
  }
}

export function mergeBlocksToManualRoots(blocks: AppliedMatrixBlock[]): ManualOptionDraft[] {
  return blocks.flatMap((b) => b.options)
}

export function mergeBlocksToAllocations(
  blocks: AppliedMatrixBlock[],
): Record<string, NovaEsteiraAlocacaoLinha[]> {
  return blocks.reduce<Record<string, NovaEsteiraAlocacaoLinha[]>>((acc, b) => {
    return { ...acc, ...b.allocations }
  }, {})
}
