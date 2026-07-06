import type { ReactNode } from 'react'

type Props = {
  eyebrow?: string
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function LaboratorioShell({ eyebrow, title, subtitle, children, footer }: Props) {
  return (
    <div className="-mx-4 -my-6 min-h-[calc(100dvh-4rem)] bg-sgp-void sm:-mx-6">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col px-4 py-6 sm:px-6">
        <header className="shrink-0">
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sgp-gold">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 font-heading text-2xl font-bold leading-tight text-white sm:text-[1.65rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{subtitle}</p>
          ) : null}
        </header>

        <div className="mt-5 min-h-0 flex-1">{children}</div>

        {footer ? <div className="mt-6 shrink-0 space-y-3">{footer}</div> : null}
      </div>
    </div>
  )
}
