import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { SgpInlineBanner, SgpToast, type SgpToastVariant } from '../../components/ui/SgpToast'
import type { SgpNormalizedError } from './sgpErrorContract'
import { presentationPlan } from './sgpErrorContract'
import { logSgpClientError, type SgpClientLogContext } from './sgpClientLog'

type BlockingModalState = {
  title: string
  message: string
  tone: 'impeditivo' | 'critico'
} | null

type ToastState = { message: string; variant: SgpToastVariant } | null

type BannerState = { message: string; variant: 'error' | 'neutral' } | null

type Ctx = {
  /** Modal bloqueante (já registado em log pelo chamador). */
  presentBlocking: (n: SgpNormalizedError) => void
  dismissBlocking: () => void
  /** Toast (leve ou quando explicitamente preferido). */
  showToast: (message: string, variant?: SgpToastVariant) => void
  /** Faixa global contextual (relevante). */
  showBanner: (message: string, variant?: 'error' | 'neutral') => void
  dismissBanner: () => void
  /**
   * Regista o erro, decide superfície pelo contrato e apresenta (modal / banner / toast).
   */
  presentFromNormalized: (
    n: SgpNormalizedError,
    logCtx: SgpClientLogContext,
  ) => void
  blockingModal: BlockingModalState
  globalBanner: BannerState
}

const SgpErrorPresentationContext = createContext<Ctx | null>(null)

function SgpBlockingErrorDialog({
  open,
  title,
  message,
  tone,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  tone: 'impeditivo' | 'critico'
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="alertdialog"
      aria-modal
      aria-labelledby="sgp-blocking-error-title"
      aria-describedby="sgp-blocking-error-desc"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel/95 to-sgp-app-panel-deep/98 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="sgp-blocking-error-title"
          className="font-heading text-lg font-bold tracking-tight text-slate-50"
        >
          {title}
        </h2>
        {tone === 'critico' ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-200/90">
            Sistema indisponível no momento
          </p>
        ) : null}
        <p
          id="sgp-blocking-error-desc"
          className="mt-3 text-sm leading-relaxed text-slate-400"
        >
          {message}
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/10 px-4 py-2.5 text-sm font-bold text-sgp-gold-warm shadow-inner transition hover:border-sgp-gold/50 hover:bg-sgp-gold/[0.14]"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}

export function SgpErrorPresentationProvider({ children }: { children: ReactNode }) {
  const [blockingModal, setBlockingModal] = useState<BlockingModalState>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [globalBanner, setGlobalBanner] = useState<BannerState>(null)

  const dismissBlocking = useCallback(() => setBlockingModal(null), [])
  const dismissBanner = useCallback(() => setGlobalBanner(null), [])

  const showToast = useCallback((message: string, variant: SgpToastVariant = 'error') => {
    setToast({ message, variant })
  }, [])

  const showBanner = useCallback(
    (message: string, variant: 'error' | 'neutral' = 'error') => {
      setGlobalBanner({ message, variant })
    },
    [],
  )

  const presentBlocking = useCallback((n: SgpNormalizedError) => {
    const plan = presentationPlan(n)
    const tone = plan.modalTone ?? 'impeditivo'
    setBlockingModal({
      title: n.modalTitle,
      message: n.userMessage,
      tone,
    })
  }, [])

  const presentFromNormalized = useCallback(
    (n: SgpNormalizedError, logCtx: SgpClientLogContext) => {
      logSgpClientError(n, logCtx)
      const plan = presentationPlan(n)
      if (plan.surface === 'modal') {
        const tone = plan.modalTone ?? 'impeditivo'
        setBlockingModal({
          title: n.modalTitle,
          message: n.userMessage,
          tone,
        })
        return
      }
      if (plan.surface === 'banner') {
        setGlobalBanner({ message: n.userMessage, variant: 'error' })
        return
      }
      setToast({ message: n.userMessage, variant: 'error' })
    },
    [],
  )

  const value = useMemo<Ctx>(
    () => ({
      presentBlocking,
      dismissBlocking,
      showToast,
      showBanner,
      dismissBanner,
      presentFromNormalized,
      blockingModal,
      globalBanner,
    }),
    [
      presentBlocking,
      dismissBlocking,
      showToast,
      showBanner,
      dismissBanner,
      presentFromNormalized,
      blockingModal,
      globalBanner,
    ],
  )

  return (
    <SgpErrorPresentationContext.Provider value={value}>
      {children}
      {toast ? (
        <SgpToast
          fixed
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <SgpBlockingErrorDialog
        open={Boolean(blockingModal)}
        title={blockingModal?.title ?? ''}
        message={blockingModal?.message ?? ''}
        tone={blockingModal?.tone ?? 'impeditivo'}
        onClose={dismissBlocking}
      />
    </SgpErrorPresentationContext.Provider>
  )
}

export function useSgpErrorSurface(): Ctx {
  const ctx = useContext(SgpErrorPresentationContext)
  if (!ctx) {
    throw new Error('useSgpErrorSurface must be used within SgpErrorPresentationProvider')
  }
  return ctx
}

/** Versão tolerante para páginas fora do provider (não deve ocorrer na app shell). */
export function useSgpErrorSurfaceOptional(): Ctx | null {
  return useContext(SgpErrorPresentationContext)
}

/** Faixa contextual global (severidade relevante via `presentFromNormalized`). */
export function SgpErrorShellBanner() {
  const ctx = useSgpErrorSurfaceOptional()
  if (!ctx?.globalBanner) return null
  return (
    <SgpInlineBanner
      variant={ctx.globalBanner.variant === 'error' ? 'error' : 'neutral'}
      message={ctx.globalBanner.message}
      className="mb-4"
    />
  )
}
