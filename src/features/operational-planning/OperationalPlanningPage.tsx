import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageCanvas } from '../../components/ui/PageCanvas'
import type {
  OperationalPlanningBacklogItem,
  OperationalPlanningPlanItem,
  OperationalPlanningWeekPayload,
} from '../../domain/operational-planning/operational-planning.types'
import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import { formatHumanMinutes } from '../../lib/formatters'
import { reportClientError } from '../../lib/errors'
import { ApiError } from '../../lib/api/apiErrors'
import { useRegisterTransientContext } from '../../lib/shell/transient-context'
import { createCollaboratorsApiService } from '../../services/collaborators/collaboratorsApiService'
import {
  getOperationalPlanningWeek,
  listOperationalPlanningBacklog,
  patchOperationalPlanningWeek,
  publishOperationalPlanningWeek,
  saveOperationalPlanningWeek,
} from '../../services/operational-planning/operationalPlanningApiService'
import {
  fridayAfterMonday,
  mondayOfWeekContainingLocal,
  shiftWeek,
  weekdayLabelsPt,
} from './operationalPlanningWeekRange'

const collaboratorsApi = createCollaboratorsApiService()

type DraftPlanItem = {
  localKey: string
  serverItemId?: string
  conveyorId: string
  activityNodeId: string
  conveyorTitle: string
  activityTitle: string
  taskTitle: string
  sectorTitle: string
  assignedCollaboratorId: string
  assignedCollaboratorName: string | null
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  notes: string | null
  isOutOfSequence?: boolean
}

function planItemToDraft(it: OperationalPlanningPlanItem): DraftPlanItem {
  return {
    localKey: it.id,
    serverItemId: it.id,
    conveyorId: it.conveyorId,
    activityNodeId: it.activityNodeId,
    conveyorTitle: it.conveyorTitle,
    activityTitle: it.activityTitle,
    taskTitle: it.taskTitle,
    sectorTitle: it.sectorTitle,
    assignedCollaboratorId: it.assignedCollaboratorId ?? '',
    assignedCollaboratorName: it.assignedCollaboratorName,
    plannedDate: it.plannedDate,
    plannedOrder: it.plannedOrder,
    plannedMinutes: it.plannedMinutes,
    notes: it.notes,
  }
}

