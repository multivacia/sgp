import type { ZodError, ZodIssue } from 'zod'

export const ARGOS_DOCUMENT_INGEST_RESULT_SCHEMA_NAME = 'argosDocumentIngestResultSchema'

export type SafeContractValidationIssue = {
  path: string
  code: string
  message: string
  expected?: string
  received?: string
}

/** Caminho estilo `matchingPlan.0.reusedStructure.plannedMinutes` (sem valores de negócio). */
export function formatContractValidationPath(path: ReadonlyArray<string | number>): string {
  let s = ''
  for (const seg of path) {
    if (typeof seg === 'number') s += s === '' ? String(seg) : `.${seg}`
    else s += s === '' ? seg : `.${seg}`
  }
  return s
}

function safeReceivedLabel(issue: ZodIssue): string | undefined {
  if (issue.code === 'invalid_type') {
    return String((issue as { received?: string }).received ?? '')
  }
  if (issue.code === 'invalid_enum_value') {
    return 'enum_mismatch'
  }
  if (issue.code === 'invalid_literal') {
    return typeof (issue as { received?: unknown }).received
  }
  return undefined
}

function safeExpectedLabel(issue: ZodIssue): string | undefined {
  if (issue.code === 'invalid_type') {
    return String((issue as { expected?: string }).expected ?? '')
  }
  if (issue.code === 'invalid_enum_value') {
    return 'one_of_enum'
  }
  if (issue.code === 'invalid_literal') {
    return 'literal'
  }
  return undefined
}

/**
 * Issues Zod sem valores de campo — só path, códigos e tipos esperado/recebido quando aplicável.
 * Não inclui texto de PDF, cliente, matrícula, financeiro ou partItems.
 */
export function contractValidationIssuesFromZodError(
  error: ZodError,
): SafeContractValidationIssue[] {
  return error.issues.map((issue) => {
    const path = formatContractValidationPath(issue.path)
    const row: SafeContractValidationIssue = {
      path: path || '(root)',
      code: issue.code,
      message: issue.message ?? '',
    }
    const exp = safeExpectedLabel(issue)
    const recv = safeReceivedLabel(issue)
    if (exp !== undefined) row.expected = exp
    if (recv !== undefined) row.received = recv
    return row
  })
}
