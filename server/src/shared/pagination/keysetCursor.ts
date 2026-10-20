import { z } from 'zod'
import { AppError } from '../errors/AppError.js'
import { ErrorCodes } from '../errors/errorCodes.js'

/**
 * Cursor opaco de paginação keyset ("Carregar mais").
 *
 * Codifica os valores da chave de ordenação do **último item devolvido** e o escopo
 * (endpoint) a que pertence. O frontend só repassa o valor recebido em `nextCursor`.
 * Cursor ausente = primeira página. Cursor malformado, adulterado ou de outro escopo → 400.
 */
export const INVALID_PAGINATION_CURSOR_MESSAGE =
  'Cursor de paginação inválido. Recarregue a lista.'

const CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,2048}$/

export const keysetCursorQuerySchema = z.string().max(2048).optional()

export const keysetCursorInt = z.number().int().min(0).max(2_147_483_647)
export const keysetCursorIsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const keysetCursorUuid = z.string().uuid()

export function encodeKeysetCursor(scope: string, key: ReadonlyArray<string | number>): string {
  return Buffer.from(JSON.stringify({ s: scope, k: key }), 'utf8').toString('base64url')
}

function invalidCursor(): AppError {
  return new AppError(INVALID_PAGINATION_CURSOR_MESSAGE, 400, ErrorCodes.VALIDATION_ERROR)
}

/** `null` quando não há cursor (primeira página). */
export function decodeKeysetCursor<T>(
  raw: string | null | undefined,
  scope: string,
  keySchema: z.ZodType<T>,
): T | null {
  if (raw == null || raw === '') return null
  if (!CURSOR_PATTERN.test(raw)) throw invalidCursor()
  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
  } catch {
    throw invalidCursor()
  }
  if (
    typeof payload !== 'object' ||
    payload === null ||
    (payload as { s?: unknown }).s !== scope
  ) {
    throw invalidCursor()
  }
  const parsed = keySchema.safeParse((payload as { k?: unknown }).k)
  if (!parsed.success) throw invalidCursor()
  return parsed.data
}
