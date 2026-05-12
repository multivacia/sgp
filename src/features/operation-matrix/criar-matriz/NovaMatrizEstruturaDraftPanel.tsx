/* eslint-disable react-hooks/refs -- @dnd-kit useSortable */
import { CSS } from '@dnd-kit/utilities'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { MatrixSuggestionCatalogData } from '../../../catalog/matrixSuggestion/types'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { Team } from '../../../domain/teams/team.types'
import { LabelSuggestField } from '../components/LabelSuggestField'
import { CriarMatrizCatalogOpcaoDraftEditor } from './CriarMatrizCatalogOpcaoDraftEditor'
import type { CatalogOpcaoDraftInstance } from './cloneCatalogTaskSubtreeForDraft'
import {
  NOVA_MATRIZ_ESTRUTURA_DND_MIME,
  stringifyNovaMatrizEstruturaDrag,
  parseNovaMatrizEstruturaDrag,
  type NovaMatrizAddCatalogResult,
} from './novaMatrizEstruturaDnD'
import { computeInsertIndexFromPointerAndRows } from './novaMatrizCatalogDropInsert'
import { summarizeMatrixTaskDraftRoot } from './novaMatrizTotemUi'

function SortableDraftOpcaoShell({
  draftRootId,
  disabled,
  children,
}: {
  draftRootId: string
  disabled?: boolean
  children: (args: {
    dragHandleProps: {
      attributes: ReturnType<typeof useSortable>['attributes']
      listeners: ReturnType<typeof useSortable>['listeners']
    }
    isDragging: boolean
  }) => ReactNode
}) {
  const sortable = useSortable({
    id: draftRootId,
    disabled: !!disabled,
  })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }
  return (
    <li
      ref={sortable.setNodeRef}
      style={style}
      className={sortable.isDragging ? 'opacity-75' : undefined}
    >
      {children({
        dragHandleProps: {
          attributes: sortable.attributes,
          listeners: sortable.listeners,
        },
        isDragging: sortable.isDragging,
      })}
    </li>
  )
}

type Props = {
  catalogDrafts: CatalogOpcaoDraftInstance[]
  onAddCatalog: (
    taskId: string,
    insertIndex?: number,
  ) => NovaMatrizAddCatalogResult
  onAddBlankCatalogOpcao: (name: string, description?: string) => void
  onRemoveCatalog: (instanceId: string) => void
  onChangeCatalogDraft: (
    instanceId: string,
    draftRoot: CatalogOpcaoDraftInstance['draftRoot'],
  ) => void
  onReorderCatalogDraft: (dir: 'up' | 'down', taskId: string | null) => void
  onDuplicateCatalogInstance: (instanceId: string) => void
  collaborators: Collaborator[]
  teams: Team[]
  collaboratorsLoading: boolean
  collaboratorsError: string | null
  matrixSuggestionCatalog: MatrixSuggestionCatalogData
  /** Quando falso, novas tarefas ficam recolhidas (totem de criação). Predefinição: true. */
  expandOnAdd?: boolean
  /** Quando falso, omite o bloco introdutório no topo (totem define o título fora). */
  showDraftIntro?: boolean
  /** Rótulo do botão quando a tarefa está recolhida (abrindo edição/expansão do rascunho). */
  expandControlLabel?: 'Expandir'
  /** Abre modo tela cheia da montagem (combo + catálogo). */
  onExpandStructure?: () => void
}

