import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

export type TransientRegistration = {
  id: string
  isDirty: () => boolean
  reset?: () => void
}

type TransientContextValue = {
  register: (r: TransientRegistration) => void
  unregister: (id: string) => void
  isAnyDirty: () => boolean
  resetAll: () => void
}

const TransientContext = createContext<TransientContextValue | null>(null)

export function TransientContextProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef(new Map<string, TransientRegistration>())

  const register = useCallback((r: TransientRegistration) => {
    mapRef.current.set(r.id, r)
  }, [])

  const unregister = useCallback((id: string) => {
    mapRef.current.delete(id)
  }, [])

  const isAnyDirty = useCallback(() => {
    for (const r of mapRef.current.values()) {
      try {
        if (r.isDirty()) return true
      } catch {
        return true
      }
    }
    return false
  }, [])

  const resetAll = useCallback(() => {
    for (const r of mapRef.current.values()) {
      try {
        r.reset?.()
      } catch {
        /* noop */
      }
    }
  }, [])

  const value = useMemo(
    () => ({ register, unregister, isAnyDirty, resetAll }),
    [register, unregister, isAnyDirty, resetAll],
  )

  return (
    <TransientContext.Provider value={value}>{children}</TransientContext.Provider>
  )
}

export function useTransientContext(): TransientContextValue {
  const ctx = useContext(TransientContext)
  if (!ctx) {
    throw new Error('useTransientContext must be used within TransientContextProvider')
  }
  return ctx
}

/**
 * Regista estado transitório (filtros em edição, rascunhos, etc.) para o fluxo global
 * de troca de função. Use `isDirty`/`onReset` estáveis via refs internos.
 */
export function useRegisterTransientContext(opts: {
  id: string
  isDirty: () => boolean
  onReset?: () => void
}): void {
  const { register, unregister } = useTransientContext()
  const isDirtyRef = useRef(opts.isDirty)
  const onResetRef = useRef(opts.onReset)
  isDirtyRef.current = opts.isDirty
  onResetRef.current = opts.onReset

  useEffect(() => {
    const id = opts.id
    register({
      id,
      isDirty: () => isDirtyRef.current(),
      reset: onResetRef.current
        ? () => {
            onResetRef.current?.()
          }
        : undefined,
    })
    return () => {
      unregister(id)
    }
  }, [opts.id, register, unregister])
}
