import { useMemo, useState } from 'react'
import type {
  MatrixNodeApi,
  MatrixNodeTreeApi,
} from '../../../domain/operation-matrix/operation-matrix.types'
import type { ManualOptionDraft } from './matrixToConveyorCreateInput'
import { collectTaskNodesFromItemTree, draftHasMatrixRoot } from './novaEsteiraDraftFromMatrix'
import {
  NOVA_ESTEIRA_DRAG_MIME,
  parseDragPayload,
  setDragPayload,
  type NovaEsteiraCatalogDrag,
} from './novaEsteiraDnD'
import { sumPlannedMinutesInMatrixTree } from './novaEsteiraTotemUi'

type Props = {
  matrices: MatrixNodeApi[]
  matricesLoading: boolean
  matricesError: string | null
  treeByMatrixId: Record<string, MatrixNodeTreeApi | undefined>
  treesLoading: boolean
  treesError: string | null
  onRemoveDraftOption: (optionKey: string) => void
  /** Modo Nova Esteira (criação): bases em cartão + extras, menos jargão de catálogo. */
  totemLayout?: boolean
  onUseMatrixAsBase?: (matrixId: string) => void
  onSwapMatrixBase?: (matrixId: string) => void
  onAddManualTask?: () => void
  manualRoots?: ManualOptionDraft[]
}

