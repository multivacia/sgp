import type { CSSProperties } from 'react'

/** Estilo comum aos gráficos do dashboard — valores default (Argos / SSR). */

export const chartTooltipContentStyle: CSSProperties = {
  backgroundColor: 'rgba(11, 18, 32, 0.96)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  fontSize: 12,
}

export const chartAxisProps = {
  stroke: '#64748b',
  tick: { fill: '#94a3b8', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: 'rgba(255,255,255,0.08)' },
}

export const CHART_BUCKET_FILL: Record<string, string> = {
  no_backlog: '#64748b',
  em_revisao: '#8b5cf6',
  em_andamento: '#38bdf8',
  em_atraso: '#fb7185',
  concluidas: '#34d399',
}

function pickVar(
  cs: CSSStyleDeclaration,
  name: string,
  fallback: string,
): string {
  const v = cs.getPropertyValue(name).trim()
  return v || fallback
}

/** Lê tokens semânticos do documento (tema ativo via `data-theme`). */
export function resolveDashboardChartTheme(): {
  tooltipStyle: CSSProperties
  axisProps: typeof chartAxisProps
  bucketFill: Record<string, string>
  execPie: { ativas: string; conclJanela: string; atraso: string }
  barMetric: { planned: string; total: string; realized: string }
  periodBar: string
  cartesianGridStroke: string
} {
  if (typeof document === 'undefined') {
    return {
      tooltipStyle: chartTooltipContentStyle,
      axisProps: chartAxisProps,
      bucketFill: { ...CHART_BUCKET_FILL },
      execPie: {
        ativas: '#38bdf8',
        conclJanela: '#34d399',
        atraso: '#fb7185',
      },
      barMetric: {
        planned: '#38bdf8',
        total: '#64748b',
        realized: '#34d399',
      },
      periodBar: '#7dd3fc',
      cartesianGridStroke: 'rgba(255,255,255,0.06)',
    }
  }

  const cs = getComputedStyle(document.documentElement)

  const tooltipStyle: CSSProperties = {
    backgroundColor: pickVar(cs, '--semantic-chart-tooltip-bg', 'rgba(11, 18, 32, 0.96)'),
    border: `1px solid ${pickVar(cs, '--semantic-chart-tooltip-border', 'rgba(255, 255, 255, 0.1)')}`,
    borderRadius: 12,
    fontSize: 12,
  }

  const axisProps = {
    stroke: pickVar(cs, '--semantic-chart-axis-stroke', '#64748b'),
    tick: {
      fill: pickVar(cs, '--semantic-chart-tick-fill', '#94a3b8'),
      fontSize: 11,
    },
    tickLine: false,
    axisLine: {
      stroke: pickVar(cs, '--semantic-chart-axis-line', 'rgba(255,255,255,0.08)'),
    },
  }

  const bucketFill: Record<string, string> = {
    no_backlog: pickVar(cs, '--semantic-chart-bucket-no-backlog', '#64748b'),
    em_revisao: pickVar(cs, '--semantic-chart-bucket-em-revisao', '#8b5cf6'),
    em_andamento: pickVar(cs, '--semantic-chart-bucket-em-andamento', '#38bdf8'),
    em_atraso: pickVar(cs, '--semantic-chart-bucket-em-atraso', '#fb7185'),
    concluidas: pickVar(cs, '--semantic-chart-bucket-concluidas', '#34d399'),
  }

  const execPie = {
    ativas: pickVar(cs, '--semantic-chart-exec-ativa', '#38bdf8'),
    conclJanela: pickVar(cs, '--semantic-chart-exec-concl', '#34d399'),
    atraso: pickVar(cs, '--semantic-chart-exec-atraso', '#fb7185'),
  }

  const barMetric = {
    planned: pickVar(cs, '--semantic-chart-exec-ativa', '#38bdf8'),
    total: pickVar(cs, '--semantic-chart-bucket-no-backlog', '#64748b'),
    realized: pickVar(cs, '--semantic-chart-exec-concl', '#34d399'),
  }

  const periodBar = pickVar(cs, '--semantic-chart-bar-period', '#7dd3fc')

  const cartesianGridStroke = pickVar(
    cs,
    '--semantic-chart-axis-line',
    'rgba(255,255,255,0.06)',
  )

  return {
    tooltipStyle,
    axisProps,
    bucketFill,
    execPie,
    barMetric,
    periodBar,
    cartesianGridStroke,
  }
}
