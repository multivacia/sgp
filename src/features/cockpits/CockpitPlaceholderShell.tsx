import type { ReactNode } from 'react'
import { PageCanvas } from '../../components/ui/PageCanvas'

type PlaceholderBlock = {
  title: string
  description?: string
}

type Props = {
  title: string
  subtitle: string
  blocks: PlaceholderBlock[]
  /** Conteúdo opcional abaixo do subtítulo (ex.: nota curta). */
  children?: ReactNode
}

/**
 * Casca inicial de cockpits — apenas layout e placeholders, sem dados nem serviços.
 */
export function CockpitPlaceholderShell({ title, subtitle, blocks, children }: Props) {
  return (
    <PageCanvas>
      <header className="sgp-header-card">
        <h1 className="sgp-page-title">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{subtitle}</p>
        {children}
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2 text-xs font-medium text-amber-100/90">
          <span
            className="size-1.5 shrink-0 rounded-full bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.35)]"
            aria-hidden
          />
          Em construção — evolução incremental sem impacto nas áreas já homologadas.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {blocks.map((b) => (
          <section
            key={b.title}
            className="flex min-h-[8.5rem] flex-col rounded-2xl border border-dashed border-white/[0.12] bg-sgp-app-panel-deep/40 p-4 shadow-inner ring-1 ring-white/[0.04]"
          >
            <h2 className="text-sm font-semibold text-slate-200">{b.title}</h2>
            {b.description ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{b.description}</p>
            ) : (
              <p className="mt-2 text-xs italic text-slate-600">Conteúdo a definir.</p>
            )}
          </section>
        ))}
      </div>
    </PageCanvas>
  )
}
