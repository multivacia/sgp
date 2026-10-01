import type {
  OperationalJourneyData,
  OperationalPeriodPreset,
} from '../../domain/operational-journey/operational-journey.types'
import { requestJson } from '../../lib/api/client'
import { ApiError, parseErrorEnvelope } from '../../lib/api/apiErrors'
import { getApiBaseUrl } from '../../lib/api/env'

const BASE = '/api/v1'

export type OperationalJourneyQuery = {
  periodPreset?: OperationalPeriodPreset
  from?: string
  to?: string
  limit?: number
  conveyorId?: string
}

function operationalJourneyQueryString(query?: OperationalJourneyQuery): string {
  const qs = new URLSearchParams()
  if (query?.periodPreset) qs.set('periodPreset', query.periodPreset)
  if (query?.from?.trim()) qs.set('from', query.from.trim())
  if (query?.to?.trim()) qs.set('to', query.to.trim())
  if (query?.limit !== undefined) qs.set('limit', String(query.limit))
  if (query?.conveyorId?.trim()) qs.set('conveyorId', query.conveyorId.trim())
  return qs.toString()
}

export async function fetchOperationalJourney(
  collaboratorId: string,
  query?: OperationalJourneyQuery,
): Promise<OperationalJourneyData> {
  const q = operationalJourneyQueryString(query)
  const path = `${BASE}/collaborators/${encodeURIComponent(collaboratorId)}/operational-journey${
    q ? `?${q}` : ''
  }`
  return requestJson<OperationalJourneyData>('GET', path)
}

/** Jornada do colaborador logado — mesmo contrato que a jornada gerencial. */
export async function fetchMyOperationalJourney(
  query?: OperationalJourneyQuery,
): Promise<OperationalJourneyData> {
  const q = operationalJourneyQueryString(query)
  return requestJson<OperationalJourneyData>(
    'GET',
    `${BASE}/my-operational-journey${q ? `?${q}` : ''}`,
  )
}

export const EXPORT_OPERATIONAL_JOURNEY_FAIL_MESSAGE =
  'Não foi possível exportar o Excel da jornada.'

/** Monta a URL relativa da exportação — mesmo recorte/filtros da tela, sem `limit`. */
export function buildOperationalJourneyExportPath(
  collaboratorIds: readonly string[],
  query?: OperationalJourneyQuery,
): string {
  const qs = new URLSearchParams(operationalJourneyQueryString({ ...query, limit: undefined }))
  qs.set('collaboratorIds', collaboratorIds.join(','))
  return `${BASE}/collaborators/operational-journey/export.xlsx?${qs.toString()}`
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1])
    } catch {
      return utfMatch[1]
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header)
  return quoted?.[1] ?? null
}

/** Baixa o `.xlsx` da jornada para os colaboradores selecionados (um ou vários). */
export async function exportOperationalJourneyToExcel(
  collaboratorIds: readonly string[],
  query?: OperationalJourneyQuery,
): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const pathPart = buildOperationalJourneyExportPath(collaboratorIds, query)
  const url = baseUrl ? `${baseUrl}${pathPart}` : pathPart

  let res: Response
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include' })
  } catch (e) {
    throw new ApiError(EXPORT_OPERATIONAL_JOURNEY_FAIL_MESSAGE, 503, {
      code: 'NETWORK_ERROR',
      cause: e,
    })
  }

  if (!res.ok) {
    let parsed: unknown = null
    try {
      const text = await res.text()
      parsed = text ? JSON.parse(text) : null
    } catch {
      // Corpo não-JSON: segue com mensagem padrão pelo status.
    }
    const { message, code, errorRef, correlationId, category, severity, details } =
      parseErrorEnvelope(parsed, res.status)
    throw new ApiError(message, res.status, {
      code,
      errorRef,
      correlationId,
      category,
      severity,
      details,
    })
  }

  const blob = await res.blob()
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) ?? 'jornada-colaboradores.xlsx'
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
