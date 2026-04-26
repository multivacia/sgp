import type { ReactNode } from 'react'

/**
 * Placeholder enquanto o chunk dos gráficos (Recharts) carrega.
 * Espelha a hierarquia do painel: intro → donut → grelha 2 colunas → bloco largo.
 */
function SkeletonPanel({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={[
        'rounded-2xl border border-white/[0.06] bg-sgp-app-panel-deep/80 p-5 shadow-inner',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div
      className={[
        'rounded-full bg-gradient-to-r from-slate-800/80 via-slate-600/30 to-slate-800/80',
        'animate-pulse',
        className,
      ].join(' ')}
      aria-hidden
    />
  )
}

export function DashboardChartsSkeleton() {
  return (
    <div
      className="mt-8 max-w-6xl space-y-10"
      role="status"
      aria-busy="true"
      aria-label="Carregando gráficos"
    >
      <div className="space-y-2">
        <ShimmerBar className="h-3 w-2/3 max-w-md" />
        <ShimmerBar className="h-3 w-1/2 max-w-sm" />
      </div>

      <SkeletonPanel>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <ShimmerBar className="h-3 w-48" />
            <ShimmerBar className="h-3 w-full max-w-xs" />
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <div className="relative flex h-[min(280px,55vw)] w-[min(280px,55vw)] max-h-[300px] max-w-[300px] items-center justify-center">
            <div
              className="absolute inset-[8%] rounded-full border-[10px] border-slate-700/40 border-t-sgp-gold/30 border-r-emerald-500/15 animate-pulse"
              aria-hidden
            />
            <div className="size-[46%] rounded-full bg-slate-800/50 animate-pulse" aria-hidden />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <ShimmerBar key={i} className="h-7 w-[5.5rem]" />
          ))}
        </div>
      </SkeletonPanel>

      <div className="grid gap-8 lg:grid-cols-2">
        <SkeletonPanel>
          <ShimmerBar className="mb-4 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.04] bg-sgp-void/40 px-3 py-2.5"
              >
                <ShimmerBar className="h-3 flex-1 max-w-[12rem]" />
                <ShimmerBar className="h-3 w-10" />
              </div>
            ))}
          </div>
        </SkeletonPanel>
        <SkeletonPanel>
          <ShimmerBar className="mb-2 w-44" />
          <ShimmerBar className="mb-4 h-3 w-full max-w-[20rem]" />
          <ShimmerBar className="mb-4 h-3 w-full max-w-[18rem]" />
          {/* Alinha com BarChart operacional: h-[220px], ~4 métricas incl. período opcional */}
          <div className="flex h-[220px] items-end justify-between gap-1.5 border-b border-white/[0.06] px-0.5 pb-1 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div
                  className="w-[min(100%,2.75rem)] rounded-t-md bg-gradient-to-t from-slate-700/60 to-slate-600/25 animate-pulse"
                  style={{ height: `${42 + ((i * 17) % 38)}%` }}
                />
                <ShimmerBar className="h-2 w-full max-w-[3.25rem]" />
              </div>
            ))}
          </div>
        </SkeletonPanel>
      </div>

      <SkeletonPanel>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ShimmerBar className="h-3 w-44" />
          <ShimmerBar className="h-3 w-24" />
        </div>
        <ShimmerBar className="mt-2 h-3 w-full max-w-lg" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <ShimmerBar className="h-3 w-24 shrink-0" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-slate-600/40 animate-pulse"
                  style={{ width: `${42 + ((i * 11) % 45)}%` }}
                />
              </div>
              <ShimmerBar className="h-3 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </SkeletonPanel>

      <p className="text-center text-[11px] text-slate-500">
        A preparar visualizações…
      </p>
    </div>
  )
}
