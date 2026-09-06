/** Lógica pura do fluxo "Outra Atividade" do Kiosk (validação/formatos). */
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import { validateJustificationSelectValue } from '../../components/operational/JustificationSelect'
import type { JustificationFieldValue } from '../shell/quickTimeEntryDrawerLogic'

/**
 * Mensagens de toast do fluxo "Outra Atividade" — distintas do "+Extra"
 * (`KIOSK_ACTIVITY_TOAST.extraEntrySaved`), porque são ações diferentes:
 * "Outra Atividade" aponta tempo real num step existente (fora da alocação
 * atual do colaborador) e recarrega a fila; "+Extra" é apontamento avulso
 * contra um catálogo genérico, sem vínculo com esteira/step.
 */
export const KIOSK_OTHER_ACTIVITY_TOAST = {
  entrySaved: 'Apontamento em outra atividade registrado com sucesso.',
} as const

export const KIOSK_OTHER_ACTIVITY_SEARCH_MIN_LENGTH = 2

export const KIOSK_OTHER_ACTIVITY_MINUTES_PRESETS = [15, 30, 45, 60] as const

/** Código/identificação curta da esteira do candidato, para exibição em lista/resumo. */
export function kioskOtherActivityCandidateCode(candidate: TimeEntryCandidateItem): string {
  return candidate.conveyorCode?.trim() || 'Sem código'
}

/** Só considera termos de busca com o mínimo de caracteres exigido. */
export function isValidKioskOtherActivitySearchTerm(query: string): boolean {
  return query.trim().length >= KIOSK_OTHER_ACTIVITY_SEARCH_MIN_LENGTH
}

/** Mantém somente candidatos fora da alocação atual do colaborador. */
export function filterKioskOtherActivityCandidates(
  items: TimeEntryCandidateItem[],
): TimeEntryCandidateItem[] {
  return items.filter((item) => item.isAssignedToMe === false)
}

export type KioskOtherActivityFormInput = {
  selected: TimeEntryCandidateItem | null
  minutes: number
  justification: JustificationFieldValue
  useFallback: boolean
  requiresComplement: boolean
}

/**
 * Validação do formulário de "Outra Atividade": exige candidato selecionado,
 * minutos válidos (> 0) e justificativa (obrigatória — mesma regra de
 * `JustificationSelect`/`validateJustificationSelectValue` já usada no projeto).
 */
export function validateKioskOtherActivityForm(
  input: KioskOtherActivityFormInput,
): string | null {
  if (!input.selected) return 'Selecione uma atividade.'
  if (!Number.isInteger(input.minutes) || input.minutes < 1) {
    return 'Informe minutos válidos (maior que zero).'
  }
  return validateJustificationSelectValue({
    useFallback: input.useFallback,
    justificationId: input.justification.justificationId,
    legacyText: input.justification.legacyText,
    requiresComplement: input.requiresComplement,
    complement: input.justification.justificationComplement,
  })
}
