import type {
  ColaboradorOperacional,
  ColaboradorOperacionalInput,
  ColaboradorOperacionalUpdate,
} from '../../mocks/colaboradores-operacionais-repository'
import type {
  AdminCollaborator,
  Collaborator,
  CollaboratorCreateInput,
  CollaboratorListFilter,
  CollaboratorStatus,
  CollaboratorUpdateInput,
} from './collaborator.types'

function statusFromActive(ativo: boolean): CollaboratorStatus {
  return ativo ? 'active' : 'inactive'
}

function pickMeta(
  m: Record<string, string> | undefined,
  key: string,
): string | undefined {
  const v = m?.[key]
  return typeof v === 'string' && v.trim() ? v : undefined
}

export function collaboratorFromMock(c: ColaboradorOperacional): Collaborator {
  const m = c.metadata ?? {}
  return {
    id: c.colaboradorId,
    code: c.codigo,
    registrationCode: c.matricula,
    fullName: c.nome,
    nickname: c.apelido,
    sectorName: c.setorPrincipal,
    email: pickMeta(m, 'email'),
    phone: pickMeta(m, 'phone'),
    jobTitle: pickMeta(m, 'jobTitle'),
    avatarUrl: pickMeta(m, 'avatarUrl'),
    sectorId: pickMeta(m, 'sectorId'),
    roleId: pickMeta(m, 'roleId'),
    roleName: pickMeta(m, 'roleName'),
    notes: pickMeta(m, 'notes'),
    status: statusFromActive(c.ativo),
  }
}

function metaFromCreateInput(
  input: CollaboratorCreateInput,
  roleNameHint?: string,
): Record<string, string> | undefined {
  const meta: Record<string, string> = {}
  const put = (k: string, v: string | undefined) => {
    if (v?.trim()) meta[k] = v.trim()
  }
  if (input.avatarUrl !== undefined && input.avatarUrl !== null) {
    const a = input.avatarUrl.trim()
    if (a) meta.avatarUrl = a
  }
  put('notes', input.notes ?? undefined)
  put('sectorId', input.sectorId ?? undefined)
  put('roleId', input.roleId ?? undefined)
  if (roleNameHint?.trim()) meta.roleName = roleNameHint.trim()
  return Object.keys(meta).length ? meta : undefined
}

export function createInputToMock(
  input: CollaboratorCreateInput,
  roleNameHint?: string,
): ColaboradorOperacionalInput {
  const setor =
    input.sectorName?.trim() ||
    input.sectorId?.trim() ||
    undefined
  return {
    nome: input.fullName,
    setorPrincipal: setor,
    ativo: input.status !== 'inactive',
    metadata: metaFromCreateInput(input, roleNameHint),
  }
}

function mergeMetaFromUpdate(
  input: CollaboratorUpdateInput,
  prev: ColaboradorOperacional | undefined,
  roleNameHint?: string,
): Record<string, string> | undefined {
  const meta = { ...(prev?.metadata ?? {}) }
  let metaTouched = false
  const touch = (key: string, val: string | null | undefined) => {
    if (val === undefined) return
    metaTouched = true
    if (val === null || val === '') delete meta[key]
    else meta[key] = val
  }
  if (input.avatarUrl !== undefined) {
    touch(
      'avatarUrl',
      input.avatarUrl === null || input.avatarUrl === ''
        ? null
        : input.avatarUrl.trim(),
    )
  }
  if (input.notes !== undefined) touch('notes', input.notes.trim() || null)
  if (input.sectorId !== undefined) touch('sectorId', input.sectorId.trim() || null)
  if (input.roleId !== undefined) {
    const rid = input.roleId.trim()
    touch('roleId', rid || null)
    if (rid) {
      if (roleNameHint !== undefined) {
        touch('roleName', roleNameHint.trim() || null)
      }
    } else {
      touch('roleName', null)
    }
  }
  if (!metaTouched) return undefined
  return meta
}

export function updateInputToMock(
  input: CollaboratorUpdateInput,
  prev?: ColaboradorOperacional,
  roleNameHint?: string,
): ColaboradorOperacionalUpdate {
  const u: ColaboradorOperacionalUpdate = {}
  if (input.fullName !== undefined) u.nome = input.fullName
  if (input.sectorName !== undefined || input.sectorId !== undefined) {
    u.setorPrincipal =
      input.sectorName?.trim() ||
      input.sectorId?.trim() ||
      undefined
  }
  if (input.status !== undefined) u.ativo = input.status === 'active'
  const merged = mergeMetaFromUpdate(input, prev, roleNameHint)
  if (merged !== undefined) u.metadata = merged
  return u
}

