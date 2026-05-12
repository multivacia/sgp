import {
  useEffect,
  useMemo,
  type FormEvent,
  type ReactNode,
} from 'react'
import type { LabelCatalogEntry } from '../../catalog/matrixSuggestion/types'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import { LabelSuggestField } from './components/LabelSuggestField'
import type { MatrixTreeAggregateMaps } from './matrixTreeAggregates'
import { buildNodeTypeMap, findAncestorTaskId } from './matrixTreeSelection'
import { OperationMatrixTaskGrid } from './OperationMatrixTaskGrid'
import { getTaskAggregate } from './treeAggregates'

/** Base para agrupamento visual no grid (hoje um único grupo; futuras seções adicionam entradas). */
export type MatrixTaskGroup = {
  id: string
  label: string
  tasks: MatrixNodeTreeApi[]
}

export type MatrixTreeCompactProps = {
  tree: MatrixNodeTreeApi
  parentMap: ReadonlyMap<string, string | null>
  selectedId: string | null
  /** Nó atualmente selecionado (Subir/Descer: não ITEM). */
  selected: MatrixNodeTreeApi | null
  onSelectTaskComposition: (id: string) => void
  onSelectTaskEditMeta: (id: string) => void
  aggregateMaps: MatrixTreeAggregateMaps
  searchQuery: string
  matchIds: ReadonlySet<string>
  busy: boolean
  onReorder: (dir: 'up' | 'down') => void
  /** Cria uma nova tarefa de serviço (TASK) sob a oferta atual. */
  onAddServiceOption: (name: string, description?: string) => void | Promise<void>
  /** Remove uma tarefa a partir do catálogo (card). */
  onRemoveTaskFromCatalog: (taskId: string) => void | Promise<void>
  /** Duplica uma tarefa pelo id (ações inline no card). */
  onDuplicateTask: (taskId: string) => void | Promise<void>
  /** Rascunho «+ Adicionar tarefa» — estado no pai para o guard de contexto transitório. */
  serviceOptionAddOpen: boolean
  setServiceOptionAddOpen: (v: boolean) => void
  serviceOptionNewName: string
  setServiceOptionNewName: (v: string) => void
  serviceOptionNewDescription: string
  setServiceOptionNewDescription: (v: string) => void
  /** Catálogo local de nomes de tarefa (TASK) para sugestão. */
  optionCatalogEntries: readonly LabelCatalogEntry[]
  /** Abre editor de estrutura em tela cheia (quando definido). */
  onExpandStructure?: () => void
  /** Conteúdo extra na toolbar (ex.: «Do catálogo» na Nova Matriz). */
  toolbarExtra?: ReactNode
  /** Substitui o texto quando não há tarefas e não há busca ativa. */
  emptyWithoutTasksMessage?: string
  /** Título da lista de tarefas (painel atual da matriz). */
  taskGroupLabel?: string
  /** Texto introdutório abaixo do título. */
  taskGroupIntro?: ReactNode
  /** Composição (setores/atividades) expandida por tarefa. */
  compositionExpandedTaskIds?: ReadonlySet<string>
  onToggleTaskCompositionExpanded?: (taskId: string) => void
  /** Bloco opcional sob cada tarefa (ex.: lista de setores). */
  renderTaskCompositionFooter?: (task: MatrixNodeTreeApi) => ReactNode
  taskCardWidthClass?: string
  /** Lista de tarefas herda scroll do pai (painel alto flexível na Alterar Matriz). */
  embedListInFlexibleScroll?: boolean
  /** Área da secção distribui altura quando embutida em painel scroll flex. */
  embedSectionFlexible?: boolean
}

function subtreeTouchesIds(
  node: MatrixNodeTreeApi,
  ids: ReadonlySet<string>,
): boolean {
  if (ids.has(node.id)) return true
  return node.children.some((c) => subtreeTouchesIds(c, ids))
}

