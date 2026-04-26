const PREFIX = '[sgp:shell]'

/**
 * Registo mínimo de eventos do shell (troca de função, etc.).
 * Em produção evita ruído; em desenvolvimento usa `console.info` para validação manual.
 */
export function shellLog(event: string, data?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return
  if (data && Object.keys(data).length > 0) {
    console.info(PREFIX, event, data)
  } else {
    console.info(PREFIX, event)
  }
}
