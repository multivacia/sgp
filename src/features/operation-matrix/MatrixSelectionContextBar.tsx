import { useEffect, useRef, type FormEvent } from 'react'
import type {
  LabelCatalogEntry,
  MatrixSuggestionCatalogData,
} from '../../catalog/matrixSuggestion/types'
import type { MatrixNodeTreeApi, MatrixNodeType } from '../../domain/operation-matrix/operation-matrix.types'
import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import type { Team } from '../../domain/teams/team.types'
import type { MatrixTreeAggregateMaps } from './matrixTreeAggregates'
import { getBranchStats } from './matrixTreeAggregates'
import type { BreadcrumbSegment } from './matrixTreeBreadcrumb'
import { breadcrumbLabel } from './matrixTreeBreadcrumb'
import { LabelSuggestField } from './components/LabelSuggestField'
import { TaskCompositionPanel } from './TaskCompositionPanel'

const ctxSeg =
  'rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 ring-1 ring-white/[0.03]'

function catalogEntriesForNodeType(
  t: MatrixNodeType,
  c: MatrixSuggestionCatalogData,
): readonly LabelCatalogEntry[] {
  if (t === 'TASK') return c.options
  if (t === 'SECTOR') return c.areas
  if (t === 'ACTIVITY') return c.activities
  return []
}

