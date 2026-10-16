import { useEffect, useMemo, useState } from 'react'
import type {
  OperationalPlanningPeriodItem,
  OperationalPlanningPeriodItemsPayload,
  OperationalPlanningPlanSituation,
} from '../../domain/operational-planning/operational-planning.types'
import { describePeriodRange } from '../../domain/operational/periodFilter'
import { formatIsoDateBr } from '../../domain/operational/workDate'
import { formatHumanMinutes } from '../../lib/formatters'
import { reportClientError } from '../../lib/errors'
import { getOperationalPlanningPeriodItems } from '../../services/operational-planning/operationalPlanningApiService'
import { filterPlanningDraftItems, type PlanningBoardFilters } from './planningBoardFilters'

const SITUATION_LABELS: Record<OperationalPlanningPlanSituation, string> = {
  PUBLICADO: 'Publicado',
  RASCUNHO: 'Rascunho',
  REVISAO_NAO_PUBLICADA: 'Revisão não publicada',
}

type Props = {
  from: string
  to: string
  filters: PlanningBoardFilters
  /** Recarrega quando o plano é salvo/publicado. */
  reloadKey: number
  onGoToWeek: (weekStartDate: string) => void
}

function toFilterable(item: OperationalPlanningPeriodItem) {
  return {
    ...item,
    assignedCollaboratorId: item.assignedCollaboratorId ?? undefined,
  }
}

/**
 * Pesquisa por período no Planejamento: itens planejados de **todas as semanas** do intervalo
 * (data planejada, inclusiva), vindos do backend. Os demais filtros do quadro (colaborador,
 * esteira, situação "sem responsável" e busca) são aplicados com a mesma regra do quadro.
 */
export function PlanningPeriodSearchPanel({ from, to, filters, reloadKey, onGoToWeek }: Props) {
  const [data, setData] = useState<OperationalPlanningPeriodItemsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const t = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      getOperationalPlanningPeriodItems(from || undefined, to || undefined)
        .then((payload) => {
          if (!cancelled) setData(payload)
        })
        .catch((e) => {
          if (cancelled) return
          const n = reportClientError(e, {
            module: 'operational-planning',
            action: 'period_items_load',
          })
          setData(null)
          setError(n.userMessage)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [from, to, reloadKey])

  const capacityStateFilter = filters.state === 'over_capacity'
  const visible = useMemo(() => {
    if (!data) return []
    const effective: PlanningBoardFilters = capacityStateFilter ? { ...filters, state: 'all' } : filters
    return filterPlanningDraftItems(data.items.map(toFilterable), effective)
  }, [data, filters, capacityStateFilter])

  const visibleMinutes = visible.reduce((s, i) => s + Math.max(0, i.plannedMinutes ?? 0), 0)
  const rangeLabel = data
    ? describePeriodRange({ from: data.range.from, to: data.range.to })
    : describePeriodRange({ from, to })

  return (
    <section
      className="rounded-xl border border-sky-400/20 bg-sky-500/[0.04] p-4"
      aria-label="Pesquisa por período"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-slate-100">
          Pesquisa por período — data planejada {rangeLabel}
        </h3>
        {data ? (
          <p className="text-[11px] text-slate-400" aria-live="polite">
            {visible.length} de {data.items.length} itens · {formatHumanMinutes(visibleMinutes)}
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        Inclui todas as semanas do período (plano em edição da semana; sem rascunho, o publicado).
        Datas inclusivas; sem uma das datas, o período vai até 92 dias.
        {capacityStateFilter ? ' A situação “capacidade excedida” vale só para a semana do quadro.' : ''}
      </p>

      {data ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.weeks.map((w) => (
            <button
              key={w.weekStartDate}
              type="button"
              onClick={() => onGoToWeek(w.weekStartDate)}
              className="rounded-full border border-white/[0.10] bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-slate-300 hover:bg-white/[0.08]"
              title="Abrir esta semana no quadro"
            >
              {formatIsoDateBr(w.weekStartDate)} · {w.situation ? SITUATION_LABELS[w.situation] : 'Sem plano'}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-3 text-[12px] text-slate-500">Carregando período…</p>
      ) : error ? (
        <p className="mt-3 text-[12px] text-rose-200" role="alert">
          {error}
        </p>
      ) : data && visible.length === 0 ? (
        <p className="mt-3 text-[12px] text-slate-500">
          Nenhum item planejado no período com os filtros atuais.
        </p>
      ) : data ? (
        <div className="mt-3 max-h-[28rem] overflow-auto rounded-lg border border-white/[0.06]">
          <table className="w-full min-w-[46rem] text-left text-[12px]">
            <thead className="sticky top-0 bg-sgp-app-panel-deep text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Colaborador</th>
                <th className="px-3 py-2">Esteira</th>
                <th className="px-3 py-2">Atividade</th>
                <th className="px-3 py-2">Tempo</th>
                <th className="px-3 py-2">Situação</th>
                <th className="px-3 py-2">Plano</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr key={i.workPlanItemId} className="border-t border-white/[0.05] text-slate-300">
                  <td className="px-3 py-1.5 tabular-nums">{formatIsoDateBr(i.plannedDate)}</td>
                  <td className="px-3 py-1.5">
                    {i.assignedCollaboratorName ?? i.assignedTeamName ?? 'Sem responsável'}
                  </td>
                  <td className="px-3 py-1.5">
                    {i.conveyorCode ? `[${i.conveyorCode}] ` : ''}
                    {i.conveyorTitle}
                  </td>
                  <td className="px-3 py-1.5">
                    {i.activityTitle}
                    <span className="block text-[10px] text-slate-500">
                      {i.taskTitle} · {i.sectorTitle}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">
                    {i.plannedMinutes == null ? '—' : formatHumanMinutes(i.plannedMinutes)}
                  </td>
                  <td className="px-3 py-1.5">{i.activityStatusLabel}</td>
                  <td className="px-3 py-1.5 text-slate-400">{SITUATION_LABELS[i.planSituation]}</td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-sgp-blue-bright hover:underline"
                      onClick={() => onGoToWeek(i.weekStartDate)}
                    >
                      Ver semana
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
