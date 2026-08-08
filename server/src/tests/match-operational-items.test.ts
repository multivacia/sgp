import { describe, expect, it } from 'vitest'
import type pg from 'pg'
import {
  buildIlikePatternsFromService,
  limitPreviewActivities,
  matchOperationalItems,
  MATCH_RECALL_LIMIT,
  MATCH_TASK_RECALL_LIMIT,
  MATRIX_SUBTREE_PREVIEW_ACTIVITIES_LIMIT,
  normalizeMatchingText,
  normalizeMatrixMatchCandidateFromSql,
  type MatrixMatchCandidate,
  sanitizeMatchingErrorMessageForLog,
  scoreOperationalSimilarity,
  toFiniteNumber,
} from '../modules/argos-integration/pipeline/matchOperationalItems.js'
import { argosDocumentIngestResultSchema } from '../modules/argos-integration/document-draft.schemas.js'
import {
  BRAVO_MATRIX_MATCHING_SEED,
  BRAVO_MACRO_TASK_IDS,
  bravoGuardNegativeTaskRows,
  bravoMacroTaskDirectRecallRows,
  poolRowsFromMatrixSeed,
} from './fixtures/bravo-matrix-matching-seed.fixture.js'

/** Simula COUNT, recall ILIKE (actividades + TASK direto) e carga completa (enriched/fallback). */
function fakePool(matrixRows: unknown[], taskRows?: unknown[]): pg.Pool {
  return {
    query: async (sql: string) => {
      const s = sql.replace(/\s+/g, ' ')
      if (/COUNT\s*\(\*\)/i.test(s) && /matrix_nodes/i.test(s) && /ACTIVITY/i.test(s)) {
        return { rows: [{ n: matrixRows.length }] }
      }
      /** SQL_MATRIX_TASK_RECALL_ENRICHED — não confundir com JOIN `task` na recall de ACTIVITY. */
      if (/ILIKE ANY/i.test(s) && /descendantActivitiesCount/i.test(s)) {
        return { rows: (taskRows ?? []).slice(0, MATCH_TASK_RECALL_LIMIT) }
      }
      if (/ILIKE ANY/i.test(s)) {
        return { rows: matrixRows.slice(0, MATCH_RECALL_LIMIT) }
      }
      return { rows: matrixRows }
    },
  } as unknown as pg.Pool
}

/** Primeira chamada query pode falhar (enriched); segunda é fallback. */
function fakePoolSequence(
  responses: Array<{ rows?: unknown[]; error?: { code: string; message: string } }>,
  opts?: { matrixRowCount?: number },
): pg.Pool {
  let i = 0
  return {
    query: async (sql: string) => {
      const s = sql.replace(/\s+/g, ' ')
      if (/COUNT\s*\(\*\)/i.test(s) && /matrix_nodes/i.test(s) && /ACTIVITY/i.test(s)) {
        const n =
          opts?.matrixRowCount ??
          (responses.some((r) => (r.rows?.length ?? 0) > 0) ? 1 : 0)
        return { rows: [{ n }] }
      }
      if (/ILIKE ANY/i.test(s) && /descendantActivitiesCount/i.test(s)) {
        return { rows: [] }
      }
      const r = responses[i++]
      if (r?.error) {
        const err = new Error(r.error.message) as Error & { code?: string }
        err.code = r.error.code
        throw err
      }
      return { rows: r?.rows ?? [] }
    },
  } as unknown as pg.Pool
}

describe('matchOperationalItems - normalization/score', () => {
  it('normaliza acentos e pontuação', () => {
    expect(normalizeMatchingText('Revestimento, Banco RECARO!')).toBe(
      'revestimento banco recaro',
    )
  })

  it('sanitiza mensagem de erro para log', () => {
    const long = 'x'.repeat(300)
    expect(sanitizeMatchingErrorMessageForLog(long).length).toBeLessThanOrEqual(181)
    expect(sanitizeMatchingErrorMessageForLog('ok')).toBe('ok')
  })

  it('gera score alto para descrições similares', () => {
    const score = scoreOperationalSimilarity(
      'BANCO RECARO GTI LAGUNA REVESTIMENTO COMPLETO',
      'Revestimento banco Recaro',
    )
    expect(score).toBeGreaterThanOrEqual(0.85)
  })

  it('gera score baixo para descrições distantes', () => {
    const score = scoreOperationalSimilarity(
      'Troca de teto e cinto',
      'Polimento farol dianteiro',
    )
    expect(score).toBeLessThan(0.65)
  })
})

