import type { MatrixTreeAggregateMaps } from './matrixTreeAggregates'
import { getBranchStats } from './matrixTreeAggregates'

/** Resumo por TASK (bloco) para cards e badges. */
export type TaskTreeAggregate = {
  sectorsCount: number
  activitiesCount: number
  totalMinutes: number
}

export function getTaskAggregate(
  maps: MatrixTreeAggregateMaps,
  taskId: string,
): TaskTreeAggregate {
  const st = getBranchStats(maps, taskId)
  return {
    sectorsCount: st.sectorCount,
    activitiesCount: st.activityCount,
    totalMinutes: st.plannedMinutesSum,
  }
}
