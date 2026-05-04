import type { Request, Response } from 'express'
import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import type { ArgosDocumentDraftPort } from './argosDocumentDraftPort.js'
import type { ArgosDocumentIngestResult } from './document-draft.schemas.js'
import {
  ARGOS_DOCUMENT_INGEST_RESULT_SCHEMA_NAME,
  contractValidationIssuesFromZodError,
} from './contractValidationDebug.js'
import {
  argosDocumentIngestEnvelopeSchema,
  argosDocumentIngestResultSchema,
} from './document-draft.schemas.js'
import {
  isDocumentDraftResponseDebugEnabled,
  shouldLogArgosContractValidation,
} from './pipeline/documentDraftPipelineDebug.js'

function parseEnvelope(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new AppError(
      'Campo envelope em falta ou inválido (JSON em string).',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return raw
}

/** Metadados seguros pós-ingestão — sem texto de PDF, PII nem payload completo. */
function documentDraftIngestLogFields(data: ArgosDocumentIngestResult): Record<string, unknown> {
  return {
    requestId: data.requestId,
    correlationId: data.correlationId,
    status: data.status,
    schemaVersion: data.draft?.schemaVersion,
    provider: data.sourceDocument?.provider,
    serviceItemsCount: data.extractedItems?.serviceItems?.length ?? 0,
    partItemsCount: data.extractedItems?.partItems?.length ?? 0,
    matchingPlanCount: Array.isArray(data.matchingPlan) ? data.matchingPlan.length : 0,
    warningCodes: (data.warnings ?? []).map((w) => w.code).slice(0, 50),
  }
}

export async function postDocumentDraft(req: Request, res: Response): Promise<void> {
  const file = req.file
  if (!file?.buffer) {
    throw new AppError(
      'Ficheiro em falta (campo file no multipart).',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(parseEnvelope(req.body?.envelope)) as unknown
  } catch (e) {
    if (e instanceof AppError) throw e
    throw new AppError(
      'Envelope não é JSON válido.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const envelope = argosDocumentIngestEnvelopeSchema.parse(parsedJson)

  const adapter = req.app.locals
    .argosDocumentDraftAdapter as ArgosDocumentDraftPort
  const logger = req.app.locals.logger as Logger | undefined

  const result = await adapter.ingest({
    fileBuffer: file.buffer,
    fileName: file.originalname || 'document.bin',
    mimeType: file.mimetype,
    envelope,
  })

  const checked = argosDocumentIngestResultSchema.safeParse(result)
  if (!checked.success) {
    const issues = contractValidationIssuesFromZodError(checked.error)
    if (shouldLogArgosContractValidation()) {
      const payload = {
        stage: 'document_draft.contract_validation.failed',
        schemaName: ARGOS_DOCUMENT_INGEST_RESULT_SCHEMA_NAME,
        requestId: result.requestId,
        correlationId: result.correlationId,
        issueCount: issues.length,
        issues,
      }
      logger?.warn(payload, 'document-draft contract validation failed')
      if (!logger) {
        console.warn(JSON.stringify(payload))
      }
    }

    const details: Record<string, unknown> = {
      schemaName: ARGOS_DOCUMENT_INGEST_RESULT_SCHEMA_NAME,
      issueCount: issues.length,
    }
    if (isDocumentDraftResponseDebugEnabled()) {
      details.debugContractIssues = issues
    }

    throw new AppError(
      'Resultado interno inválido (contrato ARGOS).',
      500,
      ErrorCodes.INTERNAL,
      details,
    )
  }

  logger?.info(
    documentDraftIngestLogFields(checked.data),
    'document-draft ingest ok',
  )

  const meta: Record<string, unknown> = {
    documentDraftExecutionMode: adapter.documentDraftExecutionMode,
  }
  if (isDocumentDraftResponseDebugEnabled()) {
    const draft = checked.data.draft
    const ext =
      draft?.schemaVersion === '1.1.0'
        ? (draft.extensions as Record<string, unknown> | undefined)
        : undefined
    const dbg = ext?.debugBasicFieldsFlags
    if (dbg !== undefined && typeof dbg === 'object') {
      meta.debugDocumentDraftFlags = dbg
    }
  }

  res.status(200).json(ok(checked.data, meta))
}
