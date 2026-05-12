import { useMemo, useState } from 'react'
import { formatMinutosHumanos } from '../../lib/formatters'
import { matrixUxNodeLabel } from './matrixServiceUx'
import { matrixPreviewActivityInfoFlags } from './operationMatrixPreviewEdits'
import type {
  MacroActivityRow,
  OperationMatrixMacroPreviewModel,
} from './operationMatrixPreviewMapper'

type Props = {
  model: OperationMatrixMacroPreviewModel
  edit?: {
    collaborators: { id: string; fullName: string }[]
    collaboratorsListFailed: boolean
    onPatchActivity: (
      activityId: string,
      patch: Partial<{
        plannedMinutes: number | null
        defaultResponsibleId: string | null
      }>,
    ) => void
  }
}

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{value}</p>
    </div>
  )
}

const matrixPreviewInfoRowClass =
  'border-amber-300/90 bg-[#FFFBEB] text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200/95'

const matrixPreviewInfoBadgeClass =
  'max-w-full whitespace-normal break-words rounded border border-amber-300/80 bg-amber-100/80 px-1.5 py-0.5 text-left text-[9px] font-medium leading-snug text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100/90'

function PencilMini({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MacroPreviewActivityRow({
  activity,
  edit,
}: {
  activity: MacroActivityRow
  edit: NonNullable<Props['edit']>
}) {
  const [timeOpen, setTimeOpen] = useState(false)
  const [timeDraft, setTimeDraft] = useState('')

  const sortedCollaborators = useMemo(
    () =>
      [...edit.collaborators].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, 'pt-BR'),
      ),
    [edit.collaborators],
  )

  const openTimeEditor = () => {
    setTimeDraft(
      activity.plannedMinutes != null ? String(activity.plannedMinutes) : '',
    )
    setTimeOpen(true)
  }

  const commitTimeDraft = () => {
    const raw = timeDraft.trim()
    if (raw === '') {
      edit.onPatchActivity(activity.id, { plannedMinutes: null })
      setTimeOpen(false)
      return
    }
    if (!/^\d+$/.test(raw)) {
      setTimeOpen(false)
      return
    }
    const n = Number.parseInt(raw, 10)
    if (n < 0) {
      setTimeOpen(false)
      return
    }
    edit.onPatchActivity(activity.id, { plannedMinutes: n })
    setTimeOpen(false)
  }

  const info = matrixPreviewActivityInfoFlags(
    activity.plannedMinutes,
    activity.defaultResponsibleId,
  )
  const infoHighlight = info.missingEffectiveTime || info.missingResponsible

  const timeDisplay =
    activity.plannedMinutes != null ? (
      <span className="tabular-nums">{formatMinutosHumanos(activity.plannedMinutes)}</span>
    ) : (
      <span className={infoHighlight ? 'opacity-75' : 'text-slate-600 dark:opacity-90'}>—</span>
    )

  return (
    <li
      className={[
        'box-border grid w-full min-w-0 max-w-full grid-cols-1 gap-x-3 gap-y-2 overflow-hidden rounded-lg border px-3 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-y-2',
        infoHighlight
          ? matrixPreviewInfoRowClass
          : 'border-white/[0.05] bg-sgp-void/40',
      ].join(' ')}
    >
      <div
        className={
          infoHighlight
            ? 'min-w-0 max-w-full break-words font-medium text-amber-950 [overflow-wrap:anywhere] dark:text-slate-100'
            : 'min-w-0 max-w-full break-words font-medium text-slate-200 [overflow-wrap:anywhere]'
        }
      >
        {activity.name}
      </div>
      <div
        className={
          infoHighlight
            ? 'flex min-w-0 w-full max-w-full flex-wrap items-center justify-start gap-x-2 gap-y-1.5 text-[11px] text-amber-900/90 sm:justify-end dark:text-slate-400'
            : 'flex min-w-0 w-full max-w-full flex-wrap items-center justify-start gap-x-2 gap-y-1.5 text-[11px] text-slate-500 sm:justify-end'
        }
      >
        {timeOpen ? (
          <span className="inline-flex shrink-0 items-center gap-1">
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={timeDraft}
              onChange={(e) => setTimeDraft(e.target.value)}
              onBlur={commitTimeDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setTimeOpen(false)
                }
              }}
              autoFocus
              aria-label="Editar tempo previsto da atividade"
              className={[
                'box-border w-[4.5rem] max-w-full shrink-0 rounded border px-1.5 py-0.5 text-[11px] tabular-nums outline-none ring-sgp-gold/40 focus-visible:ring-2',
                infoHighlight
                  ? 'border-amber-400/40 bg-white/90 text-slate-900 dark:border-white/15 dark:bg-sgp-void/90 dark:text-slate-200'
                  : 'border-white/15 bg-sgp-void/90 text-slate-200',
              ].join(' ')}
            />
            <span className="shrink-0 text-current opacity-70">min</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={openTimeEditor}
            title="Editar tempo previsto"
            aria-label="Editar tempo previsto da atividade"
            className="group inline-flex max-w-full shrink-0 items-center gap-0.5 rounded border border-transparent px-0.5 text-left text-inherit outline-none transition hover:border-white/12 hover:bg-white/[0.04] focus-visible:border-sgp-gold/35 focus-visible:ring-2 focus-visible:ring-sgp-gold/30"
          >
            {timeDisplay}
            <PencilMini className="shrink-0 text-current opacity-60 transition group-hover:opacity-100 group-focus-visible:opacity-100 dark:opacity-50" />
          </button>
        )}

        {edit.collaboratorsListFailed ? (
          <span
            className="min-w-0 max-w-full break-words text-left text-[11px] leading-snug text-slate-500 sm:max-w-[min(100%,15rem)] sm:text-right"
            title="Não foi possível carregar colaboradores. Tente novamente mais tarde."
          >
            {activity.responsibleLabel ?? '—'}
          </span>
        ) : (
          <label className="flex min-w-0 max-w-full items-center gap-0.5 sm:max-w-[min(100%,15rem)]">
            <select
              aria-label="Selecionar responsável da atividade"
              value={activity.defaultResponsibleId ?? ''}
              onChange={(e) => {
                const v = e.target.value.trim()
                edit.onPatchActivity(activity.id, {
                  defaultResponsibleId: v === '' ? null : v,
                })
              }}
              className="box-border min-h-[1.75rem] w-full min-w-0 max-w-[min(100%,15rem)] cursor-pointer truncate rounded border border-transparent bg-transparent py-0.5 pl-0.5 pr-6 text-right text-[11px] leading-snug text-slate-700 outline-none transition hover:border-white/12 hover:bg-white/[0.04] focus-visible:border-sgp-gold/35 focus-visible:ring-2 focus-visible:ring-sgp-gold/30 dark:text-slate-400"
            >
              <option value="">— Sem responsável —</option>
              {sortedCollaborators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
            <PencilMini className="pointer-events-none shrink-0 text-current opacity-40" />
          </label>
        )}

        {info.missingEffectiveTime ? (
          <span className={matrixPreviewInfoBadgeClass}>Sem tempo previsto</span>
        ) : null}
        {info.missingResponsible ? (
          <span className={matrixPreviewInfoBadgeClass}>Sem responsável padrão</span>
        ) : null}
      </div>
    </li>
  )
}

