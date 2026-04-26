import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { OPERATIONAL_BUCKET_LABELS } from '../../../lib/backlog/operationalBuckets'
import { formatHumanMinutes } from '../../../lib/formatters'
import { openBacklogInNewTab } from '../../../lib/dashboard/dashboardNavigation'
import type {
  OperationalBucketKey,
  OperationalDashboardData,
} from '../../../domain/dashboard/dashboard.types'
import { useColorTheme } from '../../../lib/theme/useColorTheme'
import { resolveDashboardChartTheme } from './dashboardChartTheme'
import {
  dashboardHints,
  operationalLabels,
} from '../../../lib/operationalSemantics'
import { BarMetricTooltip } from './BarMetricTooltip'

const BUCKET_CHART_ORDER: OperationalBucketKey[] = [
  'no_backlog',
  'em_revisao',
  'em_andamento',
  'em_atraso',
  'concluidas',
]

function minutesTick(v: number) {
  if (v >= 60) return `${Math.round(v / 60)}h`
  return `${Math.round(v)}m`
}

type Props = {
  data: OperationalDashboardData
}

export function OperationalDashboardCharts({ data }: Props) {
  const { themeId } = useColorTheme()
  const chart = useMemo(() => resolveDashboardChartTheme(), [themeId])

  const bucketRows = useMemo(
    () =>
      BUCKET_CHART_ORDER.map((k) => ({
        key: k,
        name: OPERATIONAL_BUCKET_LABELS[k],
        value: data.conveyorsByBucket[k],
        fill: chart.bucketFill[k] ?? chart.bucketFill.no_backlog,
      })),
    [chart.bucketFill, data.conveyorsByBucket],
  )

  const bucketTotal = BUCKET_CHART_ORDER.reduce(
    (s, k) => s + data.conveyorsByBucket[k],
    0,
  )
  const pieSlices = bucketRows.filter((r) => r.value > 0)

  const periodPreset = data.plannedVsRealized.realizedPeriod?.preset ?? '7d'

  const plannedRows = [
    {
      metric: `${operationalLabels.previstoEstrutural} (STEPs)`,
      minutes: data.plannedVsRealized.plannedMinutesStepNodes,
      hint: dashboardHints.previstoEstruturalSteps,
    },
    {
      metric: operationalLabels.totalPorEsteiraOs,
      minutes: data.plannedVsRealized.plannedMinutesConveyorTotal,
      hint: dashboardHints.totalOsApoio,
    },
    {
      metric: operationalLabels.minutosApontadosAcumulado,
      minutes: data.plannedVsRealized.realizedMinutesTotal,
      hint: dashboardHints.acumuladoGlobal,
    },
    ...(data.plannedVsRealized.realizedMinutesInPeriod !== undefined
      ? [
          {
            metric: `${operationalLabels.minutosApontadosPeriodo} (query)`,
            minutes: data.plannedVsRealized.realizedMinutesInPeriod,
            hint: dashboardHints.periodoUtc(periodPreset),
          },
        ]
      : []),
  ]

  const collabSorted = [...data.collaboratorLoad]
    .sort((a, b) => b.assignmentCount - a.assignmentCount)
    .slice(0, 10)
    .map((c) => ({
      id: c.collaboratorId,
      name:
        (c.fullName?.trim() || c.collaboratorId).length > 24
          ? `${(c.fullName?.trim() || c.collaboratorId).slice(0, 22)}…`
          : c.fullName?.trim() || c.collaboratorId.slice(0, 8),
      atividades: c.assignmentCount,
      planejSteps: c.plannedMinutesOnSteps,
      realizado: c.realizedMinutes,
    }))

  return (
    <div className="mt-8 max-w-6xl space-y-10">
      <p className="text-xs text-slate-500">
        Visualização analítica — mesmos dados do modo Cards · snapshot{' '}
        <span className="text-slate-600">({data.meta.scope})</span>.
      </p>

      <section className="sgp-panel sgp-panel-hover">
        <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
          Esteiras por bucket operacional
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Contagem por bucket operacional. Abre o backlog com o recorte correspondente
          ao premir um segmento ou um item da legenda{' '}
          <span className="text-slate-600">(nova aba)</span>.
        </p>
        {bucketTotal === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Sem esteiras no recorte.</p>
        ) : (
          <>
            <div className="mt-4 h-[300px] w-full max-w-lg mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieSlices.length > 0 ? pieSlices : bucketRows}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="88%"
                    paddingAngle={pieSlices.length > 1 ? 2 : 0}
                    minAngle={3}
                    onClick={(_, index, e) => {
                      e.stopPropagation()
                      const slice = (pieSlices.length > 0 ? pieSlices : bucketRows)[
                        index
                      ]
                      if (slice?.key) openBacklogInNewTab(slice.key)
                    }}
                  >
                    {(pieSlices.length > 0 ? pieSlices : bucketRows).map(
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
                      return [Number.isFinite(n) ? n : 0, 'Esteiras']
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-center font-heading text-sm tabular-nums text-slate-400">
              Total: {bucketTotal} esteiras
            </p>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-slate-400">
              {bucketRows.map((row) => (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => openBacklogInNewTab(row.key)}
                    title={dashboardHints.drillBacklogSameBucket}
                    aria-label={`${row.name}. ${dashboardHints.drillBacklogSameBucket}`}
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
            <p className="mt-3 text-center text-[10px] text-slate-600">
              Se um bucket concentrar quase todo o volume, use a legenda para
              navegar com precisão.
            </p>
          </>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="sgp-panel sgp-panel-hover">
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
            Destaque — em atraso
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.overdueHighlight.length === 0 ? (
              <li className="text-slate-500">Nenhuma esteira neste bucket.</li>
            ) : (
              data.overdueHighlight.map((r) => (
                <li
                  key={r.conveyorId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-sgp-app-panel-deep/80 px-3 py-2"
                >
                  <span className="font-semibold text-slate-200">{r.name}</span>
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

        <section className="sgp-panel sgp-panel-hover">
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
            Previsto estrutural vs minutos apontados
          </h2>
          <p className="mt-1 text-xs text-slate-500">{data.plannedVsRealized.notes}</p>
          <p className="mt-2 text-[11px] leading-snug text-slate-400">
            Ordem: {operationalLabels.previstoEstrutural} (STEPs) ·{' '}
            {operationalLabels.totalPorEsteiraOs} · acumulado global · opcionalmente{' '}
            {operationalLabels.minutosApontadosPeriodo} (escalas podem diferir).
          </p>
          <div className="mt-4 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={plannedRows}
                margin={{ top: 8, right: 8, left: 8, bottom: 48 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chart.cartesianGridStroke}
                />
                <XAxis
                  dataKey="metric"
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={56}
                  {...chart.axisProps}
                />
                <YAxis
                  tickFormatter={minutesTick}
                  {...chart.axisProps}
                />
                <Tooltip content={(props) => <BarMetricTooltip {...props} />} />
                <Bar dataKey="minutes" name="Minutos" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {plannedRows.map((row, i) => (
                    <Cell
                      key={row.metric}
                      fill={
                        row.metric.includes('período')
                          ? chart.periodBar
                          : row.metric.includes('acumulado')
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
            Carga por colaborador
          </h2>
          <a
            href="/app/colaboradores"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold uppercase tracking-wide text-sgp-blue-bright hover:underline"
          >
            Colaboradores
          </a>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Top 10 por alocações. Barras: {operationalLabels.previstoEstrutural} nos STEPs e{' '}
          {operationalLabels.minutosApontadosAcumulado} (colaborador).
        </p>
        <div className="mt-6 h-[320px] w-full">
          {collabSorted.length === 0 ? (
            <p className="text-sm text-slate-500">Sem dados de colaboradores.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={collabSorted}
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chart.cartesianGridStroke}
                />
                <XAxis
                  type="number"
                  tickFormatter={minutesTick}
                  {...chart.axisProps}
                />
                <YAxis type="category" dataKey="name" width={100} {...chart.axisProps} />
                <Tooltip
                  contentStyle={chart.tooltipStyle}
                  formatter={(value: unknown) =>
                    formatHumanMinutes(
                      typeof value === 'number'
                        ? value
                        : Number(value) || 0,
                    )
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar
                  dataKey="planejSteps"
                  name={`${operationalLabels.previstoEstrutural} (STEPs)`}
                  fill={chart.barMetric.planned}
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="realizado"
                  name="Minutos apontados (colaborador)"
                  fill={chart.barMetric.realized}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-2 text-[10px] text-slate-600">
          Por colaborador: {operationalLabels.previstoEstrutural} = soma dos STEPs alocados; minutos
          apontados = soma dos apontamentos do colaborador. Comparar barras, não somar num único
          total.
        </p>
      </section>

      <section className="sgp-panel sgp-panel-hover">
        <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
          Últimos apontamentos
        </h2>
        <ul className="mt-4 space-y-2 text-sm">
          {data.recentTimeEntries.length === 0 ? (
            <li className="text-slate-500">Nenhum apontamento registado.</li>
          ) : (
            data.recentTimeEntries.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-white/[0.06] bg-sgp-app-panel-deep/80 px-3 py-2 transition-colors hover:border-white/12"
              >
                <Link
                  to={`/app/esteiras/${encodeURIComponent(e.conveyorId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir detalhe da esteira (nova aba)"
                  className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sgp-gold/40"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-slate-200 underline-offset-2 hover:underline">
                      {e.conveyorName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(e.entryAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {e.stepName} · {e.collaboratorName ?? e.collaboratorId} ·{' '}
                    {formatHumanMinutes(e.minutes)}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="text-[10px] text-slate-600">
        Gerado em {new Date(data.meta.generatedAt).toLocaleString('pt-BR')} ·{' '}
        {data.meta.scope}
      </p>
    </div>
  )
}
