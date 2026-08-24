/**
 * Resolução de motivo de dispensa a partir do catálogo persistido.
 * O catálogo hard-coded foi substituído por `conveyor_step_abort_reasons`.
 */

export type ResolvedStepAbortReason = {
  reasonCode: string
  reasonText: string | null
  reasonLabel: string
}

export type StepAbortReasonCatalogEntry = {
  code: string
  label: string
  requires_complement: boolean
  is_active: boolean
}

/**
 * Valida motivo contra uma linha do catálogo (já carregada).
 * Complemento obrigatório quando `requires_complement = true`.
 */
export function resolveStepAbortReason(input: {
  reasonCode: string
  reasonText?: string | null
  catalog: StepAbortReasonCatalogEntry | null
  /** Se true, exige motivo ativo (novas dispensas). Replay idempotente não usa isto. */
  requireActive?: boolean
}): { ok: true; value: ResolvedStepAbortReason } | { ok: false; message: string } {
  const code = input.reasonCode?.trim() ?? ''
  if (!code.length) {
    return { ok: false, message: 'Motivo de dispensa inválido.' }
  }
  if (!input.catalog || input.catalog.code !== code) {
    return { ok: false, message: 'Motivo de dispensa inválido.' }
  }
  if (input.requireActive !== false && !input.catalog.is_active) {
    return { ok: false, message: 'Motivo de dispensa inativo.' }
  }
  const textRaw = input.reasonText?.trim() ?? ''
  if (input.catalog.requires_complement) {
    if (!textRaw.length) {
      return {
        ok: false,
        message: 'Informe o complemento do motivo selecionado.',
      }
    }
    return {
      ok: true,
      value: {
        reasonCode: code,
        reasonText: textRaw.slice(0, 2000),
        reasonLabel: input.catalog.label,
      },
    }
  }
  return {
    ok: true,
    value: {
      reasonCode: code,
      reasonText: null,
      reasonLabel: input.catalog.label,
    },
  }
}
