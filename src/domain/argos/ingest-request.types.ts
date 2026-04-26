import type { ArgosIntentId } from './intent'

/**
 * Identificação do sistema chamador (ex.: instância SGP+).
 */
export type ArgosCaller = {
  systemId: string
}

/**
 * Políticas acordadas entre SGP+ e ARGOS (limites, formatos, retenção, etc.).
 * Campos concretos são negociados operacionalmente; o tipo permite evolução.
 */
export type ArgosIngestPolicy = {
  maxFileBytes?: number
  allowedMimeTypes?: string[]
  /** Extensão sem breaking: chaves adicionais permitidas. */
  [key: string]: unknown
}

/**
 * Metadados opcionais do pedido (correlação, locale, referências opacas).
 * Não substitui campos obrigatórios do contrato principal.
 */
export type ArgosIngestMetadata = {
  correlationId?: string
  locale?: string
  /** Referências opacas; evitar PII desnecessária. */
  [key: string]: unknown
}

/**
 * Parte JSON do pedido de interpretação (o binário `file` transporta-se à parte,
 * ex. multipart). O campo `intent` deve coincidir com o intent oficial.
 */
export type ArgosDocumentIngestEnvelope = {
  caller: ArgosCaller
  policy: ArgosIngestPolicy
  intent: ArgosIntentId
  metadata?: ArgosIngestMetadata
}
