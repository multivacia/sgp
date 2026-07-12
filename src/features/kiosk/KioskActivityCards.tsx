import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ProductionCollaboratorSummary,
  ProductionWorkQueueItem,
} from '../../domain/production/production.types'
import {
  findInitialKioskCarouselIndex,
  partitionKioskWorkQueue,
} from '../../domain/production/kioskWorkQueueUi'
import { resolveSequenceListBadge } from '../../domain/production/production.helpers'
import { getProductionWorkQueue } from '../../services/production/productionApiService'
import { ProductionCollaboratorAvatar } from '../production/ProductionCollaboratorAvatar'
import { KioskActivityCard } from './KioskActivityCard'

type Props = {
  collaborator: ProductionCollaboratorSummary
  initialItems: ProductionWorkQueueItem[]
  onExit: () => void
  initialViewMode?: ViewMode
}

type ViewMode = 'carousel' | 'list'

export function KioskActivityCards({
  collaborator,
  initialItems,
  onExit,
  initialViewMode = 'carousel',
}: Props) {
  const [items, setItems] = useState(initialItems)
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [currentIndex, setCurrentIndex] = useState(() =>
    findInitialKioskCarouselIndex(initialItems),
  )
  const [search, setSearch] = useState('')
  const touchStartX = useRef(0)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return items
    return items.filter(
      (i) =>
        i.activityTitle.toLowerCase().includes(q) ||
        (i.sectorTitle?.toLowerCase().includes(q) ?? false) ||
        (i.taskTitle?.toLowerCase().includes(q) ?? false),
    )
  }, [items, search])

  const listSections = useMemo(() => partitionKioskWorkQueue(filtered), [filtered])

  // Ao filtrar ou recarregar, reposiciona no item recomendado visível
  useEffect(() => {
    setCurrentIndex(findInitialKioskCarouselIndex(filtered))
  }, [search, filtered])

  const safeIndex = Math.min(currentIndex, Math.max(0, filtered.length - 1))
  const activeItem = filtered[safeIndex] ?? null

  const prev = useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), [])
  const next = useCallback(
    () => setCurrentIndex((i) => Math.min(filtered.length - 1, i + 1)),
    [filtered.length],
  )

  const handleCardSuccess = useCallback(async () => {
    try {
      const queue = await getProductionWorkQueue()
      setItems(queue.items)
      setCurrentIndex(findInitialKioskCarouselIndex(queue.items))
    } catch {
      // mantém items existentes se a recarga falhar
    }
  }, [])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -50) next()
    else if (dx > 50) prev()
  }

  const DOTS_MAX = 10

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Barra de header */}
      <div className="shrink-0 border-b border-white/[0.07] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ProductionCollaboratorAvatar collaborator={collaborator} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {collaborator.fullName}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-sgp-gold">
                {filtered.length} atividade
                {filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Busca */}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar atividade…"
            autoComplete="off"
            className="w-36 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-sgp-gold/40 focus:outline-none focus:ring-1 focus:ring-sgp-gold/20 sm:w-48"
          />

          {/* Alternador de modo */}
          <div className="flex overflow-hidden rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('carousel')}
              title="Modo carrossel"
              aria-pressed={viewMode === 'carousel'}
              className={[
                'px-3 py-2 text-sm transition-colors',
                viewMode === 'carousel'
                  ? 'bg-sgp-gold/15 text-sgp-gold'
                  : 'bg-transparent text-slate-400 hover:text-white',
              ].join(' ')}
            >
              {/* ícone carrossel */}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <rect x={3} y={3} width={18} height={18} rx={2} strokeWidth={2} />
                <line x1={3} y1={9} x2={21} y2={9} strokeWidth={1.5} />
                <line x1={3} y1={15} x2={21} y2={15} strokeWidth={1.5} />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Modo lista"
              aria-pressed={viewMode === 'list'}
              className={[
                'border-l border-white/10 px-3 py-2 text-sm transition-colors',
                viewMode === 'list'
                  ? 'bg-sgp-gold/15 text-sgp-gold'
                  : 'bg-transparent text-slate-400 hover:text-white',
              ].join(' ')}
            >
              {/* ícone lista */}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <line x1={3} y1={6} x2={21} y2={6} strokeWidth={2} strokeLinecap="round" />
                <line x1={3} y1={12} x2={21} y2={12} strokeWidth={2} strokeLinecap="round" />
                <line x1={3} y1={18} x2={21} y2={18} strokeWidth={2} strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Sair */}
          <button
            type="button"
            onClick={onExit}
            className="sgp-cta-secondary min-h-10 px-4 text-sm"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {filtered.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center">
          <p className="text-slate-400">
            {search
              ? 'Nenhuma atividade encontrada para essa busca.'
              : 'Nenhuma atividade disponível no momento.'}
          </p>
        </div>
      ) : viewMode === 'carousel' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeItem ? (
            <div className="shrink-0 border-b border-white/[0.07] px-5 py-2">
              {(() => {
                const badge = resolveSequenceListBadge(activeItem)
                if (badge.kind === 'none') {
                  return (
                    <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Atividades
                    </p>
                  )
                }
                return (
                  <p
                    className={[
                      'text-center text-[10px] font-bold uppercase tracking-widest',
                      badge.kind === 'recommended' ? 'text-sgp-gold' : 'text-slate-300',
                    ].join(' ')}
                  >
                    {badge.label}
                  </p>
                )
              })()}
            </div>
          ) : null}
          {/* Área do carrossel */}
          <div
            className="min-h-0 flex-1 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${safeIndex * 100}%)` }}
            >
              {filtered.map((item) => (
                <div
                  key={item.workPlanItemId}
                  className="h-full min-w-full overflow-y-auto"
                >
                  <KioskActivityCard
                    item={item}
                    onSuccess={() => void handleCardSuccess()}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Navegação e dots */}
          <div
            data-sgp-kiosk-carousel-nav=""
            className="flex shrink-0 items-center justify-center gap-4 border-t border-white/[0.07] px-5 py-3"
          >
            <button
              type="button"
              onClick={prev}
              disabled={safeIndex === 0}
              aria-label="Atividade anterior"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
            >
              ←
            </button>

            <div
              className="flex items-center gap-1.5"
              aria-label={`${safeIndex + 1} de ${filtered.length}`}
            >
              {filtered.length <= DOTS_MAX ? (
                filtered.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentIndex(i)}
                    aria-label={`Ir para atividade ${i + 1}`}
                    className={[
                      'rounded-full transition-all',
                      i === safeIndex
                        ? 'h-2.5 w-6 bg-sgp-gold'
                        : 'h-2.5 w-2.5 bg-white/20 hover:bg-white/40',
                    ].join(' ')}
                  />
                ))
              ) : (
                <span className="text-sm tabular-nums text-slate-400">
                  {safeIndex + 1} / {filtered.length}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={next}
              disabled={safeIndex === filtered.length - 1}
              aria-label="Próxima atividade"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
            >
              →
            </button>
          </div>
        </div>
      ) : (
        /* Modo lista */
        <div
          data-sgp-kiosk-list-scroll=""
          className="min-h-0 flex-1 overflow-y-auto p-5"
        >
          <div className="flex flex-col gap-6">
            {listSections.map((section) => (
              <section key={section.id} className="flex flex-col gap-3">
                <h2
                  className={[
                    'text-xs font-bold uppercase tracking-widest',
                    section.id === 'recommended'
                      ? 'text-sgp-gold'
                      : section.id === 'sequenceWarning'
                        ? 'text-slate-300'
                        : 'text-slate-500',
                  ].join(' ')}
                >
                  {section.title}
                </h2>
                <div className="flex flex-col gap-4">
                  {section.items.map((item) => (
                    <div
                      key={item.workPlanItemId}
                      className={[
                        'overflow-hidden rounded-2xl border bg-white/[0.03]',
                        item.isNextRecommended
                          ? 'border-sgp-gold/40 ring-1 ring-sgp-gold/20'
                          : item.hasPreviousPendingStep
                            ? 'border-slate-500/35'
                            : 'border-white/10',
                      ].join(' ')}
                    >
                      <KioskActivityCard
                        item={item}
                        onSuccess={() => void handleCardSuccess()}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
