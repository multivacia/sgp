import type { Env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type {
  ConveyorHealthAnalysisV1,
  ConveyorOperationalSnapshotV1,
} from '../conveyors/health/conveyor-health.argos-types.js'
import { conveyorOperationalSnapshotV1Schema } from '../conveyors/health/conveyor-health.argos-schema.js'
import { resolveArgosConveyorHealthAnalyzeUrl } from './argos-health.config.js'

/**
 * Cliente HTTP JSON para `POST …/conveyor-health/analyze`.
 * Reutiliza `ARGOS_INGEST_TOKEN` como `Authorization: Bearer` quando definido
 * (token interno compartilhado com o gateway, se aplicável).
 */
export async function postConveyorHealthAnalyze(
  env: Env,
  snapshot: ConveyorOperationalSnapshotV1,
): Promise<ConveyorHealthAnalysisV1> {
  const snapshotValidation = conveyorOperationalSnapshotV1Schema.safeParse(snapshot)
  if (!snapshotValidation.success) {
    throw new AppError(
      'Snapshot inválido para contrato ARGOS ConveyorOperationalSnapshotV1.',
      500,
      ErrorCodes.INTERNAL,
      snapshotValidation.error.flatten(),
      { category: 'INTEGRATION' },
    )
  }

  if (env.argosHealthEnabled === false) {
    throw new AppError(
      'Análise de saúde da esteira desativada no servidor.',
      503,
      ErrorCodes.INTERNAL,
      undefined,
      { category: 'INTEGRATION', severity: 'warning' },
    )
  }

  const url = resolveArgosConveyorHealthAnalyzeUrl(env)
  if (!url) {
    throw new AppError(
      'ARGOS_BASE_URL não configurado para análise de saúde.',
      500,
      ErrorCodes.INTERNAL,
      undefined,
      { category: 'INTEGRATION' },
    )
  }

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), env.argosHealthTimeoutMs)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    const token = env.argosIngestToken?.trim()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(snapshot),
      signal: controller.signal,
    })

    const text = await res.text()
    let json: unknown
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      throw new AppError(
        'Resposta ARGOS (health) não é JSON válido.',
        502,
        ErrorCodes.INTERNAL,
        undefined,
        { category: 'INTEGRATION' },
      )
    }

    if (!res.ok) {
      throw new AppError(
        extractArgosHealthErrorMessage(json, res.status),
        502,
        ErrorCodes.INTERNAL,
        json,
        { category: 'INTEGRATION' },
      )
    }

    return parseConveyorHealthAnalysisResponse(json)
  } catch (e) {
    if (e instanceof AppError) throw e
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AppError(
        'Timeout ao contactar ARGOS (health).',
        504,
        ErrorCodes.INTERNAL,
        undefined,
        { category: 'INTEGRATION' },
      )
    }
    throw new AppError(
      e instanceof Error ? e.message : 'Falha ao contactar ARGOS (health).',
      502,
      ErrorCodes.INTERNAL,
      undefined,
      { category: 'INTEGRATION' },
    )
  } finally {
    clearTimeout(t)
  }
}

function extractArgosHealthErrorMessage(json: unknown, httpStatus: number): string {
  if (json && typeof json === 'object' && json !== null) {
    const o = json as Record<string, unknown>
    const err = o.error
    if (err && typeof err === 'object' && err !== null) {
      const em = (err as Record<string, unknown>).message
      if (typeof em === 'string' && em.trim()) return em.trim()
    }
    const m = o.message
    if (typeof m === 'string' && m.trim()) return m.trim()
  }
  return `ARGOS health indisponível ou resposta inválida (HTTP ${httpStatus}).`
}

function parseConveyorHealthAnalysisResponse(json: unknown): ConveyorHealthAnalysisV1 {
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>
    if (o.success === true && o.data !== undefined && typeof o.data === 'object') {
      return o.data as ConveyorHealthAnalysisV1
    }
    if ('data' in o && o.data !== undefined && typeof o.data === 'object') {
      return o.data as ConveyorHealthAnalysisV1
    }
    return json as ConveyorHealthAnalysisV1
  }
  throw new AppError(
    'Resposta ARGOS (health) em formato inesperado.',
    502,
    ErrorCodes.INTERNAL,
    json,
    { category: 'INTEGRATION' },
  )
}
