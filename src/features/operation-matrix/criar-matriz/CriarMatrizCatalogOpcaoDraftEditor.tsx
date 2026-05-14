/* eslint-disable react-hooks/refs -- @dnd-kit useSortable */
import { CSS } from '@dnd-kit/utilities'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { MatrixSuggestionCatalogData } from '../../../catalog/matrixSuggestion/types'
import type { Team } from '../../../domain/teams/team.types'
import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import type { ReactNode } from 'react'
import { LabelSuggestField } from '../components/LabelSuggestField'
import { sortMatrixChildNodes } from './cloneCatalogTaskSubtreeForDraft'
import { matrixActivityPrimaryTeamId } from '../matrixTreeAggregates'
import {
  reconcileEtapaCollaborators,
  type CriarMatrizManualEtapa,
} from './criarMatrizManualDraft'
import {
  buildMatrixActivityMetadataJson,
  parseMatrixActivitySupportIds,
} from './matrixActivityCollaboratorsMeta'

type Props = {
  /** `contextRail` = painel direito alinhado ao editor de matriz (sem cartão duplicado). */
  variant?: 'default' | 'contextRail'
  /** Metadados de origem do catálogo (breadcrumb no rail). */
  catalogOrigin?: { matrixItemName: string; taskName: string }
  draftRoot: MatrixNodeTreeApi
  onChange: (next: MatrixNodeTreeApi) => void
  matrixSuggestionCatalog: MatrixSuggestionCatalogData
  teams: Team[]
}

function nid(): string {
  return globalThis.crypto.randomUUID()
}

function updateNodeDeep(
  node: MatrixNodeTreeApi,
  id: string,
  fn: (n: MatrixNodeTreeApi) => MatrixNodeTreeApi,
): MatrixNodeTreeApi {
  if (node.id === id) return fn(node)
  return {
    ...node,
    children: node.children.map((c) => updateNodeDeep(c, id, fn)),
  }
}

function activityToEtapa(node: MatrixNodeTreeApi): CriarMatrizManualEtapa {
  const tid = matrixActivityPrimaryTeamId(node)
  const support = parseMatrixActivitySupportIds(node.metadata_json)
  return reconcileEtapaCollaborators({
    id: node.id,
    name: node.name,
    plannedMinutes: node.planned_minutes,
    teamIds: tid ? [tid] : [],
    collaboratorIds: support,
    primaryCollaboratorId: null,
  })
}

function applyEtapaToActivity(
  node: MatrixNodeTreeApi,
  et: CriarMatrizManualEtapa,
): MatrixNodeTreeApi {
  const r = reconcileEtapaCollaborators(et)
  const teamPrimary = r.teamIds[0]
  const teamIds = teamPrimary ? [teamPrimary] : []
  const supportIds = r.collaboratorIds
  return {
    ...node,
    name: r.name.trim(),
    planned_minutes: r.plannedMinutes,
    team_ids: teamIds,
    default_responsible_id: null,
    metadata_json: buildMatrixActivityMetadataJson(supportIds) ?? null,
  }
}

function blankSectorNode(
  parentTaskId: string,
  rootTaskId: string,
  orderIndex: number,
  id: string,
  levelDepth: number,
): MatrixNodeTreeApi {
  const now = new Date().toISOString()
  return {
    id,
    parent_id: parentTaskId,
    root_id: rootTaskId,
    node_type: 'SECTOR',
    code: null,
    name: 'Novo setor',
    description: null,
    order_index: orderIndex,
    level_depth: levelDepth,
    is_active: true,
    planned_minutes: null,
    default_responsible_id: null,
    team_ids: [],
    required: true,
    source_key: null,
    metadata_json: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    children: [],
  }
}

function blankActivityNode(
  parentSectorId: string,
  rootTaskId: string,
  orderIndex: number,
  id: string,
  levelDepth: number,
): MatrixNodeTreeApi {
  const now = new Date().toISOString()
  return {
    id,
    parent_id: parentSectorId,
    root_id: rootTaskId,
    node_type: 'ACTIVITY',
    code: null,
    name: 'Nova atividade',
    description: null,
    order_index: orderIndex,
    level_depth: levelDepth,
    is_active: true,
    planned_minutes: null,
    default_responsible_id: null,
    team_ids: [],
    required: true,
    source_key: null,
    metadata_json: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    children: [],
  }
}