/** Aceita snake_case ou camelCase vindos da API. */
export function collaboratorFromApiJson(raw: unknown): Collaborator {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Payload de colaborador inválido.')
  }
  const o = raw as Record<string, unknown>
  const id =
    pickStr(o, 'id') ??
    pickStr(o, 'colaborador_id') ??
    pickStr(o, 'colaboradorId') ??
    ''
  const fullName =
    pickStr(o, 'full_name') ??
    pickStr(o, 'fullName') ??
    pickStr(o, 'name') ??
    pickStr(o, 'nome') ??
    ''
  let status: CollaboratorStatus = 'active'
  if (typeof o.is_active === 'boolean') {
    status = o.is_active ? 'active' : 'inactive'
  } else if (typeof o.ativo === 'boolean') {
    status = o.ativo ? 'active' : 'inactive'
  } else {
    const statusRaw = pickStr(o, 'status')?.toLowerCase()
    status =
      statusRaw === 'inactive' || statusRaw === 'inativo' ? 'inactive' : 'active'
  }
  return {
    id,
    code: pickStr(o, 'code'),
    registrationCode:
      pickStr(o, 'registration_code') ?? pickStr(o, 'registrationCode'),
    fullName,
    nickname: pickStr(o, 'nickname') ?? pickStr(o, 'apelido'),
    email: pickStr(o, 'email'),
    phone: pickStr(o, 'phone') ?? pickStr(o, 'telefone'),
    jobTitle: pickStr(o, 'job_title') ?? pickStr(o, 'jobTitle'),
    avatarUrl: pickStr(o, 'avatar_url') ?? pickStr(o, 'avatarUrl'),
    sectorId: pickStr(o, 'sector_id') ?? pickStr(o, 'sectorId'),
    sectorName: pickStr(o, 'sector_name') ?? pickStr(o, 'sectorName'),
    roleId: pickStr(o, 'role_id') ?? pickStr(o, 'roleId'),
    roleName: pickStr(o, 'role_name') ?? pickStr(o, 'roleName'),
    status,
    notes: pickStr(o, 'notes') ?? pickStr(o, 'observacoes'),
    createdAt: pickStr(o, 'created_at') ?? pickStr(o, 'createdAt'),
    updatedAt: pickStr(o, 'updated_at') ?? pickStr(o, 'updatedAt'),
  }
}

function pickNullableStrKey(
  o: Record<string, unknown>,
  camel: string,
  snake: string,
): string | null {
  const v = o[camel] ?? o[snake]
  if (v === null || v === undefined) return null
  if (typeof v === 'string') {
    const t = v.trim()
    return t === '' ? null : t
  }
  return null
}

/** Resposta camelCase de GET /admin/collaborators. */
export function adminCollaboratorFromApiJson(raw: unknown): AdminCollaborator {
  const base = collaboratorFromApiJson(raw)
  const o = raw as Record<string, unknown>
  return {
    ...base,
    deletedAt:
      pickNullableStrKey(o, 'deletedAt', 'deleted_at') ??
      null,
    linkedUserId: pickNullableStrKey(o, 'linkedUserId', 'linked_user_id'),
    linkedUserEmail: pickNullableStrKey(o, 'linkedUserEmail', 'linked_user_email'),
    linkedUserDisplayName: pickNullableStrKey(
      o,
      'linkedUserDisplayName',
      'linked_user_display_name',
    ),
  }
}

function pickStr(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key]
  return typeof v === 'string' && v.trim() ? v : undefined
}

export function domainStatusToApi(
  status: CollaboratorStatus | undefined,
): 'ACTIVE' | 'INACTIVE' | undefined {
  if (status === undefined) return undefined
  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

/**
 * Query: `status` ACTIVE|INACTIVE (omitido = todos), `sector_id`, `search`.
 * Backend aceita também `status=ALL` e `sector_id=ALL` sem filtro; o frontend omite nesses casos.
 */
export function collaboratorListFilterToQueryString(
  filter?: CollaboratorListFilter,
): string {
  const q = new URLSearchParams()
  if (filter?.status === 'active') q.set('status', 'ACTIVE')
  else if (filter?.status === 'inactive') q.set('status', 'INACTIVE')
  const sk = filter?.sectorKey?.trim()
  if (sk) q.set('sector_id', sk)
  const search = filter?.search?.trim()
  if (search) q.set('search', search)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function createInputToApiBody(
  input: CollaboratorCreateInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    fullName: input.fullName,
    sectorId: input.sectorId,
    roleId: input.roleId,
  }
  if (input.avatarUrl !== undefined) body.avatarUrl = input.avatarUrl
  if (input.notes !== undefined) body.notes = input.notes
  if (input.sectorName !== undefined) body.sectorName = input.sectorName
  const apiSt = domainStatusToApi(input.status)
  if (apiSt !== undefined) body.status = apiSt
  return body
}

export function updateInputToApiBody(
  input: CollaboratorUpdateInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (input.fullName !== undefined) body.fullName = input.fullName
  if (input.avatarUrl !== undefined) body.avatarUrl = input.avatarUrl
  if (input.notes !== undefined) body.notes = input.notes
  if (input.sectorId !== undefined) body.sectorId = input.sectorId
  if (input.sectorName !== undefined) body.sectorName = input.sectorName
  if (input.roleId !== undefined) body.roleId = input.roleId
  const apiSt = domainStatusToApi(input.status)
  if (apiSt !== undefined) body.status = apiSt
  return body
}

export function sectorFromApiJson(raw: unknown): { id: string; name: string } {
  if (!raw || typeof raw !== 'object') {
    return { id: '', name: '' }
  }
  const o = raw as Record<string, unknown>
  const id = pickStr(o, 'id') ?? ''
  const name =
    pickStr(o, 'name') ?? pickStr(o, 'title') ?? pickStr(o, 'nome') ?? id
  return { id, name }
}

export function roleFromApiJson(raw: unknown): { id: string; name: string } {
  if (!raw || typeof raw !== 'object') {
    return { id: '', name: '' }
  }
  const o = raw as Record<string, unknown>
  const id = pickStr(o, 'id') ?? ''
  const name =
    pickStr(o, 'name') ?? pickStr(o, 'title') ?? pickStr(o, 'nome') ?? id
  return { id, name }
}
