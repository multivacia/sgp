/** Resposta GET /admin/operational-settings/capacity */
export type OperationalCapacitySettings = {
  defaultDailyMinutes: number
  updatedAt: string | null
  updatedBy: string | null
}

/** Linha de override devolvida pela API (histórico possível). */
export type CollaboratorCapacityOverrideApi = {
  id: string
  collaboratorId: string
  dailyMinutes: number
  effectiveFrom: string | null
  effectiveTo: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  deletedAt: string | null
}

/** Resposta GET /admin/operational-settings/collaborators/:id/capacity */
export type CollaboratorCapacityResolved = {
  collaboratorId: string
  date: string
  defaultDailyMinutes: number | null
  overrideDailyMinutes: number | null
  resolvedDailyMinutes: number
  source: 'override' | 'default' | 'fallback'
  overrides: CollaboratorCapacityOverrideApi[]
}

export type UpdateDefaultCapacityInput = {
  defaultDailyMinutes: number
}

export type UpsertCollaboratorCapacityOverrideInput = {
  collaboratorId: string
  dailyMinutes: number
  effectiveFrom?: string | null
  effectiveTo?: string | null
  isActive?: boolean
}
