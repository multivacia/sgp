import { useMemo, useState } from 'react'
import type { MatrixCatalogTaskEntry } from './extractMatrixTasksForCatalog'

type Props = {
  open: boolean
  onClose: () => void
  loading: boolean
  loadError: string | null
  entries: MatrixCatalogTaskEntry[]
  onRetryLoad?: () => void
  onInclude: (taskId: string) => void
}

function matchesQuery(e: MatrixCatalogTaskEntry, q: string): boolean {
  if (!q.trim()) return true
  const s = q.toLowerCase()
  return (
    e.taskName.toLowerCase().includes(s) ||
    e.matrixItemName.toLowerCase().includes(s)
  )
}

export function CatalogAddModal({
  open,
  onClose,
  loading,
  loadError,
  entries,
  onRetryLoad,
  onInclude,
}: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => entries.filter((e) => matchesQuery(e, query)),
    [entries, query],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-add-modal-title"
        className="flex max-h-[min(85vh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-sgp-app-panel-deep shadow-2xl ring-1 ring-white/[0.06]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <h2
            id="catalog-add-modal-title"
            className="text-sm font-semibold text-slate-100"
          >
            Incluir do catálogo de outras matrizes
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Cada inclusão cria um clone local no rascunho; a matriz de origem não
            é alterada.
          </p>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por opção ou matriz…"
            autoComplete="off"
            className="sgp-input-app mt-3 w-full rounded-xl border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            aria-label="Pesquisar no catálogo"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3 [scrollbar-width:thin]">
          {loading && (
            <p className="px-2 py-6 text-center text-sm text-slate-500">
              Carregando catálogo…
            </p>
          )}
          {!loading && loadError && (
            <div className="space-y-3 px-2 py-4">
              <p className="text-sm text-rose-300">{loadError}</p>
              {onRetryLoad && (
                <button
                  type="button"
                  onClick={onRetryLoad}
                  className="rounded-lg border border-white/18 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.06]"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          )}
          {!loading && !loadError && entries.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-slate-500">
              Não há opções noutras matrizes para reaproveitar.
            </p>
          )}
          {!loading && !loadError && entries.length > 0 && filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-slate-500">
              Nenhum resultado para «{query.trim()}».
            </p>
          )}
          {!loading && !loadError && filtered.length > 0 && (
            <ul className="space-y-2 pb-2">
              {filtered.map((e) => (
                <li
                  key={e.taskId}
                  className="flex items-start justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {e.taskName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {e.matrixItemName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onInclude(e.taskId)
                    }}
                    className="shrink-0 rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2.5 py-1 text-xs font-semibold text-sgp-gold hover:bg-sgp-gold/15"
                  >
                    Incluir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/[0.06] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/12 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/[0.05]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
