import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../lib/api/apiErrors'
import type { ProductionWorkQueueFilter, ProductionWorkQueueItem, ProductionWorkQueueResponse } from '../../domain/production/production.types'
import {
  filterProductionWorkQueue,
  formatProductionDate,
  formatProductionMinutes,
  productionTrackTimeDisabledTitle,
  resolveProductionOperationalStatusDisplay,
} from '../../domain/production/production.helpers'
import { getProductionWorkQueue, PRODUCTION_WORK_QUEUE_ERROR_MESSAGE } from '../../services/production/productionApiService'
import { ProductionTimeEntryDialog } from './ProductionTimeEntryDialog'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: ProductionWorkQueueResponse }

const FILTER_LABELS: Record<ProductionWorkQueueFilter, string> = {
  all: 'Todas',
  pending: 'Pendentes',
  completed: 'Concluídas',
}

const FILTERS: ProductionWorkQueueFilter[] = ['all', 'pending', 'completed']

export function ProductionWorkQueuePage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [filter, setFilter] = useState<ProductionWorkQueueFilter>('all')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<ProductionWorkQueueItem | null>(null)

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const data = await getProductionWorkQueue()
      setState({ status: 'ok', data })
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : PRODUCTION_WORK_QUEUE_ERROR_MESSAGE
      setState({ status: 'error', message: msg })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleTimeEntrySuccess = useCallback(() => {
    setActiveItem(null)
    setSuccessMessage('Apontamento registrado.')
    void load()
    setTimeout(() => setSuccessMessage(null), 4000)
  }, [load])

  const visibleItems =
    state.status === 'ok'
      ? filterProductionWorkQueue(state.data.items, filter)
      : []

  return (
    <>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Minhas atividades
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Atividades planejadas para seu trabalho na produção.
          </p>
        </div>

        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400"
          >
            {successMessage}
          </div>
        )}

        {state.status === 'loading' && (
          <div className="flex flex-1 items-center justify-center py-20 text-sm text-slate-400">
            Carregando suas atividades…
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
            <p className="text-base text-red-400">{state.message}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="sgp-cta-secondary min-h-12 px-6 text-base"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {state.status === 'ok' && (
          <>
            <FilterChips value={filter} onChange={setFilter} />

            {visibleItems.length === 0 ? (
              <EmptyState filter={filter} planStatus={state.data.planStatus} />
            ) : (
              <ul className="flex flex-col gap-4">
                {visibleItems.map((item) => (
                  <li key={item.workPlanItemId}>
                    <WorkQueueCard
                      item={item}
                      onTrackTime={() => setActiveItem(item)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {activeItem && (
        <ProductionTimeEntryDialog
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onSuccess={handleTimeEntrySuccess}
        />
      )}
    </>
  )
}

function FilterChips({
  value,
  onChange,
}: {
  value: ProductionWorkQueueFilter
  onChange: (f: ProductionWorkQueueFilter) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar atividades">
      {FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          aria-pressed={value === f}
          className={[
            'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
            value === f
              ? 'border-sgp-gold bg-sgp-gold/10 text-sgp-gold'
              : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white',
          ].join(' ')}
        >
          {FILTER_LABELS[f]}
        </button>
      ))}
    </div>
  )
}

function EmptyState({
  filter,
  planStatus,
}: {
  filter: ProductionWorkQueueFilter
  planStatus: 'PUBLISHED' | null
}) {
  if (filter !== 'all') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="text-base text-slate-400">Nenhuma atividade para este filtro.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-base text-slate-300">
        Nenhuma atividade planejada para você no momento.
      </p>
      {planStatus !== 'PUBLISHED' && (
        <p className="text-sm text-slate-500">
          Confirme com o gestor se o planejamento da fábrica já foi publicado.
        </p>
      )}
    </div>
  )
}

function WorkQueueCard({
  item,
  onTrackTime,
}: {
  item: ProductionWorkQueueItem
  onTrackTime: () => void
}) {
  const statusDisplay = resolveProductionOperationalStatusDisplay(item)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-sgp-night/60 px-5 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-snug text-white">
            {item.activityTitle}
          </p>
          <p className="mt-0.5 truncate text-sm text-slate-400">
            {item.conveyorTitle}
          </p>
        </div>
        <span className={['shrink-0 text-sm font-medium', statusDisplay.colorClass].join(' ')}>
          {statusDisplay.label}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {item.taskTitle && (
          <CardField label="Tarefa" value={item.taskTitle} />
        )}
        {item.sectorTitle && (
          <CardField label="Setor" value={item.sectorTitle} />
        )}
        <CardField label="Data planejada" value={formatProductionDate(item.plannedDate)} />
        <CardField
          label="Planejado"
          value={formatProductionMinutes(item.plannedMinutes)}
        />
        <CardField
          label="Apontado"
          value={item.realizedMinutes > 0 ? formatProductionMinutes(item.realizedMinutes) : '—'}
        />
        <CardField
          label="Pendente"
          value={item.pendingMinutes > 0 ? formatProductionMinutes(item.pendingMinutes) : '—'}
        />
        {item.isOutOfSequence && item.requiresOutOfSequenceJustification && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs text-amber-400">
              Esta atividade está fora da sequência planejada.
              {item.previousOpenCount > 0
                ? ` (${item.previousOpenCount} anterior${item.previousOpenCount > 1 ? 'es' : ''} pendente${item.previousOpenCount > 1 ? 's' : ''})`
                : ''}{' '}
              Apontamento permitido com justificativa.
            </p>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap gap-3 pt-1">
        {item.canTrackTime ? (
          <button
            type="button"
            onClick={onTrackTime}
            className="min-h-12 rounded-xl bg-sgp-gold px-5 text-sm font-semibold text-sgp-void hover:bg-sgp-gold/90 active:scale-95 transition-transform"
          >
            Apontar horas
          </button>
        ) : (
          <button
            type="button"
            disabled
            title={productionTrackTimeDisabledTitle(item)}
            className="min-h-11 cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-500 opacity-50"
          >
            Apontar horas
          </button>
        )}
        <button
          type="button"
          disabled
          title="Disponível na próxima etapa"
          className="min-h-11 cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-500 opacity-50"
        >
          Concluir etapa
        </button>
      </div>
    </div>
  )
}

function CardField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-200">{value}</dd>
    </div>
  )
}
