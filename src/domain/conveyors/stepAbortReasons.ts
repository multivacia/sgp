/**
 * Catálogo mínimo de motivos de dispensa (espelho FE do backend).
 * Sem CRUD admin nesta entrega.
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

export function stepAbortReasonLabel(code: string | null | undefined): string {
  if (!code) return ''
  if ((STEP_ABORT_REASON_CODES as readonly string[]).includes(code)) {
    return STEP_ABORT_REASON_LABELS[code as StepAbortReasonCode]
  }
  return code
}

export type AbortConveyorStepBody = {
  reasonCode: StepAbortReasonCode
  reasonText?: string | null
}