function ReadonlyActivityRow({ activity }: { activity: MacroActivityRow }) {
  const info = matrixPreviewActivityInfoFlags(
    activity.plannedMinutes,
    activity.defaultResponsibleId,
  )
  const infoHighlight = info.missingEffectiveTime || info.missingResponsible

  return (
    <li
      className={[
        'box-border grid w-full min-w-0 max-w-full grid-cols-1 gap-x-3 gap-y-2 overflow-hidden rounded-lg border px-3 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-y-2',
        infoHighlight
          ? matrixPreviewInfoRowClass
          : 'border-white/[0.05] bg-sgp-void/40',
      ].join(' ')}
    >
      <div
        className={
          infoHighlight
            ? 'min-w-0 max-w-full break-words font-medium text-amber-950 [overflow-wrap:anywhere] dark:text-slate-100'
            : 'min-w-0 max-w-full break-words font-medium text-slate-200 [overflow-wrap:anywhere]'
        }
      >
        {activity.name}
      </div>
      <div
        className={
          infoHighlight
            ? 'flex min-w-0 w-full max-w-full flex-wrap items-center justify-start gap-x-2 gap-y-1.5 text-[11px] text-amber-900/90 sm:justify-end dark:text-slate-400'
            : 'flex min-w-0 w-full max-w-full flex-wrap items-center justify-start gap-x-2 gap-y-1.5 text-[11px] text-slate-500 sm:justify-end'
        }
      >
        {activity.plannedMinutes != null ? (
          <span className="min-w-0 shrink-0">{formatMinutosHumanos(activity.plannedMinutes)}</span>
        ) : null}
        {activity.responsibleLabel ? (
          <span className="min-w-0 max-w-full break-words text-slate-600 dark:text-slate-400">
            {activity.responsibleLabel}
          </span>
        ) : null}
        {info.missingEffectiveTime ? (
          <span className={matrixPreviewInfoBadgeClass}>Sem tempo previsto</span>
        ) : null}
        {info.missingResponsible ? (
          <span className={matrixPreviewInfoBadgeClass}>Sem responsável padrão</span>
        ) : null}
      </div>
    </li>
  )
}

