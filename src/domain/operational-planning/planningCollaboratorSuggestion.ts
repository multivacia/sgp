import type {
  OperationalPlanningSuggestionContext,
  OperationalPlanningSuggestionMember,
} from './operational-planning.types'

export type PlanningCapacityLookupRow = {
  collaboratorId: string
  date: string
  capacityMinutes: number | null | undefined
}

export type PlanningDraftLoadItem = {
  assignedCollaboratorId: string
  plannedDate: string
  plannedMinutes: number | null
  status?: string | null
  removed?: boolean
  cancelled?: boolean
}

export type SuggestionReasonCode =
  | 'KEEP_RESPONSIBLE_AND_DAY'
  | 'KEEP_RESPONSIBLE_NEXT_DAY'
  | 'NEXT_SEQUENCE_SAME_DAY'
  | 'NO_AUTOMATIC_FIT'
  | 'CAPACITY_UNKNOWN'
  | 'NO_CONTEXT'

export type SuggestionOptionKind =
  | 'keep_responsible_and_day'
  | 'keep_responsible_next_day'
  | 'next_sequence_same_day'

export type PlanningSuggestionOption = {
  kind: SuggestionOptionKind
  reasonCode: SuggestionReasonCode
  collaboratorId: string
  collaboratorCode: string | null
  collaboratorFullName: string
  day: string
  neededMinutes: number
  availableMinutes: number | null
  sequenceLevel: number | null
  isPrimaryMember: boolean
}

export type PlanningCollaboratorSuggestionResult = {
  neededMinutes: number
  originalResponsible: {
    id: string
    code: string | null
    fullName: string
  } | null
  effectiveTeamId: string | null
  multipleTeamsAssigned: boolean
  primary: PlanningSuggestionOption | null
  alternatives: PlanningSuggestionOption[]
  noAutomaticFit: boolean
  responsibleCapacityUnknown: boolean
  responsibleAvailableMinutes: number | null
  hasContext: boolean
}

function compareCodeThenId(
  a: { code: string | null; id: string },
  b: { code: string | null; id: string },
): number {
  const ac = (a.code ?? '').trim()
  const bc = (b.code ?? '').trim()
  const aEmpty = ac === ''
  const bEmpty = bc === ''
  if (aEmpty !== bEmpty) return aEmpty ? 1 : -1
  if (!aEmpty && ac !== bc) return ac < bc ? -1 : ac > bc ? 1 : 0
  if (a.id < b.id) return -1
  if (a.id > b.id) return 1
  return 0
}

export function emptyPlanningSuggestionContext(): OperationalPlanningSuggestionContext {
  return {
    responsibleCollaboratorId: null,
    responsibleCollaboratorCode: null,
    responsibleCollaboratorFullName: null,
    effectiveTeamId: null,
    effectiveTeamName: null,
    members: [],
    multipleTeamsAssigned: false,
  }
}

function isActiveDraftItem(item: PlanningDraftLoadItem): boolean {
  if (item.removed || item.cancelled) return false
  const status = String(item.status ?? '').toUpperCase()
  if (status === 'CANCELLED' || status === 'REMOVED') return false
  return true
}

export function knownRemainingCapacityMinutes(input: {
  collaboratorId: string
  date: string
  capacityRows: readonly PlanningCapacityLookupRow[]
  draftItems: readonly PlanningDraftLoadItem[]
}): { known: boolean; remaining: number | null } {
  const row = input.capacityRows.find(
    (r) => r.collaboratorId === input.collaboratorId && r.date === input.date,
  )
  if (!row || row.capacityMinutes == null || !Number.isFinite(row.capacityMinutes)) {
    return { known: false, remaining: null }
  }
  const capacity = Math.max(0, Math.floor(row.capacityMinutes))
  const planned = input.draftItems
    .filter(
      (d) =>
        isActiveDraftItem(d) &&
        d.assignedCollaboratorId === input.collaboratorId &&
        d.plannedDate === input.date,
    )
    .reduce((sum, d) => {
      const m = d.plannedMinutes
      if (m == null || !Number.isFinite(m)) return sum
      return sum + Math.max(0, Math.floor(m))
    }, 0)
  return { known: true, remaining: Math.max(0, capacity - planned) }
}

export function optionFits(
  neededMinutes: number,
  remaining: { known: boolean; remaining: number | null },
): boolean {
  if (!remaining.known || remaining.remaining == null) return false
  return neededMinutes <= remaining.remaining
}

function findMember(
  members: readonly OperationalPlanningSuggestionMember[],
  collaboratorId: string | null,
): OperationalPlanningSuggestionMember | undefined {
  if (!collaboratorId) return undefined
  return members.find((m) => m.id === collaboratorId)
}

function sequenceLevelOf(member: OperationalPlanningSuggestionMember | undefined): number | null {
  if (!member) return null
  return member.isPrimary ? 0 : member.suggestionOrder
}

