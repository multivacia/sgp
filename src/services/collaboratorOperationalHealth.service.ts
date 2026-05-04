import {
  collaboratorOperationalHealthSnapshotFromApi,
  collaboratorOperationalHealthSummaryFromApi,
} from '../domain/collaborator-health/collaboratorOperationalHealth.mappers'
import type {
  CollaboratorOperationalHealthSnapshot,
  CollaboratorOperationalHealthSnapshotParams,
  CollaboratorOperationalHealthSummary,
  CollaboratorOperationalHealthSummaryMeta,
  CollaboratorOperationalHealthSummaryParams,
} from '../domain/collaborator-health/collaboratorOperationalHealth.types'
import { requestJson, requestJsonEnvelope } from '../lib/api/client'

const BASE = '/api/v1'

/** Monta query string do summary (exportado para testes). */
export function buildCollaboratorOperationalHealthSummaryQueryString(
  params?: CollaboratorOperationalHealthSummaryParams,
): string {
  const qs = new URLSearchParams()
  if (!params) return ''
  if (params.referenceDate?.trim()) qs.set('referenceDate', params.referenceDate.trim())
  if (params.recentDays !== undefined && params.recentDays !== null) {
    qs.set('recentDays', String(params.recentDays))
  }
  if (params.limit !== undefined && params.limit !== null) {
    qs.set('limit', String(params.limit))
  }
  if (params.includeInactive === true) qs.set('includeInactive', 'true')
  const s = qs.toString()
  return s ? `?${s}` : ''
}

function buildSnapshotQueryString(params?: CollaboratorOperationalHealthSnapshotParams): string {
  const qs = new URLSearchParams()
  if (!params) return ''
  if (params.referenceDate?.trim()) qs.set('referenceDate', params.referenceDate.trim())
  if (params.recentDays !== undefined && params.recentDays !== null) {
    qs.set('recentDays', String(params.recentDays))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export async function getCollaboratorOperationalHealthSummary(
  params?: CollaboratorOperationalHealthSummaryParams,
): Promise<{ summary: CollaboratorOperationalHealthSummary; meta: CollaboratorOperationalHealthSummaryMeta }> {
  const path = `${BASE}/collaborators/operational-health-summary${buildCollaboratorOperationalHealthSummaryQueryString(params)}`
  const { data, meta } = await requestJsonEnvelope<unknown>('GET', path)
  const summary = collaboratorOperationalHealthSummaryFromApi(data)
  const limit = typeof meta.limit === 'number' ? meta.limit : Number(meta.limit) || 50
  const returned = typeof meta.returned === 'number' ? meta.returned : Number(meta.returned) || 0
  const hasMore = meta.hasMore === true
  return {
    summary,
    meta: { limit, returned, hasMore },
  }
}

export async function getCollaboratorOperationalHealthSnapshot(
  collaboratorId: string,
  params?: CollaboratorOperationalHealthSnapshotParams,
): Promise<CollaboratorOperationalHealthSnapshot> {
  const path = `${BASE}/collaborators/${encodeURIComponent(collaboratorId)}/operational-health-snapshot${buildSnapshotQueryString(params)}`
  const raw = await requestJson<unknown>('GET', path)
  return collaboratorOperationalHealthSnapshotFromApi(raw)
}