export function OperationMatrixMacroView({ model, edit }: Props) {
  const g = model.executiveSummary
  const statusLabel = model.item.isActive ? 'Ativa' : 'Inativa'

  return (
    <div className="space-y-10">
      <header className="sgp-header-card">
        {edit ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-sgp-gold/95">
              Pré-visualização editável da matriz
            </p>
            <p className="max-w-3xl text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Ajuste tempo previsto e responsável padrão das atividades sem alterar a
              estrutura.
            </p>
          </div>
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sgp-gold">
            Pré-visualização · somente leitura
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="sgp-page-title">
              {model.item.name}
            </h1>
            {model.item.code ? (
              <p className="mt-1 font-mono text-xs text-slate-500">{model.item.code}</p>
            ) : null}
            {model.item.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
                {model.item.description}
              </p>
            ) : null}
          </div>
          <span
            className={`inline-flex shrink-0 self-start rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              model.item.isActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100/95'
                : 'border-white/15 bg-white/[0.04] text-slate-400'
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </header>

      <section aria-labelledby="macro-resumo-heading">
        <h2
          id="macro-resumo-heading"
          className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500"
        >
          Resumo executivo
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Tarefas de serviço" value={g.taskCount} />
          <SummaryCard label="Setores de execução" value={g.sectorCount} />
          <SummaryCard label="Atividades" value={g.activityCount} />
          <SummaryCard
            label="Tempo total previsto"
            value={formatMinutosHumanos(g.plannedMinutesSum)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span>
            Responsáveis distintos (vinculados):{' '}
            <span className="font-semibold text-slate-300">{g.linkedDistinctResponsibles}</span>
          </span>
          <span className="text-slate-600">·</span>
          <span>
            Atividades sem responsável padrão:{' '}
            <span className="font-semibold text-slate-300">
              {g.activitiesWithoutResponsible}
            </span>
          </span>
        </div>
      </section>

      <section aria-labelledby="macro-estrutura-heading" className="space-y-6">
        <h2
          id="macro-estrutura-heading"
          className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500"
        >
          Estrutura da matriz
        </h2>

        {model.tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
            Nenhuma tarefa de serviço cadastrada nesta oferta.
          </p>
        ) : (
          <div className="space-y-8">
            {model.tasks.map((task) => (
              <article
                key={task.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]"
              >
                <div className="border-b border-white/[0.06] px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sgp-gold/90">
                        {matrixUxNodeLabel.TASK}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-100">{task.name}</h3>
                      {task.description ? (
                        <p className="mt-2 text-sm text-slate-400">{task.description}</p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                        task.isActive
                          ? 'border-emerald-500/25 text-emerald-100/90'
                          : 'border-white/12 text-slate-500'
                      }`}
                    >
                      {task.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-white/[0.05]">
                  {task.sectors.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-slate-500">
                      Sem setores nesta tarefa.
                    </p>
                  ) : (
                    task.sectors.map((sector) => (
                      <div key={sector.id} className="min-w-0 px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {matrixUxNodeLabel.SECTOR}
                        </p>
                        <h4 className="mt-1 text-base font-medium text-slate-200">{sector.name}</h4>
                        {sector.activities.length === 0 ? (
                          <p className="mt-2 text-sm text-slate-500">Sem atividades neste setor.</p>
                        ) : (
                          <ul className="mt-3 flex flex-col gap-3">
                            {sector.activities.map((a) =>
                              edit ? (
                                <MacroPreviewActivityRow key={a.id} activity={a} edit={edit} />
                              ) : (
                                <ReadonlyActivityRow key={a.id} activity={a} />
                              ),
                            )}
                          </ul>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