describe('matchOperationalItems - action mapping', () => {
  it('sugere REUSE_EXISTING em match forte com reusedStructure', async () => {
    const rows = [
      {
        matrixNodeId: '11111111-1111-1111-1111-111111111111',
        activity: 'Revestimento banco Recaro',
        activityDescription: 'Reveste banco esportivo com couro',
        plannedMinutes: 180,
        collaboratorId: '22222222-2222-2222-2222-222222222222',
        collaboratorName: 'Colaborador A',
        teamId: '33333333-3333-3333-3333-333333333333',
        teamName: 'Equipe Tapeçaria',
        sector: 'Tapeçaria',
        step: 'Bancos',
      },
    ]
    const { matchingPlan: plan, outcome } = await matchOperationalItems({
      pool: fakePool(rows),
      serviceItems: [
        {
          description: 'BANCO RECARO GTI LAGUNA - REVESTIMENTO COMPLETO',
        },
      ],
    })
    expect(outcome.kind).toBe('ok')
    expect(plan?.[0]?.suggestedAction).toBe('REUSE_EXISTING')
    expect(plan?.[0]?.matchedMatrixNodeId).toBe(rows[0].matrixNodeId)
    expect(plan?.[0]?.reusedStructure?.plannedMinutes).toBe(180)
    expect(plan?.[0]?.reusedStructure?.teamName).toBe('Equipe Tapeçaria')
    expect(plan?.[0]?.reusedStructure?.collaboratorName).toBe('Colaborador A')
  })

  it('sugere REVIEW_SIMILAR quando top1 e top2 têm score ambíguo (Δ≤0,08)', async () => {
    /** Dois títulos equivalentes na Matriz → mesmo score; gatilho de ambiguidade. */
    const sameLabel = 'Revestimento lateral porta malas'
    const rows = [
      {
        matrixNodeId: '11111111-1111-1111-1111-111111111111',
        activity: sameLabel,
        activityDescription: null,
        plannedMinutes: 90,
        collaboratorId: null,
        collaboratorName: null,
        teamId: null,
        teamName: null,
        sector: 'Tapeçaria',
        step: 'Laterais',
      },
      {
        matrixNodeId: '22222222-2222-2222-2222-222222222222',
        activity: sameLabel,
        activityDescription: null,
        plannedMinutes: 95,
        collaboratorId: null,
        collaboratorName: null,
        teamId: null,
        teamName: null,
        sector: 'Tapeçaria',
        step: 'Laterais',
      },
    ]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows),
      serviceItems: [{ description: 'Revestimento lateral de porta malas' }],
    })
    expect(plan?.[0]?.suggestedAction).toBe('REVIEW_SIMILAR')
    expect(plan?.[0]?.matchReason).toMatch(/Candidatos próximos|Δ≤/i)
  })

  it('sugere CREATE_NEW quando não encontra candidato confiável', async () => {
    const rows = [
      {
        matrixNodeId: '11111111-1111-1111-1111-111111111111',
        activity: 'Polimento de farol',
        activityDescription: null,
        plannedMinutes: 40,
        collaboratorId: null,
        collaboratorName: null,
        teamId: null,
        teamName: null,
        sector: 'Acabamento',
        step: 'Polimento',
      },
    ]
    const { matchingPlan: plan, outcome } = await matchOperationalItems({
      pool: fakePool(rows),
      serviceItems: [{ description: 'Reforma completa de banco recaro' }],
    })
    expect(outcome.kind).toBe('ok')
    expect(plan?.[0]?.suggestedAction).toBe('CREATE_NEW')
    expect(plan?.[0]?.matchedMatrixNodeId).toBeUndefined()
  })

  it('no_candidates quando matriz devolve zero linhas', async () => {
    const { matchingPlan: plan, outcome } = await matchOperationalItems({
      pool: fakePool([]),
      serviceItems: [{ description: 'Serviço qualquer' }],
    })
    expect(outcome.kind).toBe('no_candidates')
    expect(outcome.querySource).toBe('enriched')
    expect(plan).toHaveLength(1)
    expect(plan[0]?.suggestedAction).toBe('CREATE_NEW')
    expect(plan[0]?.matchReason).toMatch(/Nenhuma atividade ativa/)
  })

  it('technical_failure quando pool falha de forma não recuperável', async () => {
    const pool = {
      query: async () => {
        const err = new Error('connection refused') as Error & { code?: string }
        err.code = 'ECONNREFUSED'
        throw err
      },
    } as unknown as pg.Pool
    const { matchingPlan, outcome } = await matchOperationalItems({
      pool,
      serviceItems: [{ description: 'x' }],
    })
    expect(outcome.kind).toBe('technical_failure')
    expect(matchingPlan).toEqual([])
  })

  it('usa fallback quando query enriquecida falha com 42703', async () => {
    const candidateRow = {
      matrixNodeId: '11111111-1111-1111-1111-111111111111',
      activity: 'Revestimento banco Recaro',
      activityDescription: null,
      plannedMinutes: 180,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: null,
      step: null,
    }
    const pool = fakePoolSequence(
      [
        { error: { code: '42703', message: 'column c.name does not exist' } },
        { rows: [candidateRow] },
      ],
      { matrixRowCount: 1 },
    )
    const { matchingPlan: plan, outcome } = await matchOperationalItems({
      pool,
      serviceItems: [
        { description: 'BANCO RECARO GTI LAGUNA - REVESTIMENTO COMPLETO' },
      ],
    })
    expect(outcome.kind).toBe('ok')
    expect(outcome.querySource).toBe('recall_ilike')
    expect(plan?.[0]?.suggestedAction).toBe('REUSE_EXISTING')
    expect(plan?.[0]?.reusedStructure?.sector).toBeUndefined()
    expect(plan?.[0]?.reusedStructure?.teamName).toBeUndefined()
  })
})

describe('matchOperationalItems - serviceItems vazio', () => {
  it('retorna plano vazio e outcome ok', async () => {
    const { matchingPlan, outcome } = await matchOperationalItems({
      pool: fakePool([]),
      serviceItems: [],
    })
    expect(matchingPlan).toEqual([])
    expect(outcome.kind).toBe('ok')
  })
})

