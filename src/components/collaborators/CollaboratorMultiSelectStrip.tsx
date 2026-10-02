import { useEffect, useRef, useState } from 'react'
import { collaboratorInitials } from './collaboratorInitials'

export type CollaboratorMultiSelectOption = {
  id: string
  label: string
}

type Props = {
  options: CollaboratorMultiSelectOption[]
  /** Ids selecionados, na ordem de seleção. */
  selectedIds: string[]
  onChange: (next: string[]) => void
  loading?: boolean
  readOnly?: boolean
  /** Teto de seleção; ao atingir, o botão de adicionar fica indisponível. */
  maxSelected?: number
  searchPlaceholder?: string
  /** Texto exibido quando nada está selecionado. */
  emptyHint?: string
  'aria-label'?: string
}

/**
 * Seleção múltipla de colaboradores no mesmo padrão da aba Estrutura da Esteira
 * (avatar strip): avatar com iniciais para cada selecionado — clique remove —, botão
 * `+` abrindo popover com busca, e ação de limpar a seleção.
 */
export function CollaboratorMultiSelectStrip({
  options,
  selectedIds,
  onChange,
  loading = false,
  readOnly = false,
  maxSelected,
  searchPlaceholder = 'Buscar colaborador…',
  emptyHint = 'Nenhum colaborador selecionado.',
  'aria-label': ariaLabel = 'Adicionar colaborador',
}: Props) {
  const [showPopover, setShowPopover] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!showPopover) return
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopover(false)
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowPopover(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onEsc)
    }
  }, [showPopover])

  useEffect(() => {
    if (!showPopover) return
    const t = setTimeout(() => searchRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [showPopover])

  const selectedSet = new Set(selectedIds)
  const selected = selectedIds
    .map((id) => options.find((o) => o.id === id) ?? { id, label: id })
    .filter(Boolean)
  const reachedMax = maxSelected !== undefined && selectedIds.length >= maxSelected
  const allAvailable = options.filter((o) => !selectedSet.has(o.id))
  const q = search.trim().toLowerCase()
  const available = q
    ? allAvailable.filter((o) => o.label.toLowerCase().includes(q))
    : allAvailable
  const canAdd = !readOnly && !loading && !reachedMax && allAvailable.length > 0

  const remove = (id: string) => onChange(selectedIds.filter((x) => x !== id))
  const add = (id: string) => {
    if (selectedSet.has(id) || reachedMax) return
    onChange([...selectedIds, id])
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {loading ? <span className="text-[11px] text-slate-500">Carregando…</span> : null}

      {selected.map((o) => (
        <button
          key={o.id}
          type="button"
          title={readOnly ? o.label : `${o.label} — clique para remover`}
          aria-label={readOnly ? o.label : `Remover ${o.label}`}
          disabled={readOnly}
          aria-disabled={readOnly}
          onClick={() => remove(o.id)}
          className={[
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            'bg-[var(--void,#050a12)] text-[11px] font-bold text-sgp-gold',
            'ring-1 ring-white/20 transition-opacity hover:opacity-60',
            'disabled:cursor-not-allowed disabled:hover:opacity-100',
          ].join(' ')}
        >
          {collaboratorInitials(o.label)}
        </button>
      ))}

      <div ref={containerRef} className="relative">
        <button
          type="button"
          title={
            reachedMax
              ? `Selecione no máximo ${maxSelected} colaboradores`
              : 'Adicionar colaborador'
          }
          aria-label={ariaLabel}
          aria-expanded={showPopover}
          disabled={!canAdd}
          aria-disabled={!canAdd}
          onClick={() => {
            if (!canAdd) return
            const next = !showPopover
            if (next) setSearch('')
            setShowPopover(next)
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-white/20 text-sm text-slate-400 hover:border-[var(--gold,#c9a227)]/60 hover:text-sgp-gold disabled:pointer-events-none disabled:opacity-30"
        >
          +
        </button>

        {showPopover ? (
          <div className="absolute left-0 top-9 z-50 w-80 rounded-xl border border-white/10 bg-[var(--navy,#101824)] shadow-2xl">
            <div className="px-2 pb-1 pt-2">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-[var(--gold,#c9a227)]/40"
              />
            </div>
            <div className="max-h-[384px] overflow-y-auto py-1">
              {available.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500">
                  {q ? 'Nenhum resultado' : 'Todos já adicionados'}
                </p>
              ) : null}
              {available.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    add(o.id)
                    setShowPopover(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-slate-100 hover:bg-white/[0.07]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sgp-gold/20 text-[10px] font-bold text-sgp-gold">
                    {collaboratorInitials(o.label)}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {selectedIds.length === 0 ? (
        <span className="text-[11px] text-slate-500">{emptyHint}</span>
      ) : (
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={readOnly}
          className="ml-1 text-[11px] font-semibold text-slate-400 underline-offset-2 hover:text-sgp-gold hover:underline disabled:cursor-not-allowed disabled:opacity-40"
        >
          Limpar seleção
        </button>
      )}
    </div>
  )
}
