/**
 * Diagnóstico controlado do pipeline document-draft (TD10.2 / TD10.3).
 * Nunca expor isto como substituto de logs estruturados com PII.
 */

export function isNonProductionNodeEnv(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export function isDocumentDraftPipelineFlagsEnabled(): boolean {
  return process.env.SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS === '1'
}

/** Flags na resposta HTTP e extensões do draft — só fora de produção. */
export function isDocumentDraftResponseDebugEnabled(): boolean {
  return (
    isNonProductionNodeEnv() &&
    process.env.SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS === '1'
  )
}

/**
 * Linhas candidatas sanitizadas (TD10.3): logs + meta só fora de produção,
 * com `SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS` e `SGP_DOCUMENT_DRAFT_DEBUG_CANDIDATE_LINES`.
 */
export function isDocumentDraftCandidateLinesDebugEnabled(): boolean {
  return (
    isNonProductionNodeEnv() &&
    process.env.SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS === '1' &&
    process.env.SGP_DOCUMENT_DRAFT_DEBUG_CANDIDATE_LINES === '1'
  )
}

/** Logs de falha de contrato ARGOS: fora de produção ou com `SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS=1`. */
export function shouldLogArgosContractValidation(): boolean {
  return isNonProductionNodeEnv() || isDocumentDraftPipelineFlagsEnabled()
}