describe('matchOperationalItems — R6 S3 cenários Bravo (determinístico)', () => {
  const base = (
    id: string,
    activity: string,
    extra?: Partial<(typeof BRAVO_MATRIX_MATCHING_SEED)[0]>,
  ) => ({
    matrixNodeId: id,
    activity,
    activityDescription: null,
    plannedMinutes: 100,
    collaboratorId: null,
    collaboratorName: null,
    teamId: null,
    teamName: null,
    sector: 'Tapeçaria',
    step: 'Geral',
    ...extra,
  })

  it('1 — Banco Recaro longo x Matriz: REUSE_EXISTING, score ≥ 0,85', async () => {
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool([base('01', 'Revestimento banco Recaro', { plannedMinutes: 200 })]),
      serviceItems: [
        {
          description:
            'BANCO RECARO GTI LAGUNA - REVESTIMENTO COMPLETO PADRÃO ORIGINAL',
        },
      ],
    })
    expect(plan[0]?.suggestedAction).toBe('REUSE_EXISTING')
    expect(plan[0]?.confidence ?? 0).toBeGreaterThanOrEqual(0.85)
    expect(plan[0]?.reusedStructure?.plannedMinutes).toBe(200)
  })

  it('2 — Volante couro: não CREATE_NEW com candidato compatível', async () => {
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool([base('02', 'Revestimento de volante em couro')]),
      serviceItems: [{ description: 'VOLANTE GOL GTI - REVESTIR COURO' }],
    })
    expect(plan[0]?.suggestedAction).not.toBe('CREATE_NEW')
    expect(plan[0]?.matchedMatrixNodeId).toBeTruthy()
  })

  it('3 — Ombreira dianteira', async () => {
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool([base('03', 'Revestimento ombreira dianteira')]),
      serviceItems: [
        {
          description:
            'OMBREIRA DIANTEIRA GOL GTI/GTS - REVESTIMENTO NO PADRÃO ORIGINAL',
        },
      ],
    })
    expect(plan[0]?.suggestedAction).toBe('REUSE_EXISTING')
  })

  it('4 — Lateral traseira tecido', async () => {
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool([base('04', 'Troca de tecido lateral traseira')]),
      serviceItems: [
        {
          description: 'LATERAL TRASEIRA GOL GTI - TROCAR TECIDO PADRÃO ORIGINAL /PAR',
        },
      ],
    })
    expect(['REUSE_EXISTING', 'REVIEW_SIMILAR']).toContain(plan[0]?.suggestedAction)
  })

  it('5 — Acabamento tampa traseira courvin', async () => {
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool([
        base('05', 'Revestimento acabamento tampa traseira courvin'),
      ]),
      serviceItems: [
        {
          description:
            'ACABAMENTO DA TAMPA TRASEIRA GOL GTI - REVESTIMENTO EM COURVIN',
        },
      ],
    })
    expect(['REUSE_EXISTING', 'REVIEW_SIMILAR']).toContain(plan[0]?.suggestedAction)
  })

  it('6 — Cabo de aço', async () => {
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool([base('06', 'Troca cabo de aço')]),
      serviceItems: [{ description: 'CABO DE AÇO - TROCAR' }],
    })
    expect(plan[0]?.suggestedAction).toBe('REUSE_EXISTING')
  })

  it('7 — Lateral de porta', async () => {
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool([base('07', 'Revestimento lateral de porta')]),
      serviceItems: [{ description: 'LATERAL DE PORTA' }],
    })
    expect(plan[0]?.suggestedAction).not.toBe('CREATE_NEW')
  })

  it('8 — candidato genérico “Revestimento” não deve ser REUSE_EXISTING', async () => {
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool([base('08', 'Revestimento')]),
      serviceItems: [{ description: 'VOLANTE GOL GTI - REVESTIR COURO' }],
    })
    expect(plan[0]?.suggestedAction).not.toBe('REUSE_EXISTING')
  })

  it('9 — ambiguidade ombreira traseira', async () => {
    const rows = [
      base('09a', 'Revestimento ombreira traseira'),
      base('09b', 'Revestimento ombreira com aplique'),
    ]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows),
      serviceItems: [
        {
          description: 'OMBREIRA TRASEIRA GOL GTI/GTS + APLIQUES - REVESTIMENTO',
        },
      ],
    })
    expect(plan[0]?.suggestedAction).toBe('REVIEW_SIMILAR')
    expect(plan[0]?.matchReason).toMatch(/Candidatos próximos|Δ≤/i)
  })

  it('10 — sem candidato útil → CREATE_NEW', async () => {
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool([
        base('10a', 'Revestimento banco genérico'),
        base('10b', 'Troca cabo de aço'),
      ]),
      serviceItems: [{ description: 'SERVIÇO TOTALMENTE NOVO ESPECÍFICO XYZQ' }],
    })
    expect(plan[0]?.suggestedAction).toBe('CREATE_NEW')
  })

  it('seed completo: ≥3 matches úteis com plannedMinutes e reusedStructure', async () => {
    const rows = poolRowsFromMatrixSeed(BRAVO_MATRIX_MATCHING_SEED)
    const taskRows = bravoMacroTaskDirectRecallRows()
    const services = [
      'BANCO RECARO GTI LAGUNA - REVESTIMENTO COMPLETO',
      'VOLANTE GOL GTI - REVESTIR COURO',
      'OMBREIRA DIANTEIRA GOL GTI/GTS - REVESTIMENTO',
    ]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows, taskRows),
      serviceItems: services.map((description) => ({ description })),
    })
    const useful = plan.filter((p) =>
      ['REUSE_EXISTING', 'REVIEW_SIMILAR'].includes(p.suggestedAction ?? ''),
    )
    expect(useful.length).toBeGreaterThanOrEqual(3)
    for (const p of useful) {
      expect(p.reusedStructure?.activity).toBeTruthy()
      expect(p.reusedStructure?.plannedMinutes).toBeDefined()
      expect(p.matchReason?.length).toBeGreaterThan(10)
    }
  })
})

