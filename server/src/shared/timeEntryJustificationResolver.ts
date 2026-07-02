import type pg from 'pg'
import { AppError } from './errors/AppError.js'
import { ErrorCodes } from './errors/errorCodes.js'
import { findActiveTimeEntryJustificationById } from '../modules/operational-settings/time-entry-justifications.repository.js'

export type ResolvedStandardJustification = {
  legacyText: string
  standardJustificationId: string
  standardJustificationLabelSnapshot: string
  standardJustificationCategorySnapshot: string | null
  standardJustificationComplement: string | null
}

export type ResolveTimeEntryJustificationInput = {
  justificationId?: string | null
  justificationComplement?: string | null
  legacyText?: string | null
  /** Código de erro quando `required` e nenhum input válido (preserva contratos legados por fluxo). */
  requiredErrorCode?: string
  requiredErrorMessage?: string
}

function normalizeComplement(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const t = raw.trim()
  return t.length > 0 ? t : null
}

function buildLegacyText(label: string, complement: string | null): string {
  return complement ? `${label} — ${complement}` : label
}

/**
 * Resolve justificativa estruturada (id + complemento) ou texto livre legado.
 * Quando `required` e nenhum input válido, lança erro 422.
 */
export async function resolveTimeEntryJustification(
  pool: pg.Pool,
  input: ResolveTimeEntryJustificationInput & { required: boolean },
): Promise<{
  legacyText: string | null
  standard: ResolvedStandardJustification | null
}> {
  const legacyTrimmed = (input.legacyText ?? '').trim()

  if (input.justificationId) {
    const row = await findActiveTimeEntryJustificationById(pool, input.justificationId)
    if (!row) {
      throw new AppError(
        'Justificativa padronizada inválida ou inativa.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    const complement = normalizeComplement(input.justificationComplement)
    if (row.requires_complement && !complement) {
      throw new AppError(
        'Esta justificativa exige complemento.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    const legacyText = buildLegacyText(row.label, complement)
    return {
      legacyText,
      standard: {
        legacyText,
        standardJustificationId: row.id,
        standardJustificationLabelSnapshot: row.label,
        standardJustificationCategorySnapshot: row.category,
        standardJustificationComplement: complement,
      },
    }
  }

  if (legacyTrimmed.length > 0) {
    return { legacyText: legacyTrimmed, standard: null }
  }

  if (input.required) {
    throw new AppError(
      input.requiredErrorMessage ?? 'Selecione uma justificativa para continuar.',
      422,
      input.requiredErrorCode ?? ErrorCodes.VALIDATION_ERROR,
    )
  }

  return { legacyText: null, standard: null }
}

export function standardJustificationRowFields(
  standard: ResolvedStandardJustification | null,
): {
  standard_justification_id: string | null
  standard_justification_label_snapshot: string | null
  standard_justification_category_snapshot: string | null
  standard_justification_complement: string | null
} {
  if (!standard) {
    return {
      standard_justification_id: null,
      standard_justification_label_snapshot: null,
      standard_justification_category_snapshot: null,
      standard_justification_complement: null,
    }
  }
  return {
    standard_justification_id: standard.standardJustificationId,
    standard_justification_label_snapshot: standard.standardJustificationLabelSnapshot,
    standard_justification_category_snapshot: standard.standardJustificationCategorySnapshot,
    standard_justification_complement: standard.standardJustificationComplement,
  }
}

/** Prioriza snapshot da exceção de alocação; senão usa fora de sequência. */
export function pickStandardJustificationSnapshot(
  exceptionStandard: ResolvedStandardJustification | null,
  oosStandard: ResolvedStandardJustification | null,
) {
  return standardJustificationRowFields(exceptionStandard ?? oosStandard)
}
