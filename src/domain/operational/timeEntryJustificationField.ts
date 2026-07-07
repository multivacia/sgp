import type { TimeEntryJustificationOption } from '../operational-settings/timeEntryJustifications.types'

export type JustificationFieldValue = {
  justificationId: string | null
  justificationComplement: string
  legacyText: string
}

export const emptyJustificationFieldValue = (): JustificationFieldValue => ({
  justificationId: null,
  justificationComplement: '',
  legacyText: '',
})

export const OPERATIONAL_JUSTIFICATION_MESSAGES = {
  label: 'Justificativa operacional',
  placeholder: 'Selecione uma justificativa',
  complementLabel: 'Complemento',
  complementHelp:
    'Informe um complemento quando necessário para explicar o contexto operacional.',
  missingSelection: 'Selecione uma justificativa operacional para este apontamento.',
  missingComplement: 'Esta justificativa exige complemento.',
  emptyCatalog: 'Nenhuma justificativa operacional ativa encontrada.',
  fallback:
    'Não foi possível carregar as justificativas padronizadas. Informe a justificativa manualmente.',
} as const

/** Catálogo usa apenas `requiresComplement` (boolean): true = obrigatório; false = sem campo. */

export type JustificationPreferredContext = {
  hasPreviousPendingStep?: boolean
  isOutOfSequence?: boolean
  requiresAllocationException?: boolean
}

/** Categoria sugerida para pré-seleção conforme o contexto do apontamento. */
export function resolvePreferredJustificationCategory(
  context: JustificationPreferredContext,
): string | null {
  if (context.requiresAllocationException) return 'SUBSTITUTION'
  if (context.hasPreviousPendingStep || context.isOutOfSequence) return 'SEQUENCE'
  return null
}

function sortByOrder(options: TimeEntryJustificationOption[]): TimeEntryJustificationOption[] {
  return [...options].sort((a, b) => a.sortOrder - b.sortOrder)
}

/** Escolhe a justificativa ativa mais compatível com o contexto (sem travar o usuário). */
export function pickPreferredJustificationId(
  options: TimeEntryJustificationOption[],
  preferredCategory?: string | null,
  labelHint?: string | null,
): string | null {
  if (!options.length) return null
  const ordered = sortByOrder(options)
  if (!preferredCategory) return ordered[0]?.id ?? null

  const inCategory = ordered.filter((o) => o.category === preferredCategory)
  if (!inCategory.length) return ordered[0]?.id ?? null

  if (labelHint) {
    const hint = labelHint.toLowerCase()
    const byLabel = inCategory.find((o) => o.label.toLowerCase().includes(hint))
    if (byLabel) return byLabel.id
  }

  return inCategory[0]?.id ?? null
}

export function buildJustificationFieldFromOption(
  option: TimeEntryJustificationOption,
  complement = '',
): JustificationFieldValue {
  const trimmedComplement = complement.trim()
  return {
    justificationId: option.id,
    justificationComplement: trimmedComplement,
    legacyText: trimmedComplement
      ? `${option.label} — ${trimmedComplement}`
      : option.label,
  }
}

export function validateJustificationFieldValue(input: {
  value: JustificationFieldValue
  useFallback: boolean
  requiresComplement: boolean
}): string | null {
  if (input.useFallback) {
    return input.value.legacyText.trim().length > 0
      ? null
      : OPERATIONAL_JUSTIFICATION_MESSAGES.missingSelection
  }
  if (!input.value.justificationId) {
    return OPERATIONAL_JUSTIFICATION_MESSAGES.missingSelection
  }
  if (input.requiresComplement && !input.value.justificationComplement.trim()) {
    return OPERATIONAL_JUSTIFICATION_MESSAGES.missingComplement
  }
  if (!input.value.legacyText.trim()) {
    return OPERATIONAL_JUSTIFICATION_MESSAGES.missingSelection
  }
  return null
}
