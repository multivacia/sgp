import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'

export const PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MIN = 3
export const PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX = 500

export function normalizeProductionOutOfSequenceJustification(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null
  const t = raw.trim()
  return t.length > 0 ? t : null
}

export function assertProductionOutOfSequenceJustification(
  raw: string | null | undefined,
): string {
  const t = normalizeProductionOutOfSequenceJustification(raw)
  if (!t) {
    throw new AppError(
      'Informe uma justificativa para apontar fora da sequência.',
      422,
      ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
    )
  }
  if (t.length < PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MIN) {
    throw new AppError(
      `A justificativa deve ter pelo menos ${PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MIN} caracteres.`,
      422,
      ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
    )
  }
  if (t.length > PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX) {
    throw new AppError(
      `A justificativa não pode exceder ${PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX} caracteres.`,
      422,
      ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
    )
  }
  return t
}
