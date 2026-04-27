import type { SgpNormalizedError } from './sgpErrorContract'

/**
 * Mensagem única de apresentação para o utilizador.
 * Exibe código de suporte quando disponível, sem vazar detalhe técnico.
 */
export function formatUserError(n: SgpNormalizedError): string {
  const msg = n.userMessage.trim()
  if (!n.errorRef) return msg
  return `${msg}\nCódigo de suporte: ${n.errorRef}`
}