describe('matchOperationalItems — R6 S4 recall ILIKE + fallback', () => {
  const joins = {
    activityDescription: null as string | null,
    plannedMinutes: 100,
    collaboratorId: null,
    collaboratorName: null,
    teamId: null,
    teamName: null,
    sector: 'Tapeçaria',
    step: 'Geral',
  }

  it('recall devolve título distinto (volante/couro) sem full scan obrigatório', async () => {
    const row = {
      matrixNodeId: 's4-v1-1111-1111-1111-111111111111',
      activity: 'Revestimento de volante em couro natural',
      ...joins,
    }
    const pool = {
      query: async (sql: string) => {
        const s = sql.replace(/\s+/g, ' ')
        if (/COUNT\s*\(\*\)/i.test(s) && /matrix_nodes/i.test(s)) {
          return { rows: [{ n: 1 }] }
        }
        if (/ILIKE ANY/i.test(s)) return { rows: [row] }
        return { rows: [] }
      },
    } as unknown as pg.Pool
    const { matchingPlan: plan, outcome } = await matchOperationalItems({
      pool,
      serviceItems: [{ description: 'VOLANTE GOL GTI - REVESTIR COURO' }],
    })
    expect(outcome.querySource).toBe('recall_ilike')
    expect(['REUSE_EXISTING', 'REVIEW_SIMILAR']).toContain(plan[0]?.suggestedAction)
  })

  it('descrição da atividade entra no ILIKE e no score', async () => {
    const row = {
      matrixNodeId: 's4-d1-1111-1111-1111-111111111111',
      activity: 'Serviço tapiceria lateral',
      activityDescription: 'Troca de tecido lateral traseira',
      plannedMinutes: 100,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: 'Tapeçaria',
      step: 'Geral',
    }
    const pool = {
      query: async (sql: string) => {
        const s = sql.replace(/\s+/g, ' ')
        if (/COUNT\s*\(\*\)/i.test(s) && /matrix_nodes/i.test(s)) {
          return { rows: [{ n: 1 }] }
        }
        if (/ILIKE ANY/i.test(s)) return { rows: [row] }
        return { rows: [row] }
      },
    } as unknown as pg.Pool
    const { matchingPlan: plan } = await matchOperationalItems({
      pool,
      serviceItems: [
        {
          description: 'LATERAL TRASEIRA GOL GTI - TROCAR TECIDO PADRÃO ORIGINAL /PAR',
        },
      ],
    })
    expect(['REUSE_EXISTING', 'REVIEW_SIMILAR']).toContain(plan[0]?.suggestedAction)
  })

  it('matriz com linhas mas sem match útil → CREATE_NEW e outcome ok', async () => {
    const rows = [
      {
        matrixNodeId: 's4-x1-1111-1111-1111-111111111111',
        activity: 'Polimento vidro traseiro',
        ...joins,
      },
    ]
    const { matchingPlan: plan, outcome } = await matchOperationalItems({
      pool: fakePool(rows),
      serviceItems: [{ description: 'SERVIÇO TOTALMENTE NOVO ESPECÍFICO XYZQ' }],
    })
    expect(outcome.kind).toBe('ok')
    expect(plan[0]?.suggestedAction).toBe('CREATE_NEW')
  })

  it('alternativeCandidates só com confidence ≥ 0,45', async () => {
    const rows = [
      {
        matrixNodeId: 'o1-1111-1111-1111-111111111111',
        activity: 'Revestimento ombreira traseira',
        ...joins,
      },
      {
        matrixNodeId: 'o2-1111-1111-1111-111111111111',
        activity: 'Revestimento ombreira com aplique',
        ...joins,
      },
      {
        matrixNodeId: 'z9-1111-1111-1111-111111111111',
        activity: 'Inspeção compressor ar condicionado',
        ...joins,
      },
    ]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows),
      serviceItems: [
        {
          description: 'OMBREIRA TRASEIRA GOL GTI/GTS + APLIQUES - REVESTIMENTO',
        },
      ],
    })
    const alts = plan[0]?.alternativeCandidates ?? []
    expect(alts.every((a) => a.confidence >= 0.45)).toBe(true)
    expect(alts.length).toBeLessThanOrEqual(3)
    expect(alts.some((a) => a.matrixNodeId === 'z9-1111-1111-1111-111111111111')).toBe(
      false,
    )
  })

  it('buildIlikePatternsFromService ignora tokens fracos', () => {
    const p = buildIlikePatternsFromService(
      'VOLANTE GOL GTI - REVESTIR COURO PADRÃO ORIGINAL',
    )
    expect(p.some((x) => /gti|gol|original|padrao/i.test(x))).toBe(false)
    expect(p.length).toBeGreaterThan(0)
  })

  it('[AC15] alternativeCandidates (REVIEW_SIMILAR) propaga teamId/collaboratorId do candidato MATRIX_ACTIVITY', async () => {
    const rows = [
      {
        matrixNodeId: 'o1-1111-1111-1111-111111111111',
        activity: 'Revestimento ombreira traseira',
        ...joins,
        collaboratorId: 'c1-1111-1111-1111-111111111111',
        collaboratorName: 'Colaborador Ombreira',
        teamId: 't1-1111-1111-1111-111111111111',
        teamName: 'Equipe Ombreira',
      },
      {
        matrixNodeId: 'o2-1111-1111-1111-111111111111',
        activity: 'Revestimento ombreira com aplique',
        ...joins,
        collaboratorId: 'c2-2222-2222-2222-222222222222',
        collaboratorName: 'Colaborador Aplique',
        teamId: 't2-2222-2222-2222-222222222222',
        teamName: 'Equipe Aplique',
      },
    ]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows),
      serviceItems: [
        {
          description: 'OMBREIRA TRASEIRA GOL GTI/GTS + APLIQUES - REVESTIMENTO',
        },
      ],
    })
    expect(plan[0]?.suggestedAction).toBe('REVIEW_SIMILAR')
    const alts = plan[0]?.alternativeCandidates ?? []
    expect(alts.length).toBeGreaterThanOrEqual(1)
    const alt = alts.find((a) => a.matrixNodeId === 'o2-1111-1111-1111-111111111111')
    expect(alt).toBeDefined()
    expect(alt?.kind).toBe('MATRIX_ACTIVITY')
    expect(alt?.teamId).toBe('t2-2222-2222-2222-222222222222')
    expect(alt?.teamName).toBe('Equipe Aplique')
    expect(alt?.collaboratorId).toBe('c2-2222-2222-2222-222222222222')
    expect(alt?.collaboratorName).toBe('Colaborador Aplique')
  })

  it('[AC15] alternativeCandidates (CREATE_NEW) propaga teamId/collaboratorId do candidato MATRIX_ACTIVITY', async () => {
    const rows = [
      {
        matrixNodeId: 'cn-1111-1111-1111-111111111111',
        activity: 'Revestimento de banco',
        activityDescription: null,
        plannedMinutes: 100,
        collaboratorId: 'ccn-1111-1111-1111-111111111111',
        collaboratorName: 'Colaborador Banco',
        teamId: 'tcn-1111-1111-1111-111111111111',
        teamName: 'Equipe Banco',
        sector: 'Tapeçaria',
        step: 'Geral',
      },
    ]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows),
      serviceItems: [
        {
          description: 'Revestimento de banco traseiro específico modelo raro',
        },
      ],
    })
    expect(plan[0]?.suggestedAction).toBe('CREATE_NEW')
    const alts = plan[0]?.alternativeCandidates ?? []
    expect(alts.length).toBeGreaterThanOrEqual(1)
    const alt = alts.find((a) => a.matrixNodeId === 'cn-1111-1111-1111-111111111111')
    expect(alt).toBeDefined()
    expect(alt?.kind).toBe('MATRIX_ACTIVITY')
    expect(alt?.teamId).toBe('tcn-1111-1111-1111-111111111111')
    expect(alt?.teamName).toBe('Equipe Banco')
    expect(alt?.collaboratorId).toBe('ccn-1111-1111-1111-111111111111')
    expect(alt?.collaboratorName).toBe('Colaborador Banco')

    const ingest = {
      requestId: 'r-ac15',
      correlationId: 'c-ac15',
      status: 'partial' as const,
      specialist: 'spec',
      strategy: 'str',
      document: {},
      extractedFacts: [],
      warnings: [],
      confidence: null,
      draft: null,
      matchingPlan: plan,
    }
    expect(argosDocumentIngestResultSchema.safeParse(ingest).success).toBe(true)
  })
})

