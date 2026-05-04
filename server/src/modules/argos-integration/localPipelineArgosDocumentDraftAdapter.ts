import { randomUUID } from 'node:crypto'
import type pg from 'pg'
import type {
  ArgosDocumentDraftIngestInput,
  ArgosDocumentDraftPort,
} from './argosDocumentDraftPort.js'
import { buildDocumentDraftResult } from './pipeline/buildDocumentDraftResult.js'
import { extractDocumentText } from './pipeline/extractDocumentText.js'
import { interpretBravoDeterministic } from './pipeline/interpretBravoDeterministic.js'
import {
  isDocumentDraftCandidateLinesDebugEnabled,
  isDocumentDraftPipelineFlagsEnabled,
} from './pipeline/documentDraftPipelineDebug.js'
import {
  collectBravoCandidateDebugLines,
} from './pipeline/bravoCandidateDebugLines.js'
import { sanitizeBravoDebugLine } from './pipeline/bravoDebugSanitize.js'
import {
  parseBravoBasicFieldsWithDiagnostics,
  type BravoBasicFieldsDiagnostics,
} from './pipeline/parseBravoBasicFields.js'
import { deepStripNullToUndefined } from './dtoNilNormalize.js'
import { matchOperationalItems } from './pipeline/matchOperationalItems.js'

/**
 * Pipeline documental local — extrator → parser BRAVO determinístico → draft v1.1.0.
 * Não persiste estado; não acopla UI SGP+.
 */
export class LocalPipelineArgosDocumentDraftAdapter implements ArgosDocumentDraftPort {
  readonly documentDraftExecutionMode = 'local' as const

  constructor(private readonly pool?: pg.Pool) {}

  async ingest(input: ArgosDocumentDraftIngestInput) {
    const requestId = randomUUID()
    const correlationId =
      input.envelope.metadata?.correlationId?.trim() || randomUUID()

    const extract = await extractDocumentText({
      buffer: input.fileBuffer,
      mimeType: input.mimeType,
      fileName: input.fileName,
    })

    if (isDocumentDraftPipelineFlagsEnabled()) {
      console.info({
        stage: 'document_draft.local_pipeline.start',
        requestId,
        correlationId,
        fileName: input.fileName,
        textLength: extract.text.length,
        pageCount: extract.pageCount ?? null,
        adapter: 'local',
      })
    }

    let basicParseDiagnostics: BravoBasicFieldsDiagnostics | undefined
    if (isDocumentDraftPipelineFlagsEnabled()) {
      basicParseDiagnostics = parseBravoBasicFieldsWithDiagnostics(extract.text).diagnostics
      console.info({
        stage: 'document_draft.bravo_basic_fields.flags',
        ...basicParseDiagnostics,
      })
    }

    const interpretation = interpretBravoDeterministic({
      text: extract.text,
      fileName: input.fileName,
    })

    if (isDocumentDraftPipelineFlagsEnabled()) {
      console.info({
        stage: 'document_draft.bravo_interpret.result_flags',
        requestId,
        correlationId,
        providerDetected: interpretation.heuristicSource === 'bravo_deterministic',
        heuristicSource: interpretation.heuristicSource ?? null,
        hasDocumentNumber: Boolean(interpretation.documentNumber ?? interpretation.osNumber),
        hasIssuedAt: Boolean(interpretation.issuedAt),
        hasEntryAt: Boolean(interpretation.entryAt),
        hasVehicleModel: Boolean(interpretation.vehicleDescription),
        hasVehicleYear: interpretation.vehicleYear !== undefined,
        hasVehicleColor: Boolean(interpretation.vehicleColor),
        serviceLineCount: interpretation.serviceLines.length,
        serviceItemCount: interpretation.serviceLines.length,
        partItemsSuppressedCount: interpretation.partLines?.length ?? 0,
        operationalNotesCount: interpretation.operationalNotes?.length ?? 0,
      })
    }

    let candidateDebugLines: string[] | undefined
    if (isDocumentDraftCandidateLinesDebugEnabled()) {
      const rawLines = collectBravoCandidateDebugLines(extract.text)
      candidateDebugLines = rawLines.map((l) => sanitizeBravoDebugLine(l))
      console.info({
        stage: 'document_draft.bravo_basic_fields.candidate_lines',
        requestId,
        correlationId,
        count: candidateDebugLines.length,
        lines: candidateDebugLines,
      })
    }

    const result = buildDocumentDraftResult({
      fileBuffer: input.fileBuffer,
      fileName: input.fileName,
      mimeType: input.mimeType,
      correlationId,
      requestId,
      extract,
      interpretation,
      basicParseDiagnostics,
      candidateDebugLines,
    })

    const serviceItems = result.extractedItems?.serviceItems ?? []
    if (serviceItems.length === 0) {
      return result
    }

    if (!this.pool) {
      result.warnings.push({
        category: 'revisable_warning',
        code: 'matching.unavailable',
        message: 'Matching não disponível neste modo de execução.',
      })
      return result
    }

    const { matchingPlan, outcome } = await matchOperationalItems({
      pool: this.pool,
      serviceItems,
    })
    result.matchingPlan = deepStripNullToUndefined(matchingPlan) as typeof matchingPlan

    if (outcome.kind === 'technical_failure') {
      result.warnings.push({
        category: 'revisable_warning',
        code: 'matching.failed',
        message: 'Falha ao consultar candidatos de matriz; revisão manual recomendada.',
      })
      console.error({
        stage: 'document_draft.matching.failed',
        requestId,
        correlationId,
        serviceItemsCount: serviceItems.length,
        errorCode: outcome.pgCode ?? null,
        errorMessage: outcome.sanitizedMessage,
      })
    } else if (outcome.kind === 'no_candidates') {
      result.warnings.push({
        category: 'revisable_warning',
        code: 'matching.no_candidates',
        message:
          'Nenhuma atividade de Matriz compatível encontrada; revisão manual necessária.',
      })
    }

    return result
  }
}
