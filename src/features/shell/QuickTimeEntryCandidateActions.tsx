import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import { canShowCompleteActivityButton } from './quickTimeEntryDrawerLogic'

type Props = {
  candidate: TimeEntryCandidateItem
  onApontar: () => void
  onComplete: () => void
  disabled?: boolean
  completing?: boolean
}

export function QuickTimeEntryCandidateActions({
  candidate,
  onApontar,
  onComplete,
  disabled = false,
  completing = false,
}: Props) {
  const showComplete = canShowCompleteActivityButton(candidate)

  return (
    <div className={`mt-4 grid gap-2 ${showComplete ? 'grid-cols-1 sm:grid-cols-2' : ''}`}>
      <button
        type="button"
        className="sgp-cta-primary w-full justify-center py-2 text-center text-xs"
        onClick={onApontar}
        disabled={disabled}
      >
        Apontar
      </button>
      {showComplete ? (
        <button
          type="button"
          className="w-full justify-center rounded-xl border border-emerald-400/35 bg-emerald-500/10 py-2 text-center text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/20 disabled:pointer-events-none disabled:opacity-50"
          onClick={onComplete}
          disabled={disabled || completing}
        >
          Concluir atividade
        </button>
      ) : null}
    </div>
  )
}