function recalculateOrders(items: DraftPlanItem[]): DraftPlanItem[] {
  const groups = new Map<string, DraftPlanItem[]>()
  for (const it of items) {
    const k = `${it.assignedCollaboratorId}|${it.plannedDate}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(it)
  }
  const out: DraftPlanItem[] = []
  for (const [, arr] of groups) {
    arr.sort((a, b) => a.plannedOrder - b.plannedOrder || a.localKey.localeCompare(b.localKey))
    arr.forEach((it, idx) => {
      out.push({ ...it, plannedOrder: idx })
    })
  }
  return out.sort((a, b) => {
    const dc = a.plannedDate.localeCompare(b.plannedDate)
    if (dc !== 0) return dc
    const cc = a.assignedCollaboratorId.localeCompare(b.assignedCollaboratorId)
    if (cc !== 0) return cc
    return a.plannedOrder - b.plannedOrder
  })
}

function buildSavePayload(
  weekStartDate: string,
  weekEndDate: string,
  drafts: DraftPlanItem[],
) {
  const normalized = recalculateOrders([...drafts])
  return {
    weekStartDate,
    weekEndDate,
    items: normalized.map((it) => ({
      conveyorId: it.conveyorId,
      activityNodeId: it.activityNodeId,
      assignedCollaboratorId: it.assignedCollaboratorId,
      assignedTeamId: null as string | null,
      plannedDate: it.plannedDate,
      plannedOrder: it.plannedOrder,
      plannedMinutes: it.plannedMinutes,
      notes: it.notes,
    })),
  }
}

function newLocalKey(): string {
  return globalThis.crypto.randomUUID()
}

function dragCellId(collaboratorId: string, plannedDate: string): string {
  return `cell|${collaboratorId}|${plannedDate}`
}

function parseCellId(id: string): { collaboratorId: string; plannedDate: string } | null {
  if (!id.startsWith('cell|')) return null
  const rest = id.slice(5)
  const last = rest.lastIndexOf('|')
  if (last <= 0) return null
  return {
    collaboratorId: rest.slice(0, last),
    plannedDate: rest.slice(last + 1),
  }
}

function BacklogDraggableCard(props: {
  item: OperationalPlanningBacklogItem
  blocked: boolean
  onAddClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bl|${props.item.activityNodeId}`,
    disabled: props.blocked,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-[13px] shadow-sm ring-1 ring-white/[0.04]',
        props.blocked ? 'opacity-55' : '',
        isDragging ? 'opacity-70' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div {...listeners} {...attributes} className="min-w-0 flex-1 cursor-grab active:cursor-grabbing">
          <p className="truncate font-semibold text-slate-100">{props.item.activityTitle}</p>
          <p className="mt-1 truncate text-[11px] text-slate-400">{props.item.conveyorTitle}</p>
          <p className="truncate text-[11px] text-slate-500">
            {props.item.taskTitle} › {props.item.sectorTitle}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Pendente: {formatHumanMinutes(props.item.pendingMinutes)}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2 py-1 text-[11px] text-slate-200 hover:bg-white/[0.08]"
          onClick={(e) => {
            e.stopPropagation()
            props.onAddClick()
          }}
          disabled={props.blocked}
        >
          Adicionar ao plano
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {props.item.isOutOfSequence ? (
          <span className="rounded-md border border-amber-400/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-100">
            Fora de sequência
          </span>
        ) : null}
        {!props.item.hasAssignees ? (
          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400">
            Sem responsável
          </span>
        ) : null}
        {props.item.isOverdue ? (
          <span className="rounded-md border border-rose-400/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-100">
            Atrasada
          </span>
        ) : null}
        {props.blocked ? (
          <span className="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-100">
            Já no plano
          </span>
        ) : null}
      </div>
    </div>
  )
}

function PlanDayDropZone(props: {
  collaboratorId: string
  plannedDate: string
  children: React.ReactNode
}) {
  const id = dragCellId(props.collaboratorId, props.plannedDate)
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={[
        'min-h-[140px] rounded-xl border border-white/[0.06] bg-white/[0.02] p-2',
        isOver ? 'ring-2 ring-sgp-gold/35' : '',
      ].join(' ')}
    >
      {props.children}
    </div>
  )
}

