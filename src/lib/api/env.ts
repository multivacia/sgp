export type DataMode = 'mock' | 'real' | 'auto'
export type AppEnvironment =
  | 'production'
  | 'homologation'
  | 'development'
  | 'unknown'

export type FrontendVersionMetadata = {
  product: string
  version: string
  releaseName: string
  environment: AppEnvironment
  environmentLabel: string
  commitSha: string
  buildTime: string | null
}

type FrontendAppBaseMetadata = {
  product: string
  version: string
  releaseName: string
}

const VALID: DataMode[] = ['mock', 'real', 'auto']
const FALLBACK_APP_BASE_METADATA: FrontendAppBaseMetadata = {
  product: 'SGP+',
  version: '0.0.0',
  releaseName: 'local',
}

export function getDataMode(): DataMode {
  const raw = import.meta.env.VITE_DATA_MODE?.trim().toLowerCase()
  if (raw && VALID.includes(raw as DataMode)) return raw as DataMode
  return 'real'
}

/** Base URL sem barra final, ex.: http://localhost:4000 */
export function getApiBaseUrl(): string {
  const u = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!u) return ''
  return u.replace(/\/+$/, '')
}

export function isSupportTicketsEnabled(): boolean {
  const raw = import.meta.env.VITE_SUPPORT_TICKETS_ENABLED?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

function isValidBaseMetadata(
  value: unknown,
): value is FrontendAppBaseMetadata {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as FrontendAppBaseMetadata).product === 'string' &&
    typeof (value as FrontendAppBaseMetadata).version === 'string' &&
    typeof (value as FrontendAppBaseMetadata).releaseName === 'string'
  )
}

function getBaseAppMetadata(): FrontendAppBaseMetadata {
  const globalMetadata = (
    globalThis as { __SGP_APP_BASE_METADATA__?: unknown }
  ).__SGP_APP_BASE_METADATA__

  if (
    typeof globalThis === 'object' &&
    isValidBaseMetadata(globalMetadata)
  ) {
    return globalMetadata
  }
  if (
    typeof __SGP_APP_BASE_METADATA__ !== 'undefined' &&
    isValidBaseMetadata(__SGP_APP_BASE_METADATA__)
  ) {
    return __SGP_APP_BASE_METADATA__
  }
  return FALLBACK_APP_BASE_METADATA
}

function normalizeAppEnvironment(raw: string | null | undefined): AppEnvironment {
  const value = raw?.trim().toLowerCase()
  if (!value) return 'unknown'
  if (value === 'production' || value === 'prod') return 'production'
  if (
    value === 'homologation' ||
    value === 'homolog' ||
    value === 'homologacao' ||
    value === 'homologação' ||
    value === 'hml' ||
    value === 'staging'
  ) {
    return 'homologation'
  }
  if (
    value === 'development' ||
    value === 'develop' ||
    value === 'dev' ||
    value === 'local' ||
    value === 'test'
  ) {
    return 'development'
  }
  return 'unknown'
}

export function getAppEnvironmentLabel(
  environment: AppEnvironment | string | null | undefined,
): string {
  switch (normalizeAppEnvironment(environment)) {
    case 'production':
      return 'Produção'
    case 'homologation':
      return 'Homologação'
    case 'development':
      return 'Desenvolvimento'
    default:
      return 'Desconhecido'
  }
}

export function resolveFrontendVersionMetadata(): FrontendVersionMetadata {
  const baseMetadata = getBaseAppMetadata()
  const version =
    import.meta.env.VITE_APP_VERSION?.trim() ||
    baseMetadata.version
  const environment = normalizeAppEnvironment(
    import.meta.env.VITE_APP_ENV?.trim() || import.meta.env.MODE,
  )
  const releaseName =
    import.meta.env.VITE_APP_RELEASE_NAME?.trim() ||
    baseMetadata.releaseName ||
    version
  const commitSha = import.meta.env.VITE_GIT_SHA?.trim() || 'local'
  const buildTime = import.meta.env.VITE_BUILD_TIME?.trim() || null

  return {
    product: baseMetadata.product,
    version,
    releaseName,
    environment,
    environmentLabel: getAppEnvironmentLabel(environment),
    commitSha,
    buildTime,
  }
}

export function buildVersionIdentityLabel(
  metadata: Pick<FrontendVersionMetadata, 'product' | 'version' | 'environmentLabel'>,
): string {
  return `${metadata.product} v${metadata.version} · ${metadata.environmentLabel}`
}

/**
 * Token de kiosk para o Modo Fábrica.
 * Quando definido via `VITE_PRODUCTION_KIOSK_TOKEN`, é enviado no header
 * `X-SGP-Kiosk-Token` nas chamadas públicas de produção.
 * Não é segurança absoluta — o PIN continua sendo o segundo fator.
 */
export function getProductionKioskToken(): string | undefined {
  const raw = import.meta.env.VITE_PRODUCTION_KIOSK_TOKEN?.trim()
  return raw || undefined
}
