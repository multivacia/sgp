import { describe, expect, it } from 'vitest'
import type pg from 'pg'
import { LocalPipelineArgosDocumentDraftAdapter } from '../modules/argos-integration/localPipelineArgosDocumentDraftAdapter.js'
import { BRAVO_OS_SANITIZED_TEXT } from './fixtures/bravo-os-sanitized.fixture.js'
import {
  poolRowsFromMatrixSeed,
  BRAVO_MATRIX_MATCHING_SEED,
  BRAVO_MACRO_TASK_IDS,
  bravoGuardNegativeTaskRows,
  bravoMacroTaskDirectRecallRows,
} from './fixtures/bravo-matrix-matching-seed.fixture.js'
import {
  MATCH_RECALL_LIMIT,
  MATCH_TASK_RECALL_LIMIT,
  MATRIX_SUBTREE_PREVIEW_ACTIVITIES_LIMIT,
} from '../modules/argos-integration/pipeline/matchOperationalItems.js'

function envelope() {
  return {
    caller: { systemId: 'sgp-test' },
    policy: {},
    intent: 'conveyor_draft_from_document' as const,
  }
}

/** COUNT + ILIKE atividade + ILIKE TASK (S9.1); `taskRows` opcional para recall direto de TASK. */
function poolQueryStub(rows: unknown[], taskRows?: unknown[]) {
  return async (sql: string) => {
    const s = sql.replace(/\s+/g, ' ')
    if (/COUNT\s*\(\*\)/i.test(s) && /matrix_nodes/i.test(s) && /ACTIVITY/i.test(s)) {
      return { rows: [{ n: rows.length }] }
    }
    if (/ILIKE ANY/i.test(s) && /descendantActivitiesCount/i.test(s)) {
      return { rows: (taskRows ?? []).slice(0, MATCH_TASK_RECALL_LIMIT) }
    }
    if (/ILIKE ANY/i.test(s)) {
      return { rows: rows.slice(0, MATCH_RECALL_LIMIT) }
    }
    return { rows }
  }
}

