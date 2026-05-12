import type pg from 'pg'
import { listConveyorNodesForSequenceAnalysis } from './conveyors.repository.js'
import {
  analyzeConveyorActivitySequence,
  type ConveyorActivitySequenceAnalysis,
  type SequenceAnalysisNode,
} from './conveyorActivitySequence.logic.js'

export type { ConveyorActivitySequenceAnalysis, SequenceAnalysisNode }

/**
 * Análise de sequência operacional recomendada para uma Atividade (STEP).
 */
export async function serviceAnalyzeConveyorActivitySequence(
  pool: pg.Pool,
  conveyorId: string,
  activityNodeId: string,
): Promise<ConveyorActivitySequenceAnalysis> {
  const nodes = await listConveyorNodesForSequenceAnalysis(pool, conveyorId)
  return analyzeConveyorActivitySequence(nodes as SequenceAnalysisNode[], activityNodeId)
}
