/**
 * Helpers puros do modal de dispensa — testáveis sem React Testing Library.
 */
export type AbortDialogReasonOption = {
  code: string
  label: string
  requiresComplement: boolean
}

export function abortDialogSelectedReason(
  reasons: AbortDialogReasonOption[],
  reasonCode: string,
): AbortDialogReasonOption | null {
  return reasons.find((r) => r.code === reasonCode) ?? null
}

export function abortDialogRequiresComplement(
  reasons: AbortDialogReasonOption[],
  reasonCode: string,
): boolean {
  return Boolean(abortDialogSelectedReason(reasons, reasonCode)?.requiresComplement)
}

export function abortDialogCanConfirm(input: {
  busy: boolean
  loadingReasons: boolean
  loadError: string | null
  reasons: AbortDialogReasonOption[]
  reasonCode: string
  reasonText: string
}): boolean {
  const requiresComplement = abortDialogRequiresComplement(input.reasons, input.reasonCode)
  return (
    !input.busy &&
    !input.loadingReasons &&
    !input.loadError &&
    input.reasons.length > 0 &&
    Boolean(input.reasonCode) &&
    (!requiresComplement || input.reasonText.trim().length > 0)
  )
}

export function abortDialogConfirmPayload(input: {
  reasons: AbortDialogReasonOption[]
  reasonCode: string
  reasonText: string
}): { reasonCode: string; reasonText: string | null } {
  const requiresComplement = abortDialogRequiresComplement(input.reasons, input.reasonCode)
  return {
    reasonCode: input.reasonCode,
    reasonText: requiresComplement ? input.reasonText.trim() : null,
  }
}

export function abortDialogPlaceholderLabel(loadingReasons: boolean): string {
  return loadingReasons ? 'Carregando motivos…' : 'Selecione um motivo...'
}