describe('matchOperationalItems — R6 S8 matching hierárquico', () => {
  function row(params: {
    id: string
    activity: string
    planned: number
    sector: string
    step: string
    sectorNodeId: string
    taskNodeId: string
  }) {
    return {
      matrixNodeId: params.id,
      nodeType: 'ACTIVITY',
      activity: params.activity,
      activityDescription: null,
      plannedMinutes: params.planned,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: params.sector,
      step: params.step,
      sectorNodeId: params.sectorNodeId,
      taskNodeId: params.taskNodeId,
    }
  }

  it('LATERAL TRASEIRA casa com TASK e retorna subtreeSummary', async () => {
    const taskId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    const rows = [
      row({
        id: '1',
        activity: 'Lateral traseira trocar tecido lado esquerdo',
        planned: 40,
        sector: 'Laterais',
        step: '10 - LATERAIS TRASEIRAS',
        sectorNodeId: 's1',
        taskNodeId: taskId,
      }),
      row({
        id: '2',
        activity: 'Lateral traseira trocar tecido lado direito',
        planned: 40,
        sector: 'Laterais',
        step: '10 - LATERAIS TRASEIRAS',
        sectorNodeId: 's1',
        taskNodeId: taskId,
      }),
      row({
        id: '3',
        activity: 'Acabamento lateral traseira',
        planned: 35,
        sector: 'Acabamento',
        step: '10 - LATERAIS TRASEIRAS',
        sectorNodeId: 's2',
        taskNodeId: taskId,
      }),
      row({
        id: '4',
        activity: 'Costura lateral traseira',
        planned: 40,
        sector: 'Costura',
        step: '10 - LATERAIS TRASEIRAS',
        sectorNodeId: 's3',
        taskNodeId: taskId,
      }),
      row({
        id: '5',
        activity: 'Refil acabamento lateral traseira',
        planned: 35,
        sector: 'Refil',
        step: '10 - LATERAIS TRASEIRAS',
        sectorNodeId: 's4',
        taskNodeId: taskId,
      }),
      row({
        id: '6',
        activity: 'Inspecao tecido lateral traseira',
        planned: 35,
        sector: 'Refil',
        step: '10 - LATERAIS TRASEIRAS',
        sectorNodeId: 's4',
        taskNodeId: taskId,
      }),
      row({
        id: '7',
        activity: 'Montagem lateral traseira',
        planned: 40,
        sector: 'Costura',
        step: '10 - LATERAIS TRASEIRAS',
        sectorNodeId: 's3',
        taskNodeId: taskId,
      }),
      row({
        id: '8',
        activity: 'Limpeza final lateral traseira',
        planned: 40,
        sector: 'Acabamento',
        step: '10 - LATERAIS TRASEIRAS',
        sectorNodeId: 's2',
        taskNodeId: taskId,
      }),
    ]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows),
      serviceItems: [
        {
          description:
            'LATERAL TRASEIRA GOL GTI - TROCAR TECIDO PADRÃO ORIGINAL /PAR',
        },
      ],
    })
    expect(['REUSE_EXISTING', 'REVIEW_SIMILAR']).toContain(plan[0]?.suggestedAction)
    expect(plan[0]?.matchedMatrixNodeType).toBe('TASK')
    expect(plan[0]?.matchedMatrixNodeId).toBe(taskId)
    expect(plan[0]?.subtreeSummary?.totalAreas).toBe(4)
    expect(plan[0]?.subtreeSummary?.totalActivities).toBe(8)
    expect(plan[0]?.subtreeSummary?.totalPlannedMinutes).toBe(305)
    expect(plan[0]?.matrixSubtree?.rootNodeType).toBe('TASK')
    expect(plan[0]?.matrixSubtree?.areas).toHaveLength(4)
    expect(plan[0]?.matrixSubtree?.totalActivities).toBe(8)
    expect(plan[0]?.matrixSubtree?.totalPlannedMinutes).toBe(305)
    expect((plan[0]?.subtreeSummary?.previewActivities ?? []).length).toBeLessThanOrEqual(
      MATRIX_SUBTREE_PREVIEW_ACTIVITIES_LIMIT,
    )
  })

  it('S9.2.2 — subtreeSummary.previewActivities ≤ 5; totalActivities mantém agregado SQL', async () => {
    const taskId = '92222222-2222-4222-8222-922222222222'
    const taskRow = {
      matrixNodeId: taskId,
      nodeType: 'TASK',
      activity: '9 - TAMPA TRASEIRA',
      activityDescription: 'p1 | p2 | p3 | p4 | p5 | p6',
      plannedMinutes: 200,
      descendantActivitiesCount: 10,
      descendantSectorsCount: 4,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: null,
      step: '9 - TAMPA TRASEIRA',
      sectorNodeId: null,
      taskNodeId: taskId,
      activityOrderIndex: 0,
      sectorOrderIndex: 0,
    }
    const matrixDummy = {
      matrixNodeId: 'dummy-act',
      nodeType: 'ACTIVITY',
      activity: 'Irrelevant activity xyz qwerty',
      activityDescription: null,
      plannedMinutes: 1,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: 'X',
      step: 'Y',
      sectorNodeId: 's-d',
      taskNodeId: 'other-task-id',
    }
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool([matrixDummy], [taskRow]),
      serviceItems: [
        {
          description:
            'ACABAMENTO DA TAMPA TRASEIRA GOL GTI - REVESTIMENTO EM COURVIN',
        },
      ],
    })
    expect(plan[0]?.matchedMatrixNodeId).toBe(taskId)
    expect(plan[0]?.subtreeSummary?.totalActivities).toBe(10)
    expect(plan[0]?.subtreeSummary?.previewActivities?.length).toBe(
      MATRIX_SUBTREE_PREVIEW_ACTIVITIES_LIMIT,
    )
    expect(
      limitPreviewActivities(['a', 'b', 'c', 'd', 'e', 'f', 'g']).length,
    ).toBe(MATRIX_SUBTREE_PREVIEW_ACTIVITIES_LIMIT)

    const ingest = {
      requestId: 'r-s922',
      correlationId: 'c-s922',
      status: 'partial' as const,
      specialist: 'spec',
      strategy: 'str',
      document: {},
      extractedFacts: [],
      warnings: [],
      confidence: null,
      draft: null,
      matchingPlan: plan,
    }
    expect(argosDocumentIngestResultSchema.safeParse(ingest).success).toBe(true)
  })

  it('OMBREIRA casa com TASK macro', async () => {
    const taskId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    const rows = [
      row({
        id: 'a',
        activity: 'Ombreira dianteira revestimento',
        planned: 70,
        sector: 'Ombreiras',
        step: '11 - OMBREIRA',
        sectorNodeId: 'os1',
        taskNodeId: taskId,
      }),
      row({
        id: 'b',
        activity: 'Ombreira traseira revestimento',
        planned: 80,
        sector: 'Ombreiras',
        step: '11 - OMBREIRA',
        sectorNodeId: 'os1',
        taskNodeId: taskId,
      }),
    ]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows),
      serviceItems: [{ description: 'OMBREIRA DIANTEIRA GOL GTI/GTS - REVESTIMENTO' }],
    })
    expect(plan[0]?.matchedMatrixNodeType).toBe('TASK')
    expect(plan[0]?.subtreeSummary?.totalPlannedMinutes).toBe(150)
    expect(plan[0]?.matrixSubtree?.areas?.length).toBeGreaterThanOrEqual(1)
    expect(plan[0]?.matrixSubtree?.totalPlannedMinutes).toBe(150)
  })

  it('S9.1 — recall TASK direto + fixture macro: LATERAL TRASEIRA → TASK 10 (MATRIX_SUBTREE)', async () => {
    const rows = poolRowsFromMatrixSeed(BRAVO_MATRIX_MATCHING_SEED)
    const tasks = bravoMacroTaskDirectRecallRows()
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows, tasks),
      serviceItems: [
        {
          description:
            'LATERAL TRASEIRA GOL GTI - TROCAR TECIDO PADRÃO ORIGINAL /PAR',
        },
      ],
    })
    expect(plan[0]?.suggestedAction).not.toBe('CREATE_NEW')
    expect(plan[0]?.matchedMatrixNodeType).toBe('TASK')
    expect(plan[0]?.matchedMatrixNodeId).toBe(BRAVO_MACRO_TASK_IDS.lateraisTraseiras)
    expect(plan[0]?.reusedStructure?.kind).toBe('MATRIX_SUBTREE')
    expect(plan[0]?.subtreeSummary?.totalActivities).toBe(8)
    expect(plan[0]?.subtreeSummary?.totalPlannedMinutes).toBe(305)
    expect(plan[0]?.matrixSubtree?.rootTitle).toContain('LATERAIS TRASEIRAS')
  })

  it('S9.1 — genérico REVESTIMENTO COMPLETO não força TASK macro', async () => {
    const rows = poolRowsFromMatrixSeed(BRAVO_MATRIX_MATCHING_SEED)
    const tasks = bravoMacroTaskDirectRecallRows()
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows, tasks),
      serviceItems: [{ description: 'REVESTIMENTO COMPLETO' }],
    })
    expect(plan[0]?.suggestedAction).toBe('CREATE_NEW')
    expect(plan[0]?.matchedMatrixNodeType).toBeUndefined()
  })

  it('atividade folha continua funcionando quando melhor match é ACTIVITY', async () => {
    const rows = [
      row({
        id: 'leaf-1',
        activity: 'Revestimento de volante em couro',
        planned: 120,
        sector: 'Tapeçaria',
        step: 'Volante',
        sectorNodeId: 'sv',
        taskNodeId: 'tv',
      }),
    ]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows),
      serviceItems: [{ description: 'VOLANTE GOL GTI - REVESTIR COURO' }],
    })
    expect(plan[0]?.matchedMatrixNodeType).toBe('ACTIVITY')
    expect(plan[0]?.subtreeSummary).toBeUndefined()
    expect(plan[0]?.matrixSubtree).toBeUndefined()
  })
})