export function NovaMatrizEstruturaDraftPanel({
  catalogDrafts,
  onAddCatalog,
  onAddBlankCatalogOpcao,
  onRemoveCatalog,
  onChangeCatalogDraft,
  onReorderCatalogDraft,
  onDuplicateCatalogInstance,
  collaborators,
  teams,
  collaboratorsLoading,
  collaboratorsError,
  matrixSuggestionCatalog,
  expandOnAdd = true,
  showDraftIntro = true,
  expandControlLabel = 'Expandir',
  onExpandStructure,
}: Props) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const [dropHighlight, setDropHighlight] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  function setRowRef(instanceId: string, el: HTMLDivElement | null) {
    if (el) rowRefs.current.set(instanceId, el)
    else rowRefs.current.delete(instanceId)
  }

  function toggleExpanded(instanceId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(instanceId)) next.delete(instanceId)
      else next.add(instanceId)
      return next
    })
  }

  function handleDragStartDraft(e: React.DragEvent, instanceId: string) {
    e.dataTransfer.setData(
      NOVA_MATRIZ_ESTRUTURA_DND_MIME,
      stringifyNovaMatrizEstruturaDrag({ kind: 'draft-task', instanceId }),
    )
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOverDraft(e: React.DragEvent) {
    if (e.dataTransfer.types.includes(NOVA_MATRIZ_ESTRUTURA_DND_MIME)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  function handleDragEnterDraft(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.types.includes(NOVA_MATRIZ_ESTRUTURA_DND_MIME)) {
      setDropHighlight(true)
    }
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
    if (p?.kind === 'catalog-task') {
      const orderedIds = catalogDrafts.map((d) => d.instanceId)
      const insertIndex = computeInsertIndexFromPointerAndRows(
        e.clientY,
        orderedIds,
        (id) => rowRefs.current.get(id),
      )
      const r = onAddCatalog(p.taskId, insertIndex)
      if (r.outcome === 'duplicate') {
        const inst = catalogDrafts.find((d) => d.sourceTaskId === p.taskId)
        if (inst) {
          if (expandOnAdd) {
            setExpanded((prev) => new Set(prev).add(inst.instanceId))
          }
          requestAnimationFrame(() => {
            rowRefs.current
              .get(inst.instanceId)
              ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          })
        }
      } else if (r.outcome === 'added') {
        if (expandOnAdd) {
          setExpanded((prev) => new Set(prev).add(r.instanceId))
        }
        requestAnimationFrame(() => {
          rowRefs.current
            .get(r.instanceId)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        })
      }
    }
  }

  async function handleSubmitAdd(e: FormEvent) {
    e.preventDefault()
    const n = newName.trim()
    if (!n) return
    try {
      await Promise.resolve(onAddBlankCatalogOpcao(n, newDescription.trim() || undefined))
      setNewName('')
      setNewDescription('')
      setAddOpen(false)
    } catch {
      /* toast no page, se existir */
    }
  }

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/50 px-3 py-3 shadow-inner ring-1 ring-white/[0.04] sm:px-4 ${
        dropHighlight
          ? 'border-sgp-gold/45 ring-2 ring-sgp-gold/25 bg-sgp-gold/[0.03]'
          : ''
      }`}
      role="region"
      aria-label="Rascunho da nova matriz"
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
            Arraste tarefas do catálogo à esquerda. Edite nome, setores e atividades ao expandir.
            Para remover uma tarefa do rascunho, arraste de volta ao painel do catálogo à esquerda.
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-white/[0.06] pb-3">
        {onExpandStructure ? (
          <button
            type="button"
            onClick={() => onExpandStructure()}
            className="rounded-lg border border-sgp-gold/40 bg-sgp-gold/[0.08] px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm hover:border-sgp-gold/55 hover:bg-sgp-gold/15"
          >
            Expandir estrutura
          </button>
        ) : null}
        {!addOpen ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm hover:border-sgp-gold/50 hover:bg-sgp-gold/15"
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
                onChange={(e) => setNewDescription(e.target.value)}
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
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pr-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent]"
        onDragOver={handleDragOverDraft}
      >
        {catalogDrafts.length === 0 ? (
          <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-200">Rascunho vazio</p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">
              Arraste tarefas do catálogo à esquerda para cá para montar a estrutura. Você também pode
              usar «Tarefa em branco» para criar uma tarefa nova sem partir do catálogo.
            </p>
          </div>
        ) : (
          <SortableContext
            items={catalogDrafts.map((d) => d.draftRoot.id)}
            strategy={verticalListSortingStrategy}
          >
          <ul className="space-y-3">
            {catalogDrafts.map((inst, index) => {
              const taskId = inst.draftRoot.id
              const isOpen = expanded.has(inst.instanceId)
              const upDisabled = index === 0
              const downDisabled = index >= catalogDrafts.length - 1
              const sum = summarizeMatrixTaskDraftRoot(inst.draftRoot)
              return (
                <SortableDraftOpcaoShell key={inst.instanceId} draftRootId={taskId}>
                  {({ dragHandleProps }) => (
                  <div
                    ref={(el) => setRowRef(inst.instanceId, el)}
                    className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="flex shrink-0 flex-col items-center gap-0.5 border-r border-white/[0.08] pr-2">
                        <span className="font-mono text-[10px] font-semibold tabular-nums text-slate-500">
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          {...dragHandleProps.attributes}
                          {...dragHandleProps.listeners}
                          aria-label="Arrastar para reordenar tarefa"
                          className="cursor-grab touch-none rounded-md border border-transparent px-1 py-1 text-sm leading-none text-slate-400 active:cursor-grabbing hover:border-white/14 hover:bg-white/[0.05]"
                        >
                          <span aria-hidden className="font-mono text-[10px] tracking-tighter">
                            ⋮⋮
                          </span>
                        </button>
                        <span
                          draggable
                          onDragStart={(e) => handleDragStartDraft(e, inst.instanceId)}
                          className="cursor-grab text-[11px] text-slate-400"
                          title="Arrastar para o painel do catálogo à esquerda para remover do rascunho"
                          aria-label="Arrastar para o catálogo para remover"
                        >
                          ↩
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {inst.draftRoot.name}
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                          {sum.nAreas} setor{sum.nAreas === 1 ? '' : 'es'} · {sum.nEtapas}{' '}
                          atividade{sum.nEtapas === 1 ? '' : 's'} · {sum.minutos} min
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {inst.sourceMatrixItemName === 'Tarefa nova' ||
                          inst.sourceMatrixItemName === 'Opção nova'
                            ? 'Tarefa nova (manual)'
                            : `Origem: ${inst.sourceMatrixItemName} · ${inst.sourceTaskName}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.08]"
                          onClick={() => onReorderCatalogDraft('up', taskId)}
                          disabled={upDisabled}
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.08]"
                          onClick={() => onReorderCatalogDraft('down', taskId)}
                          disabled={downDisabled}
                        >
                          Descer
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.08]"
                          onClick={() => onDuplicateCatalogInstance(inst.instanceId)}
                        >
                          Duplicar
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-rose-400/25 bg-rose-950/30 px-2 py-1 text-[10px] font-semibold text-rose-200/90 hover:bg-rose-950/45"
                          onClick={() => onRemoveCatalog(inst.instanceId)}
                        >
                          Remover
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2 py-1 text-[10px] font-semibold text-sgp-gold-warm hover:border-sgp-gold/50 hover:bg-sgp-gold/15"
                          onClick={() => toggleExpanded(inst.instanceId)}
                          aria-expanded={isOpen}
                          aria-label={
                            isOpen ? 'Recolher tarefa' : 'Expandir tarefa'
                          }
                        >
                          {isOpen ? 'Recolher' : expandControlLabel}
                        </button>
                      </div>
                    </div>
                    {isOpen ? (
                      <div className="mt-3 border-t border-white/[0.06] pt-3">
                        <CriarMatrizCatalogOpcaoDraftEditor
                          variant="contextRail"
                          draftRoot={inst.draftRoot}
                          catalogOrigin={{
                            matrixItemName: inst.sourceMatrixItemName,
                            taskName: inst.sourceTaskName,
                          }}
                          onChange={(next) => onChangeCatalogDraft(inst.instanceId, next)}
                          matrixSuggestionCatalog={matrixSuggestionCatalog}
                          collaborators={collaborators}
                          teams={teams}
                          collaboratorsLoading={collaboratorsLoading}
                          collaboratorsError={collaboratorsError}
                        />
                      </div>
                    ) : null}
                  </div>
                  )}
                </SortableDraftOpcaoShell>
              )
            })}
          </ul>
          </SortableContext>
        )}
      </div>
    </div>
  )
}
