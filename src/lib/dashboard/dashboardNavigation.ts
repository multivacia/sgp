import type { BacklogSituacaoQuery } from '../backlog/operationalBuckets'

/**
 * Política de novas abas (Sprint 3): usar só para consulta paralela, comparação ou pré-visualização
 * sem perder o fluxo atual — sempre com `noopener,noreferrer`. Evitar abrir aba por hábito em CTAs genéricos.
 */

function appUrl(path: string): string {
  if (path.startsWith('http')) return path
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

export type OpenBacklogInNewTabOptions = {
  /**
   * Com `situacao=concluidas`, restringe a linhas com `completed_at` nesta janela (dias).
   * Serializado na URL como `days=`.
   */
  days?: number
  /** @deprecated Preferir `days` (mesma semântica). */
  completedWithinDays?: number
}

/** Abre o painel operacional de esteiras; `situacao` aplica o filtro de bucket, exceto `ativas` → `scope=ativas`. */
export function openBacklogInNewTab(
  situacao?: BacklogSituacaoQuery,
  opts?: OpenBacklogInNewTabOptions,
) {
  if (!situacao) {
    window.open(appUrl('/app/backlog'), '_blank', 'noopener,noreferrer')
    return
  }
  const sp = new URLSearchParams()
  if (situacao === 'ativas') {
    sp.set('scope', 'ativas')
  } else {
    sp.set('situacao', situacao)
  }
  const effDays = opts?.days ?? opts?.completedWithinDays
  if (situacao === 'concluidas' && effDays != null && Number.isFinite(effDays)) {
    const d = Math.max(1, Math.min(365, Math.round(effDays)))
    sp.set('days', String(d))
  }
  window.open(appUrl(`/app/backlog?${sp.toString()}`), '_blank', 'noopener,noreferrer')
}

export function openEsteiraDetalheInNewTab(conveyorId: string) {
  window.open(
    appUrl(`/app/esteiras/${encodeURIComponent(conveyorId)}`),
    '_blank',
    'noopener,noreferrer',
  )
}
