import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api/apiErrors'
import {
  buildConveyorHealthTrendSummary,
  friendlyHealthAnalysisMessage,
  summarizeConveyorHealthAnalysis,
  summarizeConveyorHealthMeta,
} from './conveyorHealthDisplay'

describe('summarizeConveyorHealthAnalysis', () => {
  it('prioriza formato aninhado oficial (health + narrative)', () => {
    const s = summarizeConveyorHealthAnalysis({
      health: { status: 'attention', score: 71, riskLevel: 'medium' },
      narrative: {
        title: 'Esteira em atenção',
        summary: 'Resumo oficial',
        operationalReading: 'Leitura operacional oficial',
      },
      findings: [{ title: 'Pendência concentrada' }],
      bottlenecks: ['Área montagem'],
      recommendedActions: ['Redistribuir carga'],
      score: 10,
      riskLevel: 'old',
    })
    expect(s.overallLabel).toBe('attention')
    expect(s.score).toBe(71)
    expect(s.riskLevel).toBe('medium')
    expect(s.narrative).toBe('Resumo oficial')
    expect(s.findings).toEqual(['Pendência concentrada'])
    expect(s.bottlenecks).toEqual(['Área montagem'])
    expect(s.recommendedActions).toEqual(['Redistribuir carga'])
  })

  it('mantém leitura de campos top-level oficiais quando disponíveis', () => {
    const s = summarizeConveyorHealthAnalysis({
      overallHealth: 'Estável',
      score: 82,
      riskLevel: 'médio',
      narrative: 'Linha principal da análise.',
      findings: [{ title: 'Pendência concentrada' }],
      bottlenecks: ['Área montagem'],
      recommendedActions: ['Redistribuir carga'],
    })
    expect(s.overallLabel).toBe('Estável')
    expect(s.score).toBe(82)
    expect(s.riskLevel).toBe('médio')
    expect(s.narrative).toBe('Linha principal da análise.')
    expect(s.findings).toEqual(['Pendência concentrada'])
    expect(s.bottlenecks).toEqual(['Área montagem'])
    expect(s.recommendedActions).toEqual(['Redistribuir carga'])
  })

  it('mantém fallback defensivo para payload legado', () => {
    const s = summarizeConveyorHealthAnalysis({
      status: 'Atenção',
      overallScore: '67',
      risk: 'alto',
      summary: 'Resumo legado',
      achados: [{ message: 'Fila crescente' }],
      gargalos: ['Separação'],
      actions: ['Rebalancear operadores'],
    })
    expect(s.overallLabel).toBe('Atenção')
    expect(s.score).toBe(67)
    expect(s.riskLevel).toBe('alto')
    expect(s.narrative).toBe('Resumo legado')
    expect(s.findings).toEqual(['Fila crescente'])
    expect(s.bottlenecks).toEqual(['Separação'])
    expect(s.recommendedActions).toEqual(['Rebalancear operadores'])
  })
})

describe('summarizeConveyorHealthMeta', () => {
  it('prioriza meta oficial e usa fallback em data quando necessário', () => {
    const meta = summarizeConveyorHealthMeta(
      { routeUsed: 'from-data', llmUsed: true },
      {
        analysisId: 'a1',
        requestId: 'req-123',
        correlationId: 'corr-123',
        routeUsed: 'deterministic',
        llmUsed: false,
        savedAt: '2026-04-27T12:00:00.000Z',
      },
    )
    expect(meta.analysisId).toBe('a1')
    expect(meta.requestId).toBe('req-123')
    expect(meta.correlationId).toBe('corr-123')
    expect(meta.routeUsed).toBe('deterministic')
    expect(meta.llmUsed).toBe(false)
    expect(meta.savedAt).toBe('2026-04-27T12:00:00.000Z')
  })

  it('extrai routeUsed de data.request e llmUsed de data.governance quando meta não traz', () => {
    const meta = summarizeConveyorHealthMeta(
      {
        request: { routeUsed: 'deterministic' },
        governance: { llmUsed: false },
        routeUsed: 'legacy-route',
        llmUsed: true,
      },
      undefined,
    )
    expect(meta.routeUsed).toBe('deterministic')
    expect(meta.llmUsed).toBe(false)
  })
})

