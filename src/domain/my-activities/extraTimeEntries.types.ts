export type ExtraTimeEntryDescriptionOption = {
  id: string
  description: string
}

export type ExtraTimeEntryItem = {
  id: string
  descriptionId: string
  description: string
  entryDate: string
  minutes: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ExtraTimeEntriesResult = {
  items: ExtraTimeEntryItem[]
  collaboratorId: string | null
  unavailableReason: string | null
}

export type CreateExtraTimeEntryInput = {
  descriptionId: string
  entryDate?: string
  minutes: number
  notes?: string
}
