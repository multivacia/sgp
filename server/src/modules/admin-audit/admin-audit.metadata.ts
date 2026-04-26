import { z } from 'zod'
import type { AdminAuditEventType } from './admin-audit.types.js'

const FORBIDDEN_KEY_SUBSTR = [
  'password',
  'token',
  'hash',
  'secret',
  'cookie',
  'authorization',
] as const

function assertSafeKey(k: string): void {
  const lower = k.toLowerCase()
  for (const f of FORBIDDEN_KEY_SUBSTR) {
    if (lower.includes(f)) {
      throw new Error(`Chave de metadata proibida: ${k}`)
    }
  }
}

/**
 * Alinhado a `z.string().uuid()` (Zod v3): o mesmo literal que passa no body da API
 * deve ser aceite aqui. Uma regex manual mais estrita que o Zod fazia falhar a auditoria
 * após inserts válidos (ex.: certos UUID aceites por PostgreSQL / Zod).
 */
function isUuidString(v: unknown): v is string {
  return typeof v === 'string' && z.string().uuid().safeParse(v).success
}

const METADATA_ALLOWLIST: Record<
  AdminAuditEventType,
  readonly string[] | 'empty'
> = {
  admin_user_created: [
    'initial_role_id',
    'had_collaborator_link',
    // "pwd" em vez de "password": assertSafeKey proíbe substring "password" nos nomes das chaves
    'must_change_pwd_initial',
  ],
  admin_user_updated: ['changed_fields'],
  admin_user_activated: ['via'],
  admin_user_deactivated: ['via'],
  admin_user_soft_deleted: 'empty',
  admin_user_restored: 'empty',
  admin_user_password_reset: ['cleared_lockout'],
  admin_user_force_password_change: 'empty',
  admin_user_collaborator_linked: ['previous_collaborator_id', 'new_collaborator_id'],
  admin_user_collaborator_unlinked: ['previous_collaborator_id'],
  role_permissions_updated: [
    'role_id',
    'role_code',
    'added_permission_codes',
    'removed_permission_codes',
  ],
  time_entry_created_on_behalf: [
    'conveyor_id',
    'step_node_id',
    'time_entry_id',
    'target_collaborator_id',
    'reason',
  ],
  time_entry_deleted_by_manager: [
    'conveyor_id',
    'step_node_id',
    'time_entry_id',
    'target_collaborator_id',
    'reason',
  ],
}

export function buildSanitizedMetadata(
  eventType: AdminAuditEventType,
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const allow = METADATA_ALLOWLIST[eventType]
  if (allow === 'empty') {
    if (raw && Object.keys(raw).length > 0) {
      throw new Error(`metadata deve ser vazio para ${eventType}`)
    }
    return null
  }
  if (!raw || Object.keys(raw).length === 0) return null

  const out: Record<string, unknown> = {}
  for (const key of allow) {
    assertSafeKey(key)
    if (!(key in raw)) continue
    const v = raw[key]
    if (v === undefined) continue

    if (key === 'changed_fields') {
      if (!Array.isArray(v)) throw new Error('changed_fields deve ser array')
      const allowed = new Set([
        'email',
        'role_id',
        'avatar_url',
        'must_change_password',
      ])
      const arr = v.filter((x): x is string => typeof x === 'string')
      if (arr.some((s) => !allowed.has(s))) {
        throw new Error('changed_fields contém campo não permitido')
      }
      out[key] = arr
      continue
    }

    if (key === 'via') {
      if (v !== 'endpoint' && v !== 'patch') throw new Error('via inválido')
      out[key] = v
      continue
    }

    if (key === 'had_collaborator_link' || key === 'must_change_pwd_initial') {
      if (typeof v !== 'boolean') throw new Error(`${key} deve ser boolean`)
      out[key] = v
      continue
    }

    if (key === 'cleared_lockout') {
      if (typeof v !== 'boolean') throw new Error('cleared_lockout deve ser boolean')
      out[key] = v
      continue
    }

    if (key === 'initial_role_id' || key === 'new_collaborator_id') {
      if (!isUuidString(v)) throw new Error(`${key} deve ser UUID`)
      out[key] = v
      continue
    }

    if (key === 'previous_collaborator_id') {
      if (v === null) {
        out[key] = null
        continue
      }
      if (!isUuidString(v)) throw new Error('previous_collaborator_id inválido')
      out[key] = v
      continue
    }

    if (key === 'role_id') {
      if (!isUuidString(v)) throw new Error('role_id deve ser UUID')
      out[key] = v
      continue
    }

    if (key === 'role_code') {
      if (typeof v !== 'string' || !v.trim()) throw new Error('role_code inválido')
      out[key] = v
      continue
    }

    if (key === 'added_permission_codes' || key === 'removed_permission_codes') {
      if (!Array.isArray(v)) throw new Error(`${key} deve ser array`)
      const arr = v.filter((x): x is string => typeof x === 'string')
      if (arr.some((s) => !s.trim())) throw new Error(`${key} contém entrada inválida`)
      out[key] = arr
      continue
    }

    if (
      key === 'conveyor_id' ||
      key === 'step_node_id' ||
      key === 'time_entry_id' ||
      key === 'target_collaborator_id'
    ) {
      if (!isUuidString(v)) throw new Error(`${key} deve ser UUID`)
      out[key] = v
      continue
    }

    if (key === 'reason') {
      if (typeof v !== 'string') throw new Error('reason deve ser texto')
      const t = v.trim()
      if (!t.length) throw new Error('reason não pode ser vazio')
      if (t.length > 4000) throw new Error('reason excede tamanho máximo')
      out[key] = t
      continue
    }
  }

  for (const k of Object.keys(raw)) {
    if (!allow.includes(k)) {
      throw new Error(`Chave não permitida em metadata para ${eventType}: ${k}`)
    }
  }

  return Object.keys(out).length > 0 ? out : null
}