export function MatrixTreeCompact(props: MatrixTreeCompactProps) {
  const {
    tree,
    parentMap,
    selectedId,
    selected,
    onSelectTaskComposition,
    onSelectTaskEditMeta,
    aggregateMaps,
    searchQuery,
    matchIds,
    busy,
    onReorder,
    onExpandStructure,
    onAddServiceOption,
    onRemoveTaskFromCatalog,
    onDuplicateTask,
    serviceOptionAddOpen: addOpen,
    setServiceOptionAddOpen: setAddOpen,
    serviceOptionNewName: newName,
    setServiceOptionNewName: setNewName,
    serviceOptionNewDescription: newDescription,
    setServiceOptionNewDescription: setNewDescription,
    optionCatalogEntries,
    toolbarExtra,
    emptyWithoutTasksMessage,
    taskGroupLabel = 'Opções de serviço',
    taskGroupIntro,
    compositionExpandedTaskIds,
    onToggleTaskCompositionExpanded,
    renderTaskCompositionFooter,
    taskCardWidthClass,
    embedListInFlexibleScroll = false,
    embedSectionFlexible = false,
  } = props

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

  const visibleTaskNodes = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return taskNodes
    return taskNodes.filter((t) => subtreeTouchesIds(t, matchIds))
  }, [taskNodes, searchQuery, matchIds])

  const taskGroups = useMemo<MatrixTaskGroup[]>(
    () => [
      {
        id: 'service-options',
        label: taskGroupLabel,
        tasks: visibleTaskNodes,
      },
    ],
    [visibleTaskNodes, taskGroupLabel],
  )

  const nodeTypeMap = useMemo(() => buildNodeTypeMap(tree), [tree])

  const taskAggregates = useMemo(() => {
    const m = new Map<string, ReturnType<typeof getTaskAggregate>>()
    for (const t of taskNodes) {
      m.set(t.id, getTaskAggregate(aggregateMaps, t.id))
    }
    return m
  }, [taskNodes, aggregateMaps])

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) return
    if (visibleTaskNodes.length === 0) return

    const ancestorTask = selectedId
      ? findAncestorTaskId(selectedId, parentMap, nodeTypeMap)
      : null

    const selectionStillValid =
      ancestorTask != null &&
      visibleTaskNodes.some((t) => t.id === ancestorTask)

    if (selectionStillValid) return

    onSelectTaskComposition(visibleTaskNodes[0].id)
  }, [
    searchQuery,
    visibleTaskNodes,
    selectedId,
    parentMap,
    nodeTypeMap,
    onSelectTaskComposition,
  ])

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
      /* toast já exibido no page */
    }
  }

  const reorderDisabled =
    busy || !selected || selected.node_type === 'ITEM'

  return (
    <div
      className={
        embedSectionFlexible
              ? 'flex min-h-0 flex-1 select-none flex-col gap-8'
              : 'select-none space-y-8'
      }
    >
      {taskGroups.map((group) => (
        <section
          key={group.id}
          className={
            'min-w-0 rounded-xl border border-white/[0.07] bg-black/15 px-3 py-3 ring-1 ring-white/[0.04] sm:px-4 ' +
            (embedSectionFlexible
              ? 'flex min-h-0 flex-1 flex-col '
              : ' ')
          }
          aria-labelledby={`matrix-task-group-${group.id}`}
        >
          <div
            className={
              'flex flex-col gap-3 ' +
              (embedSectionFlexible ? 'min-h-0 flex-1 ' : '')
            }
          >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-2">
              <h2
                id={`matrix-task-group-${group.id}`}
                className="shrink-0 px-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"
              >
                {group.label}
              </h2>
              {taskGroupIntro ?? (
                <p className="max-w-xl px-0.5 text-[11px] leading-relaxed text-slate-500">
                  Arraste setores e atividades na composição (abaixo de cada tarefa
                  expandida) ou use as alças &quot;⋮⋮&quot; para organizar a sequência
                  operacional. A ordem definida aqui será usada como sequência recomendada
                  no planejamento e na execução.
                </p>
              )}
            </div>
              <div
                className="flex flex-wrap gap-1.5 sm:justify-end"
                role="toolbar"
                aria-label="Catálogo de tarefas de serviço"
              >
                {!addOpen ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setAddOpen(true)}
                    className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm disabled:opacity-50"
                  >
                    + Adicionar tarefa
                  </button>
                ) : (
                  <form
                    className="flex w-full max-w-md flex-col gap-2 sm:max-w-lg"
                    onSubmit={(e) => void handleSubmitAdd(e)}
                  >
                    <label className="flex flex-col gap-0.5 text-[11px]">
                      <span className="text-slate-500">Nome da tarefa</span>
                      <LabelSuggestField
                        value={newName}
                        onChange={setNewName}
                        catalogEntries={optionCatalogEntries}
                        disabled={busy}
                        placeholder="Ex.: Limpeza inicial"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5 text-[11px]">
                      <span className="text-slate-500">Descrição (opcional)</span>
                      <input
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Detalhe breve para o catálogo"
                        autoComplete="off"
                        className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-1.5 text-sm text-slate-200"
                      />
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="submit"
                        disabled={busy || !newName.trim()}
                        className="rounded-lg bg-sgp-gold/20 px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm disabled:opacity-50"
                      >
                        Criar tarefa
                      </button>
                      <button
                        type="button"
                        disabled={busy}
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
                {onExpandStructure ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onExpandStructure()}
                    className="rounded-lg border border-sgp-gold/40 bg-sgp-gold/[0.08] px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm disabled:opacity-50"
                  >
                    Expandir estrutura
                  </button>
                ) : null}
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
                {toolbarExtra}
              </div>
            </div>
            <div
              className={
                embedListInFlexibleScroll
                  ? 'min-h-0 flex-1 max-h-none overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent]'
                  : 'min-h-0 max-h-[min(68vh,40rem)] overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent] lg:max-h-[min(72vh,calc(100dvh-12rem))]'
              }
              role="region"
              aria-label="Lista de tarefas de serviço"
            >
              {group.tasks.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs leading-relaxed text-slate-500">
                  {taskNodes.length === 0 && !searchQuery.trim()
                    ? emptyWithoutTasksMessage ??
                      'Nenhuma tarefa de serviço nesta oferta. Use “+ Adicionar tarefa” acima para incluir a primeira.'
                    : 'Nenhum resultado para esta busca.'}
                </p>
              ) : (
                <OperationMatrixTaskGrid
                  tasks={group.tasks}
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
                  renderTaskFooter={renderTaskCompositionFooter}
                  taskCardWidthClass={taskCardWidthClass}
                  compositionExpandedByTaskId={compositionExpandedTaskIds}
                  onToggleTaskCompositionExpanded={
                    onToggleTaskCompositionExpanded
                  }
                />
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
