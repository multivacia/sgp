export type DataMode = 'mock' | 'real' | 'auto'

const VALID: DataMode[] = ['mock', 'real', 'auto']

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
