import type { DashboardOperacionalSerieItem } from '../../lib/dashboard-operacional-series'
import { DashboardOperacionalBarList } from './DashboardOperacionalBarList'

export type DashboardHeroOperacionalEixo = 'entrada' | 'operacao'

type Props = {
  eixo: DashboardHeroOperacionalEixo
  title: string
  semantica: string
  micro: string
  total: number
  items: DashboardOperacionalSerieItem[]
}

export function DashboardHeroOperacionalGrafico({
  eixo,
  title,
  semantica,
  micro,
  total,
  items,
}: Props) {
  const accent = eixo === 'entrada' ? 'entrada' : 'operacao'
  const topBar =
    eixo === 'entrada'
      ? 'from-sgp-gold via-sgp-gold-warm/55 to-transparent'
      : 'from-sgp-blue-bright via-sgp-blue-bright/50 to-transparent'

  return (
    <div
      className="relative min-h-[220px] overflow-hidden rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/40 p-4 shadow-inner"
      data-dashboard-hero={eixo}
      data-dashboard-hero-variant="grafico"
    >
      <div
        className={`absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r ${topBar}`}
        aria-hidden
      />
      <div
        className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-75 ${
          eixo === 'entrada' ? 'bg-sgp-gold-warm/12' : 'bg-sgp-blue-bright/10'
        }`}
        aria-hidden
      />

      <div className="relative border-b border-white/10 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {title}
        </p>
        <p className="mt-2 font-heading text-4xl font-bold tabular-nums tracking-tight text-slate-50">
          {total}
        </p>
        <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-slate-600">
          {semantica}
        </p>
        <p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-500">
          {micro}
        </p>
      </div>

      <div className="relative mt-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Distribuição
        </p>
        <DashboardOperacionalBarList items={items} accent={accent} />
      </div>
    </div>
  )
}
