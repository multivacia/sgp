import { useMemo, useState } from 'react'
import type { MatrixSuggestionCatalogData } from '../../../catalog/matrixSuggestion/types'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { Team } from '../../../domain/teams/team.types'
import { OperationMatrixEditorWorkbench } from '../OperationMatrixEditorWorkbench'
import { OperationMatrixMetricsStrip } from '../OperationMatrixMetricsStrip'
import { buildMatrixTreeAggregateMaps } from '../matrixTreeAggregates'
import type { CatalogOpcaoDraftInstance } from './cloneCatalogTaskSubtreeForDraft'
import type { MatrixCatalogTaskEntry } from './extractMatrixTasksForCatalog'
import type { CriarMatrizManualOpcao } from './criarMatrizManualDraft'
import { CriarMatrizEstruturaManual } from './CriarMatrizEstruturaManual'
import { CatalogAddModal } from './CatalogAddModal'
import { buildDraftCatalogItemTree } from './novaMatrizCatalogDraftTree'
import { NovaMatrizEstruturaCatalogPanel } from './NovaMatrizEstruturaCatalogPanel'
import { NovaMatrizEstruturaDraftPanel } from './NovaMatrizEstruturaDraftPanel'
import type { NovaMatrizAddCatalogResult } from './novaMatrizEstruturaDnD'

type Props = {
  loading: boolean
  loadError: string | null
  entries: MatrixCatalogTaskEntry[]
  catalogDrafts: CatalogOpcaoDraftInstance[]
  onAddCatalog: (taskId: string) => NovaMatrizAddCatalogResult
  onAddBlankCatalogOpcao: (name: string, description?: string) => void
  onRemoveCatalog: (instanceId: string) => void
  onChangeCatalogDraft: (
    instanceId: string,
    draftRoot: CatalogOpcaoDraftInstance['draftRoot'],
  ) => void
  onReorderCatalogDraft: (
    dir: 'up' | 'down',
    selectedTaskId: string | null,
  ) => void
  onDuplicateCatalogInstance: (instanceId: string) => void
  manualOpcoes: CriarMatrizManualOpcao[]
  onManualChange: (next: CriarMatrizManualOpcao[]) => void
  collaborators: Collaborator[]
  teams: Team[]
  collaboratorsLoading: boolean
  collaboratorsError: string | null
  matrixSuggestionCatalog: MatrixSuggestionCatalogData
  resolveCollaboratorLabel: (id: string) => string
  onContinuar: () => void
  onVoltar: () => void
  onRetryLoad?: () => void
  /** Totem de criação: sem CTAs Voltar/Continuar; catálogo e rascunho com copy alinhada ao combo. */
  totemMode?: boolean
}

export function CriarMatrizEtapaEstrutura({
  loading,
  loadError,
  entries,
  catalogDrafts,
  onAddCatalog,
  onAddBlankCatalogOpcao,
  onRemoveCatalog,
  onChangeCatalogDraft,
  onReorderCatalogDraft,
  onDuplicateCatalogInstance,
  manualOpcoes,
  onManualChange,
  collaborators,
  teams,
  collaboratorsLoading,
  collaboratorsError,
  matrixSuggestionCatalog,
  resolveCollaboratorLabel,
  onContinuar,
  onVoltar,
  onRetryLoad,
  totemMode = false,
}: Props) {
  const [catalogModalOpen, setCatalogModalOpen] = useState(false)

  const draftTree = useMemo(
    () => buildDraftCatalogItemTree(catalogDrafts),
    [catalogDrafts],
  )

  const collaboratorIdSet = useMemo(
    () => new Set(collaborators.map((c) => c.id)),
    [collaborators],
  )

  const aggregateMaps = useMemo(
    () => buildMatrixTreeAggregateMaps(draftTree, collaboratorIdSet),
    [draftTree, collaboratorIdSet],
  )

  const flowActions = totemMode ? null : (
    <>
      <button type="button" className="sgp-cta-secondary" onClick={onVoltar}>
        Voltar
      </button>
      <button type="button" onClick={onContinuar} className="sgp-cta-primary">
        Continuar para revisão
      </button>
    </>
  )

  const catalogToolbarBtn = (
    <button
      type="button"
      onClick={() => setCatalogModalOpen(true)}
      className="rounded-lg border border-sky-400/35 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100/95 hover:bg-sky-500/15"
    >
      + Do catálogo
    </button>
  )

  return (
    <section className="space-y-4">
      <CatalogAddModal
        open={catalogModalOpen}
        onClose={() => setCatalogModalOpen(false)}
        loading={loading}
        loadError={loadError}
        entries={entries}
        onRetryLoad={onRetryLoad}
        onInclude={(taskId) => {
          onAddCatalog(taskId)
        }}
      />

      <OperationMatrixEditorWorkbench
        columnLayout="wideRight"
        showSearchInput={false}
        metricsStrip={
          <OperationMatrixMetricsStrip global={aggregateMaps.global} />
        }
        stripEnd={flowActions}
        searchValue=""
        onSearchChange={() => {}}
        leftColumn={
          <NovaMatrizEstruturaCatalogPanel
            loading={loading}
            loadError={loadError}
            entries={entries}
            onRetryLoad={onRetryLoad}
            resolveCollaboratorLabel={resolveCollaboratorLabel}
            onDropDraftToRemove={onRemoveCatalog}
            toolbarExtra={catalogToolbarBtn}
            headingTitle={totemMode ? 'Bases e extras' : undefined}
            headingHint={
              totemMode
                ? 'Arraste para o combo ao lado. Para retirar uma opção, arraste de volta para aqui.'
                : undefined
            }
          />
        }
        rightColumn={
          <NovaMatrizEstruturaDraftPanel
            catalogDrafts={catalogDrafts}
            onAddCatalog={onAddCatalog}
            onAddBlankCatalogOpcao={onAddBlankCatalogOpcao}
            onRemoveCatalog={onRemoveCatalog}
            onChangeCatalogDraft={onChangeCatalogDraft}
            onReorderCatalogDraft={onReorderCatalogDraft}
            onDuplicateCatalogInstance={onDuplicateCatalogInstance}
            collaborators={collaborators}
            teams={teams}
            collaboratorsLoading={collaboratorsLoading}
            collaboratorsError={collaboratorsError}
            matrixSuggestionCatalog={matrixSuggestionCatalog}
            expandOnAdd={!totemMode}
            showDraftIntro={!totemMode}
            expandControlLabel={totemMode ? 'Expandir' : 'Editar'}
          />
        }
      />

      <div className="space-y-2 border-t border-white/[0.06] pt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Adicionar nova estrutura (manual)
        </h3>
        <CriarMatrizEstruturaManual
          opcoes={manualOpcoes}
          onChange={onManualChange}
          collaborators={collaborators}
          teams={teams}
          collaboratorsLoading={collaboratorsLoading}
          collaboratorsError={collaboratorsError}
          matrixSuggestionCatalog={matrixSuggestionCatalog}
        />
      </div>
    </section>
  )
}
