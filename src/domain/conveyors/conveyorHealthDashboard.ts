import type { ConveyorHealthSummaryItem } from './conveyorHealth.types'
import {
  classifyArgosHealthStatus,
  classifyArgosRiskLevel,
} from './conveyorHealthBacklog'

export type ArgosDashboardTopRiskItem = {
  conveyorId: string
  analysisId: string
  createdAt: string
  healthStatus?: string
  score?: number
  riskLevel?: string
}

export type ArgosDashboardSummary = {
  withAnalysis: number
  riskHighOrCritical: number
  healthAttention: number
  healthCritical: number
  averageScore: number | null
  latestAnalysisAt: string | null
  topRiskItems: ArgosDashboardTopRiskItem[]
}

function riskWeight(v: string | undefined): number {
  const risk = classifyArgosRiskLevel(v)
  if (risk === 'critical') return 4
  if (risk === 'high') return 3
  if (risk === 'medium') return 2
  if (risk === 'low') return 1
  return 0
}

function isAttentionCandidate(item: ConveyorHealthSummaryItem): boolean {
  const risk = classifyArgosRiskLevel(item.riskLevel)
  const health = classifyArgosHealthStatus(item.healthStatus)
  return (
    risk === 'medium' ||
    risk === 'high' ||
    risk === 'critical' ||
    health === 'attention' ||
    health === 'critical'
  )
}

export function buildArgosDashboardSummary(
  summaryItems: ConveyorHealthSummaryItem[],
): ArgosDashboardSummary {
  const withAnalysis = summaryItems.length
  let riskHighOrCritical = 0
  let healthAttention = 0
  let healthCritical = 0
  let scoreSum = 0
  let scoreCount = 0
  let latestAnalysisAt: string | null = null

  for (const item of summaryItems) {
    const risk = classifyArgosRiskLevel(item.riskLevel)
    const health = classifyArgosHealthStatus(item.healthStatus)
    if (risk === 'high' || risk === 'critical') riskHighOrCritical += 1
    if (health === 'attention') healthAttention += 1
    if (health === 'critical') healthCritical += 1
    if (typeof item.score === 'number' && Number.isFinite(item.score)) {
      scoreSum += item.score
      scoreCount += 1
    }
    if (!latestAnalysisAt || item.createdAt > latestAnalysisAt) {
      latestAnalysisAt = item.createdAt
    }
  }

  const topRiskItems = summaryItems
    .filter(isAttentionCandidate)
    .slice()
    .sort((a, b) => {
      const riskCmp = riskWeight(b.riskLevel) - riskWeight(a.riskLevel)
      if (riskCmp !== 0) return riskCmp
      const aScore = typeof a.score === 'number' && Number.isFinite(a.score) ? a.score : Number.POSITIVE_INFINITY
      const bScore = typeof b.score === 'number' && Number.isFinite(b.score) ? b.score : Number.POSITIVE_INFINITY
      if (aScore !== bScore) return aScore - bScore
      return b.createdAt.localeCompare(a.createdAt)
    })
    .slice(0, 5)
    .map((i) => ({
      conveyorId: i.conveyorId,
      analysisId: i.analysisId,
      createdAt: i.createdAt,
      healthStatus: i.healthStatus,
      score: i.score,
      riskLevel: i.riskLevel,
    }))

  return {
    withAnalysis,
    riskHighOrCritical,
    healthAttention,
    healthCritical,
    averageScore: scoreCount > 0 ? Number((scoreSum / scoreCount).toFixed(1)) : null,
    latestAnalysisAt,
    topRiskItems,
  }
}
