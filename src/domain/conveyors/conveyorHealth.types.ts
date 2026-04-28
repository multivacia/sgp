/**
 * Análise de saúde devolvida no `data` do envelope (alinhado ao backend; registo aberto).
 */
export type ConveyorHealthAnalysisV1 = {
  routeUsed?: string
  llmUsed?: boolean
  [key: string]: unknown
}

export type PostConveyorHealthAnalysisBody = {
  policy?: 'economy' | 'balanced' | 'quality'
}

export type ConveyorHealthAnalysisMeta = {
  hasAnalysis?: boolean
  analysisId?: string
  requestId?: string
  correlationId?: string
  routeUsed?: string
  llmUsed?: boolean
  savedAt?: string
  createdAt?: string
}

export type ConveyorHealthAnalysisHistoryItem = {
  analysisId: string
  createdAt: string
  requestId: string
  correlationId: string
  policy: string
  routeUsed?: string
  llmUsed?: boolean
  healthStatus?: string
  score?: number
  riskLevel?: string
  analysis: ConveyorHealthAnalysisV1
}

export type ConveyorHealthSummaryItem = {
  conveyorId: string
  analysisId: string
  createdAt: string
  healthStatus?: string
  score?: number
  riskLevel?: string
  routeUsed?: string
  llmUsed?: boolean
}

export type ArgosHealthBacklogFilter =
  | 'all'
  | 'with_analysis'
  | 'without_analysis'
  | 'risk_low'
  | 'risk_medium'
  | 'risk_high_or_critical'
  | 'health_attention'
  | 'health_critical'
