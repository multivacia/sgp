import { useMemo, type Dispatch, type SetStateAction } from 'react'
import type { MatrixSuggestionCatalogData } from '../../../catalog/matrixSuggestion/types'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { Team } from '../../../domain/teams/team.types'
import type { CatalogOpcaoDraftInstance } from './cloneCatalogTaskSubtreeForDraft'
import type { CriarMatrizManualOpcao } from './criarMatrizManualDraft'
import { CriarMatrizEtapaEstrutura } from './CriarMatrizEtapaEstrutura'
import type { MatrixCatalogTaskEntry } from './extractMatrixTasksForCatalog'
import type { NovaMatrizAddCatalogResult } from './novaMatrizEstruturaDnD'
import {
  aggregateNovaMatrizCombos,
  deriveMatrizJornadaStepperSteps,
  matrizEstruturaOk,
  pendenciasNovaMatrizResumo,
  type MatrizJornadaStepDefinition,
  type MatrizJornadaStepId,
} from './novaMatrizTotemUi'

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-300">
      {children}
    </span>
  )
}

function scrollToMatrizJornadaPasso(id: MatrizJornadaStepId) {
  if (id === 'dados') {
    document.getElementById('nova-matriz-passo-dados')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  if (id === 'estrutura') {
    document.getElementById('nova-matriz-passo-montagem')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches) {
    document.getElementById('nova-matriz-passo-revisao')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } else {
    document.querySelector<HTMLElement>('[data-jornada-matriz-revisao-movel]')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
}

function NovaMatrizJornadaStepper({ steps }: { steps: MatrizJornadaStepDefinition[] }) {
  return (
    <nav aria-label="Jornada de criação da matriz" className="mt-3">
      <p className="sr-only">Três passos: dados básicos, estrutura do combo e revisão antes de salvar.</p>
      <ol className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          const base =
            'flex min-w-0 flex-1 basis-[30%] items-center justify-center rounded-lg border px-2 py-2 text-center text-[11px] font-semibold leading-tight transition sm:px-3 sm:text-xs'
          const cls =
            step.status === 'atual'
              ? `${base} border-sgp-gold/45 bg-sgp-gold/[0.12] text-sgp-gold-warm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-sgp-gold/20`
              : step.status === 'concluida'
                ? `${base} border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-100/95`
                : `${base} border-white/[0.06] bg-black/25 text-slate-500`
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                className={cls}
                aria-current={step.status === 'atual' ? 'step' : undefined}
                title={`Ir para: ${step.label}`}
                onClick={() => scrollToMatrizJornadaPasso(step.id)}
              >
                <span className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-1.5">
                  {step.status === 'concluida' ? (
                    <span className="text-emerald-300/90" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                  <span>{step.label}</span>
                </span>
              </button>
              {!isLast ? (
                <span className="shrink-0 text-[10px] text-slate-600 select-none" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export type NovaMatrizCreateTotemShellProps = {
  name: string
  setName: (v: string) => void
  code: string
  setCode: (v: string) => void
  description: string
  setDescription: (v: string) => void
  catalogOpcoesDraft: CatalogOpcaoDraftInstance[]
  manualOpcoes: CriarMatrizManualOpcao[]
  setManualOpcoes: Dispatch<SetStateAction<CriarMatrizManualOpcao[]>>
  catalogEntries: MatrixCatalogTaskEntry[]
  structureLoading: boolean
  structureError: string | null
  onRetryLoadCatalog: () => void
  onAddCatalog: (taskId: string) => NovaMatrizAddCatalogResult
  onAddBlankCatalogOpcao: (name: string, description?: string) => void
  onRemoveCatalog: (instanceId: string) => void
  onChangeCatalogDraft: (instanceId: string, draftRoot: CatalogOpcaoDraftInstance['draftRoot']) => void
  onReorderCatalogDraft: (dir: 'up' | 'down', taskId: string | null) => void
  onDuplicateCatalogInstance: (instanceId: string) => void
  collaborators: Collaborator[]
  teams: Team[]
  collaboratorsLoading: boolean
  collaboratorsError: string | null
  matrixSuggestionCatalog: MatrixSuggestionCatalogData
  resolveCollaboratorLabel: (id: string) => string
  onCancel: () => void
  onSave: () => void
  saving: boolean
}

export function NovaMatrizCreateTotemShell(props: NovaMatrizCreateTotemShellProps) {
  const {
    name,
    setName,
    code,
    setCode,
    description,
    setDescription,
    catalogOpcoesDraft,
    manualOpcoes,
    setManualOpcoes,
    catalogEntries,
    structureLoading,
    structureError,
    onRetryLoadCatalog,
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
    resolveCollaboratorLabel,
    onCancel,
    onSave,
    saving,
  } = props

  const collaboratorIdSet = useMemo(
    () => new Set(collaborators.map((c) => c.id)),
    [collaborators],
  )

  const estruturaOk = useMemo(
    () => matrizEstruturaOk(manualOpcoes, catalogOpcoesDraft),
    [manualOpcoes, catalogOpcoesDraft],
  )

  const jornadaSteps = useMemo(
    () => deriveMatrizJornadaStepperSteps(name, estruturaOk),
    [name, estruturaOk],
  )

  const pendencias = useMemo(
    () => pendenciasNovaMatrizResumo(name, manualOpcoes, catalogOpcoesDraft),
    [name, manualOpcoes, catalogOpcoesDraft],
  )

  const { nOpcoes, nAreas, nEtapas, minutos } = useMemo(
    () => aggregateNovaMatrizCombos(catalogOpcoesDraft, manualOpcoes, collaboratorIdSet),
    [catalogOpcoesDraft, manualOpcoes, collaboratorIdSet],
  )

  const podeSalvar = name.trim().length > 0 && estruturaOk

  const cartContent = (
    <div className="space-y-4 rounded-2xl border border-sgp-gold/25 bg-gradient-to-b from-sgp-gold/[0.07] to-black/20 p-4 shadow-inner ring-1 ring-white/[0.05]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sgp-gold/90">Resumo</p>
        <p className="mt-1 font-heading text-base font-semibold text-white">Antes de salvar</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          Padrão reutilizável (combo). Mesmas validações do fluxo anterior.
        </p>
      </div>
      <dl className="space-y-2 text-[13px]">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Opções</dt>
          <dd className="tabular-nums text-slate-100">{nOpcoes}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Áreas</dt>
          <dd className="tabular-nums text-slate-100">{nAreas}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Etapas</dt>
          <dd className="tabular-nums text-slate-100">{nEtapas}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Minutos</dt>
          <dd className="tabular-nums text-slate-100">{minutos} min</dd>
        </div>
      </dl>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/80">Pendências</p>
        {pendencias.length === 0 ? (
          <p className="mt-1 text-xs text-emerald-200/90">Nada a corrigir para salvar.</p>
        ) : (
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-100/95">
            {pendencias.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        className="sgp-cta-primary w-full"
        disabled={saving || !podeSalvar}
        onClick={() => void onSave()}
      >
        {saving ? 'A guardar…' : 'Salvar matriz'}
      </button>
    </div>
  )

  return (
    <div className="mx-auto max-w-[1600px] pb-12">
      <header className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-sgp-void via-sgp-navy-deep/80 to-sgp-void px-4 py-4 shadow-inner ring-1 ring-white/[0.04] sm:px-5">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" aria-hidden />
          Gestão
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="sgp-page-title">Nova matriz</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Monte o combo padrão da operação — dados básicos, estrutura e revisão antes de salvar.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              className="sgp-cta-secondary text-sm"
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="sgp-cta-primary text-sm"
              disabled={saving || !podeSalvar}
              onClick={() => void onSave()}
            >
              {saving ? 'A guardar…' : 'Salvar matriz'}
            </button>
          </div>
        </div>

        <NovaMatrizJornadaStepper steps={jornadaSteps} />

        <div id="nova-matriz-passo-dados" className="scroll-mt-6">
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Chip>
              Opções: <span className="text-slate-100">{nOpcoes}</span>
            </Chip>
            <Chip>
              Áreas: <span className="text-slate-100">{nAreas}</span>
            </Chip>
            <Chip>
              Etapas: <span className="text-slate-100">{nEtapas}</span>
            </Chip>
            <Chip>
              Min: <span className="text-slate-100">{minutos}</span>
            </Chip>
            <Chip>
              Pendências:{' '}
              <span className={pendencias.length ? 'text-amber-200' : 'text-emerald-200'}>{pendencias.length}</span>
            </Chip>
          </div>

          <ul className="mt-3 space-y-1 text-[12px] text-slate-400">
            <li className={name.trim() ? 'text-emerald-200/90' : ''}>
              {name.trim() ? '✔' : '○'} Nome definido
            </li>
            <li>○ Descrição opcional</li>
          </ul>

          <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-400">Nome da matriz *</span>
              <input
                className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Código (opcional)</span>
              <input
                className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100"
                value={code}
                onChange={(ev) => setCode(ev.target.value)}
                autoComplete="off"
                placeholder="Ex.: CARPETE-01"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-400">Descrição (opcional)</span>
              <textarea
                className="sgp-input-app mt-1 min-h-[88px] w-full px-3 py-2 text-slate-100"
                value={description}
                onChange={(ev) => setDescription(ev.target.value)}
              />
            </label>
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] xl:items-start xl:gap-4">
        <div
          id="nova-matriz-passo-montagem"
          className="scroll-mt-6 min-w-0 space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto"
        >
          <div className="border-b border-white/[0.06] pb-3">
            <h2 className="font-heading text-base font-semibold text-white">Sua matriz em montagem</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              «Bases e extras» e o painel âmbar montam o combo. Expanda cada cartão para áreas, etapas e
              responsáveis.
            </p>
          </div>
          <CriarMatrizEtapaEstrutura
            totemMode
            loading={structureLoading}
            loadError={structureError}
            entries={catalogEntries}
            catalogDrafts={catalogOpcoesDraft}
            onAddCatalog={onAddCatalog}
            onAddBlankCatalogOpcao={onAddBlankCatalogOpcao}
            onRemoveCatalog={onRemoveCatalog}
            onChangeCatalogDraft={onChangeCatalogDraft}
            onReorderCatalogDraft={onReorderCatalogDraft}
            onDuplicateCatalogInstance={onDuplicateCatalogInstance}
            manualOpcoes={manualOpcoes}
            onManualChange={setManualOpcoes}
            collaborators={collaborators}
            teams={teams}
            collaboratorsLoading={collaboratorsLoading}
            collaboratorsError={collaboratorsError}
            matrixSuggestionCatalog={matrixSuggestionCatalog}
            resolveCollaboratorLabel={resolveCollaboratorLabel}
            onContinuar={() => {}}
            onVoltar={() => {}}
            onRetryLoad={onRetryLoadCatalog}
          />
        </div>

        <aside
          id="nova-matriz-passo-revisao"
          className="hidden scroll-mt-6 xl:block xl:sticky xl:top-4 xl:self-start"
        >
          {cartContent}
        </aside>
      </div>

      <div className="mt-5 scroll-mt-6 xl:hidden" data-jornada-matriz-revisao-movel>
        {cartContent}
      </div>
    </div>
  )
}
