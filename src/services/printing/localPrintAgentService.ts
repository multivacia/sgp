import {
  sheetsToAgentPayloads,
  type ActivityTicketAgentPayload,
} from '../../domain/printing/activityTicketAgentPayload'
import type { ThermalTicketPrintSheet } from '../../features/operational-tickets/thermalTicketPrintSheets'

export type PrintAgentHealth = {
  status: 'ok'
  service: string
  version: string
  printerName: string
  mockPrinter: boolean
  paperWidthMm: number
}

export type PrintAgentTicketResult = {
  index: number
  success: boolean
  message: string
  activityNodeId?: string
  shortCode?: string
}

export type PrintAgentBatchResponse = {
  success: boolean
  successCount: number
  failureCount: number
  results: PrintAgentTicketResult[]
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:8765'
const HEALTH_TIMEOUT_MS = 2000
const PRINT_TIMEOUT_MS = 120_000

function resolveBaseUrl(): string {
  const raw = import.meta.env.VITE_PRINT_AGENT_URL?.trim()
  return raw || DEFAULT_BASE_URL
}

function resolveAuthToken(): string {
  return import.meta.env.VITE_PRINT_AGENT_TOKEN?.trim() ?? ''
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const token = resolveAuthToken()
  if (token) headers['X-SGP-Print-Token'] = token
  return headers
}

export function getPrintAgentBaseUrl(): string {
  return resolveBaseUrl()
}

export async function checkPrintAgentHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${resolveBaseUrl()}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function fetchPrintAgentHealth(): Promise<PrintAgentHealth | null> {
  try {
    const response = await fetch(`${resolveBaseUrl()}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return (await response.json()) as PrintAgentHealth
  } catch {
    return null
  }
}

export async function printActivityTicketWithAgent(
  ticket: ActivityTicketAgentPayload,
): Promise<PrintAgentBatchResponse> {
  const response = await fetch(`${resolveBaseUrl()}/print/activity-ticket`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ ticket }),
    signal: AbortSignal.timeout(PRINT_TIMEOUT_MS),
  })

  const body = (await response.json()) as {
    success?: boolean
    results?: PrintAgentTicketResult[]
  }

  return {
    success: Boolean(body.success),
    successCount: body.results?.filter((r) => r.success).length ?? 0,
    failureCount: body.results?.filter((r) => !r.success).length ?? 0,
    results: body.results ?? [],
  }
}

export async function printActivityTicketsBatchWithAgent(
  sheets: readonly ThermalTicketPrintSheet[],
): Promise<PrintAgentBatchResponse> {
  const tickets = sheetsToAgentPayloads(sheets)
  const response = await fetch(`${resolveBaseUrl()}/print/activity-tickets/batch`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ tickets }),
    signal: AbortSignal.timeout(PRINT_TIMEOUT_MS),
  })

  const body = (await response.json()) as PrintAgentBatchResponse
  return {
    success: Boolean(body.success),
    successCount: body.successCount ?? 0,
    failureCount: body.failureCount ?? 0,
    results: body.results ?? [],
  }
}

export async function printTestTicketWithAgent(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${resolveBaseUrl()}/print/test`, {
      method: 'POST',
      headers: buildHeaders(),
      signal: AbortSignal.timeout(PRINT_TIMEOUT_MS),
    })
    const body = (await response.json()) as { success?: boolean; message?: string }
    return {
      success: Boolean(body.success),
      message: body.message ?? (body.success ? 'Teste enviado' : 'Falha no teste'),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao contatar agente'
    return { success: false, message }
  }
}
