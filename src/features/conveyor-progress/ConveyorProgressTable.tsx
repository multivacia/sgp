import { useState, type ReactNode } from 'react'
import type {
  ActivityProgressItem,
  ConveyorProgressItem,
  SectorProgressItem,
  TaskProgressItem,
} from '../../domain/conveyor-progress/conveyorProgress.types'
import { labelConveyorOperationalStatus } from '../../domain/conveyors/conveyorOperationalStatus'
import type { ConveyorOperationalStatus } from '../../domain/conveyors/conveyor.types'
import { resolvePlanningItemOperationalStatusLabel } from '../operational-planning/planningExecutionHelpers'
import { ConveyorProgressAnalyticalEntries } from './ConveyorProgressAnalyticalEntries'
import {
  EvolutionColumn,
  ExceededCell,
  LevelLabel,
  PlannedCell,
  RealizedCell,
  RemainingCell,
  StatusBadge,
  statusBadgeVariant,
  type MetricsLike,
} from './ConveyorProgressMetricsCells'

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

type Props = {
  items: ConveyorProgressItem[]
  selectedIds: ReadonlySet<string>
  onToggleSelect: (conveyorId: string) => void
  onSelectAll: (ids: string[]) => void
  onClearSelection: (ids: string[]) => void
}

export function ConveyorProgressTable({
  items,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
}: Props) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(25)

  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * pageSize
  const end = Math.min(start + pageSize, total)
  const pageItems = items.slice(start, end)

  const allPageSelected =
    pageItems.length > 0 && pageItems.every((i) => selectedIds.has(i.conveyorId))
  const somePageSelected = pageItems.some((i) => selectedIds.has(i.conveyorId))

  return (
    <div className="conveyor-progress-table-shell overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full border-collapse text-left text-sm text-slate-700">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Item</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Previsto</th>
              <th className="px-3 py-3">Realizado</th>
              <th className="px-3 py-3">Falta</th>
              <th className="px-3 py-3">Excedente</th>
              <th className="min-w-[8rem] px-3 py-3">Evolução</th>
              <th className="w-16 px-3 py-3 text-center">
                <label className="inline-flex cursor-pointer flex-col items-center gap-1">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-slate-300 accent-amber-500"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected && !allPageSelected
                    }}
                    onChange={() => {
                      if (allPageSelected) {
                        onClearSelection(pageItems.map((i) => i.conveyorId))
                      } else {
                        onSelectAll(pageItems.map((i) => i.conveyorId))
                      }
                    }}
                    aria-label="Selecionar todas as esteiras visíveis"
                  />
                  <span className="text-[9px] font-normal normal-case">Seleção</span>
                </label>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item) => (
              <ConveyorRows
                key={item.conveyorId}
                item={item}
                selected={selectedIds.has(item.conveyorId)}
                onToggleSelect={() => onToggleSelect(item.conveyorId)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
        <span>
          {total === 0
            ? 'Nenhum registro'
            : `Exibindo ${start + 1} a ${end} de ${total} registros`}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span>Linhas por página</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(0)
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Página anterior"
            >
              ‹
            </button>
            <span className="min-w-[4rem] text-center tabular-nums">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              aria-label="Próxima página"
            >
              ›
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ConveyorRows({
  item,
  selected,
  onToggleSelect,
}: {
  item: ConveyorProgressItem
  selected: boolean
  onToggleSelect: () => void
}) {
  const [open, setOpen] = useState(false)
  const statusLabel = labelConveyorOperationalStatus(
    item.operationalStatus as ConveyorOperationalStatus,
  )
  const hasChildren = item.tasks.length > 0

  return (
    <>
      <MetricsRow
        level={0}
        label="Esteira"
        name={item.conveyorName}
        code={item.conveyorCode}
        statusLabel={statusLabel}
        metrics={item}
        expanded={open}
        hasChildren={hasChildren}
        onToggle={() => setOpen((v) => !v)}
        selection={
          <input
            type="checkbox"
            className="size-4 rounded border-slate-300 accent-amber-500"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Selecionar esteira ${item.conveyorName}`}
          />
        }
        rowClassName="bg-white font-medium"
      />
      {open
        ? item.tasks.map((task) => <TaskRows key={task.taskId} task={task} />)
        : null}
    </>
  )
}

function TaskRows({ task }: { task: TaskProgressItem }) {
  const [open, setOpen] = useState(false)
  const hasChildren = task.sectors.length > 0

  return (
    <>
      <MetricsRow
        level={1}
        label="Tarefa"
        name={task.taskName}
        metrics={task}
        expanded={open}
        hasChildren={hasChildren}
        onToggle={() => setOpen((v) => !v)}
      />
      {open
        ? task.sectors.map((sector) => <SectorRows key={sector.sectorId} sector={sector} />)
        : null}
    </>
  )
}

function SectorRows({ sector }: { sector: SectorProgressItem }) {
  const [open, setOpen] = useState(false)
  const hasChildren = sector.activities.length > 0

  return (
    <>
      <MetricsRow
        level={2}
        label="Setor"
        name={sector.sectorName}
        metrics={sector}
        expanded={open}
        hasChildren={hasChildren}
        onToggle={() => setOpen((v) => !v)}
      />
      {open
        ? sector.activities.map((activity) => (
            <ActivityRows key={activity.activityId} activity={activity} />
          ))
        : null}
    </>
  )
}

function ActivityRows({ activity }: { activity: ActivityProgressItem }) {
  const [open, setOpen] = useState(false)
  const statusLabel =
    resolvePlanningItemOperationalStatusLabel(activity.status) ?? activity.status
  const hasChildren = activity.timeEntries.length > 0

  return (
    <>
      <MetricsRow
        level={3}
        label="Atividade"
        name={activity.activityName}
        subtitle={activity.collaboratorName ?? undefined}
        statusLabel={statusLabel}
        metrics={activity}
        expanded={open}
        hasChildren={hasChildren}
        onToggle={() => setOpen((v) => !v)}
      />
      {open ? (
        <ConveyorProgressAnalyticalEntries entries={activity.timeEntries} indentLevel={4} />
      ) : null}
    </>
  )
}

function MetricsRow({
  level,
  label,
  name,
  code,
  subtitle,
  statusLabel,
  metrics,
  expanded,
  hasChildren,
  onToggle,
  selection,
  rowClassName = '',
}: {
  level: number
  label: string
  name: string
  code?: string | null
  subtitle?: string
  statusLabel?: string | null
  metrics: MetricsLike
  expanded: boolean
  hasChildren: boolean
  onToggle: () => void
  selection?: ReactNode
  rowClassName?: string
}) {
  const indent = `${level * 1.25 + 1}rem`

  return (
    <tr
      className={`border-b border-slate-100 hover:bg-slate-50/70 ${rowClassName}`}
    >
      <td className="px-3 py-3" style={{ paddingLeft: indent }}>
        <div className="flex items-start gap-2">
          {hasChildren ? (
            <ExpandChevron expanded={expanded} onToggle={onToggle} label={name} />
          ) : (
            <span className="inline-block w-5 shrink-0" aria-hidden />
          )}
          <div className="min-w-0">
            <LevelLabel>{label}</LevelLabel>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {code ? (
                <span className="font-mono text-[11px] text-slate-400">{code}</span>
              ) : null}
              <span className="font-semibold text-slate-800">{name}</span>
              {subtitle ? (
                <span className="text-xs text-slate-500">· {subtitle}</span>
              ) : null}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        {statusLabel ? (
          <StatusBadge label={statusLabel} variant={statusBadgeVariant(statusLabel)} />
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        <PlannedCell minutes={metrics.plannedMinutes} />
      </td>
      <td className="px-3 py-3">
        <RealizedCell minutes={metrics.realizedMinutes} />
      </td>
      <td className="px-3 py-3">
        <RemainingCell minutes={metrics.remainingMinutes} />
      </td>
      <td className="px-3 py-3">
        <ExceededCell minutes={metrics.exceededMinutes} />
      </td>
      <td className="px-3 py-3">
        <EvolutionColumn metrics={metrics} />
      </td>
      <td className="px-3 py-3 text-center">{selection ?? null}</td>
    </tr>
  )
}

function ExpandChevron({
  expanded,
  onToggle,
  label,
}: {
  expanded: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={expanded ? `Recolher ${label}` : `Expandir ${label}`}
      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-amber-600 ${
        expanded ? 'rotate-90' : ''
      }`}
    >
      ›
    </button>
  )
}

export function filterSelectedConveyors(
  items: ConveyorProgressItem[],
  selectedIds: ReadonlySet<string>,
): ConveyorProgressItem[] {
  return items.filter((i) => selectedIds.has(i.conveyorId))
}