export function NovaEsteiraCatalogoPanel({
  matrices,
  matricesLoading,
  matricesError,
  treeByMatrixId,
  treesLoading,
  treesError,
  onRemoveDraftOption,
  totemLayout = false,
  onUseMatrixAsBase,
  onSwapMatrixBase,
  onAddManualTask,
  manualRoots = [],
}: Props) {
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const filteredMatrices = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return matrices
    return matrices.filter((m) => m.name.toLowerCase().includes(s))
  }, [matrices, q])

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div
      className={`flex flex-col rounded-2xl border border-white/[0.08] bg-black/25 ${totemLayout ? 'min-h-[280px] xl:max-h-[calc(100vh-10rem)]' : 'h-full min-h-[420px]'}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(NOVA_ESTEIRA_DRAG_MIME)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        const raw = e.dataTransfer.getData(NOVA_ESTEIRA_DRAG_MIME)
        const p = parseDragPayload(raw)
        if (p?.t !== 'draft-option') return
        e.preventDefault()
        onRemoveDraftOption(p.optionKey)
      }}
    >
      <div className="border-b border-white/[0.06] p-4">
        <h3 className="font-heading text-sm font-semibold text-slate-100">
          {totemLayout ? 'Bases e extras' : 'Catálogo (somente leitura)'}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {totemLayout
            ? 'Escolha uma base ou arraste tarefas para adicionar à esteira. Para remover da esteira, solte aqui.'
            : 'Arraste para o rascunho à direita. Para remover do rascunho, solte aqui.'}
        </p>
        <input
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder={totemLayout ? 'Buscar base…' : 'Filtrar por nome…'}
          className="sgp-input-app mt-3 w-full px-3 py-2 text-sm"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {matricesLoading && (
          <p className="text-sm text-slate-500">Carregando matrizes…</p>
        )}
        {matricesError && (
          <p className="text-sm text-rose-300">{matricesError}</p>
        )}
        {treesLoading && !matricesLoading && (
          <p className="text-xs text-slate-500">A preparar árvores…</p>
        )}
        {treesError && (
          <p className="text-xs text-rose-300">{treesError}</p>
        )}

        <section className="mt-2">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300/90">
            {totemLayout ? 'Escolher base' : 'Matrizes disponíveis'}
          </h4>
          <ul className="mt-2 space-y-2">
            {filteredMatrices.map((m) => {
              const onDragStart = (e: React.DragEvent) => {
                const p: NovaEsteiraCatalogDrag = { t: 'matrix', matrixId: m.id }
                setDragPayload(e, p)
              }
              const tree = treeByMatrixId[m.id]
              const nTasks = tree ? collectTaskNodesFromItemTree(tree, m.id).length : 0
              const nMin = sumPlannedMinutesInMatrixTree(tree)
              const hasBase = draftHasMatrixRoot(manualRoots, m.id)
              return (
                <li key={m.id}>
                  {totemLayout ? (
                    <div
                      draggable
                      onDragStart={onDragStart}
                      className="cursor-grab rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3 active:cursor-grabbing"
                    >
                      <p className="font-heading text-sm font-semibold leading-snug text-slate-50">{m.name}</p>
                      <p className="mt-1 text-[11px] tabular-nums text-slate-400">
                        {nTasks} tarefa(s) · {nMin} min estim.
                      </p>
                      <div className="mt-2 flex flex-col gap-1.5">
                        <button
                          type="button"
                          className="sgp-cta-primary py-2 text-xs"
                          disabled={!onUseMatrixAsBase || hasBase}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => onUseMatrixAsBase?.(m.id)}
                        >
                          Usar esta base
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-2 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-sgp-gold/30 disabled:opacity-40"
                          disabled={!onSwapMatrixBase}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => onSwapMatrixBase?.(m.id)}
                        >
                          Trocar base
                        </button>
                        {hasBase ? (
                          <p className="text-[10px] text-emerald-200/90">Base já incluída nesta matriz.</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="mt-2 text-[11px] font-semibold text-sgp-gold/90"
                        onClick={() => toggle(m.id)}
                      >
                        {expanded[m.id] ? 'Recolher tarefas' : 'Ver tarefas para arrastar'}
                      </button>
                      {expanded[m.id] ? <MatrixTasksUnderMatrix matrixId={m.id} tree={tree} /> : null}
                    </div>
                  ) : (
                    <div
                      draggable
                      onDragStart={onDragStart}
                      className="cursor-grab rounded-lg border border-sky-500/25 bg-sky-500/[0.08] px-3 py-2.5 active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-sky-200/90">
                            Matriz
                          </span>
                          <p className="text-sm font-medium text-slate-100">{m.name}</p>
                        </div>
                        <button type="button" className="shrink-0 text-xs text-sgp-gold" onClick={() => toggle(m.id)}>
                          {expanded[m.id] ? 'Recolher' : 'Expandir'}
                        </button>
                      </div>
                      {expanded[m.id] ? <MatrixTasksUnderMatrix matrixId={m.id} tree={tree} /> : null}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="mt-8">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
            {totemLayout ? 'Extras' : 'Tarefas disponíveis'}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {totemLayout
              ? 'Arraste uma tarefa avulsa ou adicione uma tarefa em branco à esteira.'
              : 'Lista por matriz (expandir acima) ou todas abaixo.'}
          </p>
          {totemLayout && onAddManualTask ? (
            <button type="button" className="mt-2 w-full rounded-lg border border-amber-500/30 bg-amber-500/[0.08] py-2 text-xs font-bold text-amber-100" onClick={onAddManualTask}>
              + Adicionar tarefa manual
            </button>
          ) : null}
          <ul className="mt-3 space-y-3">
            {filteredMatrices.map((m) => {
              const tree = treeByMatrixId[m.id]
              if (!tree) return null
              const tasks = collectTaskNodesFromItemTree(tree, m.id)
              return (
                <li key={`tasks-${m.id}`}>
                  <p className="text-xs font-semibold text-slate-400">{m.name}</p>
                  <ul className="mt-1.5 space-y-1.5 pl-1">
                    {tasks.map(({ task, matrixItemId }) => {
                      const onDragStart = (e: React.DragEvent) => {
                        const p: NovaEsteiraCatalogDrag = {
                          t: 'task',
                          matrixItemId,
                          taskId: task.id,
                        }
                        setDragPayload(e, p)
                      }
                      return (
                        <li
                          key={task.id}
                          draggable
                          onDragStart={onDragStart}
                          className="cursor-grab rounded border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-2 text-sm text-slate-100 active:cursor-grabbing"
                        >
                          <span className="text-[10px] font-bold uppercase text-amber-200/90">
                            Tarefa
                          </span>{' '}
                          {task.name}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

function MatrixTasksUnderMatrix({
  matrixId,
  tree,
}: {
  matrixId: string
  tree: MatrixNodeTreeApi | undefined
}) {
  if (!tree) {
    return <p className="mt-2 text-xs text-slate-500">Sem árvore carregada.</p>
  }
  const tasks = collectTaskNodesFromItemTree(tree, matrixId)
  if (tasks.length === 0) {
    return (
      <p className="mt-2 text-xs text-amber-200/80">
        Nenhuma tarefa com etapas nesta matriz.
      </p>
    )
  }
  return (
    <ul className="mt-2 space-y-1 border-t border-white/[0.06] pt-2">
      {tasks.map(({ task, matrixItemId }) => {
        const onDragStart = (e: React.DragEvent) => {
          const p: NovaEsteiraCatalogDrag = {
            t: 'task',
            matrixItemId,
            taskId: task.id,
          }
          setDragPayload(e, p)
        }
        return (
          <li
            key={task.id}
            draggable
            onDragStart={onDragStart}
            className="cursor-grab rounded border border-white/[0.06] bg-black/30 px-2 py-1.5 text-xs text-slate-200 active:cursor-grabbing"
          >
            {task.name}
          </li>
        )
      })}
    </ul>
  )
}
