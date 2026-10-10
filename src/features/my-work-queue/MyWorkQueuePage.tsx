import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import { formatHumanMinutes } from '../../lib/formatters'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import type {
  MyWorkQueueItem,
  MyWorkQueueResponse,
} from '../../domain/my-work-queue/my-work-queue.types'
import {
  formatAwaitingPreviousActivitiesLabel,
  resolveSequenceListBadge,
} from '../../domain/production/production.helpers'
import { getMyWorkQueue } from '../../services/my-work-queue/myWorkQueueApiService'
import { QuickTimeEntryDrawer } from '../shell/QuickTimeEntryDrawer'
import { workQueueApontamentoCandidate } from './myWorkQueueUi'
import {
  describePeriodRange,
  validatePeriodRange,
} from '../../domain/operational/periodFilter'

function todayIsoLocal(): string {
  const t = new Date()
  return [
    t.getFullYear(),
    String(t.getMonth() + 1).padStart(2, '0'),
    String(t.getDate()).padStart(2, '0'),
  ].join('-')
}

function shiftDateIso(date: string, deltaDays: number): string {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + deltaDays)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatDatePt(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  })
}

function badgeClass(kind: 'warning' | 'danger' | 'success' | 'neutral') {
  switch (kind) {
    case 'danger':
      return 'border-rose-400/25 bg-rose-500/10 text-rose-100 ring-1 ring-rose-500/15'
    case 'warning':
      return 'border-amber-400/25 bg-amber-500/10 text-amber-100 ring-1 ring-amber-500/15'
    case 'success':
      return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100 ring-1 ring-emerald-500/15'
    default:
      return 'border-white/12 bg-white/[0.05] text-slate-300 ring-1 ring-white/[0.06]'
  }
}

function KpiCard(props: { label: string; value: string; tone?: 'danger' | 'warning' }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 shadow-sm ring-1 ring-white/[0.04]">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {props.label}
      </p>
      <p
        className={[
          'mt-1 font-heading text-2xl font-bold tabular-nums',
          props.tone === 'danger'
            ? 'text-rose-100'
            : props.tone === 'warning'
              ? 'text-amber-100'
              : 'text-slate-50',
        ].join(' ')}
      >
        {props.value}
      </p>
    </div>
  )
}

