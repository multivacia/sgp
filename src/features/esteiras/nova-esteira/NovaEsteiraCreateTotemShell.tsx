import type { DragEventHandler } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SgpInlineBanner } from '../../../components/ui/SgpToast'
import type { CreateConveyorDados } from '../../../domain/conveyors/conveyor.types'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { Team } from '../../../domain/teams/team.types'
import type { MatrixNodeApi, MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import type { ManualOptionDraft, NovaEsteiraAlocacaoLinha } from './matrixToConveyorCreateInput'
import { NovaEsteiraCatalogoPanel } from './NovaEsteiraCatalogoPanel'
import { NovaEsteiraComposicaoManual } from './NovaEsteiraComposicaoManual'
import { NOVA_ESTEIRA_DRAG_MIME } from './novaEsteiraDnD'
import type { NovaEsteiraResponsaveisOptionsState } from './useNovaEsteiraResponsaveisOptions'
import {
  countStepsInRoots,
  countSectorsInRoots,
  deriveJornadaStepperSteps,
  matrixRootIdsFromManualRoots,
  pendenciasParaResumo,
  type JornadaStepDefinition,
  type JornadaStepId,
} from './novaEsteiraTotemUi'

type WizardExtras = {
  inicioPrevisto: string
  fimPrevisto: string
  tempoTotalPrevistoMin: number | ''
}

export type NovaEsteiraCreateTotemShellProps = {
  dados: CreateConveyorDados
  setDados: React.Dispatch<React.SetStateAction<CreateConveyorDados>>
  extras: WizardExtras
  setExtras: React.Dispatch<React.SetStateAction<WizardExtras>>
  manualRoots: ManualOptionDraft[]
  setManualRoots: React.Dispatch<React.SetStateAction<ManualOptionDraft[]>>
  manualAloc: Record<string, NovaEsteiraAlocacaoLinha[]>
  setManualAloc: React.Dispatch<React.SetStateAction<Record<string, NovaEsteiraAlocacaoLinha[]>>>
  matrizes: MatrixNodeApi[]
  matrizesLoading: boolean
  matrizesError: string | null
  treeByMatrixId: Record<string, MatrixNodeTreeApi | undefined>
  treesLoading: boolean
  treesError: string | null
  colabList: Collaborator[]
  colabLoading: boolean
  colabError: string | null
  teamList: Team[]
  teamLoading: boolean
  teamError: string | null
  removeDraftOptionKey: (optionKey: string) => void
  handleDropOnRascunho: DragEventHandler<HTMLDivElement>
  onUseMatrixAsBase: (matrixId: string) => void
  onSwapMatrixBase: (matrixId: string) => void
  onAddManualTask: () => void
  submitError: string | null
  dupHint: string | null
  estruturaHint: string | null
  handleSubmit: () => void | Promise<void>
  submitting: boolean
  estruturaOk: boolean
  minutosCalculados: number
  responsaveis: NovaEsteiraResponsaveisOptionsState
  selectResponsavel: string
}

function matrixLabelFromRoots(
  roots: ManualOptionDraft[],
  matrizes: MatrixNodeApi[],
): string {
  const ids = matrixRootIdsFromManualRoots(roots)
  if (ids.length === 0) return '—'
  if (ids.length > 1) return 'Várias bases'
  const m = matrizes.find((x) => x.id === ids[0])
  return m?.name?.trim() || 'Matriz'
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-300">
      {children}
    </span>
  )
}