function SectorBranchSummaryCompact({
  stats,
}: {
  stats: ReturnType<typeof getBranchStats>
}) {
  return (
    <div className={ctxSeg}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
        Resumo desta área
      </p>
      <dl className="mt-1.5 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
        <div>
          <dt className="text-slate-600">Etapas</dt>
          <dd className="font-medium tabular-nums text-slate-200">{stats.activityCount}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Min</dt>
          <dd className="font-medium tabular-nums text-slate-200">
            {stats.plannedMinutesSum}
          </dd>
        </div>
        <div>
          <dt className="text-slate-600">Sem resp.</dt>
          <dd className="font-medium tabular-nums text-amber-200/90">
            {stats.activitiesWithoutResponsibleInBranch}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function ItemMetricsPanelCompact({
  global: g,
}: {
  global: MatrixTreeAggregateMaps['global']
}) {
  return (
    <div className={ctxSeg}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
        Panorama da oferta
      </p>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] sm:grid-cols-3">
        <div>
          <dt className="text-slate-600">Opções</dt>
          <dd className="font-medium tabular-nums text-slate-200">{g.taskCount}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Áreas</dt>
          <dd className="font-medium tabular-nums text-slate-200">{g.sectorCount}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Etapas</dt>
          <dd className="font-medium tabular-nums text-slate-200">{g.activityCount}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Min planej.</dt>
          <dd className="font-medium tabular-nums text-slate-200">{g.plannedMinutesSum}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Resp. vinc.</dt>
          <dd className="font-medium tabular-nums text-slate-200">
            {g.linkedDistinctResponsibles}
          </dd>
        </div>
        <div>
          <dt className="text-slate-600">Sem padrão</dt>
          <dd className="font-medium tabular-nums text-amber-200/90">
            {g.activitiesWithoutResponsible}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export type MatrixSelectionContextBarProps = {
  selected: MatrixNodeTreeApi | null
  /** Task cuja composição (áreas/etapas) deve aparecer; inclui ancestral quando a seleção é setor/etapa. */
  compositionTask: MatrixNodeTreeApi | null
  breadcrumbSegments: BreadcrumbSegment[]
  aggregateMaps: MatrixTreeAggregateMaps | null
  selectedBranchStats: ReturnType<typeof getBranchStats> | null
  typeLabel: Record<MatrixNodeType, string>
  addChildCta: Record<MatrixNodeType, string>
  formName: string
  setFormName: (v: string) => void
  formCode: string
  setFormCode: (v: string) => void
  formDescription: string
  setFormDescription: (v: string) => void
  formActive: boolean
  setFormActive: (v: boolean) => void
  formPlanned: string
  setFormPlanned: (v: string) => void
  formResponsible: string
  setFormResponsible: (v: string) => void
  formTeamIds: string[]
  setFormTeamIds: (v: string[]) => void
  formRequired: boolean
  setFormRequired: (v: boolean) => void
  collaborators: Collaborator[]
  teams: Team[]
  collaboratorIdSet: ReadonlySet<string>
  teamIdSet: ReadonlySet<string>
  responsibleIsOrphan: boolean
  busy: boolean
  canAddChild: boolean
  childType: MatrixNodeType | null
  addOpen: boolean
  setAddOpen: (v: boolean) => void
  addName: string
  setAddName: (v: string) => void
  onSave: () => void | Promise<void>
  onCancel: () => void
  onDelete: () => void
  onAddChild: (e: FormEvent) => void
  collaboratorIdToName: ReadonlyMap<string, string>
  selectedId: string | null
  activePathIds: ReadonlySet<string>
  onSelectNode: (id: string) => void
  searchQuery: string
  matchIds: ReadonlySet<string>
  /** TASK: composição (áreas/etapas) vs edição de metadados da opção. */
  taskPanelMode: 'composition' | 'editTaskMeta'
  onDuplicateSector?: (sectorId: string) => void | Promise<void>
  onRemoveSector?: (sectorId: string) => void | Promise<void>
  onAddActivityToSector?: (sectorId: string) => void | Promise<void>
  onReorderActivityInSector?: (
    sectorId: string,
    direction: 'up' | 'down',
  ) => void | Promise<void>
  onDuplicateActivity?: (activityId: string) => void | Promise<void>
  onRemoveActivity?: (activityId: string) => void | Promise<void>
  /** Subir/Descer áreas no cabeçalho (igual ao catálogo de opções). */
  onCompositionSectorReorder?: (direction: 'up' | 'down') => void | Promise<void>
  compositionSectorReorderUpDisabled?: boolean
  compositionSectorReorderDownDisabled?: boolean
  /** Etapa: mostrar formulário só quando true (clique na linha = só seleção). */
  activityEditMode?: boolean
  onEditActivity?: (activityId: string) => void
  /** Catálogos locais (Opção / Área / Atividade); só preenchem texto. */
  matrixSuggestionCatalog?: MatrixSuggestionCatalogData
}

/** Painel contextual da seleção — leitura em coluna, scroll próprio (rail à direita na página de matriz). */
export function MatrixSelectionContextBar({
  selected,
  compositionTask,
  breadcrumbSegments,
  aggregateMaps,
  selectedBranchStats,
  typeLabel,
  addChildCta,
  formName,
  setFormName,
  formCode,
  setFormCode,
  formDescription,
  setFormDescription,
  formActive,
  setFormActive,
  formPlanned,
  setFormPlanned,
  formResponsible,
  setFormResponsible,
  formTeamIds,
  setFormTeamIds,
  formRequired,
  setFormRequired,
  collaborators,
  teams,
  collaboratorIdSet,
  teamIdSet,
  responsibleIsOrphan,
  busy,
  canAddChild,
  childType,
  addOpen,
  setAddOpen,
  addName,
  setAddName,
  onSave,
  onCancel,
  onDelete,
  onAddChild,
  collaboratorIdToName,
  selectedId,
  activePathIds,
  onSelectNode,
  searchQuery,
  matchIds,
  taskPanelMode,
  onDuplicateSector,
  onRemoveSector,
  onAddActivityToSector,
  onReorderActivityInSector,
  onDuplicateActivity,
  onRemoveActivity,
  onCompositionSectorReorder,
  compositionSectorReorderUpDisabled = true,
  compositionSectorReorderDownDisabled = true,
  activityEditMode = false,
  onEditActivity,
  matrixSuggestionCatalog = {
    options: [],
    areas: [],
    activities: [],
  },
}: MatrixSelectionContextBarProps) {
  const pathLine = breadcrumbLabel(breadcrumbSegments)
  const taskEditMetaMode =
    selected?.node_type === 'TASK' && taskPanelMode === 'editTaskMeta'
  const taskCompositionMode =
    selected?.node_type === 'TASK' && taskPanelMode === 'composition'
  const showCompositionPanel =
    compositionTask != null && aggregateMaps != null && !taskEditMetaMode

  const showCompositionToolbarAdd =
    taskCompositionMode && canAddChild && childType && !addOpen
  const showCompositionToolbarReorder = onCompositionSectorReorder != null

  const activityBrowseOnly =
    selected?.node_type === 'ACTIVITY' && !activityEditMode

  const panelScrollRef = useRef<HTMLDivElement | null>(null)
  const panelFooterRef = useRef<HTMLDivElement | null>(null)
  const savedScrollTopRef = useRef<number | null>(null)
  const lastActivityScrollForIdRef = useRef<string | null>(null)

  function applySavedPanelScroll() {
    const el = panelScrollRef.current
    const y = savedScrollTopRef.current
    if (el == null || y == null) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const max = Math.max(0, el.scrollHeight - el.clientHeight)
        el.scrollTop = Math.min(y, max)
        savedScrollTopRef.current = null
      })
    })
  }

  /** Só setor: alinhar a linha da composição; etapa usa fluxo dedicado (rodapé de edição). */
  useEffect(() => {
    if (!selectedId || !selected) return
    if (selected.node_type !== 'SECTOR') return
    const t = window.setTimeout(() => {
      const id =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(selectedId)
          : selectedId
      const el = document.querySelector(`[data-matrix-panel-focus="${id}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
    return () => window.clearTimeout(t)
  }, [selectedId, selected, compositionTask?.id])

  useEffect(() => {
    if (!selected || selected.node_type !== 'ACTIVITY') {
      savedScrollTopRef.current = null
      lastActivityScrollForIdRef.current = null
      return
    }
    if (!selectedId) return
    if (lastActivityScrollForIdRef.current === selectedId) return
    lastActivityScrollForIdRef.current = selectedId

    const panel = panelScrollRef.current
    const footer = panelFooterRef.current
    if (!panel || !footer) return

    savedScrollTopRef.current = panel.scrollTop
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        footer.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    })
  }, [selectedId, selected])

  async function handleSaveClick() {
    if (busy) return
    try {
      await Promise.resolve(onSave())
    } finally {
      if (selected?.node_type === 'ACTIVITY' && savedScrollTopRef.current != null) {
        applySavedPanelScroll()
      }
    }
  }

  function handleCancelClick() {
    if (busy) return
    onCancel()
    if (selected?.node_type === 'ACTIVITY' && savedScrollTopRef.current != null) {
      applySavedPanelScroll()
    }
  }

  const orphanTeamIds = formTeamIds.filter((id) => !teamIdSet.has(id))

  return (
    <div
      ref={panelScrollRef}
      className="max-h-[min(72vh,760px)] overflow-y-auto overscroll-contain rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/50 px-3 pb-2.5 pt-2 shadow-inner ring-1 ring-white/[0.04] [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent] sm:px-4 sm:pb-3 sm:pt-2.5 lg:max-h-[calc(100dvh-5.75rem)]"
      role="region"
      aria-label="Composição e ajustes da seleção"
    >
        {!selected ? (
          <p className="text-xs leading-relaxed text-slate-500">
            Selecione uma oferta, opção ou etapa no catálogo à esquerda para ver detalhes e ajustes.
          </p>
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="border-b border-white/[0.06] pb-2.5">
              <div className="flex min-w-0 items-center gap-1.5 text-[11px] leading-tight">
                <span className="shrink-0 rounded border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                  {typeLabel[selected.node_type]}
                </span>
                {selected.node_type !== 'ITEM' ? (
                  <>
                    <span className="shrink-0 text-slate-600" aria-hidden>
                      ·
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">
                      ordem {selected.order_index}
                    </span>
                  </>
                ) : null}
                <span className="shrink-0 text-slate-600" aria-hidden>
                  ·
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-slate-400"
                  title={pathLine}
                >
                  {pathLine}
                </span>
              </div>
            </div>

            {showCompositionPanel && compositionTask && aggregateMaps ? (
              <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-black/15 ring-1 ring-white/[0.04]">
                {/* Sticky no scroll da barra + lista com scroll próprio (como Opções de serviço). */}
                <div
                  className="sticky top-0 z-20 rounded-t-xl border-b border-white/[0.1] bg-sgp-app-panel-deep/95 px-3 pb-3 pt-3 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:px-4"
                >
                  <div className="flex shrink-0 flex-col gap-3">
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <h2 className="shrink-0 px-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Composição
                    </h2>
                    {showCompositionToolbarAdd ||
                    showCompositionToolbarReorder ? (
                      <div
                        className="flex min-w-0 w-full flex-nowrap items-center justify-end gap-1.5 overflow-x-auto sm:ml-auto sm:w-auto [scrollbar-width:thin]"
                        role="toolbar"
                        aria-label="Ações da composição"
                      >
                        {showCompositionToolbarAdd ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setAddOpen(true)}
                            className="shrink-0 rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm disabled:opacity-50"
                          >
                            + {addChildCta[selected.node_type]}
                          </button>
                        ) : null}
                        {showCompositionToolbarReorder ? (
                          <>
                            <button
                              type="button"
                              disabled={
                                busy || compositionSectorReorderUpDisabled
                              }
                              onClick={() =>
                                void onCompositionSectorReorder?.('up')
                              }
                              className="shrink-0 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/90 disabled:opacity-40"
                            >
                              Subir
                            </button>
                            <button
                              type="button"
                              disabled={
                                busy || compositionSectorReorderDownDisabled
                              }
                              onClick={() =>
                                void onCompositionSectorReorder?.('down')
                              }
                              className="shrink-0 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/90 disabled:opacity-40"
                            >
                              Descer
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {taskCompositionMode && canAddChild && childType && addOpen ? (
                    <div className={ctxSeg}>
                      <form
                        onSubmit={(e) => void onAddChild(e)}
                        className="flex flex-col gap-1.5"
                      >
                        <label className="flex flex-col gap-0.5 text-[11px]">
                          <span className="text-slate-500">Novo {typeLabel[childType]}</span>
                          {childType === 'TASK' ||
                          childType === 'SECTOR' ||
                          childType === 'ACTIVITY' ? (
                            <LabelSuggestField
                              value={addName}
                              onChange={setAddName}
                              catalogEntries={catalogEntriesForNodeType(
                                childType,
                                matrixSuggestionCatalog,
                              )}
                              disabled={busy}
                              placeholder="Nome"
                            />
                          ) : (
                            <input
                              value={addName}
                              onChange={(e) => setAddName(e.target.value)}
                              placeholder="Nome"
                              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200"
                            />
                          )}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="submit"
                            disabled={busy}
                            className="rounded-lg bg-sgp-gold/20 px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm disabled:opacity-50"
                          >
                            Criar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddOpen(false)
                              setAddName('')
                            }}
                            className="text-[11px] text-slate-500"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : null}
                  </div>
                </div>
                <div
                  className="min-h-0 max-h-[min(68vh,40rem)] overflow-y-auto overscroll-contain bg-black/20 px-3 pb-3 pt-3 pr-0.5 sm:px-4 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent] lg:max-h-[min(56vh,calc(100dvh-16rem))]"
                  role="region"
                  aria-label="Lista de áreas e etapas"
                >
                  <TaskCompositionPanel
                    task={compositionTask}
                    aggregateMaps={aggregateMaps}
                    collaboratorIdToName={collaboratorIdToName}
                    selectedId={selectedId}
                    activePathIds={activePathIds}
                    onSelectNode={onSelectNode}
                    searchQuery={searchQuery}
                    matchIds={matchIds}
                    showHeading={false}
                    onDuplicateSector={onDuplicateSector}
                    onRemoveSector={onRemoveSector}
                    sectorActionsBusy={busy}
                    onAddActivityToSector={onAddActivityToSector}
                    onReorderActivityInSector={onReorderActivityInSector}
                    onDuplicateActivity={onDuplicateActivity}
                    onRemoveActivity={onRemoveActivity}
                    onEditActivity={onEditActivity}
                  />
                </div>
              </div>
            ) : null}

            {taskCompositionMode ? null : (
              <>
            <div
              className={
                showCompositionPanel
                  ? 'border-t border-white/[0.06] pt-4'
                  : undefined
              }
            >
            {activityBrowseOnly ? (
              <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
                Etapa selecionada. Use{' '}
                <span className="font-medium text-slate-300">Editar</span> na
                linha da etapa para alterar nome, tempo previsto e responsável.
              </p>
            ) : (
            <div className="flex flex-col gap-4">
              <div className="space-y-2.5">
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Nome</span>
                  {selected.node_type === 'TASK' ||
                  selected.node_type === 'SECTOR' ||
                  selected.node_type === 'ACTIVITY' ? (
                    <LabelSuggestField
                      value={formName}
                      onChange={setFormName}
                      catalogEntries={catalogEntriesForNodeType(
                        selected.node_type,
                        matrixSuggestionCatalog,
                      )}
                      disabled={busy}
                    />
                  ) : (
                    <input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200"
                    />
                  )}
                </label>
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Código</span>
                  <input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Descrição</span>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    className="sgp-input-app min-h-[3rem] resize-y rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200"
                  />
                </label>
                {selected.node_type === 'ITEM' ? (
                  <label className="flex items-center gap-2 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="rounded border-white/20"
                    />
                    Oferta ativa para o cliente
                  </label>
                ) : null}
                {selected.node_type === 'TASK' ? (
                  <label className="flex items-center gap-2 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="rounded border-white/20"
                    />
                    Opção ativa no catálogo
                  </label>
                ) : null}
                {selected.node_type === 'TASK' ||
                selected.node_type === 'SECTOR' ||
                selected.node_type === 'ACTIVITY' ? (
                  <p className="rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[11px] text-slate-500">
                    Ordem na lista:{' '}
                    <span className="font-mono text-slate-300">{selected.order_index}</span>
                    . Use Subir e Descer na área{' '}
                    <span className="text-slate-400">Opções de serviço</span>.
                  </p>
                ) : null}
              </div>

              {selected.node_type === 'ACTIVITY' ? (
                <div className="space-y-2.5">
                  {!selected.default_responsible_id?.trim() ? (
                    <div
                      role="status"
                      className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100/90"
                    >
                      Sem responsável padrão.
                    </div>
                  ) : null}
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Equipe de execução
                  </p>
                  <div className="space-y-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Times
                    </p>
                    <div className="max-h-28 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
                      {teams.map((team) => {
                        const checked = formTeamIds.includes(team.id)
                        return (
                          <label
                            key={team.id}
                            className="flex items-center gap-2 text-[11px] text-slate-300"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormTeamIds([...new Set([...formTeamIds, team.id])])
                                  return
                                }
                                setFormTeamIds(formTeamIds.filter((id) => id !== team.id))
                              }}
                              className="rounded border-white/20"
                            />
                            <span className="truncate">{team.name}</span>
                          </label>
                        )
                      })}
                      {teams.length === 0 ? (
                        <p className="text-[11px] text-slate-500">Nenhum time disponível.</p>
                      ) : null}
                      {orphanTeamIds.map((id) => (
                        <label
                          key={id}
                          className="flex items-center gap-2 text-[11px] text-rose-200/90"
                        >
                          <input
                            type="checkbox"
                            checked
                            onChange={() =>
                              setFormTeamIds(formTeamIds.filter((x) => x !== id))
                            }
                            className="rounded border-white/20"
                          />
                          <span className="truncate">ID importado (sem cadastro)</span>
                        </label>
                      ))}
                    </div>
                    {orphanTeamIds.length > 0 ? (
                      <p className="text-[11px] text-rose-200/90">
                        Time(s) vinculado(s) sem cadastro ativo.
                      </p>
                    ) : null}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Colaboradores
                  </p>
                  <label className="flex flex-col gap-0.5 text-[11px]">
                    <span className="text-slate-500">Tempo previsto (min)</span>
                    <input
                      inputMode="numeric"
                      value={formPlanned}
                      onChange={(e) => setFormPlanned(e.target.value)}
                      className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 text-[11px]">
                    <span className="text-slate-500">Responsável padrão</span>
                    <select
                      value={formResponsible}
                      onChange={(e) => setFormResponsible(e.target.value)}
                      className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200"
                    >
                      <option value="">— Nenhum —</option>
                      {collaborators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName}
                        </option>
                      ))}
                      {formResponsible && !collaboratorIdSet.has(formResponsible) ? (
                        <option value={formResponsible}>
                          ID importado (sem cadastro)
                        </option>
                      ) : null}
                    </select>
                  </label>
                  {responsibleIsOrphan ? (
                    <p className="text-[11px] text-rose-200/90">
                      ID sem colaborador ativo.
                    </p>
                  ) : null}
                  <label className="flex items-center gap-2 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={formRequired}
                      onChange={(e) => setFormRequired(e.target.checked)}
                      className="rounded border-white/20"
                    />
                    Obrigatória
                  </label>
                </div>
              ) : null}

              {selected.node_type === 'ITEM' && aggregateMaps ? (
                <ItemMetricsPanelCompact global={aggregateMaps.global} />
              ) : null}
              {selected.node_type === 'SECTOR' && selectedBranchStats ? (
                <SectorBranchSummaryCompact stats={selectedBranchStats} />
              ) : null}

              {canAddChild && childType ? (
                <div className="border-t border-white/[0.06] pt-3">
                  <div className={ctxSeg}>
                    {!addOpen ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setAddOpen(true)}
                        className="w-full rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2 py-1.5 text-[11px] font-semibold text-sgp-gold-warm"
                      >
                        + {addChildCta[selected.node_type]}
                      </button>
                    ) : (
                      <form
                        onSubmit={(e) => void onAddChild(e)}
                        className="flex flex-col gap-1.5"
                      >
                        <label className="flex flex-col gap-0.5 text-[11px]">
                          <span className="text-slate-500">Novo {typeLabel[childType]}</span>
                          {childType === 'TASK' ||
                          childType === 'SECTOR' ||
                          childType === 'ACTIVITY' ? (
                            <LabelSuggestField
                              value={addName}
                              onChange={setAddName}
                              catalogEntries={catalogEntriesForNodeType(
                                childType,
                                matrixSuggestionCatalog,
                              )}
                              disabled={busy}
                              placeholder="Nome"
                            />
                          ) : (
                            <input
                              value={addName}
                              onChange={(e) => setAddName(e.target.value)}
                              placeholder="Nome"
                              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200"
                            />
                          )}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="submit"
                            disabled={busy}
                            className="rounded-lg bg-sgp-gold/20 px-2 py-1 text-[11px] font-semibold text-sgp-gold-warm disabled:opacity-50"
                          >
                            Criar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddOpen(false)
                              setAddName('')
                            }}
                            className="text-[11px] text-slate-500"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ) : null}

              <div
                ref={panelFooterRef}
                data-matrix-panel-edit-footer
                className="mt-4 border-t border-white/[0.08] pt-4"
                role="region"
                aria-label="Ações finais da seleção"
              >
                <p className="mb-2.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Ações
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSaveClick()}
                      className="sgp-cta-primary min-w-[5.5rem] flex-1 !px-3 !py-2 text-xs font-medium disabled:opacity-50 sm:flex-none"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleCancelClick}
                      className="min-w-[5.5rem] flex-1 rounded-lg border border-white/14 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/85 transition hover:border-white/22 hover:bg-white/[0.06] disabled:opacity-50 sm:flex-none"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className={ctxSeg}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDelete()}
                      className="w-full rounded-lg border border-rose-500/45 bg-rose-500/12 px-2 py-1.5 text-[11px] font-semibold text-rose-50/95 disabled:opacity-50"
                    >
                      Remover da composição
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}
            </div>
              </>
            )}
          </div>
        )}
    </div>
  )
}
