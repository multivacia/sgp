import type pg from 'pg'
import { computeCollaboratorInitials } from './production-initials.js'
import { resolveProductionCredentialStatus } from './production-credential-status.js'
import type { ProductionCollaboratorPublic } from './production.types.js'
import { listProductionActiveCollaborators } from './production-collaborators.repository.js'
import {
  collaboratorActiveForProduction,
  findCollaboratorForProductionAuth,
} from './production-auth.repository.js'
import type { ProductionCollaboratorListRow } from './production-collaborators.repository.js'

export function mapCollaboratorListRowToPublic(
  row: ProductionCollaboratorListRow,
): ProductionCollaboratorPublic {
  const productionCredentialStatus = resolveProductionCredentialStatus({
    hasCredential: row.has_credential,
    enabled: row.cred_enabled,
    lockedUntil: row.cred_locked_until,
  })
  const mustChangePin =
    productionCredentialStatus === 'READY' && row.must_change_pin === true
      ? true
      : undefined

  return {
    id: row.id,
    fullName: row.full_name,
    name: row.full_name,
    displayName: row.full_name,
    avatarUrl: row.avatar_url,
    initials: computeCollaboratorInitials(row.full_name),
    teamName: row.sector_name,
    productionCredentialStatus,
    ...(mustChangePin ? { mustChangePin } : {}),
  }
}

export function mapCollaboratorToPublic(row: {
  id: string
  full_name: string
  avatar_url: string | null
}): ProductionCollaboratorPublic {
  return {
    id: row.id,
    fullName: row.full_name,
    name: row.full_name,
    displayName: row.full_name,
    avatarUrl: row.avatar_url,
    initials: computeCollaboratorInitials(row.full_name),
    teamName: null,
    productionCredentialStatus: 'READY',
  }
}

export async function serviceListProductionCollaborators(
  pool: pg.Pool,
): Promise<{ items: ProductionCollaboratorPublic[] }> {
  const rows = await listProductionActiveCollaborators(pool)
  return {
    items: rows.map(mapCollaboratorListRowToPublic),
  }
}

export async function serviceGetProductionCollaboratorPublic(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<ProductionCollaboratorPublic | null> {
  const row = await findCollaboratorForProductionAuth(pool, collaboratorId)
  if (!collaboratorActiveForProduction(row)) {
    return null
  }
  if (!row) return null
  return mapCollaboratorToPublic(row)
}