function NovaEsteiraJornadaStepper({
  steps,
  activeStep,
  onSelectStep,
}: {
  steps: JornadaStepDefinition[]
  activeStep: JornadaStepId
  onSelectStep: (id: JornadaStepId) => void
}) {
  return (
    <nav aria-label="Jornada de criação" className="mt-3">
      <p className="sr-only">Três passos: dados básicos, estrutura e revisão antes de criar.</p>
      <ol className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          const base =
            'flex min-w-0 flex-1 basis-[30%] items-center justify-center rounded-lg border px-2 py-2 text-center text-[11px] font-semibold leading-tight transition sm:px-3 sm:text-xs'
          const cls =
            activeStep === step.id
              ? `${base} border-sgp-gold/45 bg-sgp-gold/[0.12] text-sgp-gold-warm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-sgp-gold/20`
              : step.status === 'concluida'
                ? `${base} border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-100/95`
                : `${base} border-white/[0.06] bg-black/25 text-slate-500`
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                className={cls}
                aria-current={activeStep === step.id ? 'step' : undefined}
                title={`Ir para: ${step.label}`}
                onClick={() => onSelectStep(step.id)}
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

export function NovaEsteiraCreateTotemShell(props: NovaEsteiraCreateTotemShellProps) {
  const {
    dados,
    setDados,
    extras,
    setExtras,
    manualRoots,
    setManualRoots,
    manualAloc,
    setManualAloc,
    matrizes,
    matrizesLoading,
    matrizesError,
    treeByMatrixId,
    treesLoading,
    treesError,
    colabList,
    colabLoading,
    colabError,
    teamList,
    teamLoading,
    teamError,
    removeDraftOptionKey,
    handleDropOnRascunho,
    onUseMatrixAsBase,
    onSwapMatrixBase,
    onAddManualTask,
    submitError,
    dupHint,
    estruturaHint,
    handleSubmit,
    submitting,
    estruturaOk,
    minutosCalculados,
    responsaveis,
    selectResponsavel,
  } = props

  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState(false)
  const [activeStep, setActiveStep] = useState<JornadaStepId>('dados')

  const jornadaSteps = useMemo(() => deriveJornadaStepperSteps(dados.nome, estruturaOk), [dados.nome, estruturaOk])

  const pendencias = pendenciasParaResumo(dados.nome, manualRoots, manualAloc)
  const podeCriar = estruturaOk && dados.nome.trim().length > 0
  const matrixLabel = matrixLabelFromRoots(manualRoots, matrizes)
  const nTarefas = manualRoots.length
  const nSetores = countSectorsInRoots(manualRoots)
  const nEtapas = countStepsInRoots(manualRoots)

  const cartContent = (
    <div className="space-y-4 rounded-2xl border border-sgp-gold/25 bg-gradient-to-b from-sgp-gold/[0.07] to-black/20 p-4 shadow-inner ring-1 ring-white/[0.05]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sgp-gold/90">Resumo</p>
        <p className="mt-1 font-heading text-base font-semibold text-white">Antes de criar</p>
      </div>
      <dl className="space-y-2 text-[13px]">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Base</dt>
          <dd className="max-w-[11rem] truncate text-right font-medium text-slate-100" title={matrixLabel}>
            {matrixLabel}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Tarefas</dt>
          <dd className="tabular-nums text-slate-100">{nTarefas}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Setores</dt>
          <dd className="tabular-nums text-slate-100">{nSetores}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Etapas</dt>
          <dd className="tabular-nums text-slate-100">{nEtapas}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Minutos (estrutura)</dt>
          <dd className="tabular-nums text-slate-100">{minutosCalculados} min</dd>
        </div>
      </dl>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/80">Pendências</p>
        {pendencias.length === 0 ? (
          <p className="mt-1 text-xs text-emerald-200/90">Nada a corrigir para criar.</p>
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
        disabled={submitting || !podeCriar}
        onClick={() => void handleSubmit()}
      >
        {submitting ? 'A criar…' : 'Criar esteira'}
      </button>
      <p className="text-center text-[10px] text-slate-500">Validação igual à do assistente anterior.</p>
    </div>
  )

  return (
    <div className="mx-auto max-w-[1600px] pb-12">
      <header className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-sgp-void via-sgp-navy-deep/80 to-sgp-void px-4 py-4 shadow-inner ring-1 ring-white/[0.04] sm:px-5">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" aria-hidden />
          Esteiras
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="sgp-page-title">Nova esteira</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Escolha uma base e monte a esteira — depois confira o resumo e crie.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link to="/app/backlog" className="sgp-cta-secondary inline-flex justify-center text-center text-sm">
              Cancelar
            </Link>
            <button
              type="button"
              className="sgp-cta-primary text-sm"
              disabled={submitting || !podeCriar}
              onClick={() => void handleSubmit()}
            >
              {submitting ? 'A criar…' : 'Criar esteira'}
            </button>
          </div>
        </div>

        <NovaEsteiraJornadaStepper
          steps={jornadaSteps}
          activeStep={activeStep}
          onSelectStep={setActiveStep}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Chip>
            Base: <span className="text-slate-100">{matrixLabel}</span>
          </Chip>
          <Chip>
            Tarefas: <span className="text-slate-100">{nTarefas}</span>
          </Chip>
          <Chip>
            Setores: <span className="text-slate-100">{nSetores}</span>
          </Chip>
          <Chip>
            Etapas: <span className="text-slate-100">{nEtapas}</span>
          </Chip>
          <Chip>
            Min: <span className="text-slate-100">{minutosCalculados}</span>
          </Chip>
          <Chip>
            Pendências:{' '}
            <span className={pendencias.length ? 'text-amber-200' : 'text-emerald-200'}>{pendencias.length}</span>
          </Chip>
        </div>

      </header>

      {submitError ? <SgpInlineBanner variant="error" message={submitError} className="mt-4" /> : null}
      {dupHint ? <SgpInlineBanner variant="neutral" message={dupHint} className="mt-3" /> : null}
      {estruturaHint ? <SgpInlineBanner variant="neutral" message={estruturaHint} className="mt-3" /> : null}

      {activeStep === 'dados' ? (
        <section
          id="nova-esteira-passo-dados"
          className="mt-6 scroll-mt-6 space-y-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
        >
          <h2 className="font-heading text-lg text-slate-100">Dados básicos</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="text-slate-400">Nome *</span>
              <input
                className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100"
                value={dados.nome}
                onChange={(ev) => setDados((d) => ({ ...d, nome: ev.target.value }))}
                placeholder="Ex.: OS 12345 · Gol GTI"
                autoComplete="off"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Cliente</span>
              <input
                className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100"
                value={dados.cliente ?? ''}
                onChange={(ev) => setDados((d) => ({ ...d, cliente: ev.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Veículo</span>
              <input
                className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100"
                value={dados.veiculo ?? ''}
                onChange={(ev) => setDados((d) => ({ ...d, veiculo: ev.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Início previsto</span>
              <input
                type="datetime-local"
                className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100"
                value={extras.inicioPrevisto}
                onChange={(ev) => setExtras((x) => ({ ...x, inicioPrevisto: ev.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Fim previsto</span>
              <input
                type="datetime-local"
                className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100"
                value={extras.fimPrevisto}
                onChange={(ev) => setExtras((x) => ({ ...x, fimPrevisto: ev.target.value }))}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="text-slate-400">Responsável</span>
              {responsaveis.status === 'error' ? (
                <p className="mt-1 text-xs text-rose-300">{responsaveis.message}</p>
              ) : null}
              <select
                className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100"
                value={selectResponsavel}
                disabled={responsaveis.status !== 'ready'}
                onChange={(ev) => {
                  const idSel = ev.target.value
                  if (!idSel) return setDados((d) => ({ ...d, responsavel: '', colaboradorId: null }))
                  const opt = responsaveis.status === 'ready' ? responsaveis.options.find((o) => o.value === idSel) : null
                  setDados((d) => ({ ...d, colaboradorId: idSel, responsavel: opt?.label ?? '' }))
                }}
              >
                <option value="">{responsaveis.status === 'loading' ? 'Carregando…' : 'Selecione'}</option>
                {responsaveis.status === 'ready' &&
                  responsaveis.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Prioridade</span>
              <select
                className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100"
                value={dados.prioridade || 'media'}
                onChange={(ev) =>
                  setDados((d) => ({ ...d, prioridade: ev.target.value as CreateConveyorDados['prioridade'] }))
                }
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Tempo total previsto (min)</span>
              <input
                type="number"
                min={0}
                className="sgp-input-app mt-1 w-full px-3 py-2 tabular-nums text-slate-100"
                value={extras.tempoTotalPrevistoMin}
                onChange={(ev) =>
                  setExtras((x) => ({
                    ...x,
                    tempoTotalPrevistoMin: ev.target.value === '' ? '' : Number(ev.target.value),
                  }))
                }
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="text-slate-400">Observações</span>
              <textarea
                className="sgp-input-app mt-1 min-h-[88px] w-full px-3 py-2 text-slate-100"
                value={dados.observacoes ?? ''}
                onChange={(ev) => setDados((d) => ({ ...d, observacoes: ev.target.value }))}
                placeholder="Contexto adicional do pedido (opcional)"
              />
            </label>
          </div>
        </section>
      ) : null}

      {activeStep === 'estrutura' ? (
        <div className="mt-6 flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] xl:items-start xl:gap-4">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-left text-sm font-semibold text-slate-200 xl:hidden"
            onClick={() => setCatalogDrawerOpen((o) => !o)}
          >
            Bases e extras
            <span className="text-sgp-gold">{catalogDrawerOpen ? '▲' : '▼'}</span>
          </button>

          <aside
            className={`min-h-0 space-y-3 xl:block ${catalogDrawerOpen ? 'block' : 'hidden'} xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto`}
          >
            <NovaEsteiraCatalogoPanel
              totemLayout
              matrices={matrizes}
              matricesLoading={matrizesLoading}
              matricesError={matrizesError}
              treeByMatrixId={treeByMatrixId}
              treesLoading={treesLoading}
              treesError={treesError}
              onRemoveDraftOption={removeDraftOptionKey}
              onUseMatrixAsBase={onUseMatrixAsBase}
              onSwapMatrixBase={onSwapMatrixBase}
              onAddManualTask={onAddManualTask}
              manualRoots={manualRoots}
            />
          </aside>

          <main
            id="nova-esteira-passo-montagem"
            className="scroll-mt-6 min-h-[320px] min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto"
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(NOVA_ESTEIRA_DRAG_MIME)) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={handleDropOnRascunho}
          >
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div>
                <h2 className="font-heading text-base font-semibold text-white">Sua esteira em montagem</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Use «Bases e extras» à esquerda ou arraste para aqui. Soltar na coluna da esquerda{' '}
                  <span className="text-slate-400">remove da esteira</span>.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <NovaEsteiraComposicaoManual
                roots={manualRoots}
                onChangeRoots={setManualRoots}
                alocacoes={manualAloc}
                onChangeAlocacoes={setManualAloc}
                colabList={colabList}
                colabLoading={colabLoading}
                colabError={colabError}
                teamList={teamList}
                teamLoading={teamLoading}
                teamError={teamError}
                variant="totem"
              />
            </div>
          </main>
        </div>
      ) : null}

      {activeStep === 'revisao' ? (
        <div className="mt-5 max-w-md scroll-mt-6" id="nova-esteira-passo-revisao" data-jornada-revisao-movel>
          {cartContent}
        </div>
      ) : null}
    </div>
  )
}