describe('matchOperationalItems — R6 S9.3 guarda estrutural TASK', () => {
  it('tampa traseira / courvin não escolhe LIMPEZA FINAL', async () => {
    const rows = poolRowsFromMatrixSeed(BRAVO_MATRIX_MATCHING_SEED)
    const tasks = [...bravoMacroTaskDirectRecallRows(), ...bravoGuardNegativeTaskRows()]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows, tasks),
      serviceItems: [
        {
          description:
            'ACABAMENTO DA TAMPA TRASEIRA GOL GTI - REVESTIMENTO EM COURVIN',
        },
      ],
    })
    expect(plan[0]?.matchedMatrixNodeId).toBe(BRAVO_MACRO_TASK_IDS.tampaTraseira)
    expect(plan[0]?.matchedMatrixNodeType).toBe('TASK')
    expect(plan[0]?.matchedMatrixNodeId).not.toBe(BRAVO_MACRO_TASK_IDS.limpezaFinal)
    expect(['REUSE_EXISTING', 'REVIEW_SIMILAR']).toContain(plan[0]?.suggestedAction ?? '')
  })

  it('cabo de aço escolhe atividade folha, não TASK BANCOS DIANTEIROS', async () => {
    const rows = poolRowsFromMatrixSeed(BRAVO_MATRIX_MATCHING_SEED)
    const tasks = [...bravoMacroTaskDirectRecallRows(), ...bravoGuardNegativeTaskRows()]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool: fakePool(rows, tasks),
      serviceItems: [{ description: 'CABO DE AÇO - TROCAR' }],
    })
    expect(plan[0]?.matchedMatrixNodeId).toBe('a0000001-0000-0000-0000-000000000006')
    expect(plan[0]?.matchedMatrixNodeType).toBe('ACTIVITY')
    expect(plan[0]?.matchedMatrixNodeId).not.toBe(BRAVO_MACRO_TASK_IDS.bancosDianteiros)
  })

  it('serviço com limpeza explícita pode casar LIMPEZA FINAL', async () => {
    const rows = poolRowsFromMatrixSeed(BRAVO_MATRIX_MATCHING_SEED).slice(0, 1)
    const tasks = bravoGuardNegativeTaskRows()
    const { matchingPlan: plan, outcome } = await matchOperationalItems({
      pool: fakePool(rows, tasks),
      serviceItems: [{ description: 'LIMPEZA FINAL DO VE\u00cdCULO' }],
    })
    expect(outcome.kind).toBe('ok')
    expect(plan[0]?.matchedMatrixNodeId).toBe(BRAVO_MACRO_TASK_IDS.limpezaFinal)
    expect(plan[0]?.matchedMatrixNodeType).toBe('TASK')
    expect(['REUSE_EXISTING', 'REVIEW_SIMILAR']).toContain(plan[0]?.suggestedAction ?? '')
  })

  it('regressão: LATERAL TRASEIRA, OMBREIRA, LATERAL DE PORTA, VOLANTE estáveis com guard', async () => {
    const rows = poolRowsFromMatrixSeed(BRAVO_MATRIX_MATCHING_SEED)
    const tasks = [...bravoMacroTaskDirectRecallRows(), ...bravoGuardNegativeTaskRows()]
    const pool = fakePool(rows, tasks)
    const specs: Array<{ description: string; expectedId: string }> = [
      {
        description:
          'LATERAL TRASEIRA GOL GTI - TROCAR TECIDO PADRÃO ORIGINAL /PAR',
        expectedId: BRAVO_MACRO_TASK_IDS.lateraisTraseiras,
      },
      {
        description: 'OMBREIRA DIANTEIRA GOL GTI/GTS - REVESTIMENTO',
        expectedId: BRAVO_MACRO_TASK_IDS.ombreira,
      },
      {
        description: 'LATERAL DE PORTA',
        expectedId: BRAVO_MACRO_TASK_IDS.forrosPortas,
      },
      {
        description: 'VOLANTE GOL GTI - REVESTIR COURO',
        expectedId: 'a0000001-0000-0000-0000-000000000002',
      },
    ]
    const { matchingPlan: plan } = await matchOperationalItems({
      pool,
      serviceItems: specs.map((s) => ({ description: s.description })),
    })
    for (let i = 0; i < specs.length; i++) {
      expect(plan[i]?.matchedMatrixNodeId).toBe(specs[i]!.expectedId)
      expect(['REUSE_EXISTING', 'REVIEW_SIMILAR']).toContain(plan[i]?.suggestedAction ?? '')
    }
  })
})