function sectorsOf(task: MatrixNodeTreeApi): MatrixNodeTreeApi[] {
  return sortMatrixChildNodes(task).filter((c) => c.node_type === 'SECTOR')
}

function reorderList<T>(arr: T[], id: string, getId: (x: T) => string, dir: 'up' | 'down'): T[] {
  const i = arr.findIndex((x) => getId(x) === id)
  const j = dir === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= arr.length) return arr
  const next = [...arr]
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  return next
}

const BTN_GHOST =
  'shrink-0 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/90 disabled:opacity-40'
const BTN_GOLD =
  'shrink-0 rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm disabled:opacity-50'

function SortableMatrixDraftLi({
  id,
  className,
  children,
}: {
  id: string
  className?: string
  children: (drag: {
    attributes: ReturnType<typeof useSortable>['attributes']
    listeners: ReturnType<typeof useSortable>['listeners']
  }) => ReactNode
}) {
  const sortable = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }
  return (
    <li
      ref={sortable.setNodeRef}
      style={style}
      className={
        [className ?? '', sortable.isDragging ? 'opacity-70' : ''].filter(Boolean).join(' ') ||
        undefined
      }
    >
      {children({
        attributes: sortable.attributes,
        listeners: sortable.listeners,
      })}
    </li>
  )
}

