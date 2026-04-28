import type { Env } from '../../config/env.js'

export const DEFAULT_ARGOS_CONVEYOR_HEALTH_ANALYZE_PATH =
  '/api/v1/specialists/conveyor-health/analyze'

/**
 * URL completa do `POST` de análise de saúde: `ARGOS_BASE_URL` + path.
 * `null` se a base não estiver configurada.
 */
export function resolveArgosConveyorHealthAnalyzeUrl(env: Env): string | null {
  const base = env.argosBaseUrl?.trim()
  if (!base) return null
  const b = base.replace(/\/$/, '')
  const p = (env.argosConveyorHealthAnalyzePath || DEFAULT_ARGOS_CONVEYOR_HEALTH_ANALYZE_PATH).trim()
  const path = p.startsWith('/') ? p : `/${p}`
  return `${b}${path}`
}