describe('matchOperationalItems — R6 S9.2 contrato numérico (pg numeric como string)', () => {
  it('toFiniteNumber aceita number, string numérica e null/undefined', () => {
    expect(toFiniteNumber(825, 0)).toBe(825)
    expect(toFiniteNumber('690', 0)).toBe(690)
    expect(toFiniteNumber('60', 0)).toBe(60)
    expect(toFiniteNumber(null, 3)).toBe(3)
    expect(toFiniteNumber(undefined, 3)).toBe(3)
    expect(toFiniteNumber('not-a-number', 1)).toBe(1)
  })

  it('normalizeMatrixMatchCandidateFromSql converte campos agregados vindos como string', () => {
    const raw = {
      matrixNodeId: 'task-x',
      nodeType: 'TASK' as const,
      activity: '10 - MACRO',
      activityDescription: 'a | b',
      plannedMinutes: '690',
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: null,
      step: '10 - MACRO',
      sectorNodeId: null,
      taskNodeId: 'task-x',
      activityOrderIndex: '2',
      sectorOrderIndex: '1',
      descendantActivitiesCount: '10',
      descendantSectorsCount: '4',
    }
    const n = normalizeMatrixMatchCandidateFromSql(raw as unknown as MatrixMatchCandidate)
    expect(n.plannedMinutes).toBe(690)
    expect(n.descendantActivitiesCount).toBe(10)
    expect(n.descendantSectorsCount).toBe(4)
    expect(n.activityOrderIndex).toBe(2)
    expect(n.sectorOrderIndex).toBe(1)
  })

  it('matchingPlan com linhas ILIKE em string passa argosDocumentIngestResultSchema', async () => {
    const taskId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    const rows = [
      {
        matrixNodeId: 's9-1',
        nodeType: 'ACTIVITY',
        activity: 'Lateral traseira tecido A',
        activityDescription: null,
        plannedMinutes: '40',
        activityOrderIndex: '0',
        sectorOrderIndex: '0',
        collaboratorId: null,
        collaboratorName: null,
        teamId: null,
        teamName: null,
        sector: 'Laterais',
        step: '10 - LATERAIS TRASEIRAS',
        sectorNodeId: 's1',
        taskNodeId: taskId,
      },
      {
        matrixNodeId: 's9-2',
        nodeType: 'ACTIVITY',
        activity: 'Lateral traseira tecido B',
        activityDescription: null,
        plannedMinutes: '40',
        activityOrderIndex: '1',
        sectorOrderIndex: '0',
        collaboratorId: null,
        collaboratorName: null,
        teamId: null,
        teamName: null,
        sector: 'Laterais',
        step: '10 - LATERAIS TRASEIRAS',
        sectorNodeId: 's1',
        taskNodeId: taskId,
      },
    ]
    const { matchingPlan } = await matchOperationalItems({
      pool: fakePool(rows as unknown[]),
      serviceItems: [
        {
          description:
            'LATERAL TRASEIRA GOL GTI - TROCAR TECIDO PADRÃO ORIGINAL /PAR',
        },
      ],
    })
    const item = matchingPlan[0]
    expect(typeof item?.confidence).toBe('number')
    if (item?.subtreeSummary) {
      expect(typeof item.subtreeSummary.totalPlannedMinutes).toBe('number')
      expect(typeof item.subtreeSummary.totalActivities).toBe('number')
      expect(typeof item.subtreeSummary.totalAreas).toBe('number')
    }
    if (item?.matrixSubtree) {
      expect(typeof item.matrixSubtree.totalPlannedMinutes).toBe('number')
      for (const a of item.matrixSubtree.areas) {
        expect(typeof a.orderIndex).toBe('number')
        for (const ac of a.activities) {
          expect(typeof ac.plannedMinutes).toBe('number')
          expect(typeof ac.orderIndex).toBe('number')
        }
      }
    }

    const ingest = {
      requestId: 'r1',
      correlationId: 'c1',
      status: 'partial' as const,
      specialist: 'spec',
      strategy: 'str',
      document: {},
      extractedFacts: [],
      warnings: [],
      confidence: null,
      draft: null,
      matchingPlan,
    }
    expect(argosDocumentIngestResultSchema.safeParse(ingest).success).toBe(true)
  })
})
