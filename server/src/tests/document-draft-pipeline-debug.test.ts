import { afterEach, describe, expect, it } from 'vitest'
import {
  isDocumentDraftCandidateLinesDebugEnabled,
  isDocumentDraftPipelineFlagsEnabled,
  isDocumentDraftResponseDebugEnabled,
} from '../modules/argos-integration/pipeline/documentDraftPipelineDebug.js'

/**
 * R6 S1 — diagnóstico document-draft: desligado por padrão (env não setada ou ≠ '1').
 */
describe('documentDraftPipelineDebug — defaults seguros', () => {
  const snapshot = { ...process.env }

  afterEach(() => {
    process.env = { ...snapshot }
  })

  it('SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS ausente → helpers falsos', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS
    delete process.env.SGP_DOCUMENT_DRAFT_DEBUG_CANDIDATE_LINES
    expect(isDocumentDraftPipelineFlagsEnabled()).toBe(false)
    expect(isDocumentDraftResponseDebugEnabled()).toBe(false)
    expect(isDocumentDraftCandidateLinesDebugEnabled()).toBe(false)
  })

  it('SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS=0 → pipeline flags desligadas', () => {
    process.env.NODE_ENV = 'development'
    process.env.SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS = '0'
    process.env.SGP_DOCUMENT_DRAFT_DEBUG_CANDIDATE_LINES = '1'
    expect(isDocumentDraftPipelineFlagsEnabled()).toBe(false)
    expect(isDocumentDraftCandidateLinesDebugEnabled()).toBe(false)
  })

  it('candidate lines só com PIPELINE_FLAGS=1 e CANDIDATE_LINES=1 e não produção', () => {
    process.env.NODE_ENV = 'production'
    process.env.SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS = '1'
    process.env.SGP_DOCUMENT_DRAFT_DEBUG_CANDIDATE_LINES = '1'
    expect(isDocumentDraftCandidateLinesDebugEnabled()).toBe(false)

    process.env.NODE_ENV = 'development'
    process.env.SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS = '1'
    process.env.SGP_DOCUMENT_DRAFT_DEBUG_CANDIDATE_LINES = '1'
    expect(isDocumentDraftCandidateLinesDebugEnabled()).toBe(true)
  })
})