function toOption(input: {
  kind: SuggestionOptionKind
  reasonCode: SuggestionReasonCode
  collaboratorId: string
  collaboratorCode: string | null
  collaboratorFullName: string
  day: string
  neededMinutes: number
  availableMinutes: number | null
  member?: OperationalPlanningSuggestionMember
}): PlanningSuggestionOption {
  return {
    kind: input.kind,
    reasonCode: input.reasonCode,
    collaboratorId: input.collaboratorId,
    collaboratorCode: input.collaboratorCode,
    collaboratorFullName: input.collaboratorFullName,
    day: input.day,
    neededMinutes: input.neededMinutes,
    availableMinutes: input.availableMinutes,
    sequenceLevel: sequenceLevelOf(input.member),
    isPrimaryMember: Boolean(input.member?.isPrimary),
  }
}

function groupNonPrimaryByOrder(
  members: readonly OperationalPlanningSuggestionMember[],
): OperationalPlanningSuggestionMember[][] {
  const grouped = new Map<number, OperationalPlanningSuggestionMember[]>()
  for (const member of members) {
    if (member.isPrimary) continue
    const list = grouped.get(member.suggestionOrder) ?? []
    list.push(member)
    grouped.set(member.suggestionOrder, list)
  }
  return [...grouped.keys()]
    .sort((a, b) => a - b)
    .map((level) => grouped.get(level) ?? [])
}

function nextSequenceWaves(
  members: readonly OperationalPlanningSuggestionMember[],
  responsibleId: string | null,
): OperationalPlanningSuggestionMember[][] {
  const responsible = findMember(members, responsibleId)
  const nonPrimary = members.filter((m) => !m.isPrimary)

  if (!responsible) {
    const waves: OperationalPlanningSuggestionMember[][] = []
    const primary = members.find((m) => m.isPrimary)
    if (primary) waves.push([primary])
    waves.push(...groupNonPrimaryByOrder(nonPrimary))
    return waves
  }

  if (responsible.isPrimary) {
    return groupNonPrimaryByOrder(nonPrimary)
  }

  const sameLevel = nonPrimary.filter(
    (m) => m.suggestionOrder === responsible.suggestionOrder && m.id !== responsible.id,
  )
  const later = nonPrimary.filter((m) => m.suggestionOrder > responsible.suggestionOrder)
  const waves: OperationalPlanningSuggestionMember[][] = []
  if (sameLevel.length > 0) waves.push(sameLevel)
  waves.push(...groupNonPrimaryByOrder(later))
  return waves
}

function pickFirstFitInWaves(input: {
  waves: readonly OperationalPlanningSuggestionMember[][]
  day: string
  neededMinutes: number
  capacityRows: readonly PlanningCapacityLookupRow[]
  draftItems: readonly PlanningDraftLoadItem[]
}): { member: OperationalPlanningSuggestionMember; remaining: number } | null {
  for (const wave of input.waves) {
    const scored = wave
      .map((member) => {
        const remaining = knownRemainingCapacityMinutes({
          collaboratorId: member.id,
          date: input.day,
          capacityRows: input.capacityRows,
          draftItems: input.draftItems,
        })
        return { member, remaining }
      })
      .filter((row) => optionFits(input.neededMinutes, row.remaining))
      .sort((a, b) => {
        const ra = a.remaining.remaining ?? -1
        const rb = b.remaining.remaining ?? -1
        if (rb !== ra) return rb - ra
        return compareCodeThenId(a.member, b.member)
      })
    const winner = scored[0]
    if (winner && winner.remaining.remaining != null) {
      return { member: winner.member, remaining: winner.remaining.remaining }
    }
  }
  return null
}

