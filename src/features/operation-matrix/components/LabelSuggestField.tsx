import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import type { LabelCatalogEntry } from '../../../catalog/matrixSuggestion/types'
import { rankLabelSuggestions } from '../../../catalog/matrixSuggestion/labelCatalogRank'

type Props = {
  value: string
  onChange: (next: string) => void
  catalogEntries: readonly LabelCatalogEntry[]
  disabled?: boolean
  placeholder?: string
  id?: string
  'aria-label'?: string
  className?: string
  inputClassName?: string
}

/**
 * Campo de texto com sugestões locais (apenas preenche texto; sem vínculo obrigatório a ID).
 */
export function LabelSuggestField({
  value,
  onChange,
  catalogEntries,
  disabled,
  placeholder,
  id,
  'aria-label': ariaLabel,
  className = '',
  inputClassName = 'sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200',
}: Props) {
  const genId = useId()
  const listId = `${genId}-suggestions`
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const suggestions = useMemo(
    () =>
      catalogEntries.length > 0
        ? rankLabelSuggestions(catalogEntries, value, { maxResults: 10 })
        : [],
    [catalogEntries, value],
  )

  const activeIdx =
    suggestions.length === 0 ? 0 : Math.min(highlight, suggestions.length - 1)

  const showList = open && suggestions.length > 0 && !disabled

  const pick = useCallback(
    (label: string) => {
      onChange(label)
      setOpen(false)
    },
    [onChange],
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!showList) {
        if (e.key === 'ArrowDown' && suggestions.length > 0) {
          setOpen(true)
          setHighlight(0)
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      const n = suggestions.length
      if (n === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => {
          const cur = Math.min(h, n - 1)
          return (cur + 1) % n
        })
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => {
          const cur = Math.min(h, n - 1)
          return (cur - 1 + n) % n
        })
        return
      }
      if (e.key === 'Enter') {
        const row = suggestions[activeIdx]
        if (row) {
          e.preventDefault()
          pick(row.label)
        }
      }
    },
    [showList, suggestions, activeIdx, pick],
  )

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(ev: MouseEvent) {
      const el = containerRef.current
      if (el && !el.contains(ev.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        role="combobox"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setHighlight(0)
          setOpen(true)
        }}
        onFocus={() => {
          if (catalogEntries.length > 0) setOpen(true)
        }}
        onKeyDown={onKeyDown}
        className={`w-full ${inputClassName}`}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-[min(280px,40vh)] overflow-y-auto rounded-lg border border-white/[0.12] bg-sgp-void/95 py-1 shadow-lg ring-1 ring-black/40 [scrollbar-width:thin]"
        >
          {suggestions.map((s, i) => (
            <li key={s.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                className={`flex w-full flex-col items-start gap-0.5 px-2.5 py-1.5 text-left text-sm ${
                  i === activeIdx ? 'bg-white/[0.08] text-slate-100' : 'text-slate-200'
                }`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pick(s.label)}
              >
                <span className="font-medium">{s.label}</span>
                {s.code ? (
                  <span className="text-[10px] font-mono text-slate-500">{s.code}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
