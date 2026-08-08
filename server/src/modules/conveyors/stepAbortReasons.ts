/**
 * Catálogo mínimo de motivos de dispensa de STEP (sem UI admin nesta entrega).
 * Não reutilizar `operational_time_entry_justifications`.
 */

export const STEP_ABORT_REASON_CODES = [
  'NAO_MAIS_NECESSARIA',
  'SUBSTITUIDA_POR_OUTRA',
  'ERRO_DE_PLANEJAMENTO',
  'SOLICITACAO_CLIENTE',
  'OUTRO',
] as const

export type StepAbortReasonCode = (typeof STEP_ABORT_REASON_CODES)[number]

export const STEP_ABORT_REASON_LABELS: Record<StepAbortReasonCode, string> = {
  NAO_MAIS_NECESSARIA: 'Não é mais necessária',
  SUBSTITUIDA_POR_OUTRA: 'Substituída por outra atividade',
  ERRO_DE_PLANEJAMENTO: 'Erro de planejamento / escopo',
  SOLICITACAO_CLIENTE: 'Solicitação do cliente',
  OUTRO: 'Outro',
}

export function isStepAbortReasonCode(value: string): value is StepAbortReasonCode {
  return (STEP_ABORT_REASON_CODES as readonly string[]).includes(value)
}

export type ResolvedStepAbortReason = {
  reasonCode: StepAbortReasonCode
  reasonText: string | null
}

/**
 * Valida motivo do catálogo. Retorna erro legível ou o motivo normalizado.
 * `OUTRO` exige texto trim não vazio.
 */
export function resolveStepAbortReason(input: {
  reasonCode: string
  reasonText?: string | null
}): { ok: true; value: ResolvedStepAbortReason } | { ok: false; message: string } {
  const code = input.reasonCode?.trim() ?? ''
  if (!isStepAbortReasonCode(code)) {
    return { ok: false, message: 'Motivo de dispensa inválido.' }
  }
  const textRaw = input.reasonText?.trim() ?? ''
  if (code === 'OUTRO') {
    if (!textRaw.length) {
      return { ok: false, message: 'Informe o texto do motivo quando selecionar Outro.' }
    }
    return { ok: true, value: { reasonCode: code, reasonText: textRaw.slice(0, 2000) } }
  }
  return { ok: true, value: { reasonCode: code, reasonText: null } }
}
