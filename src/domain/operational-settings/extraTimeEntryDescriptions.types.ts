export type ExtraTimeEntryDescriptionStatusFilter = 'all' | 'active' | 'inactive'

export type ExtraTimeEntryDescription = {
  id: string
  description: string
  internalNote: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateExtraTimeEntryDescriptionInput = {
  description: string
  internalNote?: string | null
  sortOrder?: number
  isActive?: boolean
}

export type UpdateExtraTimeEntryDescriptionInput = {
  description?: string
  internalNote?: string | null
  sortOrder?: number
  isActive?: boolean
}
