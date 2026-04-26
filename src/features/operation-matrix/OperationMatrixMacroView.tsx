import { formatMinutosHumanos } from '../../lib/formatters'
import { matrixUxNodeLabel } from './matrixServiceUx'
import type { OperationMatrixMacroPreviewModel } from './operationMatrixPreviewMapper'

type Props = {
  model: OperationMatrixMacroPreviewModel
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

export function OperationMatrixMacroView({ model }: Props) {
  const g = model.executiveSummary
  const statusLabel = model.item.isActive ? 'Ativa' : 'Inativa'

  return (
    <div className="space-y-10">
      <header className="sgp-header-card">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sgp-gold">
          Pré-visualização · somente leitura
        </p>
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
          <SummaryCard label="Opções de serviço" value={g.taskCount} />
          <SummaryCard label="Áreas de execução" value={g.sectorCount} />
          <SummaryCard label="Etapas" value={g.activityCount} />
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
            Etapas sem responsável padrão:{' '}
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
            Nenhuma opção de serviço cadastrada nesta oferta.
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
                      Sem áreas nesta opção.
                    </p>
                  ) : (
                    task.sectors.map((sector) => (
                      <div key={sector.id} className="px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {matrixUxNodeLabel.SECTOR}
                        </p>
                        <h4 className="mt-1 text-base font-medium text-slate-200">{sector.name}</h4>
                        {sector.activities.length === 0 ? (
                          <p className="mt-2 text-sm text-slate-500">Sem etapas nesta área.</p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {sector.activities.map((a) => (
                              <li
                                key={a.id}
                                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-white/[0.05] bg-sgp-void/40 px-3 py-2.5 text-sm"
                              >
                                <span className="font-medium text-slate-200">{a.name}</span>
                                <span className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                  {a.plannedMinutes != null ? (
                                    <span>{formatMinutosHumanos(a.plannedMinutes)}</span>
                                  ) : null}
                                  {a.responsibleLabel ? (
                                    <span className="text-slate-400">
                                      {a.responsibleLabel}
                                    </span>
                                  ) : null}
                                  {a.required ? (
                                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100/90">
                                      Obrigatória
                                    </span>
                                  ) : null}
                                </span>
                              </li>
                            ))}
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
