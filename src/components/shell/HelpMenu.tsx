import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  buildGuideUrl,
  buildManualUrl,
  manualThemeFor,
  PRACTICAL_GUIDES,
  resolveScreenHelp,
} from '../../lib/help/manual-help'
import { useColorTheme } from '../../lib/theme/useColorTheme'

type Props = {
  /** Presente só quando "Abrir chamado" está disponível; reaproveita o fluxo existente. */
  onOpenSupportTicket?: () => void
}

const ITEM_CLASS =
  'flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-xs font-semibold text-slate-200 transition hover:bg-white/[0.06] focus:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sgp-blue-bright/60'

/** Menu global "? Ajuda" da barra superior (Esc, clique fora e setas funcionam). */
export function HelpMenu({ onOpenSupportTicket }: Props) {
  const location = useLocation()
  const { themeId } = useColorTheme()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const uid = useId()
  const triggerId = `${uid}-trigger`
  const menuId = `${uid}-menu`
  const reasonId = `${uid}-reason`

  const help = resolveScreenHelp(location.pathname)
  const theme = manualThemeFor(themeId)
  const contextualHref = help.anchor
    ? buildManualUrl({ theme, anchor: help.anchor })
    : null
  const manualHref = buildManualUrl({ theme })

  function items(): HTMLElement[] {
    return Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    )
  }

  function close(restoreFocus: boolean) {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    items()[0]?.focus()
    const onDown = (e: MouseEvent) => {
      const t = e.target
      if (t instanceof Node && wrapRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const list = items()
    const index = list.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      list[(index + 1) % list.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      list[(index - 1 + list.length) % list.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      list[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      list[list.length - 1]?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        aria-label="Ajuda"
        title="Ajuda"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.preventDefault()
            close(true)
          } else if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 text-xs font-bold text-slate-200 shadow-inner transition hover:border-sgp-blue-bright/30 hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sgp-blue-bright/45 sm:min-h-0 sm:min-w-0 sm:py-2"
      >
        <svg
          className="size-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.5 9.25a2.5 2.5 0 114.2 1.84c-.8.72-1.7 1.2-1.7 2.41M12 16.9h.01"
          />
        </svg>
        <span className="hidden sm:inline" aria-hidden>
          Ajuda
        </span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-50 mt-1 w-[17rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/[0.1] bg-sgp-navy-deep py-1 text-left shadow-xl ring-1 ring-black/20"
        >
          {contextualHref ? (
            <a
              role="menuitem"
              tabIndex={-1}
              href={contextualHref}
              className={ITEM_CLASS}
              onClick={() => setOpen(false)}
            >
              Como usar esta tela
              {help.screen ? (
                <span className="text-[11px] font-normal text-slate-400">
                  {help.screen}
                </span>
              ) : null}
            </a>
          ) : (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled="true"
              aria-describedby={reasonId}
              className={`${ITEM_CLASS} cursor-not-allowed opacity-70`}
              onClick={(e) => e.preventDefault()}
            >
              Como usar esta tela
              <span
                id={reasonId}
                className="text-[11px] font-normal text-slate-400"
              >
                {help.noHelpReason}
              </span>
            </button>
          )}

          <a
            role="menuitem"
            tabIndex={-1}
            href={manualHref}
            className={ITEM_CLASS}
            onClick={() => setOpen(false)}
          >
            Manual do usuário
          </a>

          {PRACTICAL_GUIDES.map((guide) => (
            <a
              key={guide.id}
              role="menuitem"
              tabIndex={-1}
              href={buildGuideUrl({ guide: guide.id, theme })}
              className={ITEM_CLASS}
              onClick={() => setOpen(false)}
            >
              {guide.label}
            </a>
          ))}

          {onOpenSupportTicket ? (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={ITEM_CLASS}
              onClick={() => {
                setOpen(false)
                onOpenSupportTicket()
              }}
            >
              Abrir chamado
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
