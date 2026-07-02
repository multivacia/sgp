export const TIME_ENTRY_JUSTIFICATION_CATEGORIES = [
  'SUBSTITUTION',
  'SEQUENCE',
  'PLANNING',
  'REWORK',
  'PRIORITY',
  'EMERGENCY',
  'OTHER',
] as const

export type TimeEntryJustificationCategory =
  (typeof TIME_ENTRY_JUSTIFICATION_CATEGORIES)[number]

export const TIME_ENTRY_JUSTIFICATION_CATEGORY_LABELS: Record<
  TimeEntryJustificationCategory,
  string
> = {
  SUBSTITUTION: 'Substituição',
  SEQUENCE: 'Sequência',
  PLANNING: 'Planejamento',
  REWORK: 'Retrabalho',
  PRIORITY: 'Prioridade',
  EMERGENCY: 'Emergência',
  OTHER: 'Outro',
}

export type TimeEntryJustificationStatusFilter = 'active' | 'inactive' | 'all'

export type TimeEntryJustification = {
  id: string
  label: string
  description: string | null
  category: TimeEntryJustificationCategory | string | null
  requiresComplement: boolean
  usageScope: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type TimeEntryJustificationOption = {
  id: string
  label: string
  description: string | null
  category: TimeEntryJustificationCategory | string | null
  requiresComplement: boolean
  sortOrder: number
}

export type CreateTimeEntryJustificationInput = {
  label: string
  description?: string | null
  category?: TimeEntryJustificationCategory | null
  requiresComplement?: boolean
  usageScope?: string | null
  sortOrder?: number
  isActive?: boolean
}

export type UpdateTimeEntryJustificationInput = Partial<CreateTimeEntryJustificationInput>

export type JustificationSelectValue = {
  justificationId: string | null
  justificationComplement: string
  legacyText: string
}
