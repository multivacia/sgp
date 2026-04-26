import { useEffect } from 'react'

export type SgpToastVariant = 'success' | 'error' | 'neutral'

const variantClass: Record<SgpToastVariant, string> = {
  success:
    'border-emerald-500/22 bg-sgp-navy-deep/96 text-slate-100 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)] ring-1 ring-emerald-500/18',
  error:
    'border-rose-500/25 bg-sgp-navy-deep/96 text-slate-100 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)] ring-1 ring-rose-500/18',
  neutral:
    'border-white/[0.12] bg-sgp-navy-deep/96 text-slate-100 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.08]',
}

type Props = {
  message: string
  variant?: SgpToastVariant
  fixed?: boolean
  durationMs?: number
  onDismiss?: () => void
  className?: string
}

export function SgpToast({
  message,
  variant = 'success',
  fixed = false,
  durationMs = 4200,
  onDismiss,
  className = '',
}: Props) {
  useEffect(() => {
    if (!durationMs || !onDismiss) return
    const t = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(t)
  }, [durationMs, onDismiss])

  const base = fixed
    ? 'pointer-events-auto fixed bottom-6 right-6 z-[120] max-w-sm transition-opacity duration-300'
    : ''

  return (
    <div
      role="status"
      className={`flex gap-3 rounded-xl border px-4 py-3 text-sm font-medium leading-snug ${variantClass[variant]} ${base} ${className}`}
    >
      <span
        className={`mt-1.5 h-8 w-0.5 shrink-0 rounded-full ${
          variant === 'success'
            ? 'bg-emerald-400/70'
            : variant === 'error'
              ? 'bg-rose-400/70'
              : 'bg-sgp-gold/75'
        }`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">{message}</span>
    </div>
  )
}

export function SgpInlineBanner({
  message,
  variant = 'neutral',
  className = '',
}: {
  message: string
  variant?: SgpToastVariant
  className?: string
}) {
  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm font-medium leading-snug ${variant === 'success' ? 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-100/95' : ''} ${variant === 'error' ? 'border-rose-500/28 bg-rose-500/[0.08] text-rose-100/95' : ''} ${variant === 'neutral' ? 'border-white/[0.1] bg-white/[0.04] text-slate-200' : ''} ${className}`}
    >
      {message}
    </div>
  )
}
