/** Lógica pura do modal de atividade extra esteira do Kiosk (validação/formatos). */

export const NOTES_MAX_LENGTH = 500

/** Mensagens de toast do kiosk (feedback pós-ação na fila de atividades). */
export const KIOSK_ACTIVITY_TOAST = {
  extraEntrySaved: 'Apontamento extra registrado com sucesso.',
} as const

export function todayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function validateKioskExtraActivityForm(input: {
  descriptionId: string
  entryDate: string
  minutesStr: string
  notes: string
}): string | null {
  if (!input.descriptionId) {
    return 'Selecione um tipo de atividade.'
  }
  if (!input.entryDate) {
    return 'Informe a data do apontamento.'
  }
  if (input.entryDate > todayIsoDate()) {
    return 'A data não pode ser futura.'
  }
  const minutes = Number.parseInt(input.minutesStr, 10)
  if (
    !Number.isInteger(minutes) ||
    minutes <= 0 ||
    String(minutes) !== input.minutesStr.trim()
  ) {
    return 'Informe minutos válidos (número inteiro maior que zero).'
  }
  if (input.notes.trim().length > NOTES_MAX_LENGTH) {
    return `Observação deve ter no máximo ${NOTES_MAX_LENGTH} caracteres.`
  }
  return null
}
