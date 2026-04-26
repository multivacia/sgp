import type { ConveyorDraftV1 } from './draft-v1.types'
import type { ArgosIssue } from './warnings-taxonomy.types'

/**
 * Estado global do processamento no ARGOS.
 */
export type ArgosIngestStatus =
  | 'completed'
  | 'partial'
  | 'failed'

/**
 * Identificação da linha de processamento ou «especialista» lógico (pipeline).
 */
export type ArgosSpecialistRef = string

/**
 * Estratégia ou modo de extração (ex.: ocr_only, ocr_plus_rules, llm_assisted).
 * Valores concretos são acordados entre equipas; mantido como string estável.
 */
export type ArgosStrategyRef = string

/**
 * Metadados do documento de entrada (não confundir com metadados do pedido HTTP).
 */
export type ArgosDocumentDescriptor = {
  fileName?: string
  mimeType?: string
  pageCount?: number
  /** Hash estável do conteúdo binário (algoritmo acordado, ex. SHA-256). */
  contentSha256?: string
  [key: string]: unknown
}

/**
 * Facto extraído com proveniência opcional (secção, confiança).
 */
export type ArgosExtractedFact = {
  key: string
  value: string | number | boolean | null
  confidence?: number
  sourcePage?: number
  sourceSnippet?: string
  [key: string]: unknown
}

/**
 * Confiança global e opcionalmente por domínio.
 */
export type ArgosConfidenceSummary = {
  overall: number
  byField?: Record<string, number>
  [key: string]: unknown
}

/**
 * Resposta oficial ARGOS → SGP+ (corpo lógico após processamento do documento).
 * Transporte (HTTP/gRPC) fica fora deste tipo.
 */
export type ArgosDocumentIngestResult = {
  requestId: string
  correlationId: string
  status: ArgosIngestStatus
  specialist: ArgosSpecialistRef
  strategy: ArgosStrategyRef
  document: ArgosDocumentDescriptor
  extractedFacts: ArgosExtractedFact[]
  draft: ConveyorDraftV1 | null
  warnings: ArgosIssue[]
  confidence: ArgosConfidenceSummary | null
}
