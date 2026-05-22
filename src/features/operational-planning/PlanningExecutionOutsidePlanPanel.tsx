import { Link } from 'react-router-dom'
import type { OperationalPlanningExecutionOutsidePlanEntry } from '../../domain/operational-planning/operational-planning.types'
import { formatPlanningMinutes } from './planningBoardHelpers'

function formatEntryDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type PlanningExecutionOutsidePlanPanelProps = {
  entries: readonly OperationalPlanningExecutionOutsidePlanEntry[]
  summaryTotalMinutes: number
}

export function PlanningExecutionOutsidePlanPanel(props: PlanningExecutionOutsidePlanPanelProps) {
  const { entries, summaryTotalMinutes } = props

  return (
    <>
      <div>
        <h2 className="text-[15px] font-semibold text-slate-100">Fora do planejado</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          Apontamentos da semana em atividades que não constam no plano semanal da fábrica.
        </p>
        <p className="mt-2 text-[12px] font-medium text-amber-200/90">
          {entries.length === 0
            ? 'Nenhum apontamento fora do plano nesta semana.'
            : `${entries.length} apontamento(s) · ${formatPlanningMinutes(summaryTotalMinutes)}`}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-3 py-4 text-center text-[13px] text-slate-500">
          Todos os apontamentos da semana estão vinculados a itens do plano semanal.
        </p>
      ) : (
        <ul className="space-y-3 lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto lg:pr-1">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3 text-[12px] ring-1 ring-amber-500/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-100">{entry.conveyorTitle}</p>
                  <p className="mt-0.5 text-slate-400">
                    {entry.taskTitle} · {entry.sectorTitle} · {entry.activityTitle}
                  </p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums text-amber-100">
                  {formatPlanningMinutes(entry.minutes)}
                </p>
              </div>
              <p className="mt-2 text-slate-400">
                {entry.collaboratorName} · {formatEntryDateTime(entry.entryAt)}
              </p>
              {entry.entryOrigin === 'UNASSIGNED_EXCEPTION' ? (
                <p className="mt-2 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-100">
                  Apontamento por exceção
                  {entry.exceptionJustification?.trim()
                    ? ` — ${entry.exceptionJustification.trim()}`
                    : null}
                </p>
              ) : null}
              <Link
                to={`/esteiras/${entry.conveyorId}`}
                className="mt-2 inline-block text-[11px] font-medium text-sgp-gold/90 hover:text-sgp-gold"
              >
                Abrir esteira
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
