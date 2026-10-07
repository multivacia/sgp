import type {
  OperationalJourneyData,
  OperationalJourneyExtraTimeEntry,
} from '../../domain/operational-journey/operational-journey.types'
import { formatIsoDateBr } from '../../domain/operational/workDate'
import { formatHumanMinutes } from '../../lib/formatters'

type Props = {
  summary: OperationalJourneyData['extraTimeEntriesSummary']
  entries: readonly OperationalJourneyExtraTimeEntry[]
  limit: number
  /** Exibe o nome do colaborador em cada lançamento (visão gerencial multi-colaborador). */
  showCollaborator?: boolean
}

/** Lançamentos Extra Esteira (tempo fora de esteira) do período da jornada. */
export function JourneyExtraTimeEntriesSection({
  summary,
  entries,
  limit,
  showCollaborator = false,
}: Props) {
  return (
    <section
      className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 ring-1 ring-white/[0.03]"
      aria-label="Extra Esteira no período"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold text-white">Extra Esteira no período</h2>
        <p className="text-xs text-slate-400">
          Total:{' '}
          <span className="font-semibold text-slate-100">
            {formatHumanMinutes(summary.totalMinutes)}
          </span>{' '}
          · {summary.entriesCount} lançamento(s)
        </p>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">
        Tempo fora de esteira (SGP e Modo Fábrica) com data na janela (até {limit} registros).
        Não entra nos minutos apontados em esteiras.
      </p>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Nenhum lançamento Extra Esteira com data nesta janela.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-slate-100">{e.description}</p>
                <span className="shrink-0 rounded border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-100/95">
                  Extra Esteira
                </span>
                {e.origin === 'PRODUCTION' ? (
                  <span className="shrink-0 rounded border border-white/15 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-300">
                    Modo Fábrica
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatHumanMinutes(e.minutes)} · {formatIsoDateBr(e.entryDate)}
                {showCollaborator && e.collaboratorName ? ` · ${e.collaboratorName}` : ''}
              </p>
              {e.notes?.trim() ? (
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  <span className="font-semibold text-slate-500">Observação: </span>
                  {e.notes.trim()}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
