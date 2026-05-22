import { useMemo, useState } from 'react'
import type { ConveyorStructure } from '../../../domain/conveyors/conveyor.types'
import type {
  ConveyorOperationalPlanItem,
  PatchConveyorOperationalPlanItemInput,
} from '../../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import {
  formatConveyorPlanReviewReasons,
  getStepCollaboratorOptionsFromStructure,
  getStepTeamOptionsFromStructure,
  plannedMinutesNeedsReviewHighlight,
} from '../../../domain/conveyor-operational-plan/conveyorPlanReviewDisplay'
import {
  CONVEYOR_PLAN_ITEM_MANUAL_ADJUSTMENT_LABEL,
  conveyorOperationalPlanItemStatusBadgeClass,
  conveyorPlanItemShowsManualAdjustmentBadge,
  labelConveyorOperationalPlanItemSource,
  labelConveyorOperationalPlanItemStatus,
} from '../../../domain/conveyor-operational-plan/conveyorOperationalPlanDisplay'
import { formatMinutosHumanos } from '../../../lib/formatters'
import { ConveyorPlanBadge } from './ConveyorPlanBadge'

export type ItemSaveInput = PatchConveyorOperationalPlanItemInput

type Props = {
  item: ConveyorOperationalPlanItem
  structure: ConveyorStructure
  dailyCapacityMinutes: number
  planGeneratedAt: string | null
  canEditItems: boolean
  showCancelled: boolean
  busy: boolean
  onSave: (itemId: string, input: ItemSaveInput) => Promise<unknown>
}

