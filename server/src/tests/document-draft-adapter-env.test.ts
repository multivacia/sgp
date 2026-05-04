import { describe, expect, it } from 'vitest'
import { resolveDocumentDraftAdapter } from '../config/env.js'
import type { Env } from '../config/env.js'
import { createArgosDocumentDraftAdapter } from '../modules/argos-integration/createArgosDocumentDraftAdapter.js'

describe('DOCUMENT_DRAFT_ADAPTER / resolveDocumentDraftAdapter', () => {
  it('omitido + ARGOS_INGEST_URL → local (URL já não impõe remoto)', () => {
    expect(
      resolveDocumentDraftAdapter({
        ARGOS_INGEST_URL: 'https://gateway.example/v1/documents',
      } as NodeJS.ProcessEnv),
    ).toBe('local')
  })

  it('DOCUMENT_DRAFT_ADAPTER=remote com URL → remote', () => {
    expect(
      resolveDocumentDraftAdapter({
        DOCUMENT_DRAFT_ADAPTER: 'remote',
        ARGOS_INGEST_URL: 'https://gateway.example/v1/documents',
      } as NodeJS.ProcessEnv),
    ).toBe('remote')
  })

  it('DOCUMENT_DRAFT_ADAPTER explícito vence alias legacy de local', () => {
    expect(
      resolveDocumentDraftAdapter({
        DOCUMENT_DRAFT_ADAPTER: 'remote',
        ARGOS_INGEST_URL: 'https://gw.example/doc',
        DOCUMENT_DRAFT_USE_LOCAL_PIPELINE: '1',
      } as NodeJS.ProcessEnv),
    ).toBe('remote')
  })

  it('DOCUMENT_DRAFT_ADAPTER=stub', () => {
    expect(
      resolveDocumentDraftAdapter({
        DOCUMENT_DRAFT_ADAPTER: 'stub',
      } as NodeJS.ProcessEnv),
    ).toBe('stub')
  })

  it('alias legacy DOCUMENT_DRAFT_USE_LOCAL_PIPELINE=1 → local', () => {
    expect(
      resolveDocumentDraftAdapter({
        ARGOS_INGEST_URL: 'https://x',
        DOCUMENT_DRAFT_USE_LOCAL_PIPELINE: '1',
      } as NodeJS.ProcessEnv),
    ).toBe('local')
  })

  it('ARGOS_USE_MINIMAL_STUB sem DOCUMENT_DRAFT_ADAPTER → stub (legacy)', () => {
    expect(
      resolveDocumentDraftAdapter({
        ARGOS_USE_MINIMAL_STUB: '1',
      } as NodeJS.ProcessEnv),
    ).toBe('stub')
  })

  it('valor inválido → erro', () => {
    expect(() =>
      resolveDocumentDraftAdapter({
        DOCUMENT_DRAFT_ADAPTER: 'maybe',
      } as NodeJS.ProcessEnv),
    ).toThrow(/DOCUMENT_DRAFT_ADAPTER/)
  })
})

describe('createArgosDocumentDraftAdapter', () => {
  it('local mesmo com ARGOS_INGEST_URL no env resolvido', () => {
    const adapter = createArgosDocumentDraftAdapter({
      documentDraftAdapter: 'local',
      argosIngestUrl: 'https://remote-ignored.example/doc',
    } as Env)
    expect(adapter.documentDraftExecutionMode).toBe('local')
  })

  it('remote quando documentDraftAdapter=remote', () => {
    const adapter = createArgosDocumentDraftAdapter({
      documentDraftAdapter: 'remote',
      argosIngestUrl: 'https://gw.example/v1/documents',
      argosIngestTimeoutMs: 120_000,
    } as Env)
    expect(adapter.documentDraftExecutionMode).toBe('remote')
  })

  it('stub quando documentDraftAdapter=stub', () => {
    const adapter = createArgosDocumentDraftAdapter({
      documentDraftAdapter: 'stub',
    } as Env)
    expect(adapter.documentDraftExecutionMode).toBe('stub')
  })
})
