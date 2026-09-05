import { formatPlanningMinutes } from './planningBoardHelpers'
import type {
  PlanningCollaboratorSuggestionResult,
  PlanningSuggestionOption,
} from '../../domain/operational-planning/planningCollaboratorSuggestion'

export type PlanningSuggestionCardView = {
  option: PlanningSuggestionOption
  title: string
  subtitle: string
  detail: string
  selected: boolean
  testId: string
}

function dayLabel(iso: string, weekdayDates: readonly string[], weekdayLabels: readonly string[]): string {
  const idx = weekdayDates.indexOf(iso)
  return idx >= 0 ? (weekdayLabels[idx] ?? iso) : iso
}

function availableLabel(minutes: number | null): string {
  if (minutes == null) return 'capacidade indisponível'
  return `${formatPlanningMinutes(minutes)} disponíveis`
}

export function planningSuggestionCapacityMessage(
  result: PlanningCollaboratorSuggestionResult,
): string | null {
  if (!result.hasContext) return null
  const needed = formatPlanningMinutes(result.neededMinutes)
  if (result.responsibleCapacityUnknown) {
    return `A capacidade do responsável neste dia está indisponível. A atividade precisa de ${needed}. A seleção manual continua disponível.`
  }
  if (result.primary?.kind === 'keep_responsible_and_day') return null
  if (result.originalResponsible && result.responsibleAvailableMinutes != null) {
    return `A atividade precisa de ${needed} e o responsável possui ${formatPlanningMinutes(result.responsibleAvailableMinutes)} disponíveis.`
  }
  if (result.noAutomaticFit) {
    return `Não foi encontrado encaixe automático de ${needed}. Mantenha a configuração manual ou a sobrecapacidade já permitida.`
  }
  return `A atividade precisa de ${needed} e o responsável não cabe neste dia.`
}

export function buildPlanningSuggestionCardViews(input: {
  result: PlanningCollaboratorSuggestionResult
  weekdayDates: readonly string[]
  weekdayLabels: readonly string[]
  selectedCollaboratorId: string
  selectedDay: string
}): PlanningSuggestionCardView[] {
  const { result, weekdayDates, weekdayLabels, selectedCollaboratorId, selectedDay } = input
  const cards: PlanningSuggestionCardView[] = []
  const options: PlanningSuggestionOption[] = []
  if (result.primary) options.push(result.primary)
  for (const alt of result.alternatives) options.push(alt)

  for (const option of options) {
    const selected =
      option.collaboratorId === selectedCollaboratorId && option.day === selectedDay
    const day = dayLabel(option.day, weekdayDates, weekdayLabels)
    const name = option.collaboratorFullName || 'Colaborador'
    if (option.kind === 'keep_responsible_and_day') {
      cards.push({
        option,
        title: 'Cabe neste dia',
        subtitle: `${name} · ${day} · ${availableLabel(option.availableMinutes)}`,
        detail: 'Manter o responsável e o dia selecionados.',
        selected,
        testId: 'planning-suggestion-card-keep-day',
      })
    } else if (option.kind === 'keep_responsible_next_day') {
      cards.push({
        option,
        title: 'Manter o responsável',
        subtitle: `${name} · ${day} · próximo dia com espaço`,
        detail: `${availableLabel(option.availableMinutes)} nesse dia.`,
        selected,
        testId: 'planning-suggestion-card-keep-responsible',
      })
    } else {
      cards.push({
        option,
        title: 'Manter o dia',
        subtitle: `${name} · próxima na sequência · ${availableLabel(option.availableMinutes)}`,
        detail: option.isPrimaryMember
          ? 'Principal do time neste dia.'
          : `Nível ${option.sequenceLevel ?? '—'} da sequência.`,
        selected,
        testId: 'planning-suggestion-card-next-sequence',
      })
    }
  }
  return cards
}
