import type { ProductionExtraTimeEntryPayload } from '../../domain/production/production.types'

export const KIOSK_EXTRA_ESTEIRA_NOTES_MAX = 500

/** Nunca pré-seleciona a primeira descrição do catálogo. */
export const KIOSK_EXTRA_ESTEIRA_DESCRIPTION_PLACEHOLDER = 'Selecione uma descrição...' as const

export function parseKioskMinutes(raw: string): number {
  const n = Number.parseInt(raw, 10)
  return Number.isInteger(n) ? n : 0
}

export function isValidKioskExtraEsteiraMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 1
}

export function canSubmitKioskExtraEsteiraForm(input: {
  descriptionId: string
  minutes: number
}): boolean {
  if (!input.descriptionId.trim()) return false
  return isValidKioskExtraEsteiraMinutes(input.minutes)
}

export function buildKioskExtraEsteiraPayload(input: {
  descriptionId: string
  minutes: number
  notes: string
}): ProductionExtraTimeEntryPayload {
  const notes = input.notes.trim()
  return {
    descriptionId: input.descriptionId,
    minutes: input.minutes,
    ...(notes ? { notes } : {}),
  }
}
