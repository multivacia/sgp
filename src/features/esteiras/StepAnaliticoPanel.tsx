import { Link } from 'react-router-dom'
import { formatMinutosHumanos } from '../../lib/formatters'
import { useAuth } from '../../lib/use-auth'
import {
  labelStatusLeituraApontamento,
  type StepAnaliticoDetalhe,
} from '../../domain/esteiras/step-analitico.types'

export type StepAnaliticoPanelProps = {
  stepAnalitico: StepAnaliticoDetalhe | undefined
  /** Fallback quando o pai ainda expõe só na linha operacional (mock). */
  matrixActivityNodeId?: string
  loading?: boolean
}

export function StepAnaliticoPanel({
  stepAnalitico,
  matrixActivityNodeId: matrixProp,
  loading,
}: StepAnaliticoPanelProps) {
  const { canAny } = useAuth()
  const showGestorLink = canAny([
    'time_entries.create_on_behalf',
    'time_entries.delete_any',
  ])

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
        <p className="text-[10px] leading-relaxed text-slate-500">
          Carregando equipe e apontamentos…
        </p>
      </div>
    )
  }

  if (!stepAnalitico) return null

  const sa = stepAnalitico
  const matrixId = sa.matrixActivityNodeId ?? matrixProp

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Step · equipe e apontamentos
        </p>
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
            sa.apontamentos.statusLeitura === 'excedido'
              ? 'border-rose-400/40 bg-rose-500/12 text-rose-100 ring-rose-500/25'
              : sa.apontamentos.statusLeitura === 'atencao'
                ? 'border-amber-400/40 bg-amber-500/12 text-amber-50 ring-amber-500/22'
                : 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100 ring-emerald-500/18'
          }`}
        >
          {labelStatusLeituraApontamento(sa.apontamentos.statusLeitura)}
        </span>
      </div>

      {sa.cargaParcial ? (
        <p className="mt-2 text-[10px] leading-relaxed text-amber-400/90">
          Alguns dados de execução não puderam ser carregados. A leitura pode estar
          incompleta.
        </p>
      ) : null}

      {showGestorLink ? (
        <div className="mt-2">
          <Link
            to={`/app/gestao/apontamento/${encodeURIComponent(sa.stepNodeId)}?conveyorId=${encodeURIComponent(sa.conveyorId)}&from=esteira`}
            className="text-[11px] font-semibold text-sgp-gold/95 underline-offset-2 hover:text-sgp-gold hover:underline"
          >
            Apontamento gerencial neste passo
          </Link>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
        {sa.equipe.principal ? (
          <span>
            <span className="font-semibold text-slate-500">Principal: </span>
            <span className="text-slate-200">
              {sa.equipe.principal.nomeExibicao}
            </span>
            {sa.equipe.principal.codigo ? (
              <span className="ml-1 text-slate-500">
                {sa.equipe.principal.codigo}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-slate-500">Principal: não alocado</span>
        )}
        {sa.equipe.apoios.length > 0 && (
          <span>
            <span className="font-semibold text-slate-500">Apoios: </span>
            {sa.equipe.apoios.map((p) => p.nomeExibicao).join(' · ')}
          </span>
        )}
      </div>

      <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-white/[0.05]">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Planejado
          </p>
          <p className="mt-0.5 tabular-nums text-slate-100">
            {formatMinutosHumanos(sa.apontamentos.planejadoMin)}
          </p>
        </div>
        <div className="rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-white/[0.05]">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Apontado
          </p>
          <p className="mt-0.5 tabular-nums text-slate-100">
            {formatMinutosHumanos(sa.apontamentos.totalMinutosApontados)}
            {sa.apontamentos.fonteTotalMinutos === 'linha_realizada' ? (
              <span className="ml-1 text-[9px] font-medium text-slate-500">
                (linha)
              </span>
            ) : null}
          </p>
        </div>
        <div className="rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-white/[0.05]">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Saldo
          </p>
          <p
            className={`mt-0.5 tabular-nums ${
              sa.apontamentos.saldoMinutos > 0
                ? 'text-amber-200/95'
                : 'text-slate-200'
            }`}
          >
            {sa.apontamentos.saldoMinutos >= 0 ? '+' : ''}
            {formatMinutosHumanos(sa.apontamentos.saldoMinutos)}
          </p>
        </div>
        <div className="rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-white/[0.05]">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Lançamentos
          </p>
          <p className="mt-0.5 tabular-nums text-slate-100">
            {sa.apontamentos.quantidadeLancamentos}
            {sa.apontamentos.ultimoApontamentoAt ? (
              <span className="ml-1 block text-[9px] font-normal text-slate-500">
                Último:{' '}
                {new Date(sa.apontamentos.ultimoApontamentoAt).toLocaleString(
                  'pt-BR',
                  {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  },
                )}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {matrixId ? (
        <p className="mt-2 font-mono text-[9px] text-slate-600">
          matriz · step{' '}
          <span className="text-slate-500">{matrixId}</span>
        </p>
      ) : null}

      {sa.historicoPreview.length > 0 && (
        <details className="group mt-3 border-t border-white/[0.06] pt-3">
          <summary className="cursor-pointer list-none text-[10px] font-bold uppercase tracking-wider text-sgp-gold/90 transition hover:text-sgp-gold">
            <span className="inline-flex items-center gap-2">
              <span
                className="text-slate-500 transition group-open:rotate-90"
                aria-hidden
              >
                ›
              </span>
              Apontamentos recentes ({sa.historicoPreview.length})
            </span>
          </summary>
          <ul className="mt-2 space-y-1.5 text-[11px] text-slate-400">
            {sa.historicoPreview.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-black/20 px-2 py-1.5"
              >
                <span className="text-slate-300">{h.colaboradorNome}</span>
                <span className="tabular-nums text-slate-500">
                  {formatMinutosHumanos(h.minutos)} ·{' '}
                  {new Date(h.createdAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