export function ConveyorOperationalPlanItemRow({
  item,
  structure,
  dailyCapacityMinutes,
  planGeneratedAt,
  canEditItems,
  showCancelled,
  busy,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [editDate, setEditDate] = useState(item.plannedDate ?? '')
  const [editOrder, setEditOrder] = useState(item.plannedOrder)
  const [editMinutes, setEditMinutes] = useState<number | ''>(
    item.plannedMinutes != null ? item.plannedMinutes : '',
  )
  const [editCollaboratorId, setEditCollaboratorId] = useState(item.plannedCollaboratorId ?? '')
  const [editTeamId, setEditTeamId] = useState(item.plannedTeamId ?? '')
  const [editNotes, setEditNotes] = useState(item.notes ?? '')
  const [itemError, setItemError] = useState<string | null>(null)

  const teamOptions = useMemo(
    () => getStepTeamOptionsFromStructure(structure, item.activityNodeId),
    [structure, item.activityNodeId],
  )
  const collaboratorOptions = useMemo(
    () => getStepCollaboratorOptionsFromStructure(structure, item.activityNodeId),
    [structure, item.activityNodeId],
  )
  const showTeamSelectInEdit = teamOptions.length > 0
  const showCollaboratorSelectInEdit = collaboratorOptions.length > 0

  const isCancelled = item.status === 'CANCELLED'
  const borderClass = isCancelled
    ? 'border-white/[0.06] bg-white/[0.02] opacity-70'
    : item.reviewRequired
      ? 'border-amber-400/30 bg-amber-500/[0.06]'
      : 'border-white/[0.06] bg-white/[0.02]'

  function openEdit() {
    setEditDate(item.plannedDate ?? '')
    setEditOrder(item.plannedOrder)
    setEditMinutes(item.plannedMinutes != null ? item.plannedMinutes : '')
    setEditCollaboratorId(item.plannedCollaboratorId ?? '')
    setEditTeamId(item.plannedTeamId ?? '')
    setEditNotes(item.notes ?? '')
    setItemError(null)
    setEditing(true)
  }

  async function handleSave() {
    setItemError(null)
    if (editOrder < 0 || !Number.isInteger(editOrder)) {
      setItemError('Ordem planejada deve ser um número inteiro maior ou igual a zero.')
      return
    }
    const data = await onSave(item.id, {
      plannedDate: editDate.trim() || null,
      plannedOrder: editOrder,
      plannedMinutes: editMinutes === '' ? null : Number(editMinutes),
      notes: editNotes.trim() || null,
      ...(showCollaboratorSelectInEdit
        ? { plannedCollaboratorId: editCollaboratorId.trim() || null }
        : {}),
      ...(showTeamSelectInEdit ? { plannedTeamId: editTeamId.trim() || null } : {}),
    })
    if (data) {
      setEditing(false)
    } else {
      setItemError('Não foi possível salvar o item.')
    }
  }

  async function handleCancelItem() {
    if (
      !window.confirm(
        'Cancelar este item do plano? Ele não será removido da esteira, apenas deixará de contar no rascunho.',
      )
    ) {
      return
    }
    setItemError(null)
    const data = await onSave(item.id, { status: 'CANCELLED' })
    if (!data) setItemError('Não foi possível cancelar o item.')
  }

  async function handleRestoreItem() {
    setItemError(null)
    const data = await onSave(item.id, { status: 'PLANNED' })
    if (!data) setItemError('Não foi possível restaurar o item.')
  }

  return (
    <li className={`rounded-lg border px-3 py-3 text-[13px] ${borderClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 font-medium text-slate-100">
          {item.taskTitle} › {item.sectorTitle} › {item.activityTitle}
        </p>
        <ItemBadges item={item} planGeneratedAt={planGeneratedAt} />
      </div>

      {!editing ? (
        <ItemReadView
          item={item}
          canEditItems={canEditItems}
          showCancelled={showCancelled}
          busy={busy}
          itemError={itemError}
          onEdit={openEdit}
          onCancelItem={() => void handleCancelItem()}
          onRestoreItem={() => void handleRestoreItem()}
        />
      ) : (
        <ItemEditForm
          editDate={editDate}
          setEditDate={setEditDate}
          editOrder={editOrder}
          setEditOrder={setEditOrder}
          editMinutes={editMinutes}
          setEditMinutes={setEditMinutes}
          editCollaboratorId={editCollaboratorId}
          setEditCollaboratorId={setEditCollaboratorId}
          editTeamId={editTeamId}
          setEditTeamId={setEditTeamId}
          editNotes={editNotes}
          setEditNotes={setEditNotes}
          showCollaboratorSelect={showCollaboratorSelectInEdit}
          showTeamSelect={showTeamSelectInEdit}
          collaboratorOptions={collaboratorOptions}
          teamOptions={teamOptions}
          dailyCapacityMinutes={dailyCapacityMinutes}
          itemError={itemError}
          busy={busy}
          onSave={() => void handleSave()}
          onCancel={() => setEditing(false)}
        />
      )}
    </li>
  )
}

function ItemReadView({
  item,
  canEditItems,
  showCancelled,
  busy,
  itemError,
  onEdit,
  onCancelItem,
  onRestoreItem,
}: {
  item: ConveyorOperationalPlanItem
  canEditItems: boolean
  showCancelled: boolean
  busy: boolean
  itemError: string | null
  onEdit: () => void
  onCancelItem: () => void
  onRestoreItem: () => void
}) {
  const isCancelled = item.status === 'CANCELLED'

  return (
    <>
      <p className="mt-2 text-[12px] text-slate-400">
        Ordem {item.plannedOrder}
        {item.plannedMinutes != null ? ` · ${formatMinutosHumanos(item.plannedMinutes)}` : ''}
      </p>
      {(item.plannedCollaboratorName || item.plannedTeamName) && (
        <p className="mt-1 text-[12px] text-slate-500">
          {item.plannedCollaboratorName ? `Colaborador: ${item.plannedCollaboratorName}` : null}
          {item.plannedCollaboratorName && item.plannedTeamName ? ' · ' : null}
          {item.plannedTeamName ? `Equipe: ${item.plannedTeamName}` : null}
        </p>
      )}
      {item.notes ? <p className="mt-1 text-[12px] text-slate-500">Obs.: {item.notes}</p> : null}
      {!isCancelled ? (
        <p className="mt-1 text-[12px] text-slate-500">
          Realizado {formatMinutosHumanos(item.realizedMinutes)}
          {item.activityOperationalStatus ? ` · STEP ${item.activityOperationalStatus}` : ''}
        </p>
      ) : null}
      {item.reviewRequired && !isCancelled ? (
        <aside className="mt-2 space-y-1">
          <p className="text-[12px] text-amber-100/90">
            {formatConveyorPlanReviewReasons(item.reviewReasons)}
          </p>
        </aside>
      ) : null}
      {itemError ? <p className="mt-2 text-[12px] text-rose-200">{itemError}</p> : null}
      {canEditItems && !isCancelled ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-white/12 px-3 py-1.5 text-[12px] text-slate-200 hover:bg-white/[0.06] disabled:opacity-50"
            onClick={onEdit}
          >
            Editar
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-rose-400/25 px-3 py-1.5 text-[12px] text-rose-100/90 hover:bg-rose-500/10 disabled:opacity-50"
            onClick={onCancelItem}
          >
            Cancelar item
          </button>
        </div>
      ) : null}
      {canEditItems && isCancelled && showCancelled ? (
        <button
          type="button"
          disabled={busy}
          className="mt-3 rounded-lg border border-white/12 px-3 py-1.5 text-[12px] text-slate-200 hover:bg-white/[0.06] disabled:opacity-50"
          onClick={onRestoreItem}
        >
          Restaurar
        </button>
      ) : null}
    </>
  )
}

function ItemBadges({
  item,
  planGeneratedAt,
}: {
  item: ConveyorOperationalPlanItem
  planGeneratedAt: string | null
}) {
  const showManualAdjustment = conveyorPlanItemShowsManualAdjustmentBadge(item, planGeneratedAt)

  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-1">
      <ConveyorPlanBadge
        label={labelConveyorOperationalPlanItemStatus(item)}
        className={conveyorOperationalPlanItemStatusBadgeClass(item)}
      />
      <ConveyorPlanBadge
        label={labelConveyorOperationalPlanItemSource(item.sourceKind)}
        className="border-white/10 bg-white/[0.04] text-slate-400"
      />
      {showManualAdjustment ? (
        <ConveyorPlanBadge
          label={CONVEYOR_PLAN_ITEM_MANUAL_ADJUSTMENT_LABEL}
          className="border-sky-400/30 bg-sky-500/10 text-sky-100/90"
        />
      ) : null}
    </div>
  )
}

function ItemEditForm(props: {
  editDate: string
  setEditDate: (v: string) => void
  editOrder: number
  setEditOrder: (v: number) => void
  editMinutes: number | ''
  setEditMinutes: (v: number | '') => void
  editCollaboratorId: string
  setEditCollaboratorId: (v: string) => void
  editTeamId: string
  setEditTeamId: (v: string) => void
  editNotes: string
  setEditNotes: (v: string) => void
  showCollaboratorSelect: boolean
  showTeamSelect: boolean
  collaboratorOptions: { id: string; label: string }[]
  teamOptions: { id: string; label: string }[]
  dailyCapacityMinutes: number
  itemError: string | null
  busy: boolean
  onSave: () => void
  onCancel: () => void
}) {
  const {
    editDate,
    setEditDate,
    editOrder,
    setEditOrder,
    editMinutes,
    setEditMinutes,
    editCollaboratorId,
    setEditCollaboratorId,
    editTeamId,
    setEditTeamId,
    editNotes,
    setEditNotes,
    showCollaboratorSelect,
    showTeamSelect,
    collaboratorOptions,
    teamOptions,
    dailyCapacityMinutes,
    itemError,
    busy,
    onSave,
    onCancel,
  } = props

  return (
    <div className="mt-3 space-y-3 border-t border-white/[0.08] pt-3">
      <label className="block text-[12px] text-slate-400">
        Data planejada
        <input
          type="date"
          className={`mt-1 w-full max-w-xs rounded-lg border bg-sgp-base px-2 py-2 text-sm text-slate-100 ${
            !editDate.trim() ? 'border-amber-400/40' : 'border-white/10'
          }`}
          value={editDate}
          onChange={(e) => setEditDate(e.target.value)}
        />
      </label>
      <label className="block text-[12px] text-slate-400">
        Ordem planejada
        <input
          type="number"
          min={0}
          step={1}
          className="mt-1 w-full max-w-xs rounded-lg border border-white/10 bg-sgp-base px-2 py-2 text-sm text-slate-100"
          value={editOrder}
          onChange={(e) => setEditOrder(Number(e.target.value))}
        />
      </label>
      <label className="block text-[12px] text-slate-400">
        Minutos previstos
        <input
          type="number"
          min={0}
          className={`mt-1 w-full max-w-xs rounded-lg border bg-sgp-base px-2 py-2 text-sm text-slate-100 ${
            plannedMinutesNeedsReviewHighlight(editMinutes, dailyCapacityMinutes)
              ? 'border-amber-400/40'
              : 'border-white/10'
          }`}
          value={editMinutes}
          onChange={(e) =>
            setEditMinutes(e.target.value === '' ? '' : Number(e.target.value))
          }
        />
      </label>
      {showCollaboratorSelect ? (
        <label className="block text-[12px] text-slate-400">
          Colaborador
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-sgp-base px-2 py-2 text-sm text-slate-100"
            value={editCollaboratorId}
            onChange={(e) => setEditCollaboratorId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {collaboratorOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showTeamSelect ? (
        <label className="block text-[12px] text-slate-400">
          Equipe
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-sgp-base px-2 py-2 text-sm text-slate-100"
            value={editTeamId}
            onChange={(e) => setEditTeamId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block text-[12px] text-slate-400">
        Observação
        <textarea
          rows={2}
          className="mt-1 w-full rounded-lg border border-white/10 bg-sgp-base px-2 py-2 text-sm text-slate-100"
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
        />
      </label>
      {itemError ? <p className="text-[12px] text-rose-200">{itemError}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/15 px-3 py-2 text-[13px] text-slate-50 disabled:opacity-50"
          onClick={onSave}
        >
          Salvar alterações
        </button>
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-[13px] text-slate-400 hover:bg-white/[0.06]"
          onClick={onCancel}
        >
          Cancelar edição
        </button>
      </div>
    </div>
  )
}
