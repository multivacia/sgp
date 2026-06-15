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
