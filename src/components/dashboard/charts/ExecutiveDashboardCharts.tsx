import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { OperationalBucket } from '../../../lib/backlog/operationalBuckets'
import { openBacklogInNewTab } from '../../../lib/dashboard/dashboardNavigation'
import type { ExecutiveDashboardData } from '../../../domain/dashboard/dashboard.types'
import {
  dashboardHints,
  executiveDashboardCopy,
  operationalLabels,
} from '../../../lib/operationalSemantics'
import { useColorTheme } from '../../../lib/theme/useColorTheme'
import { BarMetricTooltip } from './BarMetricTooltip'
import { resolveDashboardChartTheme } from './dashboardChartTheme'

function minutesTick(v: number) {
  if (v >= 60) return `${Math.round(v / 60)}h`
  return `${Math.round(v)}m`
}

type ExecSlice = {
  key: string
  name: string
  value: number
  fill: string
  nav: 'all' | 'bucket'
  situacao?: OperationalBucket
}

type Props = {
  data: ExecutiveDashboardData
  windowDays: number
}

export function ExecutiveDashboardCharts({ data, windowDays }: Props) {
  const { themeId } = useColorTheme()
  const chart = useMemo(() => resolveDashboardChartTheme(), [themeId])
  const { totals } = data

  const execSlicesRaw: ExecSlice[] = useMemo(
    () => [
      {
        key: 'ativas',
        name: 'Ativas',
        value: totals.activeConveyors,
        fill: chart.execPie.ativas,
        nav: 'all',
      },
      {
        key: 'concl_janela',
        name: `Concluídas (${windowDays}d)`,
        value: totals.completedInWindow,
        fill: chart.execPie.conclJanela,
        nav: 'bucket',
        situacao: 'concluidas',
      },
      {
        key: 'atraso',
        name: 'Em atraso',
        value: totals.overdueConveyors,
        fill: chart.execPie.atraso,
        nav: 'bucket',
        situacao: 'em_atraso',
      },
    ],
    [chart.execPie, totals, windowDays],
  )

  const execTotal = execSlicesRaw.reduce((s, x) => s + x.value, 0)
  const execPieSlices = execSlicesRaw.filter((r) => r.value > 0)

  function navigateSlice(s: ExecSlice) {
    if (s.nav === 'all') {
      openBacklogInNewTab('ativas')
      return
    }
    if (s.key === 'concl_janela' && s.situacao === 'concluidas') {
      openBacklogInNewTab('concluidas', { days: windowDays })
      return
    }
    if (s.situacao) openBacklogInNewTab(s.situacao)
  }

  const execRows = [
    {
      metric: `${operationalLabels.previstoEstrutural} (STEPs)`,
      minutes: data.plannedVsRealized.plannedMinutesStepNodes,
      valueCaption: executiveDashboardCopy.barTooltipValueCaption,
      hint: dashboardHints.previstoEstruturalSteps,
    },
    {
      metric: operationalLabels.totalPorEsteiraOs,
      minutes: data.plannedVsRealized.plannedMinutesConveyorTotal,
      valueCaption: executiveDashboardCopy.barTooltipValueCaption,
      hint: dashboardHints.totalOsApoio,
    },
    {
      metric: operationalLabels.minutosApontadosAcumulado,
      minutes: data.plannedVsRealized.realizedMinutesTotal,
      valueCaption: executiveDashboardCopy.barTooltipValueCaption,
      hint: dashboardHints.acumuladoGlobal,
    },
  ]

  const delayPct =
    totals.delayRateVsActive == null
      ? null
      : Math.round(totals.delayRateVsActive * 1000) / 10

  return (
    <div className="mt-8 max-w-6xl space-y-10">
      <p className="text-xs text-slate-500">
        Mesmos dados do modo Cards.{' '}
        <span className="font-medium text-slate-400">Janela temporal</span> aplica-se
        apenas a <span className="text-slate-400">concluídas</span> (data de conclusão nos
        últimos {windowDays} dias). Ativas = estado atual, sem janela.
      </p>

      <section className="sgp-panel sgp-panel-hover">
        <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
          {executiveDashboardCopy.pizzaTitulo}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          <span className="font-medium text-slate-400">Ativas</span>: não concluídas
          (agora).{' '}
          <span className="font-medium text-slate-400">
            Concluídas ({windowDays}d)
          </span>
          : concluídas com data de conclusão na janela. Abre o backlog com o mesmo filtro
          ao premir um segmento ou a legenda{' '}
          <span className="text-slate-600">(nova aba)</span>.
        </p>
        {execTotal === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Sem dados agregados.</p>
        ) : (
          <>
            <div className="mt-6 h-[280px] w-full max-w-lg mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={execPieSlices.length > 0 ? execPieSlices : execSlicesRaw}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="56%"
                    outerRadius="86%"
                    paddingAngle={execPieSlices.length > 1 ? 2 : 0}
                    minAngle={3}
                    onClick={(_, index) => {
                      const slice = (execPieSlices.length > 0
                        ? execPieSlices
                        : execSlicesRaw)[index]
                      if (slice) navigateSlice(slice)
                    }}
                  >
                    {(execPieSlices.length > 0 ? execPieSlices : execSlicesRaw).map(
                      (row) => (
                        <Cell
                          key={row.key}
                          fill={row.fill}
                          fillOpacity={row.value === 0 ? 0.25 : 1}
                          className="cursor-pointer outline-none transition-opacity hover:opacity-90"
                          stroke="rgba(15,23,42,0.9)"
                          strokeWidth={1}
                        />
                      ),
                    )}
                  </Pie>
                  <Tooltip
                    contentStyle={chart.tooltipStyle}
                    formatter={(value: unknown) => {
                      const n = typeof value === 'number' ? value : Number(value)
                      return [
                        Number.isFinite(n) ? n : 0,
                        executiveDashboardCopy.pieTooltipValueLabel,
                      ]
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-slate-400">
              {execSlicesRaw.map((row) => (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => navigateSlice(row)}
                    title={dashboardHints.drillBacklogChartSlice}
                    aria-label={`${row.name}. ${dashboardHints.drillBacklogChartSlice}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-left transition hover:border-sgp-gold/25 hover:bg-white/[0.06]"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: row.fill }}
                      aria-hidden
                    />
                    <span className="text-slate-300">{row.name}</span>
                    <span className="tabular-nums text-slate-500">({row.value})</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="sgp-panel sgp-panel-hover">
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
            {executiveDashboardCopy.participacaoAtrasoTitulo}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {executiveDashboardCopy.participacaoAtrasoHint}
          </p>
          <div className="mt-6">
            <p className="font-heading text-4xl font-bold tabular-nums text-slate-50">
              {delayPct == null ? '—' : `${delayPct}%`}
            </p>
            {delayPct != null ? (
              <div
                className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.08]"
                role="img"
                aria-label={`${executiveDashboardCopy.participacaoAtrasoTitulo}: ${delayPct} por cento`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500/90 to-rose-400/70"
                  style={{ width: `${Math.min(100, delayPct)}%` }}
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="sgp-panel sgp-panel-hover">
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
            {executiveDashboardCopy.secaoAgregadaTitulo}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{data.plannedVsRealized.notes}</p>
          <div className="mt-4 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={execRows}
                margin={{ top: 8, right: 8, left: 8, bottom: 52 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chart.cartesianGridStroke}
                />
                <XAxis
                  dataKey="metric"
                  {...chart.axisProps}
                  interval={0}
                  angle={-16}
                  textAnchor="end"
                  height={48}
                />
                <YAxis tickFormatter={minutesTick} {...chart.axisProps} />
                <Tooltip content={(props) => <BarMetricTooltip {...props} />} />
                <Bar
                  dataKey="minutes"
                  name={executiveDashboardCopy.barSeriesName}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                >
                  {execRows.map((_, i) => (
                    <Cell
                      key={execRows[i].metric}
                      fill={
                        i === 2
                          ? chart.barMetric.realized
                          : i === 0
                            ? chart.barMetric.planned
                            : chart.barMetric.total
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="sgp-panel sgp-panel-hover">
        <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
          {executiveDashboardCopy.listaAtrasoTitulo}
        </h2>
        <ul className="mt-4 space-y-2 text-sm">
          {data.topOverdueConveyors.length === 0 ? (
            <li className="text-slate-500">Nenhuma esteira em atraso no momento.</li>
          ) : (
            data.topOverdueConveyors.map((r) => (
              <li
                key={r.conveyorId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2"
              >
                <div>
                  <span className="font-semibold text-slate-100">{r.name}</span>
                  {r.estimatedDeadline ? (
                    <span className="ml-2 text-xs text-slate-500">
                      Prazo: {r.estimatedDeadline}
                    </span>
                  ) : null}
                </div>
                <a
                  href={`/app/esteiras/${encodeURIComponent(r.conveyorId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-sgp-blue-bright hover:underline"
                >
                  Abrir
                </a>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="text-[10px] text-slate-600">
        Gerado em {new Date(data.meta.generatedAt).toLocaleString('pt-BR')}
      </p>
    </div>
  )
}
