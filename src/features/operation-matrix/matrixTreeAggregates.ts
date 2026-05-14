import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'

/**
 * IDs de equipe da atividade: trim, dedupe mantendo a 1ª ocorrência (ordem do backend / assignment).
 */
export function normalizeMatrixTeamIds(teamIds: string[] | undefined | null): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of teamIds ?? []) {
    const s = (raw ?? '').trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

/** Equipe padrão da atividade na Matriz (no máximo uma; usa a 1ª da lista persistida). */
export function matrixActivityPrimaryTeamId(node: MatrixNodeTreeApi): string | null {
  if (node.node_type !== 'ACTIVITY') return null
  const ids = normalizeMatrixTeamIds(node.team_ids)
  return ids[0] ?? null
}

/** Atividade com equipe padrão definida (colaborador legado em `default_responsible_id` não conta). */
export function activityHasMatrixDefaultTeam(node: MatrixNodeTreeApi): boolean {
  return matrixActivityPrimaryTeamId(node) != null
}

/** Agregados da subárvore enraizada em um nó (para chips na árvore e resumo no painel). */
export type MatrixBranchStats = {
  taskCount: number
  sectorCount: number
  activityCount: number
  /** Soma de planned_minutes nas atividades da subárvore (null conta como 0). */
  plannedMinutesSum: number
  /** Atividades sem equipe padrão na subárvore deste nó. */
  activitiesWithoutDefaultTeamInBranch: number
}

/** Totais da matriz inteira (item raiz) + métricas de equipe padrão. */
export type MatrixTreeGlobalStats = MatrixBranchStats & {
  /** Atividades sem equipe padrão (matriz inteira). */
  activitiesWithoutDefaultTeam: number
  /** Equipe padrão referenciada mas não existe no conjunto de equipes carregado (catálogo). */
  activitiesWithOrphanDefaultTeam: number
  /** Quantidade de equipes distintas usadas como padrão e presentes no catálogo carregado. */
  linkedDistinctDefaultTeams: number
  /** IDs distintos de equipe padrão referenciados nas atividades. */
  distinctDefaultTeamIdsInTree: number
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
  activitiesWithoutDefaultTeamInBranch: 0,
})

function mergeBranch(a: MatrixBranchStats, b: MatrixBranchStats): MatrixBranchStats {
  return {
    taskCount: a.taskCount + b.taskCount,
    sectorCount: a.sectorCount + b.sectorCount,
    activityCount: a.activityCount + b.activityCount,
    plannedMinutesSum: a.plannedMinutesSum + b.plannedMinutesSum,
    activitiesWithoutDefaultTeamInBranch:
      a.activitiesWithoutDefaultTeamInBranch +
      b.activitiesWithoutDefaultTeamInBranch,
  }
}

/**
 * Uma única travessia em profundidade: preenche `byNodeId` com agregados da subárvore
 * de cada nó e calcula métricas globais de equipe padrão.
 * `validTeamIdSet`: equipes conhecidas no carregamento atual (para deteção de órfãos).
 */
export function buildMatrixTreeAggregateMaps(
  tree: MatrixNodeTreeApi,
  validTeamIdSet: ReadonlySet<string>,
): MatrixTreeAggregateMaps {
  const byNodeId: Record<string, MatrixBranchStats> = {}

  let activitiesWithoutDefaultTeam = 0
  let activitiesWithOrphanDefaultTeam = 0
  const teamIdsSeen = new Set<string>()
  const linkedTeamIds = new Set<string>()

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
      const primary = matrixActivityPrimaryTeamId(node)
      const withoutTeam = primary == null
      acc = mergeBranch(acc, {
        ...emptyBranch(),
        activityCount: 1,
        plannedMinutesSum: pm,
        activitiesWithoutDefaultTeamInBranch: withoutTeam ? 1 : 0,
      })
      if (withoutTeam) {
        activitiesWithoutDefaultTeam += 1
      }
      if (primary != null) {
        teamIdsSeen.add(primary)
        if (validTeamIdSet.has(primary)) {
          linkedTeamIds.add(primary)
        } else {
          activitiesWithOrphanDefaultTeam += 1
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
      activitiesWithoutDefaultTeam,
      activitiesWithOrphanDefaultTeam,
      linkedDistinctDefaultTeams: linkedTeamIds.size,
      distinctDefaultTeamIdsInTree: teamIdsSeen.size,
    },
  }
}

export function getBranchStats(
  maps: MatrixTreeAggregateMaps,
  nodeId: string,
): MatrixBranchStats {
  return maps.byNodeId[nodeId] ?? emptyBranch()
}
