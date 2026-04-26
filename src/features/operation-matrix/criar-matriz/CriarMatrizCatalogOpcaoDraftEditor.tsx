import type { MatrixSuggestionCatalogData } from '../../../catalog/matrixSuggestion/types'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { Team } from '../../../domain/teams/team.types'
import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import { LabelSuggestField } from '../components/LabelSuggestField'
import { sortMatrixChildNodes } from './cloneCatalogTaskSubtreeForDraft'
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
  collaborators: Collaborator[]
  teams: Team[]
  collaboratorsLoading: boolean
  collaboratorsError: string | null
}

function nid(): string {
  return globalThis.crypto.randomUUID()
}

function collabOptionLabel(c: Collaborator): string {
  const base =
    c.fullName?.trim() ||
    c.nickname?.trim() ||
    c.email?.trim() ||
    c.code?.trim() ||
    'Colaborador'
  return c.code ? `${base} (${c.code})` : base
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
  const primary = node.default_responsible_id
  const support = parseMatrixActivitySupportIds(node.metadata_json)
  const collabIds = [
    ...new Set([
      ...(primary ? [primary] : []),
      ...support.filter((x) => x !== primary),
    ]),
  ]
  return reconcileEtapaCollaborators({
    id: node.id,
    name: node.name,
    plannedMinutes: node.planned_minutes,
    teamIds: [...(node.team_ids ?? [])],
    collaboratorIds: collabIds,
    primaryCollaboratorId: primary,
  })
}

function applyEtapaToActivity(
  node: MatrixNodeTreeApi,
  et: CriarMatrizManualEtapa,
): MatrixNodeTreeApi {
  const r = reconcileEtapaCollaborators(et)
  const primary = r.primaryCollaboratorId
  const supportIds = r.collaboratorIds.filter((x) => x !== primary)
  return {
    ...node,
    name: r.name.trim(),
    planned_minutes: r.plannedMinutes,
    team_ids: [...new Set(r.teamIds)],
    default_responsible_id: primary ?? null,
    metadata_json: buildMatrixActivityMetadataJson(supportIds) ?? null,
  }
}

