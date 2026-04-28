import { describe, expect, it } from 'vitest'
import { buildArgosDashboardSummary } from './conveyorHealthDashboard'

describe('buildArgosDashboardSummary', () => {
  it('calcula score médio ignorando score ausente', () => {
    const s = buildArgosDashboardSummary([
      { conveyorId: 'c1', analysisId: 'a1', createdAt: '2026-04-01T10:00:00.000Z', score: 70 },
      { conveyorId: 'c2', analysisId: 'a2', createdAt: '2026-04-02T10:00:00.000Z' },
      { conveyorId: 'c3', analysisId: 'a3', createdAt: '2026-04-03T10:00:00.000Z', score: 80 },
    ])
    expect(s.averageScore).toBe(75)
  })

  it('conta alto/crítico', () => {
    const s = buildArgosDashboardSummary([
      { conveyorId: 'c1', analysisId: 'a1', createdAt: '2026-04-01T10:00:00.000Z', riskLevel: 'high' },
      { conveyorId: 'c2', analysisId: 'a2', createdAt: '2026-04-02T10:00:00.000Z', riskLevel: 'critical' },
      { conveyorId: 'c3', analysisId: 'a3', createdAt: '2026-04-03T10:00:00.000Z', riskLevel: 'medium' },
    ])
    expect(s.riskHighOrCritical).toBe(2)
  })

  it('conta atenção/crítico', () => {
    const s = buildArgosDashboardSummary([
      { conveyorId: 'c1', analysisId: 'a1', createdAt: '2026-04-01T10:00:00.000Z', healthStatus: 'attention' },
      { conveyorId: 'c2', analysisId: 'a2', createdAt: '2026-04-02T10:00:00.000Z', healthStatus: 'critical' },
      { conveyorId: 'c3', analysisId: 'a3', createdAt: '2026-04-03T10:00:00.000Z', healthStatus: 'healthy' },
    ])
    expect(s.healthAttention).toBe(1)
    expect(s.healthCritical).toBe(1)
  })

  it('seleciona topRiskItems por risco desc, score asc e data desc', () => {
    const s = buildArgosDashboardSummary([
      {
        conveyorId: 'c1',
        analysisId: 'a1',
        createdAt: '2026-04-01T10:00:00.000Z',
        riskLevel: 'high',
        score: 80,
      },
      {
        conveyorId: 'c2',
        analysisId: 'a2',
        createdAt: '2026-04-02T10:00:00.000Z',
        riskLevel: 'critical',
        score: 90,
      },
      {
        conveyorId: 'c3',
        analysisId: 'a3',
        createdAt: '2026-04-03T10:00:00.000Z',
        riskLevel: 'critical',
        score: 70,
      },
    ])
    expect(s.topRiskItems.map((x) => x.conveyorId)).toEqual(['c3', 'c2', 'c1'])
  })

  it('lida com lista vazia', () => {
    const s = buildArgosDashboardSummary([])
    expect(s.withAnalysis).toBe(0)
    expect(s.averageScore).toBeNull()
    expect(s.latestAnalysisAt).toBeNull()
    expect(s.topRiskItems).toEqual([])
  })
})
