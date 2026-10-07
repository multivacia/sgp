/**
 * Aviso in-app de que dados operacionais mudaram (apontamento, conclusão, Extra Esteira).
 *
 * Telas que mantêm agregados em memória (ex.: Dashboard) escutam o evento e refazem a
 * consulta ao backend — sem polling e sem recalcular regra de negócio no frontend.
 */
export const OPERATIONAL_DATA_CHANGED_EVENT = 'sgp:operational-data-changed'

export type OperationalDataChangeReason =
  | 'time_entry_created'
  | 'activity_completed'
  | 'extra_time_entry_created'

export type OperationalDataChangedDetail = { reason: OperationalDataChangeReason }

export function notifyOperationalDataChanged(reason: OperationalDataChangeReason): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<OperationalDataChangedDetail>(OPERATIONAL_DATA_CHANGED_EVENT, {
      detail: { reason },
    }),
  )
}

/** Retorna a função de cancelamento da inscrição. */
export function subscribeOperationalDataChanged(
  listener: (detail: OperationalDataChangedDetail) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<OperationalDataChangedDetail>).detail
    listener(detail ?? { reason: 'time_entry_created' })
  }
  window.addEventListener(OPERATIONAL_DATA_CHANGED_EVENT, handler)
  return () => window.removeEventListener(OPERATIONAL_DATA_CHANGED_EVENT, handler)
}
