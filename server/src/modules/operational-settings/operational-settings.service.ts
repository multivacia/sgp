import { randomBytes } from 'node:crypto'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type {
  CreateCollaboratorRoleBody,
  CreateSectorBody,
  PatchCollaboratorRoleBody,
  PatchSectorBody,
} from './operational-settings.schemas.js'
import {
  countCollaboratorsWithRole,
  countUsersWithRole,
  deleteSector,
  findCollaboratorFunctionById,
  findSectorById,
  insertCollaboratorFunction,
  insertSector,
  listCollaboratorFunctions,
  listSectorsAdmin,
  roleCodeExists,
  sectorNameExists,
  updateCollaboratorFunction,
  updateSector,
  type CollaboratorFunctionRow,
  type SectorAdminRow,
} from './operational-settings.repository.js'

function genOperationalRoleCode(): string {
  return `OPF_${randomBytes(4).toString('hex').toUpperCase()}`
}

export async function serviceListSectorsAdmin(pool: pg.Pool): Promise<SectorAdminRow[]> {
  return listSectorsAdmin(pool)
}

export async function serviceCreateSector(
  pool: pg.Pool,
  body: CreateSectorBody,
): Promise<SectorAdminRow> {
  if (await sectorNameExists(pool, body.name)) {
    throw new AppError(
      'Já existe um setor com este nome.',
      409,
      ErrorCodes.CONFLICT,
    )
  }
  return insertSector(pool, body.name)
}

export async function servicePatchSector(
  pool: pg.Pool,
  id: string,
  body: PatchSectorBody,
): Promise<SectorAdminRow> {
  const cur = await findSectorById(pool, id)
  if (!cur) {
    throw new AppError('Setor não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  if (body.name !== undefined) {
    if (await sectorNameExists(pool, body.name, id)) {
      throw new AppError(
        'Já existe um setor com este nome.',
        409,
        ErrorCodes.CONFLICT,
      )
    }
  }
  const row = await updateSector(pool, id, {
    name: body.name,
    is_active: body.isActive,
  })
  if (!row) {
    throw new AppError('Setor não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return row
}

export async function serviceDeleteSector(pool: pg.Pool, id: string): Promise<void> {
  const cur = await findSectorById(pool, id)
  if (!cur) {
    throw new AppError('Setor não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  const ok = await deleteSector(pool, id)
  if (!ok) {
    throw new AppError('Setor não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
}

export async function serviceListCollaboratorFunctions(
  pool: pg.Pool,
): Promise<CollaboratorFunctionRow[]> {
  return listCollaboratorFunctions(pool)
}

export async function serviceCreateCollaboratorFunction(
  pool: pg.Pool,
  body: CreateCollaboratorRoleBody,
): Promise<CollaboratorFunctionRow> {
  let code = body.code?.trim()
  if (!code) {
    for (let i = 0; i < 8; i += 1) {
      const c = genOperationalRoleCode()
      if (!(await roleCodeExists(pool, c))) {
        code = c
        break
      }
    }
  }
  if (!code) {
    throw new AppError(
      'Não foi possível gerar código único. Tente novamente.',
      500,
      ErrorCodes.INTERNAL,
    )
  }
  if (await roleCodeExists(pool, code)) {
    throw new AppError(
      'Já existe um papel com este código.',
      409,
      ErrorCodes.CONFLICT,
    )
  }
  return insertCollaboratorFunction(pool, code, body.name)
}

export async function servicePatchCollaboratorFunction(
  pool: pg.Pool,
  id: string,
  body: PatchCollaboratorRoleBody,
): Promise<CollaboratorFunctionRow> {
  const cur = await findCollaboratorFunctionById(pool, id)
  if (!cur) {
    throw new AppError(
      'Função operacional não encontrada.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
  if (body.code !== undefined && (await roleCodeExists(pool, body.code, id))) {
    throw new AppError(
      'Já existe um papel com este código.',
      409,
      ErrorCodes.CONFLICT,
    )
  }
  const row = await updateCollaboratorFunction(pool, id, {
    name: body.name,
    code: body.code,
    is_active: body.isActive,
  })
  if (!row) {
    throw new AppError(
      'Função operacional não encontrada.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
  return row
}

export async function serviceDeleteCollaboratorFunction(
  pool: pg.Pool,
  id: string,
): Promise<void> {
  const cur = await findCollaboratorFunctionById(pool, id)
  if (!cur) {
    throw new AppError(
      'Função operacional não encontrada.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
  const users = await countUsersWithRole(pool, id)
  const cols = await countCollaboratorsWithRole(pool, id)
  if (users > 0 || cols > 0) {
    throw new AppError(
      'Não é possível eliminar: existem utilizadores ou colaboradores a usar este papel. Inative-o em vez disso.',
      409,
      ErrorCodes.CONFLICT,
    )
  }
  const r = await pool.query(`DELETE FROM app_roles WHERE id = $1::uuid`, [id])
  if ((r.rowCount ?? 0) === 0) {
    throw new AppError(
      'Função operacional não encontrada.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
}
