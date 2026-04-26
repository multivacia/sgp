/**
 * Taxonomia mínima de problemas devolvidos pelo ARGOS.
 * O SGP+ mapeia para UX, i18n e política de bloqueio.
 */

/** Categoria estável para routing no SGP+. */
export type ArgosIssueCategory =
  | 'fatal_error'
  | 'revisable_warning'
  | 'missing_field'
  | 'low_confidence_field'

/**
 * Códigos estáveis (snake_case). Lista inicial; novos códigos não removem existentes.
 */
export type ArgosIssueCode =
  /* Fatal */
  | 'document_unreadable'
  | 'unsupported_format'
  | 'file_too_large'
  | 'policy_denied'
  | 'processing_error'
  /* Revisável */
  | 'ambiguous_segment'
  | 'conflicting_facts'
  | 'review_recommended'
  /* Campo ausente */
  | 'missing_license_plate'
  | 'missing_client'
  | 'missing_deadline'
  | 'missing_title'
  /* Baixa confiança */
  | 'low_confidence_field'
  | string

/**
 * Um aviso ou erro estruturado.
 */
export type ArgosIssue = {
  category: ArgosIssueCategory
  code: ArgosIssueCode
  message?: string
  /** Caminho lógico do campo (ex.: draft.suggestedDados.licensePlate). */
  fieldPath?: string
  confidence?: number
  [key: string]: unknown
}