export function resolvePlanningCollaboratorSuggestion(input: {
  context: OperationalPlanningSuggestionContext | null | undefined
  selectedDay: string
  weekdayDates: readonly string[]
  neededMinutes: number
  capacityRows: readonly PlanningCapacityLookupRow[]
  draftItems: readonly PlanningDraftLoadItem[]
}): PlanningCollaboratorSuggestionResult {
  const neededMinutes = Math.max(0, Math.floor(input.neededMinutes || 0))
  const context = input.context
  const hasContext = Boolean(
    context &&
      (context.responsibleCollaboratorId ||
        context.effectiveTeamId ||
        (context.members && context.members.length > 0)),
  )
  const originalResponsible = context?.responsibleCollaboratorId
    ? {
        id: context.responsibleCollaboratorId,
        code: context.responsibleCollaboratorCode,
        fullName: context.responsibleCollaboratorFullName ?? '',
      }
    : null

  const empty: PlanningCollaboratorSuggestionResult = {
    neededMinutes,
    originalResponsible,
    effectiveTeamId: context?.effectiveTeamId ?? null,
    multipleTeamsAssigned: Boolean(context?.multipleTeamsAssigned),
    primary: null,
    alternatives: [],
    noAutomaticFit: true,
    responsibleCapacityUnknown: false,
    responsibleAvailableMinutes: null,
    hasContext,
  }

  if (!hasContext || !originalResponsible) {
    return { ...empty, hasContext }
  }

  const weekdayDates = input.weekdayDates.filter(Boolean)
  const selectedDay = weekdayDates.includes(input.selectedDay)
    ? input.selectedDay
    : (weekdayDates[0] ?? input.selectedDay)

  const responsibleRemaining = knownRemainingCapacityMinutes({
    collaboratorId: originalResponsible.id,
    date: selectedDay,
    capacityRows: input.capacityRows,
    draftItems: input.draftItems,
  })
  const responsibleCapacityUnknown = !responsibleRemaining.known
  const responsibleFits = optionFits(neededMinutes, responsibleRemaining)

  const responsibleMember = findMember(context?.members ?? [], originalResponsible.id)

  const keepDayOption = toOption({
    kind: 'keep_responsible_and_day',
    reasonCode: responsibleCapacityUnknown ? 'CAPACITY_UNKNOWN' : 'KEEP_RESPONSIBLE_AND_DAY',
    collaboratorId: originalResponsible.id,
    collaboratorCode: originalResponsible.code,
    collaboratorFullName: originalResponsible.fullName,
    day: selectedDay,
    neededMinutes,
    availableMinutes: responsibleRemaining.remaining,
    member: responsibleMember,
  })

  if (responsibleFits) {
    return {
      neededMinutes,
      originalResponsible,
      effectiveTeamId: context?.effectiveTeamId ?? null,
      multipleTeamsAssigned: Boolean(context?.multipleTeamsAssigned),
      primary: keepDayOption,
      alternatives: [],
      noAutomaticFit: false,
      responsibleCapacityUnknown: false,
      responsibleAvailableMinutes: responsibleRemaining.remaining,
      hasContext: true,
    }
  }

  const alternatives: PlanningSuggestionOption[] = []
  const selectedIndex = weekdayDates.indexOf(selectedDay)
  const laterDays = selectedIndex >= 0 ? weekdayDates.slice(selectedIndex + 1) : []
  for (const day of laterDays) {
    const rem = knownRemainingCapacityMinutes({
      collaboratorId: originalResponsible.id,
      date: day,
      capacityRows: input.capacityRows,
      draftItems: input.draftItems,
    })
    if (!optionFits(neededMinutes, rem)) continue
    alternatives.push(
      toOption({
        kind: 'keep_responsible_next_day',
        reasonCode: 'KEEP_RESPONSIBLE_NEXT_DAY',
        collaboratorId: originalResponsible.id,
        collaboratorCode: originalResponsible.code,
        collaboratorFullName: originalResponsible.fullName,
        day,
        neededMinutes,
        availableMinutes: rem.remaining,
        member: responsibleMember,
      }),
    )
    break
  }

  const sequenceWaves = nextSequenceWaves(
    context?.members ?? [],
    originalResponsible.id,
  )
  const nextFit = pickFirstFitInWaves({
    waves: sequenceWaves,
    day: selectedDay,
    neededMinutes,
    capacityRows: input.capacityRows,
    draftItems: input.draftItems,
  })
  if (nextFit) {
    alternatives.push(
      toOption({
        kind: 'next_sequence_same_day',
        reasonCode: 'NEXT_SEQUENCE_SAME_DAY',
        collaboratorId: nextFit.member.id,
        collaboratorCode: nextFit.member.code,
        collaboratorFullName: nextFit.member.fullName,
        day: selectedDay,
        neededMinutes,
        availableMinutes: nextFit.remaining,
        member: nextFit.member,
      }),
    )
  }

  return {
    neededMinutes,
    originalResponsible,
    effectiveTeamId: context?.effectiveTeamId ?? null,
    multipleTeamsAssigned: Boolean(context?.multipleTeamsAssigned),
    primary: null,
    alternatives,
    noAutomaticFit: alternatives.length === 0,
    responsibleCapacityUnknown,
    responsibleAvailableMinutes: responsibleRemaining.remaining,
    hasContext: true,
  }
}

export function applyPlanningSuggestionToFields(
  _current: { collaboratorId: string; day: string },
  option: Pick<PlanningSuggestionOption, 'collaboratorId' | 'day'>,
): { collaboratorId: string; day: string } {
  return {
    collaboratorId: option.collaboratorId,
    day: option.day,
  }
}

export function initialFieldsFromSuggestion(input: {
  result: PlanningCollaboratorSuggestionResult
  fallbackCollaboratorId: string
  fallbackDay: string
}): { collaboratorId: string; day: string } {
  if (input.result.primary) {
    return {
      collaboratorId: input.result.primary.collaboratorId,
      day: input.result.primary.day,
    }
  }
  if (input.result.originalResponsible) {
    return {
      collaboratorId: input.result.originalResponsible.id,
      day: input.fallbackDay,
    }
  }
  return {
    collaboratorId: input.fallbackCollaboratorId,
    day: input.fallbackDay,
  }
}
