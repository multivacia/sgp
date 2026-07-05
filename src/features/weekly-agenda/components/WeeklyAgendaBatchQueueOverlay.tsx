import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { OperationalPlanningBacklogItem } from '../../../domain/operational-planning/operational-planning.types'
import { formatHumanMinutes } from '../../../lib/formatters'
import {
  type CapacityRow,
  batchQueueProgress,
  buildCollaboratorFreeMinutesList,
  findBestBatchQueueSuggestion,
  formatWeeklyFreeMinutesLabel,
  skipBatchQueueItem,
} from '../weeklyAgendaBatchQueue'

type WeeklyAgendaBatchQueueOverlayProps = {
  open: boolean
  items: readonly OperationalPlanningBacklogItem[]
  collaborators: readonly Collaborator[]
  weekdayDates: readonly string[]
  weekdayLabels: readonly string[]
  capacityRows: readonly CapacityRow[]
  draftItems: readonly import('../weeklyAgendaDraft').DraftPlanItem[]
  defaultPlannedDate: string
  onClose: () => void
  onAssign: (input: {
    activityNodeId: string
    collaboratorId: string
    plannedDate: string
  }) => void
  onComplete: () => void
}

export function WeeklyAgendaBatchQueueOverlay(props: WeeklyAgendaBatchQueueOverlayProps) {
  const {
    open,
    items,
    collaborators,
    weekdayDates,
    weekdayLabels,
    capacityRows,
    draftItems,
    defaultPlannedDate,
    onClose,
    onAssign,
    onComplete,
  } = props

  const [queueIds, setQueueIds] = useState<string[]>([])
  const [completedCount, setCompletedCount] = useState(0)
  const [altOpen, setAltOpen] = useState(false)
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null)
  const [selectedPlannedDate, setSelectedPlannedDate] = useState<string>('')

  useEffect(() => {
    setQueueIds(items.map((i) => i.activityNodeId))
    setCompletedCount(0)
    setAltOpen(false)
    setSelectedCollaboratorId(null)
    setSelectedPlannedDate(defaultPlannedDate || weekdayDates[0] || '')
  }, [items, defaultPlannedDate, weekdayDates])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const itemsById = useMemo(
    () => new Map(items.map((i) => [i.activityNodeId, i])),
    [items],
  )

  const currentActivityId = queueIds[0] ?? null
  const currentItem = currentActivityId ? itemsById.get(currentActivityId) : undefined

  const suggestion = useMemo(
    () =>
      findBestBatchQueueSuggestion({
        collaborators,
        weekdayDates,
        draftItems,
        capacityRows,
        defaultPlannedDate: selectedPlannedDate || defaultPlannedDate,
      }),
    [
      collaborators,
      weekdayDates,
      draftItems,
      capacityRows,
      selectedPlannedDate,
      defaultPlannedDate,
    ],
  )

  const rankedCollaborators = useMemo(
    () =>
      buildCollaboratorFreeMinutesList({
        collaborators,
        weekdayDates,
        draftItems,
        capacityRows,
      }),
    [collaborators, weekdayDates, draftItems, capacityRows],
  )

  const maxWeeklyFree = useMemo(
    () => Math.max(1, ...rankedCollaborators.map((r) => r.weeklyFreeMinutes)),
    [rankedCollaborators],
  )

  const activeCollaboratorId = selectedCollaboratorId ?? suggestion?.collaboratorId ?? null
  const activePlannedDate =
    selectedPlannedDate || suggestion?.plannedDate || weekdayDates[0] || ''

  const dayLabel = (iso: string) => {
    const idx = weekdayDates.indexOf(iso)
    return idx >= 0 ? (weekdayLabels[idx] ?? iso) : iso
  }

  const confirmAssign = useCallback(
    (collaboratorId: string, plannedDate: string) => {
      if (!currentActivityId) return
      onAssign({ activityNodeId: currentActivityId, collaboratorId, plannedDate })
      const remaining = queueIds.slice(1)
      const nextCompleted = completedCount + 1
      setCompletedCount(nextCompleted)
      setAltOpen(false)
      setSelectedCollaboratorId(null)
      setSelectedPlannedDate(defaultPlannedDate || weekdayDates[0] || '')
      if (remaining.length === 0) {
        onComplete()
      } else {
        setQueueIds(remaining)
      }
    },
    [
      currentActivityId,
      onAssign,
      queueIds,
      completedCount,
      defaultPlannedDate,
      weekdayDates,
      onComplete,
    ],
  )

  const handleSkip = useCallback(() => {
    if (!currentActivityId) return
    setQueueIds((prev) => skipBatchQueueItem(prev, 0))
    setAltOpen(false)
    setSelectedCollaboratorId(null)
    setSelectedPlannedDate(defaultPlannedDate || weekdayDates[0] || '')
  }, [currentActivityId, defaultPlannedDate, weekdayDates])

  if (!open) return null

  const totalCount = completedCount + queueIds.length
  const progress = batchQueueProgress({ completedCount, totalCount })

  return createPortal(
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-sgp-navy-void"
      data-testid="weekly-agenda-batch-queue-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-agenda-batch-queue-title"
    >
      <div className="mx-auto max-w-[520px] px-[18px] pb-16 pt-7">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="weekly-agenda-batch-queue-title"
            className="text-[15px] font-semibold text-slate-50"
          >
            Alocação em lote
          </h2>
          <button
            type="button"
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-slate-300 hover:bg-white/[0.08]"
            data-testid="weekly-agenda-batch-queue-exit"
            onClick={onClose}
          >
            Voltar à agenda
          </button>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[12px] text-slate-400">
            <span data-testid="weekly-agenda-batch-queue-progress-label">{progress.label}</span>
            <span data-testid="weekly-agenda-batch-queue-progress-pct">{progress.percent}% concluído</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-700 to-sgp-gold transition-[width] duration-300"
              style={{ width: `${progress.percent}%` }}
              data-testid="weekly-agenda-batch-queue-progress-fill"
            />
          </div>
        </div>

        {currentItem ? (
          <article className="mt-6 rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-5 py-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
              Próximo item do backlog
            </p>
            <h3
              className="mt-2 text-[20px] font-semibold leading-snug text-slate-50"
              data-testid="weekly-agenda-batch-queue-item-title"
            >
              {currentItem.activityTitle}
            </h3>
            <p className="mt-1.5 text-[14px] text-slate-400">{currentItem.conveyorTitle}</p>
            <div className="mt-3.5 inline-flex flex-wrap justify-center gap-2">
              <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-[11.5px] text-slate-300">
                {currentItem.sectorTitle}
              </span>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-[11.5px] text-slate-300">
                {formatHumanMinutes(
                  currentItem.pendingMinutes ?? currentItem.plannedMinutes ?? 0,
                )}{' '}
                previstos
              </span>
            </div>

            {suggestion ? (
              <div className="mt-5 rounded-2xl border border-sky-400/35 bg-sky-500/10 p-4 text-left">
                <p className="text-[11px] uppercase tracking-[0.06em] text-sky-300">Sugestão</p>
                <p
                  className="mt-1.5 text-[16px] font-semibold text-slate-50"
                  data-testid="weekly-agenda-batch-queue-suggestion-name"
                >
                  {suggestion.collaboratorName}
                </p>
                <p className="mt-0.5 text-[12.5px] text-slate-400">
                  Tem {formatWeeklyFreeMinutesLabel(suggestion.weeklyFreeMinutes)} essa semana — a
                  maior folga da equipe.
                </p>
                <button
                  type="button"
                  className="mt-3.5 w-full rounded-xl border border-sgp-gold/35 bg-sgp-gold/15 px-3 py-3 text-[14px] font-semibold text-slate-50 hover:bg-sgp-gold/25"
                  data-testid="weekly-agenda-batch-queue-confirm-suggestion"
                  onClick={() =>
                    confirmAssign(suggestion.collaboratorId, suggestion.plannedDate)
                  }
                >
                  Atribuir a {suggestion.collaboratorName.split(' ')[0]} ·{' '}
                  {dayLabel(suggestion.plannedDate)}
                </button>
              </div>
            ) : null}

            <button
              type="button"
              className="mt-3 w-full rounded-xl border border-dashed border-white/[0.12] bg-transparent px-3 py-2.5 text-[12.5px] text-slate-400 hover:bg-white/[0.04] hover:text-slate-300"
              data-testid="weekly-agenda-batch-queue-alt-toggle"
              onClick={() => setAltOpen((v) => !v)}
            >
              {altOpen ? 'Ocultar opções' : 'Escolher outra pessoa ou dia'}
            </button>

            {altOpen ? (
              <div
                className="mt-3.5 text-left"
                data-testid="weekly-agenda-batch-queue-alt-panel"
              >
                <p className="text-[11px] uppercase tracking-[0.06em] text-slate-500">Pessoa</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {rankedCollaborators.map((row) => (
                    <button
                      key={row.collaboratorId}
                      type="button"
                      className={[
                        'rounded-xl border px-2.5 py-2.5 text-left transition-colors',
                        activeCollaboratorId === row.collaboratorId
                          ? 'border-sgp-gold/35 bg-sgp-gold/[0.06]'
                          : 'border-white/[0.08] bg-white/[0.06] hover:bg-white/[0.09]',
                      ].join(' ')}
                      data-testid={`weekly-agenda-batch-queue-person-${row.collaboratorId}`}
                      onClick={() => setSelectedCollaboratorId(row.collaboratorId)}
                    >
                      <p className="text-[13px] font-semibold text-slate-200">
                        {row.collaboratorName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatWeeklyFreeMinutesLabel(row.weeklyFreeMinutes)}
                      </p>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sgp-blue to-sky-300"
                          style={{
                            width: `${Math.round((row.weeklyFreeMinutes / maxWeeklyFree) * 100)}%`,
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>

                <p className="mt-3.5 text-[11px] uppercase tracking-[0.06em] text-slate-500">Dia</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {weekdayDates.map((iso, idx) => (
                    <button
                      key={iso}
                      type="button"
                      className={[
                        'min-w-[56px] flex-1 rounded-[10px] border px-1 py-2 text-center text-[12px]',
                        activePlannedDate === iso
                          ? 'border-sgp-gold/35 bg-sgp-gold/[0.06] text-slate-100'
                          : 'border-white/[0.08] bg-white/[0.06] text-slate-300 hover:bg-white/[0.09]',
                      ].join(' ')}
                      data-testid={`weekly-agenda-batch-queue-day-${iso}`}
                      onClick={() => setSelectedPlannedDate(iso)}
                    >
                      {weekdayLabels[idx] ?? iso}
                      <span className="mt-0.5 block text-[9.5px] text-slate-500">{iso}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="mt-4 w-full rounded-xl border border-sgp-gold/35 bg-sgp-gold/15 px-3 py-3 text-[13.5px] font-semibold text-slate-50 hover:bg-sgp-gold/25 disabled:opacity-40"
                  data-testid="weekly-agenda-batch-queue-confirm-alt"
                  disabled={!activeCollaboratorId || !activePlannedDate}
                  onClick={() => {
                    if (!activeCollaboratorId || !activePlannedDate) return
                    confirmAssign(activeCollaboratorId, activePlannedDate)
                  }}
                >
                  Confirmar alocação
                </button>
              </div>
            ) : null}

            <div className="mt-3.5">
              <button
                type="button"
                className="w-full rounded-xl border border-white/[0.08] bg-transparent px-3 py-2.5 text-[12.5px] text-slate-400 hover:bg-white/[0.04] hover:text-slate-300"
                data-testid="weekly-agenda-batch-queue-skip"
                onClick={handleSkip}
              >
                Deixar para depois
              </button>
            </div>

            <p className="mt-4 text-[11.5px] text-slate-600">
              {Math.max(0, queueIds.length - 1)} restantes na fila após este
            </p>
          </article>
        ) : (
          <p className="mt-10 text-center text-[13px] text-slate-500" role="status">
            Fila concluída.
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
