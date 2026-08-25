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
  listCollaboratorCapacityOverrides,
  listSectorsAdmin,
  resolveCollaboratorDailyCapacityMinutes,
  roleCodeExists,
  sectorNameExists,
  softDeleteCollaboratorCapacityOverride,
  upsertCollaboratorCapacityOverride,
  upsertOperationalCapacitySettings,
  getOperationalCapacitySettings,
  updateCollaboratorFunction,
  updateSector,
  type CollaboratorCapacityOverrideRow,
  type CollaboratorFunctionRow,
  type OperationalCapacitySettingsRow,
  type SectorAdminRow,
} from './operational-settings.repository.js'

function genOperationalRoleCode(): string {
  return `OPF_${randomBytes(4).toString('hex').toUpperCase()}`
}

export const OPERATIONAL_DAILY_CAPACITY_FALLBACK_MINUTES = 480
const SAFE_CAPACITY_FALLBACK_MINUTES = OPERATIONAL_DAILY_CAPACITY_FALLBACK_MINUTES
const MIN_DAILY_CAPACITY_MINUTES = 1
const MAX_DAILY_CAPACITY_MINUTES = 1440

function assertExplicitCapacityValue(
  value: number | null | undefined,
  field: 'defaultDailyMinutes' | 'overrideDailyMinutes',
): void {
  if (value == null) return
  if (!Number.isInteger(value) || value < MIN_DAILY_CAPACITY_MINUTES || value > MAX_DAILY_CAPACITY_MINUTES) {
    throw new AppError(
      `${field} deve ser um inteiro entre ${MIN_DAILY_CAPACITY_MINUTES} e ${MAX_DAILY_CAPACITY_MINUTES}.`,
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
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

export function resolveDailyCapacityMinutes(input: {
  defaultDailyMinutes: number | null | undefined
  overrideDailyMinutes: number | null | undefined
}): number {
  assertExplicitCapacityValue(input.defaultDailyMinutes, 'defaultDailyMinutes')
  assertExplicitCapacityValue(input.overrideDailyMinutes, 'overrideDailyMinutes')

  const resolved = input.overrideDailyMinutes ?? input.defaultDailyMinutes ?? SAFE_CAPACITY_FALLBACK_MINUTES
  return Math.min(MAX_DAILY_CAPACITY_MINUTES, Math.max(MIN_DAILY_CAPACITY_MINUTES, resolved))
}

export async function serviceGetOperationalCapacitySettings(
  pool: pg.Pool,
): Promise<OperationalCapacitySettingsRow | null> {
  return getOperationalCapacitySettings(pool)
}

export type DefaultOperationalDailyCapacitySource = 'OPERATIONAL_SETTINGS' | 'FALLBACK'

/** Capacidade diária padrão global (Configurações Operacionais), sem override por colaborador. */
export async function serviceResolveDefaultOperationalDailyCapacity(
  pool: pg.Pool,
): Promise<{
  dailyCapacityMinutes: number
  source: DefaultOperationalDailyCapacitySource
}> {
  const settings = await getOperationalCapacitySettings(pool)
  const raw = settings?.default_daily_minutes
  if (
    raw != null &&
    Number.isInteger(raw) &&
    raw >= MIN_DAILY_CAPACITY_MINUTES &&
    raw <= MAX_DAILY_CAPACITY_MINUTES
  ) {
    return { dailyCapacityMinutes: raw, source: 'OPERATIONAL_SETTINGS' }
  }

  console.warn(
    JSON.stringify({
      event: 'default_operational_daily_capacity_fallback',
      reason:
        settings == null ? 'settings_unavailable' : 'invalid_or_missing_default_daily_minutes',
      fallbackMinutes: SAFE_CAPACITY_FALLBACK_MINUTES,
    }),
  )
  return {
    dailyCapacityMinutes: SAFE_CAPACITY_FALLBACK_MINUTES,
    source: 'FALLBACK',
  }
}

function throwIfOperationalCapacityStorageUnavailable(e: unknown): void {
  if (e instanceof Error && e.message === 'OPERATIONAL_CAPACITY_STORAGE_UNAVAILABLE') {
    throw new AppError(
      'Capacidade operacional indisponível nesta instância. Confirme se a migration 0025_operational_capacity_base.sql foi aplicada à base.',
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
    )
  }
}

function mapCollaboratorOverrideWriteFailure(e: unknown): never {
  throwIfOperationalCapacityStorageUnavailable(e)
  const code = (e as { code?: string })?.code
  if (code === '23503') {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  throw e
}

export async function serviceUpsertOperationalCapacitySettings(
  pool: pg.Pool,
  defaultDailyMinutes: number,
  actorUserId?: string | null,
): Promise<OperationalCapacitySettingsRow> {
  try {
    return await upsertOperationalCapacitySettings(pool, {
      defaultDailyMinutes,
      updatedBy: actorUserId ?? null,
    })
  } catch (e) {
    throwIfOperationalCapacityStorageUnavailable(e)
    throw e
  }
}

export async function serviceGetCollaboratorCapacityOverrides(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<CollaboratorCapacityOverrideRow[]> {
  return listCollaboratorCapacityOverrides(pool, { collaboratorId })
}

export async function serviceUpsertCollaboratorCapacityOverride(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    dailyMinutes: number
    effectiveFrom?: string | null
    effectiveTo?: string | null
    isActive?: boolean
    actorUserId?: string | null
  },
): Promise<CollaboratorCapacityOverrideRow> {
  try {
    return await upsertCollaboratorCapacityOverride(pool, input)
  } catch (e) {
    mapCollaboratorOverrideWriteFailure(e)
  }
}

export async function serviceSoftDeleteCollaboratorCapacityOverride(
  pool: pg.Pool,
  collaboratorId: string,
  actorUserId?: string | null,
): Promise<void> {
  const [latest] = await listCollaboratorCapacityOverrides(pool, { collaboratorId })
  if (!latest) {
    throw new AppError(
      'Override de capacidade não encontrado para o colaborador.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
  try {
    const ok = await softDeleteCollaboratorCapacityOverride(pool, latest.id, actorUserId ?? null)
    if (!ok) {
      throw new AppError(
        'Override de capacidade não encontrado para o colaborador.',
        404,
        ErrorCodes.NOT_FOUND,
      )
    }
  } catch (e) {
    if (e instanceof AppError) throw e
    throwIfOperationalCapacityStorageUnavailable(e)
    throw e
  }
}

export async function serviceResolveCollaboratorDailyCapacity(
  pool: pg.Pool,
  collaboratorId: string,
  date?: string,
): Promise<{
  collaboratorId: string
  date: string
  defaultDailyMinutes: number | null
  overrideDailyMinutes: number | null
  resolvedDailyMinutes: number
  source: 'override' | 'default' | 'fallback'
}> {
  const refDate = date ?? new Date().toISOString().slice(0, 10)
  const resolved = await resolveCollaboratorDailyCapacityMinutes(
    pool,
    collaboratorId,
    refDate,
  )
  return {
    collaboratorId,
    date: refDate,
    defaultDailyMinutes: resolved.defaultDailyMinutes,
    overrideDailyMinutes: resolved.overrideDailyMinutes,
    resolvedDailyMinutes: resolveDailyCapacityMinutes(resolved),
    source: resolved.source,
  }
}

export async function serviceResolveCollaboratorExplicitDailyCapacity(
  pool: pg.Pool,
  collaboratorId: string,
  date?: string,
): Promise<{
  collaboratorId: string
  date: string
  defaultDailyMinutes: number | null
  overrideDailyMinutes: number | null
  explicitDailyMinutes: number | null
  source: 'override' | 'default' | 'fallback'
}> {
  const refDate = date ?? new Date().toISOString().slice(0, 10)
  const resolved = await resolveCollaboratorDailyCapacityMinutes(
    pool,
    collaboratorId,
    refDate,
  )
  return {
    collaboratorId,
    date: refDate,
    defaultDailyMinutes: resolved.defaultDailyMinutes,
    overrideDailyMinutes: resolved.overrideDailyMinutes,
    explicitDailyMinutes: resolved.overrideDailyMinutes ?? resolved.defaultDailyMinutes ?? null,
    source: resolved.source,
  }
}
