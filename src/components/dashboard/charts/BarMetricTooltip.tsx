import { formatHumanMinutes } from '../../../lib/formatters'

export type BarMetricTooltipRow = {
  metric: string
  minutes: number
  /** Linha curta sob o valor formatado (unidade / âmbito). */
  valueCaption?: string
  hint?: string
}

type PayloadEntry = { payload?: BarMetricTooltipRow }

/** Tooltip partilhado — barras com `metric`, `minutes` e opcional `hint` no payload. */
export function BarMetricTooltip({
  active,
  payload,
}: {
  active?: boolean
  /** Recharts usa payload readonly — aceitar como iterável. */
  payload?: readonly PayloadEntry[]
}) {
  if (!active || !payload?.[0]?.payload) return null
  const p = payload[0].payload
  return (
    <div className="sgp-chart-tooltip-inner text-left">
      <p className="sgp-chart-tooltip-label">{p.metric}</p>
      <p className="sgp-chart-tooltip-value">
        {formatHumanMinutes(p.minutes)}
      </p>
      {p.valueCaption ? (
        <p className="mt-1 max-w-[16rem] text-[10px] leading-snug text-slate-500">
          {p.valueCaption}
        </p>
      ) : null}
      {p.hint ? (
        <p className="mt-1.5 max-w-[16rem] text-[10px] leading-snug text-slate-500">
          {p.hint}
        </p>
      ) : null}
    </div>
  )
}
