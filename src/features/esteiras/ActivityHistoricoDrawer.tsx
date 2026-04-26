import { useEffect } from 'react'
import {
  categoriaLabel,
  eventoTipoLabel,
  formatMinutosEvento,
  getHistoricoAtividadeMock,
  modoLabel,
  type HistoricoCategoria,
  type HistoricoEvento,
} from '../../mocks/atividade-historico'
import { formatHistoricoDataHora } from '../../lib/formatters'
import type { AtividadeStatusDetalhe } from '../../mocks/esteira-detalhe'

export type HistoricoDrawerContext = {
  activityId: string
  activityNome: string
  tarefaNome: string
  esteiraNome: string
  responsavel: string
  setor: string
  statusAtual: AtividadeStatusDetalhe
}

type Props = {
  open: boolean
  onClose: () => void
  context: HistoricoDrawerContext
}

function statusAtividadeLabel(s: AtividadeStatusDetalhe) {
  const map: Record<AtividadeStatusDetalhe, string> = {
    pendente: 'Pendente',
    pronta: 'Pronta',
    em_execucao: 'Em execução',
    pausada: 'Pausada',
    concluida: 'Concluída',
    bloqueada: 'Bloqueada',
  }
  return map[s]
}

function statusBadgeClass(s: AtividadeStatusDetalhe) {
  const styles: Record<AtividadeStatusDetalhe, string> = {
    pendente:
      'border-white/15 bg-white/[0.06] text-slate-300 ring-1 ring-white/[0.06]',
    pronta:
      'border-emerald-400/35 bg-emerald-500/12 text-emerald-100 ring-1 ring-emerald-500/18',
    em_execucao:
      'border-sky-400/40 bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/20',
    pausada:
      'border-violet-400/40 bg-violet-500/14 text-violet-100 ring-1 ring-violet-500/20',
    concluida:
      'border-emerald-400/40 bg-emerald-500/14 text-emerald-100 ring-1 ring-emerald-500/18',
    bloqueada:
      'border-amber-400/45 bg-amber-500/16 text-amber-50 ring-1 ring-amber-500/20',
  }
  return styles[s]
}

function categoriaAccent(c: HistoricoCategoria) {
  if (c === 'operacional') return 'border-l-sky-400/70'
  if (c === 'gestao') return 'border-l-violet-400/65'
  return 'border-l-slate-500/50'
}

export function ActivityHistoricoDrawer({ open, onClose, context }: Props) {
  const eventos = getHistoricoAtividadeMock(context.activityId)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[3px] transition-opacity"
        aria-label="Fechar histórico"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-xl flex-col border-l border-white/[0.09] bg-gradient-to-b from-sgp-navy/98 via-sgp-app-panel to-sgp-navy-deep shadow-[0_0_60px_-12px_rgba(0,0,0,0.85)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hist-titulo-principal"
      >
        {/* Cabeçalho — contexto explícito da atividade */}
        <div className="shrink-0 border-b border-white/[0.07] bg-gradient-to-br from-sgp-navy-deep/95 to-black/20 px-5 py-5 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p
                id="hist-titulo-principal"
                className="text-[10px] font-bold uppercase tracking-[0.22em] text-sgp-gold"
              >
                Histórico desta atividade
              </p>
              <h2 className="mt-2 font-heading text-xl font-bold leading-snug tracking-tight text-white md:text-2xl">
                {context.activityNome}
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                <span className="text-slate-600">Tarefa · </span>
                <span className="font-medium text-slate-300">
                  {context.tarefaNome}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                <span className="text-slate-600">Esteira · </span>
                <span className="font-medium text-slate-300">
                  {context.esteiraNome}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
            >
              Fechar
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Responsável agora
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-100">
                {context.responsavel}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Setor / contexto
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-200">
                {context.setor}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Status atual
              </p>
              <p className="mt-2">
                <span
                  className={`inline-flex rounded-md px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeClass(context.statusAtual)}`}
                >
                  {statusAtividadeLabel(context.statusAtual)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Legenda leve — modos oficiais */}
        <div className="shrink-0 border-b border-white/[0.05] px-5 py-3 md:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            Modos de apontamento (oficiais)
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-lg border border-sky-400/35 bg-sky-500/12 px-2.5 py-1 text-[11px] font-semibold text-sky-100">
              Execução guiada
            </span>
            <span className="inline-flex items-center rounded-lg border border-amber-400/35 bg-amber-500/12 px-2.5 py-1 text-[11px] font-semibold text-amber-50">
              Lançamento manual
            </span>
            <span className="text-[11px] text-slate-600">
              Ambos têm o mesmo peso no histórico.
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Linha do tempo · mais recentes primeiro
          </p>

          {eventos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-14 text-center">
              <div
                className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-lg text-slate-500"
                aria-hidden
              >
                ◌
              </div>
              <p className="font-heading text-base font-semibold text-slate-300">
                Ainda não há registros para esta atividade.
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                O primeiro apontamento, observação ou ação de gestão aparecerá
                aqui — leve, legível, sem parecer log técnico.
              </p>
            </div>
          ) : (
            <ol className="relative space-y-0 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-gradient-to-b before:from-sgp-gold/40 before:via-white/10 before:to-transparent md:before:left-[17px]">
              {eventos.map((ev, i) => (
                <HistoricoTimelineItem
                  key={ev.id}
                  ev={ev}
                  isLast={i === eventos.length - 1}
                />
              ))}
            </ol>
          )}
        </div>

        <div className="shrink-0 border-t border-white/[0.06] bg-black/25 px-5 py-3 md:px-6">
          <p className="text-center text-[11px] text-slate-600">
            Você continua no detalhe da esteira — feche para retomar a leitura.
          </p>
        </div>
      </aside>
    </div>
  )
}