export function OperationalPlanningPage() {
  const [weekMonday, setWeekMonday] = useState(() => mondayOfWeekContainingLocal(new Date()))
  const weekFriday = useMemo(() => fridayAfterMonday(weekMonday), [weekMonday])

  const [weekPayload, setWeekPayload] = useState<OperationalPlanningWeekPayload | null>(null)
  const [draftItems, setDraftItems] = useState<DraftPlanItem[]>([])
  const savedDraftJsonRef = useRef<string>('')

  const [backlogItems, setBacklogItems] = useState<OperationalPlanningBacklogItem[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])

  const [backlogQ, setBacklogQ] = useState('')
  const [boardCollabQ, setBoardCollabQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalBacklogItem, setModalBacklogItem] = useState<OperationalPlanningBacklogItem | null>(
    null,
  )
  const [modalCollaboratorId, setModalCollaboratorId] = useState('')
  const [modalDay, setModalDay] = useState('')
  const [modalMinutes, setModalMinutes] = useState<number>(60)

  const weekdayDates = weekPayload?.week.weekdayDates ?? []
  const dayLabels = weekdayLabelsPt()

  const plannedActivityIds = useMemo(
    () => new Set(draftItems.map((i) => i.activityNodeId)),
    [draftItems],
  )

  const dirty = useMemo(() => {
    try {
      return JSON.stringify(draftItems) !== savedDraftJsonRef.current
    } catch {
      return true
    }
  }, [draftItems])

  useEffect(() => {
    if (dirty) setSuccessMsg(null)
  }, [dirty])

  useRegisterTransientContext({
    id: 'operational-planning-week',
    isDirty: () => dirty,
    onReset: () => {
      try {
        const parsed = JSON.parse(savedDraftJsonRef.current) as DraftPlanItem[]
        setDraftItems(parsed)
      } catch {
        /* noop */
      }
    },
  })

  const loadWeek = useCallback(async () => {
    setBusy(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const w = await getOperationalPlanningWeek(weekMonday)
      setWeekPayload(w)
      setWeekMonday(w.week.weekStartDate)
      if (w.plan?.items?.length) {
        const d = w.plan.items.map(planItemToDraft)
        setDraftItems(d)
        savedDraftJsonRef.current = JSON.stringify(d)
      } else {
        setDraftItems([])
        savedDraftJsonRef.current = JSON.stringify([])
      }
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'load_week' })
      setErrorMsg('Não foi possível carregar o plano da semana.')
    } finally {
      setBusy(false)
    }
  }, [weekMonday])

  const loadBacklog = useCallback(async () => {
    try {
      const b = await listOperationalPlanningBacklog({
        q: backlogQ,
        limit: 100,
      })
      setBacklogItems(b.items)
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'load_backlog' })
    }
  }, [backlogQ])

  useEffect(() => {
    void loadWeek()
  }, [loadWeek])

  useEffect(() => {
    void loadBacklog()
  }, [loadBacklog])

  useEffect(() => {
    void (async () => {
      try {
        const rows = await collaboratorsApi.listCollaborators({ status: 'active' })
        setCollaborators(rows)
      } catch (e) {
        reportClientError(e, { module: 'operational-planning', action: 'load_collaborators' })
      }
    })()
  }, [])

  const filteredCollaborators = useMemo(() => {
    const q = boardCollabQ.trim().toLowerCase()
    if (!q) return collaborators
    return collaborators.filter((c) => c.fullName.toLowerCase().includes(q))
  }, [collaborators, boardCollabQ])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function openAddModal(item: OperationalPlanningBacklogItem) {
    setModalBacklogItem(item)
    const firstCollab = collaborators[0]?.id ?? ''
    setModalCollaboratorId(firstCollab)
    setModalDay(weekdayDates[0] ?? weekMonday)
    setModalMinutes(Math.max(1, item.pendingMinutes || item.plannedMinutes || 60))
    setModalOpen(true)
  }

  function confirmAddFromModal() {
    if (!modalBacklogItem || !modalCollaboratorId || !modalDay) return
    if (plannedActivityIds.has(modalBacklogItem.activityNodeId)) {
      setModalOpen(false)
      return
    }
    const name =
      collaborators.find((c) => c.id === modalCollaboratorId)?.fullName ?? null
    const cellItems = draftItems.filter(
      (d) => d.assignedCollaboratorId === modalCollaboratorId && d.plannedDate === modalDay,
    )
    const nextOrder =
      cellItems.length === 0 ? 0 : Math.max(...cellItems.map((c) => c.plannedOrder)) + 1
    const next: DraftPlanItem = {
      localKey: newLocalKey(),
      conveyorId: modalBacklogItem.conveyorId,
      activityNodeId: modalBacklogItem.activityNodeId,
      conveyorTitle: modalBacklogItem.conveyorTitle,
      activityTitle: modalBacklogItem.activityTitle,
      taskTitle: modalBacklogItem.taskTitle,
      sectorTitle: modalBacklogItem.sectorTitle,
      assignedCollaboratorId: modalCollaboratorId,
      assignedCollaboratorName: name,
      plannedDate: modalDay,
      plannedOrder: nextOrder,
      plannedMinutes: modalMinutes,
      notes: null,
      isOutOfSequence: modalBacklogItem.isOutOfSequence,
    }
    setDraftItems((prev) => recalculateOrders([...prev, next]))
    setModalOpen(false)
  }

  function removeDraft(localKey: string) {
    setDraftItems((prev) => prev.filter((p) => p.localKey !== localKey))
  }

  function moveOrder(localKey: string, dir: -1 | 1) {
    setDraftItems((prev) => {
      const idx = prev.findIndex((p) => p.localKey === localKey)
      if (idx < 0) return prev
      const cur = prev[idx]!
      const sameCell = prev.filter(
        (p) =>
          p.assignedCollaboratorId === cur.assignedCollaboratorId &&
          p.plannedDate === cur.plannedDate,
      )
      const sorted = [...sameCell].sort((a, b) => a.plannedOrder - b.plannedOrder)
      const pos = sorted.findIndex((s) => s.localKey === localKey)
      const swapWith = sorted[pos + dir]
      if (!swapWith) return prev
      const next = prev.map((p) => {
        if (p.localKey === cur.localKey) return { ...p, plannedOrder: swapWith.plannedOrder }
        if (p.localKey === swapWith.localKey) return { ...p, plannedOrder: cur.plannedOrder }
        return p
      })
      return recalculateOrders(next)
    })
  }

  async function handleSaveDraft() {
    if (!weekPayload) return
    const body = buildSavePayload(weekPayload.week.weekStartDate, weekPayload.week.weekEndDate, draftItems)
    setBusy(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      let out: OperationalPlanningWeekPayload
      if (weekPayload.hasPlan && weekPayload.plan) {
        out = await patchOperationalPlanningWeek(weekPayload.plan.id, body)
      } else {
        out = await saveOperationalPlanningWeek(body)
      }
      setWeekPayload(out)
      if (out.plan?.items?.length) {
        const d = out.plan.items.map(planItemToDraft)
        setDraftItems(d)
        savedDraftJsonRef.current = JSON.stringify(d)
      } else {
        setDraftItems([])
        savedDraftJsonRef.current = JSON.stringify([])
      }
      setSuccessMsg('Rascunho salvo.')
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'save_week' })
      const detail = e instanceof ApiError ? e.message : null
      setErrorMsg(detail ?? 'Não foi possível salvar o rascunho.')
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish() {
    if (!weekPayload?.plan || draftItems.length === 0) return
    setBusy(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await publishOperationalPlanningWeek(weekPayload.plan.id)
      await loadWeek()
      setSuccessMsg('Plano publicado.')
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'publish_week' })
      const detail = e instanceof ApiError ? e.message : null
      setErrorMsg(detail ?? 'Não foi possível publicar o plano.')
    } finally {
      setBusy(false)
    }
  }

  function handleDragEnd(ev: DragEndEvent) {
    const { active, over } = ev
    if (!over) return
    const aid = String(active.id)
    const oid = String(over.id)
    if (!aid.startsWith('bl|')) return
    const activityNodeId = aid.slice(3)
    const cell = parseCellId(oid)
    if (!cell) return
    if (plannedActivityIds.has(activityNodeId)) return
    const bl = backlogItems.find((b) => b.activityNodeId === activityNodeId)
    if (!bl) return
    const name = collaborators.find((c) => c.id === cell.collaboratorId)?.fullName ?? null
    const cellItems = draftItems.filter(
      (d) => d.assignedCollaboratorId === cell.collaboratorId && d.plannedDate === cell.plannedDate,
    )
    const nextOrder =
      cellItems.length === 0 ? 0 : Math.max(...cellItems.map((c) => c.plannedOrder)) + 1
    const next: DraftPlanItem = {
      localKey: newLocalKey(),
      conveyorId: bl.conveyorId,
      activityNodeId: bl.activityNodeId,
      conveyorTitle: bl.conveyorTitle,
      activityTitle: bl.activityTitle,
      taskTitle: bl.taskTitle,
      sectorTitle: bl.sectorTitle,
      assignedCollaboratorId: cell.collaboratorId,
      assignedCollaboratorName: name,
      plannedDate: cell.plannedDate,
      plannedOrder: nextOrder,
      plannedMinutes: Math.max(1, bl.pendingMinutes || bl.plannedMinutes || 60),
      notes: null,
      isOutOfSequence: bl.isOutOfSequence,
    }
    setDraftItems((prev) => recalculateOrders([...prev, next]))
  }

  const summary = weekPayload?.summary
  const capacityRows = weekPayload?.capacityByCollaboratorDay ?? []

  const backlogFiltered = backlogItems

  return (
    <PageCanvas>
      <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-8">
        <header className="border-b border-white/[0.06] pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Gestão
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
            Planejamento da Semana
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-slate-400">
            Distribua atividades por colaborador e acompanhe a execução diária.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-1">
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-white/[0.06]"
                onClick={() => setWeekMonday((w) => shiftWeek(w, -1))}
              >
                ‹
              </button>
              <span className="min-w-[200px] text-center text-[13px] text-slate-200">
                {weekPayload?.week.weekStartDate ?? weekMonday} →{' '}
                {weekPayload?.week.weekEndDate ?? weekFriday}
              </span>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-white/[0.06]"
                onClick={() => setWeekMonday((w) => shiftWeek(w, 1))}
              >
                ›
              </button>
            </div>

            <span
              className={[
                'rounded-full border px-3 py-1 text-[12px]',
                weekPayload?.plan?.status === 'PUBLISHED'
                  ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                  : 'border-white/[0.08] bg-white/[0.04] text-slate-300',
              ].join(' ')}
            >
              {weekPayload?.plan?.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
            </span>

            <button
              type="button"
              className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-slate-100 hover:bg-white/[0.09] disabled:opacity-50"
              onClick={() => void handleSaveDraft()}
              disabled={busy || !dirty || !weekPayload}
            >
              Salvar rascunho
            </button>
            <button
              type="button"
              className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/15 px-4 py-2 text-[13px] font-medium text-slate-50 hover:bg-sgp-gold/25 disabled:opacity-50"
              title={
                draftItems.length === 0
                  ? 'Adicione ao menos uma atividade antes de publicar o plano.'
                  : undefined
              }
              onClick={() => void handlePublish()}
              disabled={
                busy ||
                dirty ||
                draftItems.length === 0 ||
                !weekPayload?.plan ||
                weekPayload.plan.status === 'PUBLISHED'
              }
            >
              Publicar plano
            </button>
          </div>

          {successMsg ? (
            <p className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-100">
              {successMsg}
            </p>
          ) : null}
          {errorMsg ? (
            <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100">
              {errorMsg}
            </p>
          ) : null}
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Minutos planejados</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{summary?.plannedMinutes ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Atividades planejadas</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{summary?.plannedItems ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Colaboradores no plano</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{summary?.collaboratorsCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Itens no backlog</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{backlogFiltered.length}</p>
          </div>
        </section>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr]">
            <section className="space-y-4">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-100">Backlog operacional</h2>
                <p className="mt-1 text-[12px] text-slate-500">Buscar esteira / atividade</p>
                <div className="mt-3 flex gap-2">
                  <input
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600"
                    placeholder="Buscar…"
                    value={backlogQ}
                    onChange={(e) => setBacklogQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void loadBacklog()
                    }}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-xl border border-white/[0.10] bg-white/[0.06] px-3 py-2 text-[13px] text-slate-100"
                    onClick={() => void loadBacklog()}
                  >
                    Buscar
                  </button>
                </div>
              </div>
              <div className="space-y-3 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-1">
                {backlogFiltered.map((b) => (
                  <BacklogDraggableCard
                    key={b.activityNodeId}
                    item={b}
                    blocked={plannedActivityIds.has(b.activityNodeId)}
                    onAddClick={() => openAddModal(b)}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-end gap-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-100">Plano semanal</h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Arraste do backlog para uma célula ou use “Adicionar ao plano”.
                  </p>
                </div>
                <input
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600"
                  placeholder="Filtrar colaboradores no quadro…"
                  value={boardCollabQ}
                  onChange={(e) => setBoardCollabQ(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-separate border-spacing-2">
                  <thead>
                    <tr>
                      <th className="w-44 rounded-lg bg-white/[0.03] px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Colaborador
                      </th>
                      {dayLabels.map((label, i) => (
                        <th
                          key={label}
                          className="rounded-lg bg-white/[0.03] px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {label}
                          <div className="mt-0.5 font-normal text-[10px] text-slate-600">
                            {weekdayDates[i] ?? '—'}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCollaborators.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[13px] text-slate-500">
                          Nenhum colaborador corresponde ao filtro.
                        </td>
                      </tr>
                    ) : (
                    filteredCollaborators.map((c) => (
                      <tr key={c.id}>
                        <td className="align-top text-[13px] font-medium text-slate-200">{c.fullName}</td>
                        {weekdayDates.map((d) => {
                          const cellItems = draftItems
                            .filter((it) => it.assignedCollaboratorId === c.id && it.plannedDate === d)
                            .sort((a, b) => a.plannedOrder - b.plannedOrder)
                          const cap = capacityRows.find(
                            (r) => r.collaboratorId === c.id && r.date === d,
                          )
                          const plannedSum = cellItems.reduce(
                            (s, it) => s + Math.max(0, Number(it.plannedMinutes ?? 0) || 0),
                            0,
                          )
                          const over =
                            cap && plannedSum > cap.capacityMinutes && cap.capacityMinutes > 0
                          return (
                            <td key={d} className="align-top">
                              <PlanDayDropZone collaboratorId={c.id} plannedDate={d}>
                                {over ? (
                                  <p className="mb-1 text-[10px] font-medium text-amber-200">
                                    Acima da capacidade
                                  </p>
                                ) : null}
                                <p className="mb-2 text-[10px] text-slate-500">
                                  Σ {plannedSum} min
                                  {cap ? ` / ${cap.capacityMinutes} min` : ''}
                                </p>
                                <div className="space-y-2">
                                  {cellItems.map((it, idx) => (
                                    <div
                                      key={it.localKey}
                                      className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2 text-[11px]"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <span className="font-semibold text-slate-100">
                                            {idx + 1}. {it.activityTitle}
                                          </span>
                                          <p className="truncate text-[10px] text-slate-500">
                                            {it.conveyorTitle}
                                          </p>
                                          <p className="truncate text-[10px] text-slate-600">
                                            {it.taskTitle} › {it.sectorTitle}
                                          </p>
                                          <p className="mt-1 text-[10px] text-slate-400">
                                            {formatHumanMinutes(it.plannedMinutes ?? 0)}
                                          </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col gap-1">
                                          <button
                                            type="button"
                                            className="rounded border border-white/[0.08] px-1 text-[10px]"
                                            onClick={() => moveOrder(it.localKey, -1)}
                                          >
                                            ↑
                                          </button>
                                          <button
                                            type="button"
                                            className="rounded border border-white/[0.08] px-1 text-[10px]"
                                            onClick={() => moveOrder(it.localKey, 1)}
                                          >
                                            ↓
                                          </button>
                                          <button
                                            type="button"
                                            className="rounded border border-rose-400/30 px-1 text-[10px] text-rose-100"
                                            onClick={() => removeDraft(it.localKey)}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      </div>
                                      {it.isOutOfSequence ? (
                                        <p className="mt-1 text-[10px] text-amber-200">Fora de sequência</p>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </PlanDayDropZone>
                            </td>
                          )
                        })}
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </DndContext>
      </div>

      {modalOpen && modalBacklogItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-slate-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-50">Adicionar ao plano</h3>
            <p className="mt-2 text-[13px] text-slate-400">{modalBacklogItem.activityTitle}</p>
            <label className="mt-4 block text-[12px] text-slate-500">
              Colaborador
              <select
                className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100"
                value={modalCollaboratorId}
                onChange={(e) => setModalCollaboratorId(e.target.value)}
              >
                {collaborators.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-[12px] text-slate-500">
              Dia
              <select
                className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100"
                value={modalDay}
                onChange={(e) => setModalDay(e.target.value)}
              >
                {weekdayDates.map((d, i) => (
                  <option key={d} value={d}>
                    {dayLabels[i]} ({d})
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-[12px] text-slate-500">
              Minutos planejados
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100"
                value={modalMinutes}
                onChange={(e) => setModalMinutes(Number(e.target.value))}
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-white/[0.08] px-4 py-2 text-[13px] text-slate-300"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/15 px-4 py-2 text-[13px] font-medium text-slate-50"
                onClick={() => confirmAddFromModal()}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageCanvas>
  )
}
