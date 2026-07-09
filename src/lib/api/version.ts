import {
  buildVersionIdentityLabel,
  getApiBaseUrl,
  resolveFrontendVersionMetadata,
  type FrontendVersionMetadata,
} from './env'

export type ApiVersionMetadata = {
  product: string
  version: string
  releaseName: string
  environment: string
  buildTime: string | null
  commit: string
}

type SuccessEnvelope<T> = {
  data?: T
  meta?: unknown
}

let cachedVersionRequest: Promise<ApiVersionMetadata | null> | null = null

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function sanitizeApiVersionPayload(raw: unknown): ApiVersionMetadata | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<ApiVersionMetadata>
  return {
    product: normalizeString(data.product, 'SGP+'),
    version: normalizeString(data.version, '0.0.0'),
    releaseName: normalizeString(data.releaseName, 'local'),
    environment: normalizeString(data.environment, 'unknown'),
    buildTime: normalizeNullableString(data.buildTime),
    commit: normalizeString(data.commit, 'local'),
  }
}

function versionEndpointUrl(): string {
  const base = getApiBaseUrl()
  return base ? `${base}/api/v1/version` : '/api/v1/version'
}

export async function fetchApiVersionMetadata(): Promise<ApiVersionMetadata | null> {
  if (cachedVersionRequest) return cachedVersionRequest

  cachedVersionRequest = (async () => {
    try {
      const response = await fetch(versionEndpointUrl(), {
        method: 'GET',
        credentials: 'include',
      })
      if (!response.ok) return null
      const parsed = (await response.json()) as SuccessEnvelope<ApiVersionMetadata>
      return sanitizeApiVersionPayload(parsed.data ?? parsed)
    } catch {
      return null
    }
  })()

  return cachedVersionRequest
}

export function isApiVersionMismatch(
  frontend: FrontendVersionMetadata,
  api: ApiVersionMetadata | null,
): boolean {
  if (!api) return false
  return (
    frontend.version !== api.version ||
    frontend.environment !== api.environment
  )
}

export function buildVersionStampTitle(
  frontend: FrontendVersionMetadata,
  api: ApiVersionMetadata | null,
): string {
  const localTitle = [
    buildVersionIdentityLabel(frontend),
    `release: ${frontend.releaseName}`,
    `commit: ${frontend.commitSha}`,
    `build: ${frontend.buildTime ?? 'não informado'}`,
  ].join('\n')

  if (!api) {
    return `${localTitle}\nAPI: indisponível`
  }

  return [
    localTitle,
    `API: ${api.product} v${api.version} · ${api.environment}`,
    `API release: ${api.releaseName}`,
    `API commit: ${api.commit}`,
    `API build: ${api.buildTime ?? 'não informado'}`,
  ].join('\n')
}

export function getFrontendVersionIdentity(): FrontendVersionMetadata {
  return resolveFrontendVersionMetadata()
}
