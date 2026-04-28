import { describe, expect, it } from 'vitest'
import {
  buildArgosHealthSummaryOverview,
  classifyArgosRiskLevel,
  filterRowsByArgosHealth,
} from './conveyorHealthBacklog'

const rows = [
  { id: '1', argosSummary: { riskLevel: 'low', healthStatus: 'healthy' } },
  { id: '2', argosSummary: { riskLevel: 'medium', healthStatus: 'attention' } },
  { id: '3', argosSummary: { riskLevel: 'high', healthStatus: 'warning' } },
  { id: '4', argosSummary: { riskLevel: 'critical', healthStatus: 'critical' } },
  { id: '5' },
]

describe('buildArgosHealthSummaryOverview', () => {
  it('conta com análise e sem análise corretamente', () => {
    const o = buildArgosHealthSummaryOverview(rows)
    expect(o.withAnalysis).toBe(4)
    expect(o.withoutAnalysis).toBe(1)
  })

  it('conta risco médio', () => {
    const o = buildArgosHealthSummaryOverview(rows)
    expect(o.riskMedium).toBe(1)
  })

  it('conta alto/crítico agrupado', () => {
    const o = buildArgosHealthSummaryOverview(rows)
    expect(o.riskHighOrCritical).toBe(2)
  })

  it('valores desconhecidos não quebram', () => {
    const o = buildArgosHealthSummaryOverview([
      { id: 'x', argosSummary: { riskLevel: 'desconhecido', healthStatus: '??' } },
    ])
    expect(o.withAnalysis).toBe(1)
    expect(o.riskLow).toBe(0)
    expect(o.riskMedium).toBe(0)
    expect(o.riskHighOrCritical).toBe(0)
  })
})

describe('filterRowsByArgosHealth', () => {
  it('without_analysis retorna apenas sem argosSummary', () => {
    const out = filterRowsByArgosHealth(rows, 'without_analysis')
    expect(out.map((r) => r.id)).toEqual(['5'])
  })

  it('with_analysis retorna apenas com argosSummary', () => {
    const out = filterRowsByArgosHealth(rows, 'with_analysis')
    expect(out).toHaveLength(4)
  })

  it('risk_high_or_critical agrupa high/critical', () => {
    const out = filterRowsByArgosHealth(rows, 'risk_high_or_critical')
    expect(out.map((r) => r.id)).toEqual(['3', '4'])
  })

  it('health_attention funciona', () => {
    const out = filterRowsByArgosHealth(rows, 'health_attention')
    expect(out.map((r) => r.id)).toEqual(['2'])
  })
})

describe('classifyArgosRiskLevel', () => {
  it('normaliza pt-br com acento e sem acento', () => {
    expect(classifyArgosRiskLevel('médio')).toBe('medium')
    expect(classifyArgosRiskLevel('medio')).toBe('medium')
    expect(classifyArgosRiskLevel('crítico')).toBe('critical')
  })
})