function HistoricoTimelineItem({
  ev,
  isLast,
}: {
  ev: HistoricoEvento
  isLast: boolean
}) {
  const modoText = modoLabel(ev.modo)
  const cat = categoriaLabel(ev.categoria)

  return (
    <li
      className={`relative pb-8 pl-10 md:pl-12 ${isLast ? 'pb-2' : ''}`}
    >
      <span
        className="absolute left-0 top-1.5 flex size-8 items-center justify-center md:left-0.5"
        aria-hidden
      >
        <span
          className={`size-2.5 rounded-full ring-2 ring-sgp-navy-deep ${
            ev.categoria === 'gestao'
              ? 'bg-violet-400/90'
              : ev.categoria === 'sistema'
                ? 'bg-slate-400/90'
                : 'bg-sky-400/90'
          }`}
        />
      </span>

      <article
        className={`rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 shadow-sm transition hover:border-white/[0.12] hover:bg-white/[0.045] ${categoriaAccent(ev.categoria)} border-l-[3px]`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {eventoTipoLabel(ev.tipo)}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              ev.categoria === 'gestao'
                ? 'border border-violet-500/30 bg-violet-500/10 text-violet-100'
                : ev.categoria === 'sistema'
                  ? 'border border-slate-500/25 bg-slate-500/10 text-slate-300'
                  : 'border border-sky-500/25 bg-sky-500/10 text-sky-100'
            }`}
          >
            {cat}
          </span>
          <time
            className="ml-auto text-[11px] font-medium tabular-nums text-slate-500"
            dateTime={ev.at}
          >
            {formatHistoricoDataHora(ev.at)}
          </time>
        </div>

        <p className="mt-2 text-sm font-semibold leading-snug text-slate-100">
          {ev.label}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          <span className="text-slate-600">Quem · </span>
          <span className="font-medium text-slate-400">{ev.usuario}</span>
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {modoText && (
            <span
              className={`inline-flex rounded-lg border px-2 py-1 text-[10px] font-bold ${
                ev.modo === 'guiado'
                  ? 'border-sky-400/35 bg-sky-500/12 text-sky-100'
                  : 'border-amber-400/40 bg-amber-500/12 text-amber-50'
              }`}
            >
              {modoText}
            </span>
          )}
          {ev.minutosLancados != null && (
            <span className="inline-flex rounded-lg border border-sgp-gold/30 bg-sgp-gold/10 px-2 py-1 text-[10px] font-bold text-sgp-gold-warm">
              Tempo · {formatMinutosEvento(ev.minutosLancados)}
            </span>
          )}
          {ev.impactoStatus && (
            <span className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-slate-400">
              Efeito · {ev.impactoStatus}
            </span>
          )}
        </div>

        {ev.observacao && (
          <p className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
            {ev.observacao}
          </p>
        )}
      </article>
    </li>
  )
}
