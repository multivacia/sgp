export type ProductionScope = 'PRODUCTION_MODE'

export type ProductionCredentialStatus =
  | 'READY'
  | 'NEEDS_INITIAL_PIN'
  | 'LOCKED'
  | 'DISABLED'

export type ProductionLoginStatus = 'AUTHENTICATED' | 'PIN_CHANGE_REQUIRED'

export type ProductionCollaboratorPublic = {
  id: string
  /** Nome completo (legado — preferir `name` / `displayName`). */
  fullName: string
  name: string
  displayName: string
  avatarUrl: string | null
  initials: string
  teamName?: string | null
  productionCredentialStatus: ProductionCredentialStatus
  mustChangePin?: boolean
}

export type ProductionSessionContext = {
  collaboratorId: string
  scope: ProductionScope
  authAtMs: number
  lastActMs: number
}

export type ProductionAuthEventType =
  | 'PRODUCTION_LOGIN_SUCCESS'
  | 'PRODUCTION_LOGIN_FAILURE'
  | 'PRODUCTION_LOGOUT'
  | 'PRODUCTION_SESSION_REJECTED'
