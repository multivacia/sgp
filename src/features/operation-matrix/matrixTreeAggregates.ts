import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'

/** Agregados da subárvore enraizada em um nó (para chips na árvore e resumo no painel). */
export type MatrixBranchStats = {
  taskCount: number
  sectorCount: number
  activityCount: number
  /** Soma de planned_minutes nas atividades da subárvore (null conta como 0). */
  plannedMinutesSum: number
  /** Atividades com default_responsible_id vazio na subárvore deste nó. */
  activitiesWithoutResponsibleInBranch: number
}

/** Totais da matriz inteira (item raiz) + métricas de responsável. */
export type MatrixTreeGlobalStats = MatrixBranchStats & {
  activitiesWithoutResponsible: number
  /** default_responsible_id preenchido mas não existe na lista de colaboradores carregada. */
  activitiesWithOrphanResponsible: number
  /** Quantidade de IDs distintos de responsável que existem no mapa de colaboradores. */
  linkedDistinctResponsibles: number
  /** IDs distintos referenciados em atividades (para inspeção opcional). */
  distinctResponsibleIdsInTree: number
}

export type MatrixTreeAggregateMaps = {
  byNodeId: Record<string, MatrixBranchStats>
  global: MatrixTreeGlobalStats
}

const emptyBranch = (): MatrixBranchStats => ({
  taskCount: 0,
  sectorCount: 0,
  activityCount: 0,
  plannedMinutesSum: 0,
  activitiesWithoutResponsibleInBranch: 0,
})

function mergeBranch(a: MatrixBranchStats, b: MatrixBranchStats): MatrixBranchStats {
  return {
    taskCount: a.taskCount + b.taskCount,
    sectorCount: a.sectorCount + b.sectorCount,
    activityCount: a.activityCount + b.activityCount,
    plannedMinutesSum: a.plannedMinutesSum + b.plannedMinutesSum,
    activitiesWithoutResponsibleInBranch:
      a.activitiesWithoutResponsibleInBranch +
      b.activitiesWithoutResponsibleInBranch,
  }
}

/**
 * Uma única travessia em profundidade: preenche `byNodeId` com agregados da subárvore
 * de cada nó e calcula métricas globais de responsável.
 * Complexidade O(n). Chamar apenas quando `tree` (referência) mudar — ex.: useMemo no editor.
 */
export function buildMatrixTreeAggregateMaps(
  tree: MatrixNodeTreeApi,
  collaboratorIds: ReadonlySet<string>,
): MatrixTreeAggregateMaps {
  const byNodeId: Record<string, MatrixBranchStats> = {}

  let activitiesWithoutResponsible = 0
  let activitiesWithOrphanResponsible = 0
  const responsibleIdsSeen = new Set<string>()
  const linkedIds = new Set<string>()

  function dfs(node: MatrixNodeTreeApi): MatrixBranchStats {
    let acc = emptyBranch()

    for (const c of node.children) {
      acc = mergeBranch(acc, dfs(c))
    }

    if (node.node_type === 'TASK') {
      acc = mergeBranch(acc, { ...emptyBranch(), taskCount: 1 })
    } else if (node.node_type === 'SECTOR') {
      acc = mergeBranch(acc, { ...emptyBranch(), sectorCount: 1 })
    } else if (node.node_type === 'ACTIVITY') {
      const pm = node.planned_minutes ?? 0
      const dr = node.default_responsible_id
      const withoutResp = dr == null || dr.trim() === ''
      acc = mergeBranch(acc, {
        ...emptyBranch(),
        activityCount: 1,
        plannedMinutesSum: pm,
        activitiesWithoutResponsibleInBranch: withoutResp ? 1 : 0,
      })
      if (dr == null || dr.trim() === '') {
        activitiesWithoutResponsible += 1
      } else {
        responsibleIdsSeen.add(dr)
        if (collaboratorIds.has(dr)) {
          linkedIds.add(dr)
        } else {
          activitiesWithOrphanResponsible += 1
        }
      }
    }

    byNodeId[node.id] = acc
    return acc
  }

  const rootTotals = dfs(tree)

  return {
    byNodeId,
    global: {
      ...rootTotals,
      activitiesWithoutResponsible,
      activitiesWithOrphanResponsible,
      linkedDistinctResponsibles: linkedIds.size,
      distinctResponsibleIdsInTree: responsibleIdsSeen.size,
    },
  }
}

export function getBranchStats(
  maps: MatrixTreeAggregateMaps,
  nodeId: string,
): MatrixBranchStats {
  return maps.byNodeId[nodeId] ?? emptyBranch()
}
