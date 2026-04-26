import type { Request, Response } from 'express'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import type { ArgosDocumentDraftPort } from './argosDocumentDraftPort.js'
import {
  argosDocumentIngestEnvelopeSchema,
  argosDocumentIngestResultSchema,
} from './document-draft.schemas.js'

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

  const result = await adapter.ingest({
    fileBuffer: file.buffer,
    fileName: file.originalname || 'document.bin',
    mimeType: file.mimetype,
    envelope,
  })

  const checked = argosDocumentIngestResultSchema.safeParse(result)
  if (!checked.success) {
    throw new AppError(
      'Resultado interno inválido (contrato ARGOS).',
      500,
      ErrorCodes.INTERNAL,
      checked.error.flatten(),
    )
  }

  res.status(200).json(
    ok(checked.data, {
      documentDraftExecutionMode: adapter.documentDraftExecutionMode,
    }),
  )
}
