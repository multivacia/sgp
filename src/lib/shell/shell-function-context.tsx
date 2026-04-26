import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  type AppShellFunctionId,
  defaultRouteForShellFunction,
  inferShellFunctionFromPath,
} from './app-nav-config'
import { TransientLeaveConfirmDialog } from '../../components/shell/TransientLeaveConfirmDialog'
import { shellLog } from './shellLog'
import { useTransientContext } from './transient-context'

/** Compara rotas absolutas (pathname) para decidir se a navegação muda de ecrã. */
export function pathsWouldChangeForNavigation(pathname: string, to: string): boolean {
  const norm = (p: string) => {
    const s = p.split('?')[0]?.split('#')[0] ?? ''
    return s.replace(/\/$/, '') || '/'
  }
  return norm(pathname) !== norm(to)
}

type ShellFunctionContextValue = {
  /** Função inferida pela rota atual (fonte de verdade visual). */
  activeFunction: AppShellFunctionId
  /** Inicia troca para outra função (modal se necessário). */
  requestSwitchTo: (next: AppShellFunctionId) => void
  /**
   * Navegação na app com o mesmo fluxo de confirmação do estado transitório
   * (ex.: menu lateral dentro da mesma função).
   */
  requestNavigateWithTransientGuard: (to: string) => void
}

const ShellFunctionContext = createContext<ShellFunctionContextValue | null>(null)

export function ShellFunctionProvider({
  children,
  mainScrollRef,
  confirmDialog,
}: {
  children: ReactNode
  mainScrollRef: RefObject<HTMLElement | null>
  /** Render prop para manter o aspeto do diálogo junto do layout. */
  confirmDialog: (props: {
    open: boolean
    target: AppShellFunctionId | null
    onConfirm: () => void
    onCancel: () => void
  }) => ReactNode
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAnyDirty, resetAll } = useTransientContext()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingTarget, setPendingTarget] = useState<AppShellFunctionId | null>(null)

  const [pathConfirmOpen, setPathConfirmOpen] = useState(false)
  const [pendingPath, setPendingPath] = useState<string | null>(null)

  const activeFunction = inferShellFunctionFromPath(location.pathname)

  const scrollMainToTop = useCallback(() => {
    const el = mainScrollRef.current
    if (el) {
      el.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [mainScrollRef])

  const applySwitch = useCallback(
    (next: AppShellFunctionId) => {
      const dest = defaultRouteForShellFunction(next)
      shellLog('function_switch_apply', { to: next, route: dest })
      resetAll()
      navigate(dest, { replace: true })
      requestAnimationFrame(() => {
        scrollMainToTop()
      })
    },
    [navigate, resetAll, scrollMainToTop],
  )

  const requestSwitchTo = useCallback(
    (next: AppShellFunctionId) => {
      if (next === activeFunction) return
      if (isAnyDirty()) {
        setPendingTarget(next)
        setConfirmOpen(true)
        shellLog('function_switch_confirm_open', { to: next })
        return
      }
      applySwitch(next)
    },
    [activeFunction, applySwitch, isAnyDirty],
  )

  const handleConfirm = useCallback(() => {
    if (!pendingTarget) return
    const next = pendingTarget
    setConfirmOpen(false)
    setPendingTarget(null)
    applySwitch(next)
  }, [applySwitch, pendingTarget])

  const handleCancel = useCallback(() => {
    setConfirmOpen(false)
    setPendingTarget(null)
    shellLog('function_switch_confirm_cancel', {})
  }, [])

  const requestNavigateWithTransientGuard = useCallback(
    (to: string) => {
      if (!pathsWouldChangeForNavigation(location.pathname, to)) return
      if (!isAnyDirty()) {
        navigate(to)
        requestAnimationFrame(() => {
          scrollMainToTop()
        })
        return
      }
      setPendingPath(to)
      setPathConfirmOpen(true)
      shellLog('route_change_confirm_open', { to })
    },
    [isAnyDirty, location.pathname, navigate, scrollMainToTop],
  )

  const handlePathConfirm = useCallback(() => {
    if (!pendingPath) return
    const dest = pendingPath
    setPathConfirmOpen(false)
    setPendingPath(null)
    resetAll()
    navigate(dest)
    requestAnimationFrame(() => {
      scrollMainToTop()
    })
    shellLog('route_change_confirm_apply', { to: dest })
  }, [navigate, pendingPath, resetAll, scrollMainToTop])

  const handlePathCancel = useCallback(() => {
    setPathConfirmOpen(false)
    setPendingPath(null)
    shellLog('route_change_confirm_cancel', {})
  }, [])

  const value = useMemo(
    () => ({
      activeFunction,
      requestSwitchTo,
      requestNavigateWithTransientGuard,
    }),
    [activeFunction, requestNavigateWithTransientGuard, requestSwitchTo],
  )

  return (
    <ShellFunctionContext.Provider value={value}>
      {children}
      {confirmDialog({
        open: confirmOpen,
        target: pendingTarget,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
      })}
      <TransientLeaveConfirmDialog
        open={pathConfirmOpen}
        onConfirm={handlePathConfirm}
        onCancel={handlePathCancel}
      />
    </ShellFunctionContext.Provider>
  )
}

export function useShellFunction(): ShellFunctionContextValue {
  const ctx = useContext(ShellFunctionContext)
  if (!ctx) {
    throw new Error('useShellFunction must be used within ShellFunctionProvider')
  }
  return ctx
}
