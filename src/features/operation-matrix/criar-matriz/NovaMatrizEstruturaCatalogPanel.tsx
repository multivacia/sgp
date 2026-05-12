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
  /** Entrada equivalente já existe na matriz em edição — bloqueia arrastar e oferece aviso. */
  isCatalogEntryReuseBlocked?: (entry: MatrixCatalogTaskEntry) => boolean
  reuseBlockedBadgeLabel?: string
  /** Incluir subárvore na matriz atual (fluxo Alterar Matriz). */
  onIncludeCatalogEntry?: (entry: MatrixCatalogTaskEntry) => void
  includeBusy?: boolean
  /** Tarefa persistida foi solta de volta sobre o catálogo (Alterar Matriz). */
  onDropPersistedMatrixTask?: (taskId: string) => void
  /** `subtle`: link discreto como fallback quando o fluxo principal é DnD. */
  includeButtonVariant?: 'primary' | 'subtle'
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
  isCatalogEntryReuseBlocked,
  reuseBlockedBadgeLabel = 'Já na matriz',
  onIncludeCatalogEntry,
  includeBusy = false,
  onDropPersistedMatrixTask,
  includeButtonVariant = 'primary',
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
      return
    }
    if (p?.kind === 'persisted-matrix-task') {
      onDropPersistedMatrixTask?.(p.taskId)
    }
  }

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col rounded-xl border border-white/[0.07] bg-black/15 px-3 py-3 shadow-inner ring-1 ring-white/[0.04] sm:px-4 ${
        dropHighlight
          ? 'border-sgp-gold/45 ring-2 ring-sgp-gold/25 bg-sgp-gold/[0.02]'
          : ''
      }`}
      role="region"
      aria-label={headingTitle ?? 'Catálogo de tarefas existentes'}
      onDragEnter={handleDragEnterPanel}
      onDragLeave={handleDragLeavePanel}
      onDragOver={handleDragOverRemoveZone}
      onDrop={handleDropOnCatalog}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-white/[0.06] pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-sm font-semibold text-slate-100">
            {headingTitle ?? 'Catálogo de tarefas'}
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
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
          className="sgp-input-app w-full rounded-xl border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
        />
      </label>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent]">
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
              const reuseBlocked = isCatalogEntryReuseBlocked?.(entry) ?? false
              return (
                <li key={entry.taskId}>
                  <div
                    draggable={!reuseBlocked}
                    onDragStart={
                      reuseBlocked
                        ? undefined
                        : (e) => handleDragStartCatalog(e, entry.taskId)
                    }
                    className={
                      'rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 ' +
                      (reuseBlocked
                        ? 'cursor-not-allowed opacity-70'
                        : 'cursor-grab active:cursor-grabbing')
                    }
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
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {reuseBlocked ? (
                          <span className="rounded-md border border-white/12 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            {reuseBlockedBadgeLabel}
                          </span>
                        ) : null}
                        {onIncludeCatalogEntry && !reuseBlocked ? (
                          <button
                            type="button"
                            disabled={includeBusy}
                            onClick={() => onIncludeCatalogEntry(entry)}
                            className={
                              includeButtonVariant === 'subtle'
                                ? 'rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 underline decoration-slate-500/50 hover:text-slate-200 disabled:opacity-50'
                                : 'rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2 py-1 text-[10px] font-semibold text-sgp-gold-warm hover:border-sgp-gold/50 hover:bg-sgp-gold/15 disabled:opacity-50'
                            }
                          >
                            Incluir
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.07]"
                          onClick={() => toggleExpanded(entry.taskId)}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? 'Recolher tarefa' : 'Expandir tarefa'}
                        >
                          {isOpen ? 'Recolher' : 'Expandir'}
                        </button>
                      </div>
                    </div>
                    {isOpen ? (
                      <div className="mt-3 border-t border-white/[0.06] pt-3">
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
