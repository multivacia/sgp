import { Link } from 'react-router-dom'
import type { ConveyorNodeWorkload } from '../../domain/conveyors/conveyorNodeWorkload.types'
import { OPERATIONAL_BUCKET_LABELS } from '../../lib/backlog/operationalBuckets'
import { formatMinutosHumanos } from '../../lib/formatters'
import { nodeWorkloadLabels } from '../../lib/operationalSemantics'

type Props = {
  conveyorId: string
  data: ConveyorNodeWorkload | null
  loading: boolean
  error: string | null
}

export function ConveyorNodeWorkloadPanel({
  conveyorId,
  data,
  loading,
  error,
}: Props) {
  return (
    <section
      className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
      title={nodeWorkloadLabels.tooltipBloco}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {nodeWorkloadLabels.sectionTitle}
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-500">
            {nodeWorkloadLabels.tooltipBloco}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Carregando indicadores…</p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-rose-300/95" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && data ? (
        <div className="mt-6 space-y-8">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-500">
              {nodeWorkloadLabels.bucketOperacional}:
            </span>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-slate-200">
              {OPERATIONAL_BUCKET_LABELS[data.conveyor.operationalBucket]}
            </span>
            {data.conveyor.isOverdueContext ? (
              <span
                className="rounded-md border border-rose-500/35 bg-rose-500/[0.12] px-2 py-0.5 text-xs font-semibold text-rose-100/95"
                title={nodeWorkloadLabels.pressaoAtrasoContexto}
              >
                {nodeWorkloadLabels.pressaoAtrasoContexto}
              </span>
            ) : null}
          </div>

          <p className="text-[11px] leading-relaxed text-slate-600">{data.notes}</p>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {nodeWorkloadLabels.concentracaoPrevisto} /{' '}
              {nodeWorkloadLabels.concentracaoRealizado} — por área
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">{nodeWorkloadLabels.colunas.opcao}</th>
                    <th className="py-2 pr-3">{nodeWorkloadLabels.colunas.area}</th>
                    <th className="py-2 pr-3 text-right tabular-nums">
                      {nodeWorkloadLabels.colunas.previsto} (Σ)
                    </th>
                    <th className="py-2 pr-3 text-right tabular-nums">
                      {nodeWorkloadLabels.colunas.realizado} (Σ)
                    </th>
                    <th className="py-2 text-right tabular-nums">
                      {nodeWorkloadLabels.pendenciaTempoStep} (Σ)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.areas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-4 text-slate-500"
                      >
                        Sem STEPs na estrutura.
                      </td>
                    </tr>
                  ) : (
                    data.areas.map((a) => (
                      <tr
                        key={`${a.optionId}-${a.areaId}`}
                        className="border-b border-white/[0.04] text-slate-300"
                      >
                        <td className="py-2 pr-3 text-slate-400">{a.optionName}</td>
                        <td className="py-2 pr-3 font-medium text-slate-200">
                          {a.areaName}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {formatMinutosHumanos(a.plannedMinutesSum)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-emerald-200/90">
                          {formatMinutosHumanos(a.realizedMinutesSum)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-sky-200/95">
                          {formatMinutosHumanos(a.pendingMinutesSum)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {nodeWorkloadLabels.pendenciaTempoStep} — detalhe
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">{nodeWorkloadLabels.colunas.opcao}</th>
                    <th className="py-2 pr-3">{nodeWorkloadLabels.colunas.area}</th>
                    <th className="py-2 pr-3">{nodeWorkloadLabels.colunas.step}</th>
                    <th className="py-2 pr-3 text-right tabular-nums">
                      {nodeWorkloadLabels.colunas.previsto}
                    </th>
                    <th className="py-2 pr-3 text-right tabular-nums">
                      {nodeWorkloadLabels.colunas.realizado}
                    </th>
                    <th className="py-2 pr-3 text-right tabular-nums">
                      {nodeWorkloadLabels.colunas.pendencia}
                    </th>
                    <th className="py-2 text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {data.steps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-slate-500">
                        Sem STEPs na estrutura.
                      </td>
                    </tr>
                  ) : (
                    data.steps.map((s) => (
                      <tr
                        key={s.stepId}
                        className="border-b border-white/[0.04] text-slate-300"
                      >
                        <td className="py-2 pr-3 align-top text-slate-400">
                          {s.optionName}
                        </td>
                        <td className="py-2 pr-3 align-top text-slate-400">
                          {s.areaName}
                        </td>
                        <td className="py-2 pr-3 align-top font-medium text-slate-100">
                          {s.stepName}
                        </td>
                        <td className="py-2 pr-3 text-right align-top tabular-nums">
                          {s.plannedMinutes == null
                            ? '—'
                            : formatMinutosHumanos(s.plannedMinutes)}
                        </td>
                        <td className="py-2 pr-3 text-right align-top tabular-nums text-emerald-200/90">
                          {formatMinutosHumanos(s.realizedMinutes)}
                        </td>
                        <td className="py-2 pr-3 text-right align-top tabular-nums text-sky-200/95">
                          {formatMinutosHumanos(s.pendingMinutes)}
                        </td>
                        <td className="py-2 text-right align-top">
                          <Link
                            to={`/app/esteiras/${encodeURIComponent(conveyorId)}?step=${encodeURIComponent(s.stepId)}`}
                            className="text-[11px] font-semibold text-sgp-blue-bright hover:underline"
                          >
                            Focar STEP
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
