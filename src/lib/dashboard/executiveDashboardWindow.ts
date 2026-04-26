/**
 * Janela temporal do dashboard gerencial (`GET /api/v1/dashboard/executive?days=N`).
 * Valores expostos na UI devem permanecer alinhados ao drill-down (`days` no backlog).
 */

export const EXECUTIVE_WINDOW_DAY_OPTIONS = [7, 15, 30, 60, 90] as const

export type ExecutiveWindowDays = (typeof EXECUTIVE_WINDOW_DAY_OPTIONS)[number]

const STORAGE_KEY = 'sgp.dashboard.executiveWindowDays'

export function readStoredExecutiveWindowDays(): ExecutiveWindowDays {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const n = raw ? Number.parseInt(raw, 10) : NaN
    if (
      Number.isFinite(n) &&
      EXECUTIVE_WINDOW_DAY_OPTIONS.includes(n as ExecutiveWindowDays)
    ) {
      return n as ExecutiveWindowDays
    }
  } catch {
    /* ignore */
  }
  return 30
}

export function persistExecutiveWindowDays(days: ExecutiveWindowDays): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(days))
  } catch {
    /* ignore */
  }
}
