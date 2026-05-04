import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LocalPipelineArgosDocumentDraftAdapter } from '../modules/argos-integration/localPipelineArgosDocumentDraftAdapter.js'
import { argosDocumentIngestResultSchema } from '../modules/argos-integration/document-draft.schemas.js'
import { BRAVO_OS_SANITIZED_TEXT } from './fixtures/bravo-os-sanitized.fixture.js'

/**
 * TD10.1 / TD10.2 — mesmo caminho que POST /api/v1/conveyors/document-draft com adapter local.
 */
describe('LocalPipelineArgosDocumentDraftAdapter — dados básicos Bravo', () => {
  const prevFlags = process.env.SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS
  const prevNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS = '1'
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env.SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS = prevFlags
    process.env.NODE_ENV = prevNodeEnv
  })

  it('propaga parseBravoBasicFields até draft e operationalContext (texto como extrator)', async () => {
    const adapter = new LocalPipelineArgosDocumentDraftAdapter(undefined)
    const buf = Buffer.from(BRAVO_OS_SANITIZED_TEXT, 'utf8')
    const out = await adapter.ingest({
      fileBuffer: buf,
      fileName: 'os-bravo.pdf',
      mimeType: 'text/plain',
      envelope: {
        caller: { systemId: 'test' },
        policy: {},
        intent: 'conveyor_draft_from_document',
      },
    })

    const validated = argosDocumentIngestResultSchema.safeParse(out)
    expect(validated.success).toBe(true)

    expect(adapter.documentDraftExecutionMode).toBe('local')
    expect(out.sourceDocument?.provider).toBe('BRAVO')
    expect(out.sourceDocument?.documentNumber).toBe('7452')
    expect(out.sourceDocument?.issuedAt).toBe('2026-01-15')
    expect((out.sourceDocument as { entryDate?: string }).entryDate).toBe('2026-01-26')

    expect(out.operationalContext?.vehicle).not.toEqual({})
    expect(Object.keys(out.operationalContext?.vehicle ?? {})).not.toHaveLength(0)
    expect(out.operationalContext?.maskedIdentifiers).not.toEqual({})
    expect(out.operationalContext?.vehicle?.model).toMatch(/GOL GTI 2000/i)
    expect(out.operationalContext?.vehicle?.year).toBe(1993)
    expect(out.operationalContext?.vehicle?.color).toMatch(/PRETA/i)
    expect(out.operationalContext?.maskedIdentifiers?.licensePlateMasked).toBe('AWW****')

    expect(out.draft?.schemaVersion).toBe('1.1.0')
    if (out.draft?.schemaVersion === '1.1.0') {
      const ext = out.draft.extensions as Record<string, unknown> | undefined
      const dbg = ext?.debugBasicFieldsFlags as
        | {
            propagation?: { estimatedDeadlineSource?: string }
          }
        | undefined
      expect(dbg?.propagation?.estimatedDeadlineSource).toBe('entryAt')
      expect(out.draft.suggestedDados.title).toBe('7452')
      expect(out.draft.suggestedDados.clientName).toBe('DENILSON DE FRETAS GTI')
      expect(out.draft.suggestedDados.vehicleDescription).toMatch(/GOL GTI 2000/i)
      expect(out.draft.suggestedDados.modelVersion).toBe('')
      expect(out.draft.suggestedDados.licensePlate).toMatch(/AWW2C00/i)
      expect(out.draft.suggestedDados.estimatedDeadline ?? '').toBe('')
      expect(out.draft.suggestedDados.notes).toBe('')
      expect(out.draft.suggestedDados.osNumber).toBe('7452')
    }

    expect(
      out.warnings.some((w) => w.code === 'field.missing.suggestedDados_licensePlate'),
    ).toBe(false)
  })
})