function selectOptionsForRow(
  collaborators: Collaborator[],
  ids: string[],
  rowIndex: number,
): Collaborator[] {
  const currentId = ids[rowIndex]
  return collaborators.filter(
    (c) => c.id === currentId || !ids.includes(c.id),
  )
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
    name: 'Nova área',
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
    name: 'Nova etapa',
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

export function CriarMatrizCatalogOpcaoDraftEditor({
  variant = 'default',
  catalogOrigin,
  draftRoot,
  onChange,
  matrixSuggestionCatalog,
  collaborators,
  teams,
  collaboratorsLoading,
  collaboratorsError,
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

        const activityItems = activities.map((act, ai) => {
          const etRec = activityToEtapa(act)
          const ids = etRec.collaboratorIds
          const canAddCollab = collaborators.some((c) => !ids.includes(c.id))

          return (
            <li key={act.id} className={activityShell}>
              <div className="flex flex-wrap items-start gap-2">
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
                        Etapa
                      </span>
                    ) : (
                      <span className="text-slate-500">Etapa {ai + 1}</span>
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
                        placeholder="Nome da etapa"
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
                      Remover etapa
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 border-t border-white/[0.05] pt-3">
                <p
                  className={
                    rail
                      ? 'text-[9px] font-bold uppercase tracking-wider text-slate-500'
                      : 'text-[11px] font-semibold uppercase tracking-wide text-slate-500'
                  }
                >
                  Equipe de execução (opcional)
                </p>
                <div className="mt-2 space-y-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Times
                  </p>
                  <div className="max-h-24 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
                    {teams.map((team) => {
                      const checked = etRec.teamIds.includes(team.id)
                      return (
                        <label
                          key={`${act.id}-team-${team.id}`}
                          className="flex items-center gap-2 text-[11px] text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(ev) =>
                              patchTask(
                                updateNodeDeep(task, act.id, (n) => {
                                  const cur = activityToEtapa(n)
                                  const nextIds = ev.target.checked
                                    ? [...new Set([...cur.teamIds, team.id])]
                                    : cur.teamIds.filter((id) => id !== team.id)
                                  return applyEtapaToActivity(n, {
                                    ...cur,
                                    teamIds: nextIds,
                                  })
                                }),
                              )
                            }
                            className="rounded border-white/20"
                          />
                          <span className="truncate">{team.name}</span>
                        </label>
                      )
                    })}
                    {teams.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        Nenhum time disponível.
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Colaboradores
                </p>
                {collaboratorsLoading && (
                  <p className="mt-2 text-xs text-slate-500">
                    Carregando colaboradores…
                  </p>
                )}
                {collaboratorsError && (
                  <p className="mt-2 text-xs text-rose-300">
                    {collaboratorsError}
                  </p>
                )}
                {!collaboratorsLoading &&
                  !collaboratorsError &&
                  collaborators.length === 0 && (
                    <p className="mt-2 text-xs text-amber-200/90">
                      Não há colaboradores ativos.
                    </p>
                  )}
                {!collaboratorsLoading &&
                  !collaboratorsError &&
                  collaborators.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {ids.map((cid, idx) => {
                        const rowOptions = selectOptionsForRow(
                          collaborators,
                          ids,
                          idx,
                        )
                        return (
                          <div
                            key={`${act.id}-${cid}-${idx}`}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <select
                              className={
                                rail
                                  ? 'sgp-input-app min-w-[min(100%,12rem)] flex-1 rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200'
                                  : 'min-w-[min(100%,12rem)] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-100'
                              }
                              value={cid}
                              onChange={(ev) => {
                                const newId = ev.target.value
                                patchTask(
                                  updateNodeDeep(task, act.id, (n) => {
                                    const cur = activityToEtapa(n)
                                    const next = [...cur.collaboratorIds]
                                    if (next[idx] === newId) return n
                                    if (next.includes(newId)) return n
                                    next[idx] = newId
                                    return applyEtapaToActivity(n, {
                                      ...cur,
                                      collaboratorIds: next,
                                      primaryCollaboratorId:
                                        cur.primaryCollaboratorId,
                                    })
                                  }),
                                )
                              }}
                            >
                              {rowOptions.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {collabOptionLabel(c)}
                                </option>
                              ))}
                            </select>
                            <label className="flex items-center gap-1.5 text-xs text-slate-400">
                              <input
                                type="radio"
                                className="accent-sgp-gold"
                                name={`principal-${act.id}`}
                                checked={
                                  etRec.primaryCollaboratorId === cid
                                }
                                onChange={() =>
                                  patchTask(
                                    updateNodeDeep(task, act.id, (n) =>
                                      applyEtapaToActivity(n, {
                                        ...activityToEtapa(n),
                                        primaryCollaboratorId: cid,
                                      }),
                                    ),
                                  )
                                }
                              />
                              Principal
                            </label>
                            <button
                              type="button"
                              className="text-xs font-semibold text-rose-300/90"
                              onClick={() =>
                                patchTask(
                                  updateNodeDeep(task, act.id, (n) => {
                                    const cur = activityToEtapa(n)
                                    const next = cur.collaboratorIds.filter(
                                      (_, i) => i !== idx,
                                    )
                                    let prim = cur.primaryCollaboratorId
                                    if (prim === cid) prim = null
                                    return applyEtapaToActivity(n, {
                                      ...cur,
                                      collaboratorIds: next,
                                      primaryCollaboratorId: prim,
                                    })
                                  }),
                                )
                              }
                            >
                              Remover
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                <button
                  type="button"
                  disabled={!canAddCollab || collaborators.length === 0}
                  className={
                    rail
                      ? `mt-2 ${BTN_GOLD} disabled:opacity-40`
                      : 'mt-2 text-xs font-bold text-sgp-gold disabled:opacity-40'
                  }
                  onClick={() =>
                    patchTask(
                      updateNodeDeep(task, act.id, (n) => {
                        const cur = activityToEtapa(n)
                        const nextCollab = collaborators.find(
                          (c) => !cur.collaboratorIds.includes(c.id),
                        )
                        if (!nextCollab) return n
                        const nextIds = [...cur.collaboratorIds, nextCollab.id]
                        let prim = cur.primaryCollaboratorId
                        if (nextIds.length === 1) {
                          prim = nextIds[0]!
                        }
                        return applyEtapaToActivity(n, {
                          ...cur,
                          collaboratorIds: nextIds,
                          primaryCollaboratorId: prim,
                        })
                      }),
                    )
                  }
                >
                  + Colaborador
                </button>
                {ids.length > 1 && !etRec.primaryCollaboratorId && (
                  <p className="mt-2 text-xs text-amber-200/90">
                    Indique quem é o principal.
                  </p>
                )}
              </div>
            </li>
          )
        })

        return (
          <li key={sector.id} className={sectorShell}>
            <div
              className={
                rail
                  ? 'flex flex-wrap items-start justify-between gap-2 border-b border-white/[0.06] p-2.5 sm:p-3'
                  : 'flex flex-wrap items-start justify-between gap-2'
              }
            >
              <label
                className={
                  rail
                    ? 'block min-w-0 flex-1 flex-col gap-0.5 text-[11px]'
                    : 'block min-w-[180px] flex-1 text-sm'
                }
              >
                {rail ? (
                  <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Área
                  </span>
                ) : (
                  <span className="text-slate-500">Área {si + 1}</span>
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
                  Remover área
                </button>
              </div>
            </div>

            {rail ? (
              <div className="rounded-b-xl border-t border-white/[0.06] bg-black/10">
                <div className="border-b border-white/[0.06] bg-black/[0.08] px-2 py-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <h3 className="shrink-0 px-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Etapas
                    </h3>
                    <div
                      className="flex min-w-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto [scrollbar-width:thin]"
                      role="toolbar"
                      aria-label="Ações das etapas desta área"
                    >
                      <button
                        type="button"
                        className={BTN_GOLD}
                        onClick={addEtapaToSector}
                      >
                        + Adicionar etapa
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
                  + Etapa nesta área
                </button>
              </>
            )}
          </li>
        )
      })}
    </ul>
  )

  const addAreaBtn = (
    <button type="button" onClick={addArea} className={BTN_GOLD}>
      + Área nesta opção
    </button>
  )

  return (
    <div className={shell}>
      {rail ? (
        <div className="border-b border-white/[0.06] pb-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] leading-tight">
            <span className="shrink-0 rounded border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
              Opção
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
          Composição desta opção (rascunho local)
        </p>
      ) : null}

      <label className={labelCls}>
        <span className="text-slate-500">Nome da opção</span>
        <div className="mt-1">
          <LabelSuggestField
            value={task.name}
            onChange={(next) => patchTask({ ...task, name: next })}
            catalogEntries={matrixSuggestionCatalog.options}
            placeholder="Nome da opção"
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
