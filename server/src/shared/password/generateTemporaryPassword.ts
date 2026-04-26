import { randomBytes } from 'node:crypto'

/**
 * Senha temporária forte (não persistida em claro; apenas retorno HTTP único).
 * Base64url ~22 caracteres a partir de 16 bytes de entropia.
 */
export function generateTemporaryPassword(): string {
  return randomBytes(16).toString('base64url')
}
