import { useRef, useState, type FormEvent } from 'react'
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
import { summarizeMatrixTaskDraftRoot } from './novaMatrizTotemUi'

type Props = {
  catalogDrafts: CatalogOpcaoDraftInstance[]
  onAddCatalog: (taskId: string) => NovaMatrizAddCatalogResult
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
  /** Quando falso, novas opções ficam recolhidas (totem de criação). Predefinição: true. */
  expandOnAdd?: boolean
  /** Quando falso, omite o bloco introdutório no topo (totem define o título fora). */
  showDraftIntro?: boolean
  expandControlLabel?: 'Editar' | 'Expandir'
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
  expandControlLabel = 'Editar',
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
      const r = onAddCatalog(p.taskId)
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
      className={`flex h-full min-h-0 w-full flex-col rounded-2xl border bg-gradient-to-b from-amber-950/45 to-black/25 px-3 py-3 shadow-inner ring-1 ring-amber-300/15 sm:px-4 ${
        dropHighlight
          ? 'border-amber-200 ring-2 ring-amber-300/45'
          : 'border-amber-300/40'
      }`}
      role="region"
      aria-label="Rascunho da nova matriz"
      onDragEnter={handleDragEnterDraft}
      onDragLeave={handleDragLeaveDraft}
      onDragOver={handleDragOverDraft}
      onDrop={handleDropOnDraft}
    >
      {showDraftIntro ? (
        <div className="shrink-0 border-b border-amber-300/25 pb-3">
          <h2 className="font-heading text-sm font-semibold text-amber-100/95">
            Rascunho da matriz
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-100/55">
            Arraste tarefas do catálogo à esquerda. Edite nome, setores e atividades ao expandir.
            Para remover uma opção do rascunho, arraste de volta ao painel laranja.
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-amber-300/15 pb-3">
        {!addOpen ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded-lg border border-amber-300/35 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-100/95 hover:bg-amber-500/22"
          >
            + Opção em branco
          </button>
        ) : (
          <form
            className="flex w-full flex-col gap-2 rounded-xl border border-amber-300/20 bg-black/25 p-3 sm:max-w-lg"
            onSubmit={(e) => void handleSubmitAdd(e)}
          >
            <label className="flex flex-col gap-0.5 text-[11px]">
              <span className="text-slate-500">Nome da opção</span>
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
                className="rounded-lg bg-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-100 disabled:opacity-50"
              >
                Criar opção
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pr-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(250,204,21,0.35)_transparent]">
        {catalogDrafts.length === 0 ? (
          <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300/35 bg-amber-950/20 px-4 py-10 text-center">
            <p className="text-sm font-medium text-amber-100/90">Rascunho vazio</p>
            <p className="max-w-sm text-xs leading-relaxed text-amber-100/55">
              Arraste tarefas do catálogo laranja para cá para montar a estrutura. Você também pode
              usar «Opção em branco» para criar uma opção nova sem partir do catálogo.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {catalogDrafts.map((inst, index) => {
              const taskId = inst.draftRoot.id
              const isOpen = expanded.has(inst.instanceId)
              const upDisabled = index === 0
              const downDisabled = index >= catalogDrafts.length - 1
              const sum = summarizeMatrixTaskDraftRoot(inst.draftRoot)
              return (
                <li key={inst.instanceId}>
                  <div
                    ref={(el) => setRowRef(inst.instanceId, el)}
                    draggable
                    onDragStart={(e) => handleDragStartDraft(e, inst.instanceId)}
                    className="rounded-xl border border-amber-300/25 bg-amber-950/25 px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {inst.draftRoot.name}
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                          {sum.nAreas} área{sum.nAreas === 1 ? '' : 's'} · {sum.nEtapas} etapa
                          {sum.nEtapas === 1 ? '' : 's'} · {sum.minutos} min
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {inst.sourceMatrixItemName === 'Opção nova'
                            ? 'Opção nova (manual)'
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
                          className="rounded-lg border border-amber-300/30 bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-100/95 hover:bg-amber-500/25"
                          onClick={() => toggleExpanded(inst.instanceId)}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? 'Recolher' : expandControlLabel}
                        </button>
                      </div>
                    </div>
                    {isOpen ? (
                      <div className="mt-3 border-t border-amber-300/20 pt-3">
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
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
