import { useMemo, useState } from 'react'
import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import type { Team } from '../../domain/teams/team.types'
import type {
  CreateConveyorOptionInput,
  CreateConveyorStepAssigneeInput,
  PostConveyorStructureItemBody,
} from '../../domain/conveyors/conveyor.types'
import { SgpInlineBanner } from '../../components/ui/SgpToast'
import {
  buildManualConveyorInput,
  manualAssigneeRowsToApi,
  validateManualStepAssignees,
  validateManualStructure,
  type ManualOptionDraft,
  type NovaEsteiraAlocacaoLinha,
} from './nova-esteira/matrixToConveyorCreateInput'
import {
  createInitialManualOption,
  NovaEsteiraComposicaoManual,
} from './nova-esteira/NovaEsteiraComposicaoManual'

type Props = {
  open: boolean
  busy: boolean
  error?: string | null
  colabList: Collaborator[]
  colabLoading: boolean
  colabError: string | null
  teamList: Team[]
  teamLoading: boolean
  teamError: string | null
  onCancel: () => void
  onConfirm: (body: PostConveyorStructureItemBody) => void
}

const STRUCTURE_HINT = 'Preencha os dados da tarefa, do setor e da atividade.'

/**
 * Drawer de inclusão tardia: nova subárvore (1 OPTION) + motivo obrigatório sem pré-seleção.
 * Superfícies e tipografia usam tokens semânticos / painel temático do SGP+ (claro e escuro).
 */
export function LateStructureAppendDrawer({
  open,
  busy,
  error = null,
  colabList,
  colabLoading,
  colabError,
  teamList,
  teamLoading,
  teamError,
  onCancel,
  onConfirm,
}: Props) {
  // Estado inicial no mount; o pai remonta com `key` ao abrir (idempotencyKey).
  const [roots, setRoots] = useState<ManualOptionDraft[]>(() => [createInitialManualOption(1)])
  const [aloc, setAloc] = useState<Record<string, NovaEsteiraAlocacaoLinha[]>>({})
  const [reason, setReason] = useState('')
  /** Evita erro estrutural global antes de o usuário interagir com a composição. */
  const [structureTouched, setStructureTouched] = useState(false)
  /** Remonta a composição após descartar para reaplicar initiallyExpanded. */
  const [composicaoKey, setComposicaoKey] = useState(0)

  const structureError = useMemo(() => {
    if (roots.length !== 1) return 'Inclua exatamente uma nova tarefa (OPTION).'
    return validateManualStructure(roots) ?? validateManualStepAssignees(roots, aloc)
  }, [roots, aloc])

  const reasonTrim = reason.trim()
  const reasonOk = reasonTrim.length >= 3 && reasonTrim.length <= 500
  const canSubmit = !busy && structureError === null && reasonOk

  if (!open) return null

  function resetDraftStructure() {
    setRoots([createInitialManualOption(1)])
    setAloc({})
    setStructureTouched(false)
    setComposicaoKey((k) => k + 1)
  }

  function handleRootsChange(next: ManualOptionDraft[]) {
    setStructureTouched(true)
    // Exatamente 1 OPTION; descartar a única recria rascunho vazio expandido (motivo preservado).
    if (next.length === 0) {
      resetDraftStructure()
      return
    }
    setRoots(next.slice(0, 1))
  }

  function handleAlocChange(
    next:
      | Record<string, NovaEsteiraAlocacaoLinha[]>
      | ((prev: Record<string, NovaEsteiraAlocacaoLinha[]>) => Record<string, NovaEsteiraAlocacaoLinha[]>),
  ) {
    setStructureTouched(true)
    setAloc(next)
  }

  function handleConfirm() {
    if (!canSubmit) return
    const assignMap: Record<string, CreateConveyorStepAssigneeInput[]> = {}
    for (const op of roots) {
      for (const ar of op.areas) {
        for (const st of ar.steps) {
          const rows = aloc[st.key] ?? []
          if (rows.length > 0) assignMap[st.key] = manualAssigneeRowsToApi(rows)
        }
      }
    }
    const built = buildManualConveyorInput(
      {
        nome: 'late-append',
        cliente: '',
        veiculo: '',
        modeloVersao: '',
        placa: '',
        observacoes: '',
        responsavel: '',
        prazoEstimado: '',
        prioridade: 'media',
        colaboradorId: null,
      },
      roots,
      assignMap,
    )
    const option = built.options[0] as CreateConveyorOptionInput
    onConfirm({
      reason: reasonTrim,
      originType: 'MANUAL',
      matrixRootItemId: null,
      option,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="late-structure-append-title"
    >
      <div
        data-testid="late-structure-append-panel"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-sgp-border bg-sgp-app-panel text-[color:var(--semantic-base-fg)] shadow-2xl"
      >
        <header className="border-b border-sgp-border px-4 py-3">
          <h2
            id="late-structure-append-title"
            className="font-heading text-base font-semibold text-[color:var(--semantic-base-fg)]"
          >
            Incluir novo item
          </h2>
          <p className="mt-1 text-xs text-sgp-muted">
            A estrutura existente permanece intacta. A nova tarefa é acrescentada ao final e as
            atividades entram no Backlog do Planejamento Semanal.
          </p>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-sgp-muted">
              Motivo da inclusão <span className="text-sgp-gold">*</span>
            </span>
            <textarea
              className="sgp-input-app min-h-[88px] w-full resize-y"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo (3 a 500 caracteres)"
              maxLength={500}
              disabled={busy}
            />
            <span className="block text-[11px] text-sgp-muted">
              {reasonTrim.length}/500
              {!reasonOk && reasonTrim.length > 0 ? ' — mínimo 3 caracteres' : null}
            </span>
          </label>

          <div className="rounded-xl border border-sgp-border-subtle bg-sgp-surface-muted p-3">
            <NovaEsteiraComposicaoManual
              key={composicaoKey}
              roots={roots}
              onChangeRoots={handleRootsChange}
              alocacoes={aloc}
              onChangeAlocacoes={handleAlocChange}
              colabList={colabList}
              colabLoading={colabLoading}
              colabError={colabError}
              teamList={teamList}
              teamLoading={teamLoading}
              teamError={teamError}
              variant="totem"
              initiallyExpanded
              optionRemoveLabel="Descartar item"
            />
          </div>

          {!structureTouched ? (
            <p data-testid="late-structure-hint" className="text-sm text-sgp-muted">
              {STRUCTURE_HINT}
            </p>
          ) : null}
          {structureTouched && structureError ? (
            <SgpInlineBanner message={structureError} variant="neutral" />
          ) : null}
          {error ? <SgpInlineBanner message={error} variant="error" /> : null}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-sgp-border px-4 py-3">
          <button type="button" className="sgp-cta-secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="sgp-cta-primary disabled:opacity-40"
            disabled={!canSubmit}
            onClick={handleConfirm}
          >
            {busy ? 'Incluindo…' : 'Incluir item'}
          </button>
        </footer>
      </div>
    </div>
  )
}
