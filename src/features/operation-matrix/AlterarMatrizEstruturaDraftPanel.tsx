import type { FormEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import type { MatrixSuggestionCatalogData } from '../../catalog/matrixSuggestion/types'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import { LabelSuggestField } from './components/LabelSuggestField'
import { OperationMatrixTaskGrid } from './OperationMatrixTaskGrid'
import { TaskCompositionPanel } from './TaskCompositionPanel'
import type { MatrixTreeAggregateMaps } from './matrixTreeAggregates'
import { getTaskAggregate } from './treeAggregates'
import {
  NOVA_MATRIZ_ESTRUTURA_DND_MIME,
  parseNovaMatrizEstruturaDrag,
} from './criar-matriz/novaMatrizEstruturaDnD'
import { computeInsertIndexFromPointerAndRows } from './criar-matriz/novaMatrizCatalogDropInsert'

export type AlterarMatrizEstruturaDraftPanelProps = {
  tree: MatrixNodeTreeApi
  parentMap: ReadonlyMap<string, string | null>
  selectedId: string | null
  selected: MatrixNodeTreeApi | null
  activePathIds: ReadonlySet<string>
  aggregateMaps: MatrixTreeAggregateMaps
  collaboratorIdToName: ReadonlyMap<string, string>
  searchQuery: string
  matchIds: ReadonlySet<string>
  busy: boolean
  matrixSuggestionCatalog: MatrixSuggestionCatalogData
  structureExpandedTaskIds: ReadonlySet<string>
  onToggleTaskCompositionExpanded: (taskId: string) => void
  onSelectTaskComposition: (id: string) => void
  onSelectTaskEditMeta: (id: string) => void
  onReorder: (dir: 'up' | 'down') => void
  onAddServiceOption: (
    name: string,
    description?: string,
  ) => void | Promise<void>
  onRemoveTaskFromCatalog: (taskId: string) => void | Promise<void>
  onDuplicateTask: (taskId: string) => void | Promise<void>
  onDuplicateSector: (sectorId: string) => void | Promise<void>
  onRemoveSector: (sectorId: string) => void | Promise<void>
  onAddActivityToSector: (sectorId: string) => void | Promise<void>
  onReorderActivityInSector: (
    sectorId: string,
    dir: 'up' | 'down',
  ) => void | Promise<void>
  onDuplicateActivity: (activityId: string) => void | Promise<void>
  onRemoveActivity: (activityId: string) => void | Promise<void>
  onEditActivity: (activityId: string) => void
  serviceOptionAddOpen: boolean
  setServiceOptionAddOpen: (v: boolean) => void
  serviceOptionNewName: string
  setServiceOptionNewName: (v: string) => void
  serviceOptionNewDescription: string
  setServiceOptionNewDescription: (v: string) => void
  /** Soltar tarefa do catálogo (taskId na matriz origem) na posição calculada. */
  onDropCatalogTask: (catalogSourceTaskId: string, insertIndex: number) => void
  showDraftIntro?: boolean
}

export function AlterarMatrizEstruturaDraftPanel({
  tree,
  parentMap,
  selectedId,
  selected,
  activePathIds,
  aggregateMaps,
  collaboratorIdToName,
  searchQuery,
  matchIds,
  busy,
  matrixSuggestionCatalog,
  structureExpandedTaskIds,
  onToggleTaskCompositionExpanded,
  onSelectTaskComposition,
  onSelectTaskEditMeta,
  onReorder,
  onAddServiceOption,
  onRemoveTaskFromCatalog,
  onDuplicateTask,
  onDuplicateSector,
  onRemoveSector,
  onAddActivityToSector,
  onReorderActivityInSector,
  onDuplicateActivity,
  onRemoveActivity,
  onEditActivity,
  serviceOptionAddOpen: addOpen,
  setServiceOptionAddOpen: setAddOpen,
  serviceOptionNewName: newName,
  setServiceOptionNewName: setNewName,
  serviceOptionNewDescription: newDescription,
  setServiceOptionNewDescription: setNewDescription,
  onDropCatalogTask,
  showDraftIntro = true,
}: AlterarMatrizEstruturaDraftPanelProps) {
  const [dropHighlight, setDropHighlight] = useState(false)
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  function setRowRef(taskId: string, el: HTMLDivElement | null) {
    if (el) rowRefs.current.set(taskId, el)
    else rowRefs.current.delete(taskId)
  }

  const taskNodes = useMemo(
    () =>
      tree.children
        .filter((c) => c.node_type === 'TASK')
        .slice()
        .sort(
          (a, b) =>
            a.order_index - b.order_index ||
            a.name.localeCompare(b.name, 'pt-BR'),
        ),
    [tree],
  )

  const taskAggregates = useMemo(() => {
    const m = new Map<string, ReturnType<typeof getTaskAggregate>>()
    for (const t of taskNodes) {
      m.set(t.id, getTaskAggregate(aggregateMaps, t.id))
    }
    return m
  }, [taskNodes, aggregateMaps])

  function handleDragOverDraft(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(NOVA_MATRIZ_ESTRUTURA_DND_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDragEnterDraft(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(NOVA_MATRIZ_ESTRUTURA_DND_MIME)) return
    e.preventDefault()
    setDropHighlight(true)
  }

  function handleDragLeaveDraft(e: React.DragEvent) {
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    setDropHighlight(false)
  }

  function handleDropOnDraft(e: React.DragEvent) {
    e.preventDefault()
    setDropHighlight(false)
    const raw = e.dataTransfer.getData(NOVA_MATRIZ_ESTRUTURA_DND_MIME)
    const p = parseNovaMatrizEstruturaDrag(raw)
    if (p?.kind !== 'catalog-task') return
    const orderedIds = taskNodes.map((t) => t.id)
    const insertIndex = computeInsertIndexFromPointerAndRows(
      e.clientY,
      orderedIds,
      (id) => rowRefs.current.get(id),
    )
    onDropCatalogTask(p.taskId, insertIndex)
  }

  async function handleSubmitAdd(e: FormEvent) {
    e.preventDefault()
    const n = newName.trim()
    if (!n) return
    try {
      await Promise.resolve(onAddServiceOption(n, newDescription.trim() || undefined))
      setNewName('')
      setNewDescription('')
      setAddOpen(false)
    } catch {
      /* toast no page */
    }
  }

  const reorderDisabled =
    busy || !selected || selected.node_type === 'ITEM'

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/50 px-3 py-3 shadow-inner ring-1 ring-white/[0.04] sm:px-4 ${
        dropHighlight
          ? 'border-sgp-gold/45 ring-2 ring-sgp-gold/25 bg-sgp-gold/[0.03]'
          : ''
      }`}
      role="region"
      aria-label="Estrutura da matriz atual"
      onDragEnter={handleDragEnterDraft}
      onDragLeave={handleDragLeaveDraft}
      onDragOver={handleDragOverDraft}
      onDrop={handleDropOnDraft}
    >
      {showDraftIntro ? (
        <div className="shrink-0 border-b border-white/[0.06] pb-3">
          <h2 className="font-heading text-sm font-semibold text-slate-100">
            Rascunho da matriz
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            Arraste tarefas do catálogo à esquerda. Edite nome, setores e atividades ao
            expandir. Para remover uma tarefa da matriz, arraste de volta para «Bases e
            extras».
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-white/[0.06] pb-3">
        {!addOpen ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setAddOpen(true)}
            className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm hover:border-sgp-gold/50 hover:bg-sgp-gold/15 disabled:opacity-50"
          >
            + Tarefa em branco
          </button>
        ) : (
          <form
            className="flex w-full flex-col gap-2 rounded-xl border border-white/[0.08] bg-black/20 p-3 sm:max-w-lg"
            onSubmit={(e) => void handleSubmitAdd(e)}
          >
            <label className="flex flex-col gap-0.5 text-[11px]">
              <span className="text-slate-500">Nome da tarefa</span>
              <LabelSuggestField
                value={newName}
                onChange={setNewName}
                catalogEntries={matrixSuggestionCatalog.options}
                placeholder="Ex.: Limpeza inicial"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-[11px]">
              <span className="text-slate-500">Descrição (opcional)</span>
              <input
                value={newDescription}
                onChange={(ev) => setNewDescription(ev.target.value)}
                placeholder="Detalhe breve"
                autoComplete="off"
                className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={!newName.trim()}
                className="rounded-lg border border-sgp-gold/40 bg-sgp-gold/15 px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm hover:border-sgp-gold/55 hover:bg-sgp-gold/20 disabled:opacity-50"
              >
                Criar tarefa
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(false)
                  setNewName('')
                  setNewDescription('')
                }}
                className="text-[11px] text-slate-500"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
        <button
          type="button"
          disabled={reorderDisabled}
          onClick={() => onReorder('up')}
          className="rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/90 disabled:opacity-40"
        >
          Subir
        </button>
        <button
          type="button"
          disabled={reorderDisabled}
          onClick={() => onReorder('down')}
          className="rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/90 disabled:opacity-40"
        >
          Descer
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pr-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent]"
        onDragOver={handleDragOverDraft}
      >
        {taskNodes.length === 0 ? (
          <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-200">Rascunho vazio</p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">
              Arraste tarefas do catálogo à esquerda para cá para montar a estrutura. Você
              também pode usar «Tarefa em branco» para criar uma tarefa nova sem partir do
              catálogo.
            </p>
          </div>
        ) : (
          <OperationMatrixTaskGrid
            tasks={taskNodes}
            tree={tree}
            parentMap={parentMap}
            selectedId={selectedId}
            onSelectComposition={onSelectTaskComposition}
            onSelectEditMeta={onSelectTaskEditMeta}
            aggregateMaps={aggregateMaps}
            searchQuery={searchQuery}
            matchIds={matchIds}
            taskAggregates={taskAggregates}
            busy={busy}
            onRemoveTaskFromCatalog={onRemoveTaskFromCatalog}
            onDuplicateTask={onDuplicateTask}
            taskCardWidthClass="max-w-none w-full"
            compositionExpandedByTaskId={structureExpandedTaskIds}
            onToggleTaskCompositionExpanded={onToggleTaskCompositionExpanded}
            registerCatalogDropRowEl={setRowRef}
            persistedCatalogDragBack
            renderTaskFooter={(taskNode) =>
              structureExpandedTaskIds.has(taskNode.id) ? (
                <div className="mt-2 rounded-xl border border-white/[0.08] bg-black/20 px-2 py-2 sm:px-3">
                  <TaskCompositionPanel
                    task={taskNode}
                    aggregateMaps={aggregateMaps}
                    collaboratorIdToName={collaboratorIdToName}
                    selectedId={selectedId}
                    activePathIds={activePathIds}
                    onSelectNode={onSelectTaskComposition}
                    searchQuery={searchQuery}
                    matchIds={matchIds}
                    showHeading={false}
                    sectorActionsBusy={busy}
                    onDuplicateSector={(id) => void onDuplicateSector(id)}
                    onRemoveSector={(id) => void onRemoveSector(id)}
                    onAddActivityToSector={(id) =>
                      void onAddActivityToSector(id)
                    }
                    onReorderActivityInSector={(sectorId, dir) =>
                      void onReorderActivityInSector(sectorId, dir)
                    }
                    onDuplicateActivity={(id) => void onDuplicateActivity(id)}
                    onRemoveActivity={(id) => void onRemoveActivity(id)}
                    onEditActivity={(id) => onEditActivity(id)}
                  />
                </div>
              ) : null
            }
          />
        )}
      </div>
    </div>
  )
}