function QueueCard(props: {
  item: MyWorkQueueItem
  onPointHours: (item: MyWorkQueueItem) => void
}) {
  const { item } = props
  const plannedMinutes = item.plannedMinutes == null ? '—' : formatHumanMinutes(item.plannedMinutes)
  const context = [item.clientName, item.vehicleDescription, item.licensePlate]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' · ')
  return (
    <li className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-sgp-app-panel/95 to-sgp-app-panel-deep/90 p-5 shadow-[var(--sgp-shadow-card-dark)] ring-1 ring-white/[0.04]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-xl border border-sgp-blue-bright/25 bg-sgp-blue-bright/10 font-heading text-sm font-bold text-sgp-blue-bright">
              {item.plannedOrder + 1}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeClass('neutral')}`}
              title="Planejado para você nesta atividade, somando todos os dias"
            >
              {plannedMinutes}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeClass('neutral')}`}
              data-testid="queue-card-realized"
            >
              Apontado: {formatHumanMinutes(item.realizedMinutes ?? 0)}
            </span>
            {item.isOverdue ? (
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeClass('danger')}`}>
                Atrasada
              </span>
            ) : null}
            {item.isActivityCompleted ? (
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeClass('success')}`}>
                Concluída
              </span>
            ) : null}
            {(() => {
              const seqBadge = resolveSequenceListBadge(item)
              if (seqBadge.kind === 'recommended') {
                return (
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeClass('neutral')}`}>
                    {seqBadge.label}
                  </span>
                )
              }
              if (seqBadge.kind === 'warning' && seqBadge.label) {
                return (
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeClass('neutral')}`}>
                    {seqBadge.label}
                  </span>
                )
              }
              return null
            })()}
            {item.requiresUnassignedJustification ? (
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeClass('warning')}`}>
                Fora da sua alocação
              </span>
            ) : null}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Atividade
            </p>
            <h2 className="mt-1 font-heading text-lg font-bold leading-snug text-slate-50">
              {item.activityTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              <span className="text-slate-500">Tarefa · </span>
              {item.taskTitle}
              <span className="text-slate-600"> / </span>
              <span className="text-slate-500">Setor · </span>
              {item.sectorTitle}
            </p>
          </div>

          <div className="grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
            <p>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Esteira
              </span>
              <span className="font-medium text-slate-200">{item.conveyorTitle}</span>
            </p>
            <p>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Data planejada
              </span>
              <span className="font-medium text-slate-200">{formatDatePt(item.plannedDate)}</span>
            </p>
          </div>

          {context ? <p className="text-xs text-slate-500">{context}</p> : null}

          {item.requiresUnassignedJustification ? (
            <p className="rounded-xl border border-amber-400/15 bg-amber-500/[0.06] px-3 py-2 text-xs leading-relaxed text-amber-100/90">
              Você foi planejado para esta Atividade, mas não está alocado nela. O apontamento exigirá justificativa.
            </p>
          ) : null}

          {item.hasPreviousPendingStep && !item.isNextRecommended ? (
            <p className="text-xs text-slate-400">
              {item.sequenceWarningLabel ??
                formatAwaitingPreviousActivitiesLabel(item.awaitingPreviousActivities) ??
                'Atenção à sequência'}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <button
            type="button"
            onClick={() => props.onPointHours(item)}
            disabled={item.isActivityCompleted}
            className="sgp-cta-primary !px-4 !py-2.5 text-center text-sm disabled:cursor-not-allowed disabled:opacity-45"
          >
            Apontar horas
          </button>
          <Link
            to={`/app/esteiras/${encodeURIComponent(item.conveyorId)}?activityNodeId=${encodeURIComponent(item.activityNodeId)}`}
            className="sgp-cta-secondary !px-4 !py-2.5 text-center text-sm"
          >
            Abrir Esteira
          </Link>
        </div>
      </div>
    </li>
  )
}

function QueueSection(props: {
  title: string
  items: MyWorkQueueItem[]
  onPointHours: (item: MyWorkQueueItem) => void
}) {
  if (props.items.length === 0) return null
  return (
    <section className="mt-8 max-w-5xl">
      <h2 className="font-heading text-xl font-bold text-slate-100">{props.title}</h2>
      <ul className="mt-4 space-y-4">
        {props.items.map((item) => (
          <QueueCard key={item.workPlanItemId} item={item} onPointHours={props.onPointHours} />
        ))}
      </ul>
    </section>
  )
}

export function MyWorkQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const { presentBlocking } = useSgpErrorSurface()
  const selectedDate = searchParams.get('date') || todayIsoLocal()
  /** Pesquisa por período (data planejada). `mode=periodo` mantém a seção aberta sem datas. */
  const periodFrom = searchParams.get('from')?.trim() || ''
  const periodTo = searchParams.get('to')?.trim() || ''
  const periodMode = searchParams.get('mode') === 'periodo' || Boolean(periodFrom || periodTo)
  const periodRange = useMemo(() => ({ from: periodFrom, to: periodTo }), [periodFrom, periodTo])
  const periodError = periodMode ? validatePeriodRange(periodRange) : null
  const periodQueryActive = periodMode && Boolean(periodFrom || periodTo) && !periodError
  const [queue, setQueue] = useState<MyWorkQueueResponse | null>(null)
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entryItem, setEntryItem] = useState<MyWorkQueueItem | null>(null)

  const load = useCallback(async () => {
    if (periodError) {
      setQueue(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await getMyWorkQueue(
        periodQueryActive
          ? { from: periodFrom || undefined, to: periodTo || undefined }
          : { date: selectedDate },
      )
      setQueue(result.data)
      setUnavailableReason(result.unavailableReason)
    } catch (e) {
      setQueue(null)
      setUnavailableReason(null)
      const n = reportClientError(e, {
        module: 'colaborador',
        action: 'my_work_queue_load',
        route: location.pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setError(n.userMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [
    location.pathname,
    presentBlocking,
    selectedDate,
    periodQueryActive,
    periodFrom,
    periodTo,
    periodError,
  ])

  useEffect(() => {
    void load()
  }, [load])

  const groups = useMemo(() => {
    const items = queue?.items ?? []
    return {
      overdue: items.filter((item) => item.group === 'overdue'),
      today: items.filter((item) => item.group === 'today'),
      completed: items.filter((item) => item.group === 'completed'),
    }
  }, [queue])

  function setDate(date: string) {
    setSearchParams({ date })
  }

  function patchPeriod(next: { from?: string; to?: string }) {
    const from = next.from ?? periodFrom
    const to = next.to ?? periodTo
    const sp = new URLSearchParams({ mode: 'periodo' })
    if (from) sp.set('from', from)
    if (to) sp.set('to', to)
    setSearchParams(sp, { replace: true })
  }

  const periodLabel = queue?.period
    ? describePeriodRange({ from: queue.period.from, to: queue.period.to })
    : ''
  const showingPeriod = periodQueryActive && Boolean(queue?.period)

  const emptyTitle = showingPeriod
    ? 'Não há atividades planejadas para você neste período.'
    : queue?.planStatus === 'PUBLISHED'
      ? 'Não há atividades planejadas para você neste dia.'
      : 'Você ainda não possui atividades planejadas para este dia.'

  return (
    <PageCanvas>
      <div data-sgp-surface="pointing">
        <header className="sgp-header-card max-w-5xl">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
            <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
            Colaborador
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="sgp-page-title">Minha fila</h1>
              <p className="sgp-page-lead mt-1">
                Atividades planejadas para hoje, em ordem de execução.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {queue?.planStatus === 'PUBLISHED'
                  ? 'Exibindo plano publicado.'
                  : 'A fila mostra apenas planos publicados.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="sgp-cta-secondary shrink-0 !py-2 text-sm disabled:opacity-40"
            >
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </header>

        <div className="mt-6 flex max-w-5xl flex-wrap items-center gap-2" role="group" aria-label="Modo de pesquisa">
          <button
            type="button"
            aria-pressed={!periodMode}
            className={[
              '!px-3 !py-1.5 text-sm',
              !periodMode ? 'sgp-cta-primary' : 'sgp-cta-secondary',
            ].join(' ')}
            onClick={() => setDate(selectedDate)}
          >
            Por dia
          </button>
          <button
            type="button"
            aria-pressed={periodMode}
            className={[
              '!px-3 !py-1.5 text-sm',
              periodMode ? 'sgp-cta-primary' : 'sgp-cta-secondary',
            ].join(' ')}
            onClick={() => patchPeriod({})}
          >
            Por período
          </button>
        </div>

        {periodMode ? (
          <div className="mt-3 max-w-5xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 ring-1 ring-white/[0.04]">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-400">
                De (data planejada)
                <input
                  type="date"
                  value={periodFrom}
                  max={periodTo || undefined}
                  onChange={(e) => patchPeriod({ from: e.target.value })}
                  className="sgp-input-app px-3 py-2 text-sm text-slate-200"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-400">
                Até (data planejada)
                <input
                  type="date"
                  value={periodTo}
                  min={periodFrom || undefined}
                  onChange={(e) => patchPeriod({ to: e.target.value })}
                  className="sgp-input-app px-3 py-2 text-sm text-slate-200"
                />
              </label>
              <button
                type="button"
                className="sgp-cta-secondary !px-3 !py-2 text-sm"
                onClick={() => setSearchParams({ mode: 'periodo' }, { replace: true })}
                disabled={!periodFrom && !periodTo}
              >
                Limpar datas
              </button>
            </div>
            {periodError ? (
              <p className="mt-2 text-xs font-medium text-rose-200" role="alert">
                {periodError}
              </p>
            ) : !periodFrom && !periodTo ? (
              <p className="mt-2 text-xs text-slate-500">
                Informe a data inicial, a final ou ambas (datas inclusivas). Sem datas, a fila
                abaixo mostra o dia selecionado.
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400" aria-live="polite">
                {showingPeriod
                  ? `Exibindo atividades com data planejada ${periodLabel}.`
                  : 'Carregando período…'}
                {!periodFrom || !periodTo ? ' Sem uma das datas, o período vai até 92 dias.' : ''}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3 flex max-w-5xl flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 ring-1 ring-white/[0.04]">
            <button
              type="button"
              className="sgp-cta-secondary !px-3 !py-2 text-sm"
              onClick={() => setDate(shiftDateIso(selectedDate, -1))}
            >
              Dia anterior
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setDate(e.target.value || todayIsoLocal())}
              className="sgp-input-app px-3 py-2 text-sm text-slate-200"
            />
            <button
              type="button"
              className="sgp-cta-secondary !px-3 !py-2 text-sm"
              onClick={() => setDate(shiftDateIso(selectedDate, 1))}
            >
              Próximo dia
            </button>
            <button
              type="button"
              className="sgp-cta-primary !px-3 !py-2 text-sm"
              onClick={() => setDate(todayIsoLocal())}
            >
              Hoje
            </button>
            <span className="ml-auto text-sm font-medium text-slate-400">
              {formatDatePt(selectedDate)}
            </span>
          </div>
        )}

        {queue ? (
          <div className="mt-6 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={showingPeriod ? 'Atividades no período' : 'Atividades de hoje'}
              value={String(queue.summary.plannedItemsToday)}
            />
            <KpiCard
              label={showingPeriod ? 'Minutos planejados (período)' : 'Minutos planejados'}
              value={formatHumanMinutes(queue.summary.plannedMinutesToday)}
            />
            <KpiCard label="Atenção à sequência" value={String(queue.summary.outOfSequenceItems)} tone={queue.summary.outOfSequenceItems > 0 ? 'warning' : undefined} />
            <KpiCard label="Atrasadas" value={String(queue.summary.overdueItems)} tone={queue.summary.overdueItems > 0 ? 'danger' : undefined} />
          </div>
        ) : null}

        {queue?.summary.overload ? (
          <div className="mt-4 max-w-5xl rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100/90">
            Planejamento acima da capacidade do dia: {formatHumanMinutes(queue.summary.plannedMinutesToday)} planejados para {formatHumanMinutes(queue.summary.capacityMinutesToday)} de capacidade.
          </div>
        ) : null}

        {unavailableReason ? (
          <div className="mt-4 max-w-5xl rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100/90">
            {unavailableReason}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 max-w-5xl rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-100/95" role="alert">
            {error}
          </div>
        ) : null}

        {loading ? <p className="mt-8 text-sm text-slate-500">Carregando Minha fila...</p> : null}

        {!loading && !error && queue && queue.items.length > 0 ? (
          <>
            <QueueSection title="Atrasadas" items={groups.overdue} onPointHours={setEntryItem} />
            <QueueSection
              title={showingPeriod ? 'No período (a partir de hoje)' : 'Hoje'}
              items={groups.today}
              onPointHours={setEntryItem}
            />
            <QueueSection title="Concluídas" items={groups.completed} onPointHours={setEntryItem} />
          </>
        ) : null}

        {!loading && !error && !periodError && queue && queue.items.length === 0 ? (
          <div className="mt-8 max-w-5xl rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-14 text-center">
            <p className="font-heading text-base font-semibold text-slate-300">
              {emptyTitle}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              Quando um plano semanal for publicado, suas atividades aparecerão aqui.
            </p>
          </div>
        ) : null}
      </div>

      <QuickTimeEntryDrawer
        open={entryItem != null}
        initialCandidate={entryItem ? workQueueApontamentoCandidate(entryItem) : null}
        onClose={() => {
          setEntryItem(null)
          void load()
        }}
      />
    </PageCanvas>
  )
}