describe('friendlyHealthAnalysisMessage', () => {
  it('503 menciona indisponível', () => {
    expect(friendlyHealthAnalysisMessage(new ApiError('x', 503))).toContain(
      'indisponível',
    )
  })

  it('504 menciona demora de resposta', () => {
    expect(friendlyHealthAnalysisMessage(new ApiError('x', 504))).toContain(
      'demorou',
    )
  })

  it('502 menciona falha de comunicação', () => {
    expect(friendlyHealthAnalysisMessage(new ApiError('x', 502))).toContain(
      'comunicação',
    )
  })

  it('401 orienta novo login', () => {
    expect(friendlyHealthAnalysisMessage(new ApiError('x', 401))).toContain(
      'login',
    )
  })

  it('403 menciona permissão', () => {
    expect(friendlyHealthAnalysisMessage(new ApiError('x', 403))).toContain(
      'permissão',
    )
  })

  it('erro genérico para falhas desconhecidas', () => {
    expect(friendlyHealthAnalysisMessage(new Error('oops'))).toContain(
      'Não foi possível',
    )
  })
})

describe('buildConveyorHealthTrendSummary', () => {
  it('hasComparison false quando não há análise anterior', () => {
    const trend = buildConveyorHealthTrendSummary({ score: 10 }, null)
    expect(trend.hasComparison).toBe(false)
    expect(trend.overallTrend).toBe('unknown')
  })

  it('score +10 retorna improved quando risco não piora', () => {
    const trend = buildConveyorHealthTrendSummary(
      { score: 80, riskLevel: 'medium' },
      { score: 70, riskLevel: 'medium' },
    )
    expect(trend.scoreDelta).toBe(10)
    expect(trend.scoreDirection).toBe('up')
    expect(trend.overallTrend).toBe('improved')
  })

  it('score -10 retorna worsened', () => {
    const trend = buildConveyorHealthTrendSummary(
      { score: 60, riskLevel: 'medium' },
      { score: 70, riskLevel: 'medium' },
    )
    expect(trend.scoreDelta).toBe(-10)
    expect(trend.overallTrend).toBe('worsened')
  })

  it('risco high -> medium retorna improved', () => {
    const trend = buildConveyorHealthTrendSummary(
      { score: 70, riskLevel: 'medium' },
      { score: 70, riskLevel: 'high' },
    )
    expect(trend.riskDirection).toBe('improved')
  })

  it('risco medium -> high retorna worsened', () => {
    const trend = buildConveyorHealthTrendSummary(
      { score: 70, riskLevel: 'high' },
      { score: 70, riskLevel: 'medium' },
    )
    expect(trend.riskDirection).toBe('worsened')
    expect(trend.overallTrend).toBe('worsened')
  })

  it('score igual e risco igual retorna stable', () => {
    const trend = buildConveyorHealthTrendSummary(
      { score: 70, riskLevel: 'medium' },
      { score: 70, riskLevel: 'medium' },
    )
    expect(trend.scoreDirection).toBe('stable')
    expect(trend.riskDirection).toBe('stable')
    expect(trend.overallTrend).toBe('stable')
  })

  it('dados ausentes retornam unknown sem quebrar', () => {
    const trend = buildConveyorHealthTrendSummary(
      { narrative: 'x' },
      { narrative: 'y' },
    )
    expect(trend.scoreDirection).toBe('unknown')
    expect(trend.riskDirection).toBe('unknown')
    expect(trend.overallTrend).toBe('unknown')
  })

  it('formato aninhado analysis.health continua funcionando', () => {
    const trend = buildConveyorHealthTrendSummary(
      { health: { status: 'attention', score: 71, riskLevel: 'medium' } },
      { health: { status: 'warning', score: 61, riskLevel: 'high' } },
    )
    expect(trend.scoreDelta).toBe(10)
    expect(trend.healthDirection).toBe('improved')
    expect(trend.riskDirection).toBe('improved')
  })

  it('normaliza português baixo/médio/alto/crítico', () => {
    const trend = buildConveyorHealthTrendSummary(
      { riskLevel: 'médio' },
      { riskLevel: 'alto' },
    )
    expect(trend.riskDirection).toBe('improved')
    const trend2 = buildConveyorHealthTrendSummary(
      { riskLevel: 'crítico' },
      { riskLevel: 'baixo' },
    )
    expect(trend2.riskDirection).toBe('worsened')
  })
})