export function CriarMatrizCatalogOpcaoDraftEditor({
  variant = 'default',
  catalogOrigin,
  draftRoot,
  onChange,
  matrixSuggestionCatalog,
  teams,
}: Props) {
  const task = draftRoot
  if (task.node_type !== 'TASK') {
    return (
      <p className="text-sm text-rose-300">Erro interno: raiz inválida.</p>
    )
  }

  const rootId = task.id
  const sectorLevel = Math.max(2, (task.level_depth ?? 1) + 1)
  const activityLevel = sectorLevel + 1

  function patchTask(next: MatrixNodeTreeApi) {
    onChange(next)
  }

  const sectors = sectorsOf(task)

  const rail = variant === 'contextRail'
  const shell = rail
    ? 'flex flex-col gap-3.5'
    : 'mt-4 space-y-6 rounded-xl border border-white/[0.06] bg-black/20 p-4'

  const labelCls = rail ? 'flex flex-col gap-0.5 text-[11px]' : 'block text-sm'
  const suggestCls = rail
    ? 'mt-0 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200'
    : 'mt-0 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100'
  const descCls = rail
    ? 'sgp-input-app mt-1 min-h-[52px] w-full resize-y rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200'
    : 'mt-1 min-h-[52px] w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100'

  const sectorShell = rail
    ? 'overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] ring-1 ring-white/[0.04]'
    : 'rounded-xl border border-white/[0.06] bg-black/15 p-4'

  const activityShell = rail
    ? 'rounded-lg border border-white/[0.06] bg-black/20 p-2.5 ring-1 ring-white/[0.03]'
    : 'rounded-lg border border-white/[0.05] bg-black/25 p-3'

  function addArea() {
    const id = nid()
    const order = sectors.length
    const child = blankSectorNode(
      task.id,
      rootId,
      order,
      id,
      sectorLevel,
    )
    patchTask({
      ...task,
      children: [...task.children, child],
    })
  }

  const sectorsList = (
    <SortableContext
      items={sectors.map((s) => s.id)}
      strategy={verticalListSortingStrategy}
    >
      <ul className={rail ? 'space-y-3' : 'space-y-6'}>
      {sectors.map((sector, si) => {
        const activities = sortMatrixChildNodes(sector).filter(
          (c) => c.node_type === 'ACTIVITY',
        )

        const addEtapaToSector = () => {
          const sid = nid()
          const order =
            activities.length === 0
              ? 0
              : Math.max(...activities.map((a) => a.order_index), -1) + 1
          const child = blankActivityNode(
            sector.id,
            rootId,
            order,
            sid,
            activityLevel,
          )
          patchTask(
            updateNodeDeep(task, sector.id, (sec) => ({
              ...sec,
              children: [...sec.children, child],
            })),
          )
        }

        const activityItems = (
          <SortableContext
            items={activities.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            {activities.map((act, ai) => {
          const etRec = activityToEtapa(act)

          return (
            <SortableMatrixDraftLi key={act.id} id={act.id} className={activityShell}>
              {({ attributes: actAttrs, listeners: actListeners }) => (
              <>
              <div className="flex flex-wrap items-start gap-2">
                <div className="flex shrink-0 flex-col items-center gap-0.5 border-r border-white/[0.08] pr-2 pt-0.5">
                  <span className="font-mono text-[9px] font-semibold tabular-nums text-slate-500">
                    {ai + 1}
                  </span>
                  <button
                    type="button"
                    {...actAttrs}
                    {...actListeners}
                    aria-label="Arrastar para reordenar atividade"
                    className="cursor-grab touch-none rounded-md border border-transparent px-1 py-1 text-[10px] leading-none text-slate-500 active:cursor-grabbing hover:border-white/12 hover:bg-white/[0.05]"
                  >
                    <span aria-hidden>⋮⋮</span>
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                  <label
                    className={
                      rail
                        ? 'block min-w-[160px] flex-1 flex-col gap-0.5 text-[11px]'
                        : 'block min-w-[160px] flex-1 text-sm'
                    }
                  >
                    {rail ? (
                      <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Atividade
                      </span>
                    ) : (
                      <span className="text-slate-500">Atividade {ai + 1}</span>
                    )}
                    <div className="mt-1">
                      <LabelSuggestField
                        value={act.name}
                        onChange={(next) =>
                          patchTask(
                            updateNodeDeep(task, act.id, (n) => ({
                              ...n,
                              name: next,
                            })),
                          )
                        }
                        catalogEntries={matrixSuggestionCatalog.activities}
                        placeholder="Nome da atividade"
                        inputClassName={
                          rail
                            ? 'mt-0 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200'
                            : 'mt-0 w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-slate-100'
                        }
                      />
                    </div>
                  </label>
                  <label className="block w-24 shrink-0 text-sm sm:w-28">
                    <span className="text-slate-500">Min</span>
                    <input
                      type="number"
                      min={0}
                      className={
                        rail
                          ? 'sgp-input-app mt-1 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 tabular-nums text-sm text-slate-200'
                          : 'mt-1 w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 tabular-nums text-slate-100'
                      }
                      value={act.planned_minutes ?? ''}
                      placeholder="—"
                      onChange={(ev) => {
                        const raw = ev.target.value
                        const pm =
                          raw === '' ? null : Number.parseInt(raw, 10)
                        patchTask(
                          updateNodeDeep(task, act.id, (n) => ({
                            ...n,
                            planned_minutes:
                              pm != null && !Number.isNaN(pm) ? pm : null,
                          })),
                        )
                      }}
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className={BTN_GHOST}
                      disabled={ai === 0}
                      onClick={() => {
                        const ordered = reorderList(
                          activities,
                          act.id,
                          (a) => a.id,
                          'up',
                        )
                        const reindexed = ordered.map((a, k) => ({
                          ...a,
                          order_index: k,
                        }))
                        patchTask(
                          updateNodeDeep(task, sector.id, (sec) => ({
                            ...sec,
                            children: [
                              ...reindexed,
                              ...sec.children.filter(
                                (c) => c.node_type !== 'ACTIVITY',
                              ),
                            ],
                          })),
                        )
                      }}
                    >
                      Subir
                    </button>
                    <button
                      type="button"
                      className={BTN_GHOST}
                      disabled={ai === activities.length - 1}
                      onClick={() => {
                        const ordered = reorderList(
                          activities,
                          act.id,
                          (a) => a.id,
                          'down',
                        )
                        const reindexed = ordered.map((a, k) => ({
                          ...a,
                          order_index: k,
                        }))
                        patchTask(
                          updateNodeDeep(task, sector.id, (sec) => ({
                            ...sec,
                            children: [
                              ...reindexed,
                              ...sec.children.filter(
                                (c) => c.node_type !== 'ACTIVITY',
                              ),
                            ],
                          })),
                        )
                      }}
                    >
                      Descer
                    </button>
                  </div>
                  {activities.length > 1 && (
                    <button
                      type="button"
                      className="self-end text-xs text-rose-300/90"
                      onClick={() =>
                        patchTask(
                          updateNodeDeep(task, sector.id, (sec) => ({
                            ...sec,
                            children: sec.children.filter(
                              (c) => c.id !== act.id,
                            ),
                          })),
                        )
                      }
                    >
                      Remover atividade
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 border-t border-white/[0.05] pt-3">
                <label
                  className={
                    rail
                      ? 'flex min-w-0 flex-col gap-1 text-[11px]'
                      : 'flex min-w-0 flex-col gap-1 text-sm'
                  }
                >
                  <span
                    className={
                      rail
                        ? 'text-[9px] font-bold uppercase tracking-wider text-slate-500'
                        : 'text-[11px] font-semibold uppercase tracking-wide text-slate-500'
                    }
                  >
                    Equipe padrão
                  </span>
                  <select
                    aria-label="Equipe padrão da atividade"
                    value={etRec.teamIds[0] ?? ''}
                    onChange={(ev) => {
                      const v = ev.target.value.trim()
                      patchTask(
                        updateNodeDeep(task, act.id, (n) => {
                          const cur = activityToEtapa(n)
                          return applyEtapaToActivity(n, {
                            ...cur,
                            teamIds: v ? [v] : [],
                            collaboratorIds: [],
                            primaryCollaboratorId: null,
                          })
                        }),
                      )
                    }}
                    className={
                      rail
                        ? 'sgp-input-app mt-0.5 w-full max-w-md rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200'
                        : 'mt-0.5 w-full max-w-md rounded border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-100'
                    }
                  >
                    <option value="">— Sem equipe padrão —</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-1.5 max-w-md text-[10px] leading-snug text-slate-500">
                  Use Equipe para representar funções operacionais, como Ajudante, Costura ou Montagem.
                  Colaboradores reais ficam na execução da Esteira.
                </p>
              </div>
              </>
              )}
            </SortableMatrixDraftLi>
          )
        })}
          </SortableContext>
        )

        return (
          <SortableMatrixDraftLi key={sector.id} id={sector.id} className={sectorShell}>
            {({ attributes: secAttrs, listeners: secListeners }) => (
            <>
            <div
              className={
                rail
                  ? 'flex flex-wrap items-start justify-between gap-2 border-b border-white/[0.06] p-2.5 sm:p-3'
                  : 'flex flex-wrap items-start justify-between gap-2'
              }
            >
              <div className="flex shrink-0 flex-col items-center gap-0.5 border-r border-white/[0.08] pr-2 pt-0.5">
                <span className="font-mono text-[10px] font-semibold tabular-nums text-slate-500">
                  {si + 1}
                </span>
                <button
                  type="button"
                  {...secAttrs}
                  {...secListeners}
                  aria-label="Arrastar para reordenar setor"
                  className="cursor-grab touch-none rounded-md border border-transparent px-1 py-1.5 text-sm leading-none text-slate-500 active:cursor-grabbing hover:border-white/12 hover:bg-white/[0.06]"
                >
                  <span aria-hidden className="font-mono text-[10px] tracking-tighter">
                    ⋮⋮
                  </span>
                </button>
              </div>
              <label
                className={
                  rail
                    ? 'block min-w-0 flex-1 flex-col gap-0.5 text-[11px]'
                    : 'block min-w-[180px] flex-1 text-sm'
                }
              >
                {rail ? (
                  <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Setor
                  </span>
                ) : (
                  <span className="text-slate-500">Setor {si + 1}</span>
                )}
                <div className={rail ? 'mt-0.5' : 'mt-1'}>
                  <LabelSuggestField
                    value={sector.name}
                    onChange={(next) =>
                      patchTask(
                        updateNodeDeep(task, sector.id, (n) => ({
                          ...n,
                          name: next,
                        })),
                      )
                    }
                    catalogEntries={matrixSuggestionCatalog.areas}
                    placeholder="Ex.: Mecânica"
                    inputClassName={suggestCls}
                  />
                </div>
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className={BTN_GHOST}
                  disabled={si === 0}
                  onClick={() => {
                    const ordered = reorderList(
                      sectors,
                      sector.id,
                      (s) => s.id,
                      'up',
                    )
                    const reindexed = ordered.map((s, k) => ({
                      ...s,
                      order_index: k,
                    }))
                    const rest = task.children.filter(
                      (c) => c.node_type !== 'SECTOR',
                    )
                    patchTask({
                      ...task,
                      children: [...reindexed, ...rest],
                    })
                  }}
                >
                  Subir
                </button>
                <button
                  type="button"
                  className={BTN_GHOST}
                  disabled={si === sectors.length - 1}
                  onClick={() => {
                    const ordered = reorderList(
                      sectors,
                      sector.id,
                      (s) => s.id,
                      'down',
                    )
                    const reindexed = ordered.map((s, k) => ({
                      ...s,
                      order_index: k,
                    }))
                    const rest = task.children.filter(
                      (c) => c.node_type !== 'SECTOR',
                    )
                    patchTask({
                      ...task,
                      children: [...reindexed, ...rest],
                    })
                  }}
                >
                  Descer
                </button>
                <button
                  type="button"
                  className="shrink-0 text-[11px] font-medium text-rose-300/90"
                  onClick={() =>
                    patchTask({
                      ...task,
                      children: task.children.filter(
                        (c) => c.id !== sector.id,
                      ),
                    })
                  }
                >
                  Remover setor
                </button>
              </div>
            </div>

            {rail ? (
              <div className="rounded-b-xl border-t border-white/[0.06] bg-black/10">
                <div className="border-b border-white/[0.06] bg-black/[0.08] px-2 py-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <h3 className="shrink-0 px-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Atividades
                    </h3>
                    <div
                      className="flex min-w-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto [scrollbar-width:thin]"
                      role="toolbar"
                      aria-label="Ações das atividades deste setor"
                    >
                      <button
                        type="button"
                        className={BTN_GOLD}
                        onClick={addEtapaToSector}
                      >
                        + Adicionar atividade
                      </button>
                    </div>
                  </div>
                </div>
                <ul className="space-y-1.5 px-2 py-2.5">{activityItems}</ul>
              </div>
            ) : (
              <>
                <ul className="mt-4 space-y-4">{activityItems}</ul>
                <button
                  type="button"
                  onClick={addEtapaToSector}
                  className={`mt-3 ${BTN_GOLD}`}
                >
                  + Atividade neste setor
                </button>
              </>
            )}
            </>
            )}
          </SortableMatrixDraftLi>
        )
      })}
    </ul>
    </SortableContext>
  )

  const addAreaBtn = (
    <button type="button" onClick={addArea} className={BTN_GOLD}>
      + Setor nesta tarefa
    </button>
  )

  return (
    <div className={shell}>
      {rail ? (
        <div className="border-b border-white/[0.06] pb-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] leading-tight">
            <span className="shrink-0 rounded border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
              Tarefa
            </span>
            <span className="shrink-0 text-slate-600" aria-hidden>
              ·
            </span>
            <span className="shrink-0 font-mono text-[10px] text-slate-500">
              ordem {task.order_index}
            </span>
            {catalogOrigin ? (
              <>
                <span className="shrink-0 text-slate-600" aria-hidden>
                  ·
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-slate-400"
                  title={`${catalogOrigin.matrixItemName} — ${catalogOrigin.taskName}`}
                >
                  {catalogOrigin.matrixItemName} — {catalogOrigin.taskName}
                </span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {!rail ? (
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Composição desta tarefa (rascunho local)
        </p>
      ) : null}

      <label className={labelCls}>
        <span className="text-slate-500">Nome da tarefa</span>
        <div className="mt-1">
          <LabelSuggestField
            value={task.name}
            onChange={(next) => patchTask({ ...task, name: next })}
            catalogEntries={matrixSuggestionCatalog.options}
            placeholder="Nome da tarefa"
            inputClassName={suggestCls}
          />
        </div>
      </label>

      <label className={labelCls}>
        <span className="text-slate-500">Descrição (opcional)</span>
        <textarea
          className={descCls}
          value={task.description ?? ''}
          onChange={(ev) =>
            patchTask({ ...task, description: ev.target.value || null })
          }
        />
      </label>

      {rail ? (
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-black/15 ring-1 ring-white/[0.04]">
          <div className="sticky top-0 z-20 rounded-t-xl border-b border-white/[0.1] bg-sgp-app-panel-deep/95 px-3 pb-3 pt-3 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:px-4">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <h2 className="shrink-0 px-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Composição
              </h2>
              <div className="flex flex-wrap justify-end gap-1.5">{addAreaBtn}</div>
            </div>
          </div>
          <div className="min-h-0 max-h-[min(68vh,40rem)] overflow-y-auto overscroll-contain bg-black/20 px-3 pb-3 pt-3 pr-0.5 sm:px-4 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent] lg:max-h-[min(56vh,calc(100dvh-16rem))]">
            {sectorsList}
          </div>
        </div>
      ) : (
        <>
          {sectorsList}
          {addAreaBtn}
        </>
      )}
    </div>
  )
}
