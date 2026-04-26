import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

type MenuRegistry = {
  openKey: string | null
  setOpenKey: (k: string | null) => void
}

const SgpContextActionsMenuContext = createContext<MenuRegistry | null>(null)

export function SgpContextActionsMenuProvider({ children }: { children: ReactNode }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const value = useMemo(() => ({ openKey, setOpenKey }), [openKey])
  return (
    <SgpContextActionsMenuContext.Provider value={value}>
      {children}
    </SgpContextActionsMenuContext.Provider>
  )
}

export type SgpContextActionsMenuItemDef = {
  label: string
  onClick: () => void | Promise<void>
  destructive?: boolean
  disabled?: boolean
}

const triggerClassName =
  'rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-sgp-gold/35 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sgp-gold/40 disabled:opacity-40'

const MENU_MIN_WIDTH_PX = 192

const menuClassName =
  'z-[100] min-w-[12rem] rounded-xl border border-white/[0.1] bg-sgp-navy-deep py-1 text-left shadow-xl'

const itemClassName = (destructive: boolean) =>
  destructive
    ? 'w-full px-3 py-2 text-left text-xs text-rose-200/90 hover:bg-white/[0.06] disabled:opacity-40'
    : 'w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/[0.06] disabled:opacity-40'

/**
 * Botão «Ações» + menu contextual (dropdown): clique fora, Escape, um menu aberto por vez.
 * Usar dentro de {@link SgpContextActionsMenuProvider}.
 */
export function SgpContextActionsMenu({
  menuKey,
  disabled,
  items,
  triggerLabel = 'Ações',
  align = 'end',
}: {
  menuKey: string
  disabled?: boolean
  items: SgpContextActionsMenuItemDef[]
  triggerLabel?: string
  align?: 'end' | 'start'
}) {
  const ctx = useContext(SgpContextActionsMenuContext)
  if (!ctx) {
    throw new Error(
      'SgpContextActionsMenu must be used within SgpContextActionsMenuProvider',
    )
  }
  const { openKey, setOpenKey } = ctx
  const open = openKey === menuKey
  const close = useCallback(() => setOpenKey(null), [setOpenKey])
  const toggle = useCallback(() => {
    setOpenKey(open ? null : menuKey)
  }, [open, menuKey, setOpenKey])

  const wrapRef = useRef<HTMLDivElement>(null)
  const [menuFixedStyle, setMenuFixedStyle] = useState<{
    top: number
    left: number
  } | null>(null)

  const updateMenuPosition = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 4
    let left =
      align === 'end' ? r.right - MENU_MIN_WIDTH_PX : r.left
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_MIN_WIDTH_PX - 8))
    const top = r.bottom + gap
    setMenuFixedStyle({ top, left })
  }, [align])

  useLayoutEffect(() => {
    if (!open) {
      setMenuFixedStyle(null)
      return
    }
    updateMenuPosition()
    const onScroll = () => updateMenuPosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, updateMenuPosition])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (wrapRef.current?.contains(t)) return
      if (
        t instanceof Element &&
        t.closest('[data-sgp-context-menu-root]')
      ) {
        return
      }
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const menuList =
    open && menuFixedStyle ? (
      <ul
        data-sgp-context-menu-root
        className={`fixed ${menuClassName}`}
        style={{
          top: menuFixedStyle.top,
          left: menuFixedStyle.left,
        }}
        role="menu"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item) => (
          <li key={`${menuKey}-${item.label}`} role="none">
            <button
              type="button"
              role="menuitem"
              disabled={disabled || item.disabled}
              className={itemClassName(Boolean(item.destructive))}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                close()
                void Promise.resolve(item.onClick())
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    ) : null

  return (
    <div
      className={`relative flex shrink-0 flex-col ${align === 'end' ? 'items-end' : 'items-start'}`}
      ref={wrapRef}
    >
      <button
        type="button"
        disabled={disabled}
        className={triggerClassName}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggle()
        }}
      >
        {triggerLabel}
      </button>
      {menuList ? createPortal(menuList, document.body) : null}
    </div>
  )
}
