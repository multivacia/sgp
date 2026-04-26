import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type { AdminCollaboratorListItem } from './admin-collaborators.dto.js'
import type { ListAdminCollaboratorsQuery } from './admin-collaborators.schemas.js'
import {
  countAdminCollaborators,
  findAdminCollaboratorById,
  listAdminCollaborators,
  restoreCollaborator,
  softDeleteCollaborator,
} from './admin-collaborators.repository.js'
import type {
  CreateCollaboratorBody,
  PatchCollaboratorBody,
} from '../collaborators/collaborators.schemas.js'
import {
  serviceActivate,
  serviceCreate,
  serviceInactivate,
  servicePatch,
} from '../collaborators/collaborators.service.js'

function assertNotDeleted(row: AdminCollaboratorListItem | null): AdminCollaboratorListItem {
  if (!row) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  if (row.deletedAt) {
    throw new AppError(
      'Colaborador removido logicamente. Restaure antes de alterar.',
      409,
      ErrorCodes.CONFLICT,
    )
  }
  return row
}

export async function serviceListAdmin(
  pool: pg.Pool,
  filters: ListAdminCollaboratorsQuery,
): Promise<{ data: AdminCollaboratorListItem[]; total: number }> {
  const [data, total] = await Promise.all([
    listAdminCollaborators(pool, filters),
    countAdminCollaborators(pool, filters),
  ])
  return { data, total }
}

export async function serviceGetAdminById(
  pool: pg.Pool,
  id: string,
): Promise<AdminCollaboratorListItem | null> {
  return findAdminCollaboratorById(pool, id)
}

export async function serviceCreateAdmin(
  pool: pg.Pool,
  body: CreateCollaboratorBody,
): Promise<AdminCollaboratorListItem> {
  const created = await serviceCreate(pool, body)
  const full = await findAdminCollaboratorById(pool, created.id)
  if (!full) {
    throw new AppError('Colaborador criado mas não encontrado.', 500, ErrorCodes.INTERNAL)
  }
  return full
}

export async function servicePatchAdmin(
  pool: pg.Pool,
  id: string,
  body: PatchCollaboratorBody,
): Promise<AdminCollaboratorListItem> {
  const current = await findAdminCollaboratorById(pool, id)
  assertNotDeleted(current)
  const updated = await servicePatch(pool, id, body)
  if (!updated) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  const full = await findAdminCollaboratorById(pool, id)
  if (!full) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return full
}

export async function serviceActivateAdmin(
  pool: pg.Pool,
  id: string,
): Promise<AdminCollaboratorListItem> {
  const current = await findAdminCollaboratorById(pool, id)
  assertNotDeleted(current)
  const updated = await serviceActivate(pool, id)
  if (!updated) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  const full = await findAdminCollaboratorById(pool, id)
  if (!full) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return full
}

export async function serviceInactivateAdmin(
  pool: pg.Pool,
  id: string,
): Promise<AdminCollaboratorListItem> {
  const current = await findAdminCollaboratorById(pool, id)
  assertNotDeleted(current)
  const updated = await serviceInactivate(pool, id)
  if (!updated) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  const full = await findAdminCollaboratorById(pool, id)
  if (!full) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return full
}

export async function serviceSoftDeleteAdmin(
  pool: pg.Pool,
  id: string,
): Promise<AdminCollaboratorListItem> {
  const row = await softDeleteCollaborator(pool, id)
  if (!row) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return row
}

export async function serviceRestoreAdmin(
  pool: pg.Pool,
  id: string,
): Promise<AdminCollaboratorListItem> {
  const row = await restoreCollaborator(pool, id)
  if (!row) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return row
}
