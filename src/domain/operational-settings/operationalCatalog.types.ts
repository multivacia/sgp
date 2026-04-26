export type OperationalSectorRow = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
}

export type OperationalCollaboratorRoleRow = {
  id: string
  code: string
  name: string
  isActive: boolean
  isCollaboratorFunction: boolean
  createdAt: string
}

export type OperationalSectorCreateInput = { name: string }

export type OperationalSectorPatchInput = {
  name?: string
  isActive?: boolean
}

export type OperationalCollaboratorRoleCreateInput = {
  name: string
  /** Se omitido, o servidor gera código `OPF_*`. */
  code?: string
}

export type OperationalCollaboratorRolePatchInput = {
  name?: string
  code?: string
  isActive?: boolean
}