describe('LocalPipelineArgosDocumentDraftAdapter - matching integration', () => {
  it('preenche matchingPlan quando há candidatos de matriz', async () => {
    const matrixRow = {
      matrixNodeId: '11111111-1111-1111-1111-111111111111',
      activity: 'Revestimento banco Recaro',
      activityDescription: 'couro',
      plannedMinutes: 180,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: 'Tapeçaria',
      step: 'Bancos',
    }
    const pool = {
      query: poolQueryStub([matrixRow]),
    } as unknown as pg.Pool

    const adapter = new LocalPipelineArgosDocumentDraftAdapter(pool)
    const out = await adapter.ingest({
      fileBuffer: Buffer.from(
        [
          'OS 9001',
          'Servicos do Pedido',
          'BANCO RECARO GTI LAGUNA - REVESTIMENTO COMPLETO',
          'Pecas do Pedido',
          'Courvin preto qtd: 2',
        ].join('\n'),
      ),
      fileName: 'os-bravo.txt',
      mimeType: 'text/plain',
      envelope: envelope(),
    })

    expect(out.matchingPlan?.length).toBeGreaterThan(0)
    const reused = out.matchingPlan?.find((m) =>
      /recaro|revestimento/i.test(m.extractedServiceDescription),
    )
    expect(reused?.suggestedAction).toMatch(/REUSE_EXISTING|REVIEW_SIMILAR/)
    expect(reused?.matchedMatrixNodeId).toBe(
      '11111111-1111-1111-1111-111111111111',
    )
    expect(
      out.matchingPlan?.some((m) => /courvin|espuma|tecido|insumo/i.test(m.extractedServiceDescription)),
    ).toBe(false)
  })

  it('falha no matching não quebra ingest e gera warning', async () => {
    const pool = {
      query: async (sql: string) => {
        const s = sql.replace(/\s+/g, ' ')
        if (/COUNT\s*\(\*\)/i.test(s) && /matrix_nodes/i.test(s)) {
          return { rows: [{ n: 1 }] }
        }
        const err = new Error('db down') as Error & { code?: string }
        err.code = 'ECONNREFUSED'
        throw err
      },
    } as unknown as pg.Pool

    const adapter = new LocalPipelineArgosDocumentDraftAdapter(pool)
    const out = await adapter.ingest({
      fileBuffer: Buffer.from('OS 100\nServicos do Pedido\nRevestimento banco'),
      fileName: 'os-bravo.txt',
      mimeType: 'text/plain',
      envelope: envelope(),
    })

    expect(out.draft).not.toBeNull()
    expect(out.matchingPlan).toEqual([])
    expect(out.warnings.some((w) => w.code === 'matching.failed')).toBe(true)
  })

  it('matriz sem atividades → matching.no_candidates, não matching.failed', async () => {
    const pool = {
      query: async (sql: string) => {
        const s = sql.replace(/\s+/g, ' ')
        if (/COUNT\s*\(\*\)/i.test(s) && /matrix_nodes/i.test(s)) {
          return { rows: [{ n: 0 }] }
        }
        return { rows: [] }
      },
    } as unknown as pg.Pool

    const adapter = new LocalPipelineArgosDocumentDraftAdapter(pool)
    const out = await adapter.ingest({
      fileBuffer: Buffer.from(
        [
          'OS 9001',
          'Servicos do Pedido',
          'BANCO RECARO GTI LAGUNA - REVESTIMENTO COMPLETO',
        ].join('\n'),
      ),
      fileName: 'os-bravo.txt',
      mimeType: 'text/plain',
      envelope: envelope(),
    })

    expect(out.draft).not.toBeNull()
    expect(out.warnings.some((w) => w.code === 'matching.failed')).toBe(false)
    expect(out.warnings.some((w) => w.code === 'matching.no_candidates')).toBe(true)
    expect(out.matchingPlan?.length).toBeGreaterThan(0)
    expect(out.matchingPlan?.every((m) => m.suggestedAction === 'CREATE_NEW')).toBe(true)
  })

  it('sem pool → matching.unavailable com mensagem S2', async () => {
    const adapter = new LocalPipelineArgosDocumentDraftAdapter(undefined)
    const out = await adapter.ingest({
      fileBuffer: Buffer.from(
        [
          'OS 9001',
          'Servicos do Pedido',
          'BANCO RECARO GTI LAGUNA - REVESTIMENTO COMPLETO',
        ].join('\n'),
      ),
      fileName: 'os-bravo.txt',
      mimeType: 'text/plain',
      envelope: envelope(),
    })
    const u = out.warnings.find((w) => w.code === 'matching.unavailable')
    expect(u?.message).toBe('Matching não disponível neste modo de execução.')
  })

  it('R6 S3 — matriz seed: vários serviços Bravo com match útil, plannedMinutes e structure', async () => {
    const rows = poolRowsFromMatrixSeed(BRAVO_MATRIX_MATCHING_SEED)
    const pool = {
      query: poolQueryStub(rows),
    } as unknown as pg.Pool

    const adapter = new LocalPipelineArgosDocumentDraftAdapter(pool)
    const out = await adapter.ingest({
      fileBuffer: Buffer.from(BRAVO_OS_SANITIZED_TEXT, 'utf8'),
      fileName: 'os-bravo-sanitizado.txt',
      mimeType: 'text/plain',
      envelope: envelope(),
    })

    expect(out.draft).not.toBeNull()
    expect((out.matchingPlan?.length ?? 0) > 0).toBe(true)
    const useful = (out.matchingPlan ?? []).filter((m) =>
      ['REUSE_EXISTING', 'REVIEW_SIMILAR'].includes(m.suggestedAction ?? ''),
    )
    expect(useful.length).toBeGreaterThanOrEqual(3)
    const withMinutes = useful.filter((m) => m.reusedStructure?.plannedMinutes !== undefined)
    expect(withMinutes.length).toBeGreaterThanOrEqual(3)
    const sample = useful.find((m) =>
      /banco|recaro/i.test(m.extractedServiceDescription),
    )
    if (sample?.reusedStructure?.kind === 'MATRIX_SUBTREE') {
      expect(sample?.matrixSubtree?.areas?.length ?? 0).toBeGreaterThan(0)
      expect(sample?.reusedStructure?.step ?? sample?.matrixSubtree?.rootTitle).toBeTruthy()
    } else {
      expect(sample?.reusedStructure?.sector).toBeTruthy()
      expect(sample?.reusedStructure?.step).toBeTruthy()
    }
    expect(sample?.matchReason?.length).toBeGreaterThan(15)
    expect(
      useful.some((m) => m.matchedMatrixNodeType === 'TASK' || m.matchedMatrixNodeType === 'ACTIVITY'),
    ).toBe(true)
    for (const m of out.matchingPlan ?? []) {
      const prev = m.subtreeSummary?.previewActivities
      if (prev && prev.length > 0) {
        expect(prev.length).toBeLessThanOrEqual(MATRIX_SUBTREE_PREVIEW_ACTIVITIES_LIMIT)
      }
    }
  })

  it('R6 S9 — serviço LATERAL TRASEIRA retorna matrixSubtree na integração', async () => {
    const taskId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    const rows = [
      {
        matrixNodeId: 's9-1',
        nodeType: 'ACTIVITY',
        activity: 'Lateral traseira tecido A',
        activityDescription: null,
        plannedMinutes: 40,
        activityOrderIndex: 0,
        sectorOrderIndex: 0,
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
        plannedMinutes: 40,
        activityOrderIndex: 1,
        sectorOrderIndex: 0,
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
    const pool = {
      query: poolQueryStub(rows),
    } as unknown as pg.Pool

    const adapter = new LocalPipelineArgosDocumentDraftAdapter(pool)
    const out = await adapter.ingest({
      fileBuffer: Buffer.from(
        [
          'OS 9001',
          'Servicos do Pedido',
          'LATERAL TRASEIRA GOL GTI - TROCAR TECIDO PADRÃO ORIGINAL /PAR',
        ].join('\n'),
      ),
      fileName: 'os-bravo.txt',
      mimeType: 'text/plain',
      envelope: envelope(),
    })
    const m = out.matchingPlan?.[0]
    expect(m?.matchedMatrixNodeType).toBe('TASK')
    expect(m?.matrixSubtree?.rootNodeId).toBe(taskId)
    expect(m?.matrixSubtree?.areas?.length).toBeGreaterThanOrEqual(1)
  })

  it('R6 S9.3 — OS sanitizada: tampa traseira ≠ limpeza final; cabo de aço ≠ bancos TASK', async () => {
    const matrixRows = poolRowsFromMatrixSeed(BRAVO_MATRIX_MATCHING_SEED)
    const taskRows = [...bravoMacroTaskDirectRecallRows(), ...bravoGuardNegativeTaskRows()]
    const pool = {
      query: poolQueryStub(matrixRows, taskRows),
    } as unknown as pg.Pool

    const adapter = new LocalPipelineArgosDocumentDraftAdapter(pool)
    const out = await adapter.ingest({
      fileBuffer: Buffer.from(BRAVO_OS_SANITIZED_TEXT, 'utf8'),
      fileName: 'os-bravo-sanitizado.txt',
      mimeType: 'text/plain',
      envelope: envelope(),
    })

    const tampa = out.matchingPlan?.find((m) =>
      /TAMPA TRASEIRA/i.test(m.extractedServiceDescription ?? '') &&
        /COURVIN/i.test(m.extractedServiceDescription ?? ''),
    )
    expect(tampa?.matchedMatrixNodeId).toBe(BRAVO_MACRO_TASK_IDS.tampaTraseira)
    expect(tampa?.matchedMatrixNodeId).not.toBe(BRAVO_MACRO_TASK_IDS.limpezaFinal)

    const cabo = out.matchingPlan?.find((m) => /CABO DE AÇO/i.test(m.extractedServiceDescription ?? ''))
    expect(cabo?.matchedMatrixNodeType).toBe('ACTIVITY')
    expect(cabo?.matchedMatrixNodeId).toBe('a0000001-0000-0000-0000-000000000006')
    expect(cabo?.matchedMatrixNodeId).not.toBe(BRAVO_MACRO_TASK_IDS.bancosDianteiros)
  })
})

