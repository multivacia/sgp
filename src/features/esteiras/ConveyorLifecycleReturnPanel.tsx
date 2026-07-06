import { useCallback, useState } from 'react'
import type { ConveyorDetail } from '../../domain/conveyors/conveyor.types'
import type { ConveyorOperationalEvent } from '../../domain/conveyors/conveyorOperationalEvents.types'
import {
  CONVEYOR_RETURN_REASON_MAX,
  getConveyorLifecycleReturnActions,
  getConveyorReturnModalCopy,
  type ConveyorLifecycleReturnAction,
  validateConveyorReturnReason,
} from '../../domain/conveyors/conveyorLifecycleActions'
import {
  getConveyorOperationalEvents,
  postConveyorReturnToBacklog,
  postConveyorReturnToPlanning,
} from '../../services/conveyors/conveyorsApiService'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../lib/errors'

type ConveyorLifecycleReturnPanelProps = {
  conveyorId: string
  operationalStatus: ConveyorDetail['operationalStatus']
  operationalEventsLimit: number
  routePath: string
  onDetailUpdated: (detail: ConveyorDetail) => void
  onOperationalEventsUpdated: (events: ConveyorOperationalEvent[]) => void
  onOperationalEventsLoading: (loading: boolean) => void
  onSuccessToast: (message: string) => void
  presentBlocking: (normalized: ReturnType<typeof reportClientError>) => void
  disabled?: boolean
  disabledTitle?: string
}

export function ConveyorLifecycleReturnPanel({
  conveyorId,
  operationalStatus,
  operationalEventsLimit,
  routePath,
  onDetailUpdated,
  onOperationalEventsUpdated,
  onOperationalEventsLoading,
  onSuccessToast,
  presentBlocking,
  disabled = false,
  disabledTitle,
}: ConveyorLifecycleReturnPanelProps) {
  const returnActions = getConveyorLifecycleReturnActions(operationalStatus)
  const [loadingAction, setLoadingAction] = useState<ConveyorLifecycleReturnAction | null>(
    null,
  )
  const [dialogAction, setDialogAction] = useState<ConveyorLifecycleReturnAction | null>(
    null,
  )
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const closeDialog = useCallback(() => {
    if (loadingAction) return
    setDialogAction(null)
    setReason('')
    setReasonError(null)
  }, [loadingAction])

  const openDialog = useCallback((action: ConveyorLifecycleReturnAction) => {
    setActionError(null)
    setDialogAction(action)
    setReason('')
    setReasonError(null)
  }, [])

  const submitReturn = useCallback(async () => {
    if (!dialogAction) return
    const validationError = validateConveyorReturnReason(reason)
    if (validationError) {
      setReasonError(validationError)
      return
    }
    setReasonError(null)
    setActionError(null)
    setLoadingAction(dialogAction)
    const trimmedReason = reason.trim()
    try {
      const detail =
        dialogAction === 'RETURN_TO_BACKLOG'
          ? await postConveyorReturnToBacklog(conveyorId, { reason: trimmedReason })
          : await postConveyorReturnToPlanning(conveyorId, { reason: trimmedReason })
      onDetailUpdated(detail)
      onOperationalEventsLoading(true)
      try {
        const ev = await getConveyorOperationalEvents(conveyorId, {
          limit: operationalEventsLimit,
        })
        onOperationalEventsUpdated(ev.data)
      } catch {
        onOperationalEventsUpdated([])
      } finally {
        onOperationalEventsLoading(false)
      }
      const copy = getConveyorReturnModalCopy(dialogAction)
      onSuccessToast(copy.successToast)
      setDialogAction(null)
      setReason('')
    } catch (e) {
      const n = reportClientError(e, {
        module: 'esteiras',
        action:
          dialogAction === 'RETURN_TO_BACKLOG'
            ? 'return_to_backlog'
            : 'return_to_planning',
        route: routePath,
        entityId: conveyorId,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setActionError(n.userMessage)
      }
    } finally {
      setLoadingAction(null)
    }
  }, [
    conveyorId,
    dialogAction,
    onDetailUpdated,
    onOperationalEventsLoading,
    onOperationalEventsUpdated,
    onSuccessToast,
    operationalEventsLimit,
    presentBlocking,
    reason,
    routePath,
  ])

  if (returnActions.length === 0) return null

  const modalCopy = dialogAction ? getConveyorReturnModalCopy(dialogAction) : null

  return (
    <>
      {actionError ? (
        <div
          className="relative mt-2 w-full rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100/95"
          role="alert"
        >
          {actionError}
        </div>
      ) : null}
      {returnActions.map((a) => (
        <button
          key={a.action}
          type="button"
          disabled={disabled || Boolean(loadingAction)}
          onClick={() => openDialog(a.action)}
          title={disabled ? disabledTitle : undefined}
          className="rounded-lg border border-sky-400/35 bg-sky-500/12 px-3 py-2 text-xs font-bold text-sky-100 shadow-sm transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {a.label}
        </button>
      ))}
      {dialogAction && modalCopy ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal
          aria-labelledby="conveyor-return-title"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel/95 to-sgp-app-panel-deep/98 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="conveyor-return-title"
              className="font-heading text-lg font-bold tracking-tight text-slate-50"
            >
              {modalCopy.title}
            </h2>
            {modalCopy.description.split('\n\n').map((paragraph) => (
              <p
                key={paragraph}
                className="mt-3 text-sm leading-relaxed text-slate-400"
              >
                {paragraph}
              </p>
            ))}
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Informe o motivo:
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  if (reasonError) setReasonError(null)
                }}
                maxLength={CONVEYOR_RETURN_REASON_MAX}
                rows={3}
                disabled={Boolean(loadingAction)}
                className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm normal-case text-slate-100 placeholder:text-slate-600 focus:border-sgp-gold/35 focus:outline-none focus:ring-1 focus:ring-sgp-gold/25 disabled:opacity-50"
                placeholder="Descreva o motivo do retrocesso…"
              />
            </label>
            {reasonError ? (
              <p className="mt-2 text-sm text-rose-300/95" role="alert">
                {reasonError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                disabled={Boolean(loadingAction)}
                onClick={closeDialog}
                className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sgp-gold/30 hover:bg-white/[0.07] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={Boolean(loadingAction)}
                onClick={() => void submitReturn()}
                className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/10 px-4 py-2.5 text-sm font-bold text-sgp-gold-warm shadow-inner transition hover:border-sgp-gold/50 hover:bg-sgp-gold/[0.14] disabled:opacity-50"
              >
                {loadingAction ? 'Processando…' : modalCopy.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
