import { useMemo, useState, type ReactNode } from 'react'
import type { MatrixCatalogTaskEntry } from './extractMatrixTasksForCatalog'
import { MatrixCatalogReadonlyDetails } from './MatrixCatalogReadonlyDetails'
import {
  NOVA_MATRIZ_ESTRUTURA_DND_MIME,
  stringifyNovaMatrizEstruturaDrag,
  parseNovaMatrizEstruturaDrag,
} from './novaMatrizEstruturaDnD'

type Props = {
  loading: boolean
  loadError: string | null
  entries: MatrixCatalogTaskEntry[]
  onRetryLoad?: () => void
  resolveCollaboratorLabel: (id: string) => string
  /** Remove instância do rascunho ao soltar cartão do rascunho sobre o catálogo. */
  onDropDraftToRemove: (instanceId: string) => void
  /** Botões extra (ex.: abrir modal «Do catálogo»). */
  toolbarExtra?: ReactNode
  /** Totem de criação — substitui o título padrão do painel. */
  headingTitle?: string
  headingHint?: string
}

function matchesSearch(entry: MatrixCatalogTaskEntry, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return (
    entry.taskName.toLowerCase().includes(s) ||
    entry.matrixItemName.toLowerCase().includes(s)
  )
}

export function NovaMatrizEstruturaCatalogPanel({
  loading,
  loadError,
  entries,
  onRetryLoad,
  resolveCollaboratorLabel,
  onDropDraftToRemove,
  toolbarExtra,
  headingTitle,
  headingHint,
}: Props) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const [dropHighlight, setDropHighlight] = useState(false)

  const filtered = useMemo(
    () => entries.filter((e) => matchesSearch(e, search)),
    [entries, search],
  )

  function toggleExpanded(taskId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  function handleDragStartCatalog(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData(
      NOVA_MATRIZ_ESTRUTURA_DND_MIME,
      stringifyNovaMatrizEstruturaDrag({ kind: 'catalog-task', taskId }),
    )
    e.dataTransfer.effectAllowed = 'copy'
  }

  function handleDragOverRemoveZone(e: React.DragEvent) {
    if (e.dataTransfer.types.includes(NOVA_MATRIZ_ESTRUTURA_DND_MIME)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  function handleDragEnterPanel(e: React.DragEvent) {
    e.preventDefault()
    setDropHighlight(true)
  }

  function handleDragLeavePanel(e: React.DragEvent) {
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    setDropHighlight(false)
  }

  function handleDropOnCatalog(e: React.DragEvent) {
    e.preventDefault()
    setDropHighlight(false)
    const raw = e.dataTransfer.getData(NOVA_MATRIZ_ESTRUTURA_DND_MIME)
    const p = parseNovaMatrizEstruturaDrag(raw)
    if (p?.kind === 'draft-task') {
      onDropDraftToRemove(p.instanceId)
    }
  }

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col rounded-2xl border bg-gradient-to-b from-orange-950/50 to-black/20 px-3 py-3 shadow-inner ring-1 ring-orange-400/20 sm:px-4 ${
        dropHighlight
          ? 'border-orange-300 ring-2 ring-orange-400/50'
          : 'border-orange-400/35'
      }`}
      role="region"
      aria-label={headingTitle ?? 'Catálogo de tarefas existentes'}
      onDragEnter={handleDragEnterPanel}
      onDragLeave={handleDragLeavePanel}
      onDragOver={handleDragOverRemoveZone}
      onDrop={handleDropOnCatalog}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-orange-400/20 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-sm font-semibold text-orange-100/95">
            {headingTitle ?? 'Catálogo de tarefas'}
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-orange-200/55">
            {headingHint ??
              'Somente leitura. Arraste para o rascunho à direita. Para remover do rascunho, arraste de volta para esta área.'}
          </p>
        </div>
        {toolbarExtra ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">{toolbarExtra}</div>
        ) : null}
      </div>

      <label className="mt-3 block shrink-0 text-[11px]">
        <span className="sr-only">Buscar no catálogo</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tarefa ou matriz de origem…"
          autoComplete="off"
          className="sgp-input-app w-full rounded-xl border border-orange-400/25 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
        />
      </label>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(251,146,60,0.35)_transparent]">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">Carregando catálogo…</p>
        ) : loadError ? (
          <div className="rounded-xl border border-rose-400/25 bg-rose-950/30 px-3 py-4 text-sm text-rose-100/90">
            <p>{loadError}</p>
            {onRetryLoad ? (
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-rose-200 underline"
                onClick={onRetryLoad}
              >
                Tentar novamente
              </button>
            ) : null}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500">
            {entries.length === 0
              ? 'Nenhuma tarefa encontrada nas matrizes ativas.'
              : 'Nenhum resultado para esta busca.'}
          </p>
        ) : (
          <ul className="space-y-2 pb-2">
            {filtered.map((entry) => {
              const isOpen = expanded.has(entry.taskId)
              return (
                <li key={entry.taskId}>
                  <div
                    draggable
                    onDragStart={(e) => handleDragStartCatalog(e, entry.taskId)}
                    className="cursor-grab rounded-xl border border-orange-400/20 bg-orange-950/20 px-3 py-2.5 active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {entry.taskName}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {entry.matrixItemName}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.07]"
                        onClick={() => toggleExpanded(entry.taskId)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? 'Recolher' : 'Detalhes'}
                      </button>
                    </div>
                    {isOpen ? (
                      <div className="mt-3 border-t border-orange-400/15 pt-3">
                        <MatrixCatalogReadonlyDetails
                          taskRoot={entry.taskSubtree}
                          resolveCollaboratorLabel={resolveCollaboratorLabel}
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
