import { useState } from 'react'
import { JourneyExtraTimeEntryCorrectionDialog } from './JourneyExtraTimeEntryCorrectionDialog'
import type {
  OperationalJourneyData,
  OperationalJourneyExtraTimeEntry,
  ExtraTimeEntryCorrectionSnapshot,
} from '../../domain/operational-journey/operational-journey.types'
import { formatIsoDateBr } from '../../domain/operational/workDate'
import { formatHumanMinutes } from '../../lib/formatters'

type Props = {
  summary: OperationalJourneyData['extraTimeEntriesSummary']
  entries: readonly OperationalJourneyExtraTimeEntry[]
  limit: number
  /** Exibe o nome do colaborador em cada lançamento (visão gerencial multi-colaborador). */
  showCollaborator?: boolean
  canEdit?: boolean
  canDelete?: boolean
  onMutated?: () => Promise<void>
}

function formatTimestamp(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function snapshotText(value: ExtraTimeEntryCorrectionSnapshot) {
  const description = value.description || 'Descrição não disponível'
  return `${description} · ${formatHumanMinutes(value.minutes)} · ${formatIsoDateBr(value.entryDate)}`
}

/** Lançamentos Extra Esteira (tempo fora de esteira) do período da jornada. */
export function JourneyExtraTimeEntriesSection({
  summary,
  entries,
  limit,
  showCollaborator = false,
  canEdit = false,
  canDelete = false,
  onMutated,
}: Props) {
  const [selected, setSelected] = useState<{ entry: OperationalJourneyExtraTimeEntry; mode: 'edit' | 'delete' } | null>(null)
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
        Tempo fora de esteira (SGP e Modo Fábrica) no período (até {limit} registros, incluindo excluídos).
        Os totais consideram apenas lançamentos ativos; excluídos são exibidos para consulta histórica.
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
              className={`rounded-lg border px-3 py-2.5 text-sm ${e.deletedAt ? 'border-rose-400/25 bg-rose-500/[0.05]' : 'border-white/[0.06] bg-black/20'}`}
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
                {e.deletedAt ? (
                  <span className="rounded border border-rose-400/40 px-2 py-0.5 text-xs font-semibold text-rose-200">
                    Excluído
                  </span>
                ) : (e.correctionHistory ?? []).some((h) => h.action === 'EDIT') ? (
                  <span className="rounded border border-sky-400/35 px-2 py-0.5 text-xs font-semibold text-sky-200">
                    Corrigido
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatHumanMinutes(e.minutes)} · {formatIsoDateBr(e.entryDate)}
                {showCollaborator && e.collaboratorName ? ` · ${e.collaboratorName}` : ''}
                {e.deletedAt ? ' · Não contabilizado' : ''}
              </p>
              {e.deletedAt ? (
                <div className="mt-2 rounded-lg border border-rose-500/15 px-3 py-2 text-xs text-rose-100">
                  <p><strong>Motivo da exclusão:</strong> {
                    (e.correctionHistory ?? []).find((h) => h.action === 'DELETE')?.reason?.trim()
                    || 'Motivo não registrado no histórico.'
                  }</p>
                  {(e.correctionHistory ?? []).find((h) => h.action === 'DELETE')?.actorLabel ? (
                    <p className="mt-1 text-slate-400">
                      Por {(e.correctionHistory ?? []).find((h) => h.action === 'DELETE')?.actorLabel}
                      {' · '}{formatTimestamp(e.deletedAt)}
                    </p>
                  ) : (
                    <p className="mt-1 text-slate-400">Excluído em {formatTimestamp(e.deletedAt)}</p>
                  )}
                </div>
              ) : (e.correctionHistory ?? []).some((h) => h.action === 'EDIT') ? (
                <p className="mt-2 text-xs text-sky-200">
                  <strong>Motivo da correção:</strong> {
                    (e.correctionHistory ?? []).find((h) => h.action === 'EDIT')?.reason
                  }
                </p>
              ) : null}
              {(e.correctionHistory?.length ?? 0) > 0 ? (
                <details className="mt-2 text-xs text-slate-300">
                  <summary className="cursor-pointer font-semibold">
                    Histórico de alterações ({e.correctionHistory?.length})
                  </summary>
                  <ol className="mt-2 space-y-2">
                    {e.correctionHistory?.map((history, index) => (
                      <li key={`${history.occurredAt}-${index}`} className="rounded-lg border border-white/10 px-3 py-2">
                        <p className="font-semibold">
                          {history.action === 'DELETE' ? 'Exclusão' : 'Correção'}
                          {' · '}{formatTimestamp(history.occurredAt)}
                        </p>
                        {history.actorLabel ? <p>Responsável: {history.actorLabel}</p> : null}
                        <p>Justificativa: {history.reason || 'Motivo não registrado'}</p>
                        <p>Antes: {snapshotText(history.before)}</p>
                        {history.before.notes ? <p>Observação anterior: {history.before.notes}</p> : null}
                        {history.after ? (
                          <>
                            <p>Depois: {snapshotText(history.after)}</p>
                            {history.after.notes ? <p>Observação posterior: {history.after.notes}</p> : null}
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
              {(canEdit || canDelete) && onMutated && e.updatedAt && !e.deletedAt ? (
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {canEdit ? (
                    <button type="button" className="font-semibold text-sky-300 hover:underline"
                      onClick={() => setSelected({ entry: e, mode: 'edit' })}
                      aria-label={`Editar apontamento Extra Esteira: ${e.description}`}>
                      Editar
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button type="button" className="font-semibold text-rose-300 hover:underline"
                      onClick={() => setSelected({ entry: e, mode: 'delete' })}
                      aria-label={`Remover apontamento Extra Esteira: ${e.description}`}>
                      Remover
                    </button>
                  ) : null}
                </div>
              ) : null}
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
      {selected && onMutated ? (
        <JourneyExtraTimeEntryCorrectionDialog
          key={selected.entry.id + selected.mode}
          entry={selected.entry}
          mode={selected.mode}
          onClose={() => setSelected(null)}
          onMutated={onMutated}
        />
      ) : null}
    </section>
  )
}
