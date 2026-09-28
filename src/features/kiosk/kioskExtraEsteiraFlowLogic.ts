import type { ProductionExtraTimeEntryPayload } from '../../domain/production/production.types'
import { validateWorkDate } from '../../domain/operational/workDate'

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
  /** Data de realização (YYYY-MM-DD, São Paulo). Ausente = não validada (retrocompat). */
  entryDate?: string
}): boolean {
  if (!input.descriptionId.trim()) return false
  if (input.entryDate !== undefined && validateWorkDate(input.entryDate) !== null) return false
  return isValidKioskExtraEsteiraMinutes(input.minutes)
}

export function buildKioskExtraEsteiraPayload(input: {
  descriptionId: string
  minutes: number
  notes: string
  /** Data de realização (YYYY-MM-DD, São Paulo) — mesmo contrato do extra esteira web. */
  entryDate: string
}): ProductionExtraTimeEntryPayload {
  const notes = input.notes.trim()
  return {
    descriptionId: input.descriptionId,
    entryDate: input.entryDate,
    minutes: input.minutes,
    ...(notes ? { notes } : {}),
  }
}
