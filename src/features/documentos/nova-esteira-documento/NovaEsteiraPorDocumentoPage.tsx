import { useCallback, useState, type DragEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ConveyorDraftV1 } from '../../../domain/argos/draft-v1.types'
import type { ArgosDocumentIngestResult } from '../../../domain/argos/ingest-response.types'
import { PageCanvas } from '../../../components/ui/PageCanvas'
import { SgpInlineBanner } from '../../../components/ui/SgpToast'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../../lib/errors'
import { useSgpErrorSurface } from '../../../lib/errors/SgpErrorPresentation'
import { useRegisterTransientContext } from '../../../lib/shell/transient-context'
import { createConveyor } from '../../../services/conveyors/conveyorsApiService'
import {
  postConveyorDocumentDraft,
  type DocumentDraftExecutionMode,
} from '../../../services/conveyors/documentDraftApiService'
import { partitionArgosIssues, isArgosResultOperationallyFailed } from './argosIssues'
import {
  draftV1ToCreateConveyorInput,
  validateDraftForCreate,
} from './draftToCreateConveyorInput'

type SuggestedForm = ConveyorDraftV1['suggestedDados'] & { osNumber?: string }

function cloneDraft(d: ConveyorDraftV1): ConveyorDraftV1 {
  return JSON.parse(JSON.stringify(d)) as ConveyorDraftV1
}

function ingestAllowsHumanReview(r: ArgosDocumentIngestResult): boolean {
  if (r.status === 'failed') return false
  const { fatal } = partitionArgosIssues(r.warnings)
  if (fatal.length > 0) return false
  return Boolean(r.draft)
}

export function NovaEsteiraPorDocumentoPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()

  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [ingest, setIngest] = useState<ArgosDocumentIngestResult | null>(null)
  const [editedDraft, setEditedDraft] = useState<ConveyorDraftV1 | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  /** Modo de execução documental no servidor (vindo de `meta` — sem inferência no cliente). */
  const [documentExecutionMode, setDocumentExecutionMode] = useState<
    DocumentDraftExecutionMode | null
  >(null)

  const resetJourney = useCallback(() => {
    setPickedFile(null)
    setProcessing(false)
    setIngest(null)
    setEditedDraft(null)
    setLocalError(null)
    setDocumentExecutionMode(null)
  }, [])

  /** Troca de função no shell: há interpretação ARGOS ou processamento em curso. */
  useRegisterTransientContext({
    id: 'nova-esteira-documento',
    isDirty: () =>
      (ingest !== null || processing) && !submitting,
    onReset: resetJourney,
  })

  const runPipeline = useCallback(
    async (file: File) => {
      setLocalError(null)
      setProcessing(true)
      setIngest(null)
      setEditedDraft(null)
      setDocumentExecutionMode(null)
      try {
        const { result, documentDraftExecutionMode } =
          await postConveyorDocumentDraft(file)
        setIngest(result)
        setDocumentExecutionMode(documentDraftExecutionMode ?? null)
        if (ingestAllowsHumanReview(result) && result.draft) {
          setEditedDraft(cloneDraft(result.draft))
        }
      } catch (e) {
        const n = reportClientError(e, {
          module: 'documentos',
          action: 'document_draft_ingest',
          route: pathname,
        })
        if (isBlockingSeverity(n.severity)) {
          presentBlocking(n)
        } else {
          setLocalError(n.userMessage)
        }
      } finally {
        setProcessing(false)
      }
    },
    [pathname, presentBlocking],
  )

  const onPickFile = useCallback(
    (f: File | null) => {
      if (!f) return
      setPickedFile(f)
      void runPipeline(f)
    },
    [runPipeline],
  )

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) onPickFile(f)
  }

  const fatalList = ingest
    ? partitionArgosIssues(ingest.warnings).fatal
    : []
  const nonFatalList = ingest
    ? partitionArgosIssues(ingest.warnings).nonFatal
    : []

  const blockedOperationally =
    ingest &&
    isArgosResultOperationallyFailed({
      status: ingest.status,
      draft: ingest.draft,
      fatalIssues: fatalList,
    })

  const canSubmit = Boolean(editedDraft) && !blockedOperationally && !submitting

  async function handleCriarEsteira() {
    if (!editedDraft) return
    const v = validateDraftForCreate(editedDraft)
    if (v) {
      setLocalError(v)
      return
    }
    setLocalError(null)
    setSubmitting(true)
    try {
      const body = draftV1ToCreateConveyorInput(editedDraft)
      const created = await createConveyor(body)
      navigate(`/app/esteiras/${encodeURIComponent(created.id)}`, {
        replace: true,
        state: {
          sgpToast: 'Esteira criada a partir do documento revisto.',
          fromDocumentDraft: true,
        },
      })
    } catch (e) {
      const n = reportClientError(e, {
        module: 'documentos',
        action: 'document_draft_create_conveyor',
        route: pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setLocalError(n.userMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function patchSuggested(patch: Partial<SuggestedForm>) {
    setEditedDraft((prev) => {
      if (!prev) return null
      const n = cloneDraft(prev)
      n.suggestedDados = { ...n.suggestedDados, ...patch }
      return n
    })
  }

  return (
    <PageCanvas>
      <header className="sgp-header-card max-w-4xl">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
          Documento
        </p>
        <h1 className="sgp-page-title mt-3">Nova esteira por documento</h1>
        <p className="sgp-page-lead max-w-3xl">
          Envie um PDF da ordem de serviço. O sistema gera um{' '}
          <strong className="font-semibold text-slate-200">rascunho automático</strong>{' '}
          para rever e corrigir antes de criar a esteira oficialmente no SGP+.
        </p>
      </header>

      {documentExecutionMode === 'local' ? (
        <SgpInlineBanner
          variant="neutral"
          message="Modo local: este rascunho foi gerado no servidor SGP+ (pipeline local), sem chamada ao ARGOS remoto nesta execução."
          className="mt-6 max-w-4xl border-sky-500/25 bg-sky-500/[0.08] text-sky-50/95"
        />
      ) : null}
      {documentExecutionMode === 'stub' ? (
        <SgpInlineBanner
          variant="neutral"
          message="Modo demonstração (stub): rascunho mínimo para testes rápidos — não usa o ARGOS remoto nem o pipeline local completo."
          className="mt-6 max-w-4xl border-amber-500/30 bg-amber-500/[0.09] text-amber-50/95"
        />
      ) : null}

      {processing ? (
        <SgpInlineBanner
          variant="neutral"
          message="A processar o documento e a gerar o rascunho…"
          className="mt-6 max-w-4xl"
        />
      ) : null}

      {localError ? (
        <SgpInlineBanner variant="error" message={localError} className="mt-4 max-w-4xl" />
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-50">
            1. Documento (PDF)
          </h2>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 ${
              dragOver
                ? 'border-sgp-blue-bright bg-sgp-blue/15 transition-colors duration-200'
                : 'border-white/12 bg-sgp-app-panel/70 sgp-dropzone-hover'
            }`}
          >
            <p className="text-center text-sm text-slate-300">
              {pickedFile
                ? 'Ficheiro selecionado. Pode substituir escolhendo outro PDF.'
                : 'Arraste o PDF ou escolha um arquivo.'}
            </p>
            <label className="sgp-cta-primary mt-4 inline-flex cursor-pointer px-6 py-2.5">
              {processing ? 'A processar…' : 'Escolher PDF'}
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                disabled={processing || submitting}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {pickedFile ? (
              <p className="mt-4 text-sm font-semibold text-slate-100">{pickedFile.name}</p>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            O processamento não cria a esteira sozinho: só gera um rascunho. A criação
            oficial ocorre apenas quando confirmar abaixo, com os dados que revê.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-50">
            2. Situação do rascunho
          </h2>
          <div className="sgp-panel sgp-panel-hover !p-5">
            {!ingest && !processing ? (
              <p className="text-sm text-slate-400">
                Ainda sem resultado. Envie um PDF para ver o rascunho e os avisos do
                interpretador.
              </p>
            ) : null}
            {ingest ? (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-500">Situação ARGOS:</span>
                  <StatusPill status={ingest.status} />
                  {ingest.confidence ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-slate-300">
                      Confiança global:{' '}
                      {Math.round((ingest.confidence.overall ?? 0) * 100)}%
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">
                  Estratégia: {ingest.strategy} · Especialista: {ingest.specialist}
                </p>
                {ingest.document?.contentSha256 ? (
                  <p className="text-[11px] text-slate-600">
                    Hash do arquivo: {ingest.document.contentSha256.slice(0, 16)}…
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {ingest ? (
        <div className="mt-6 max-w-4xl rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 ring-1 ring-white/[0.04]">
          <ArgosSupportReference ingest={ingest} />
        </div>
      ) : null}

      {ingest && blockedOperationally ? (
        <div className="mt-8 max-w-4xl space-y-3">
          <SgpInlineBanner
            variant="error"
            message="Não foi possível obter um rascunho utilizável a partir deste documento. Corrija o arquivo ou tente outro envio. Se o problema continuar, contate o suporte."
          />
          {fatalList.length > 0 ? (
            <ul className="list-inside list-disc space-y-1 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-100/90">
              {fatalList.map((w) => (
                <li key={w.code}>
                  <span className="font-mono text-xs text-rose-200/80">{w.code}</span>
                  {w.message ? ` — ${w.message}` : null}
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={resetJourney}
            className="sgp-cta-secondary"
          >
            Enviar outro documento
          </button>
        </div>
      ) : null}

      {ingest && !blockedOperationally && nonFatalList.length > 0 ? (
        <div className="mt-8 max-w-4xl rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-4 ring-1 ring-amber-500/15">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-100/90">
            Avisos para revisão
          </p>
          <p className="mt-1 text-xs text-amber-100/75">
            Estes pontos não bloqueiam por si o envio, mas devem ser confirmados por um
            humano antes de criar a esteira.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-amber-50/95">
            {nonFatalList.map((w) => (
              <li key={`${w.code}-${w.fieldPath ?? ''}`} className="flex flex-col gap-0.5">
                <span className="font-mono text-[11px] text-amber-200/85">{w.code}</span>
                <span>{w.message ?? 'Revise o campo indicado no documento.'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {editedDraft ? (
        <div className="mt-10 max-w-4xl space-y-8">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 ring-1 ring-white/[0.05]">
            <h2 className="font-heading text-lg text-slate-100">Dados sugeridos (editáveis)</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ajuste os campos antes de criar a esteira. O texto abaixo reflete a leitura
              automática, não a versão final na base.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Nome da esteira"
                value={(editedDraft.suggestedDados as SuggestedForm).title ?? ''}
                onChange={(v) => patchSuggested({ title: v })}
              />
              <Field
                label="Cliente"
                value={(editedDraft.suggestedDados as SuggestedForm).clientName ?? ''}
                onChange={(v) => patchSuggested({ clientName: v })}
              />
              <Field
                label="Veículo"
                value={(editedDraft.suggestedDados as SuggestedForm).vehicleDescription ?? ''}
                onChange={(v) => patchSuggested({ vehicleDescription: v })}
              />
              <Field
                label="Modelo / versão"
                value={(editedDraft.suggestedDados as SuggestedForm).modelVersion ?? ''}
                onChange={(v) => patchSuggested({ modelVersion: v })}
              />
              <Field
                label="Placa"
                value={(editedDraft.suggestedDados as SuggestedForm).licensePlate ?? ''}
                onChange={(v) => patchSuggested({ licensePlate: v })}
              />
              <Field
                label="Prazo estimado"
                value={(editedDraft.suggestedDados as SuggestedForm).estimatedDeadline ?? ''}
                onChange={(v) => patchSuggested({ estimatedDeadline: v })}
              />
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Observações
                </label>
                <textarea
                  value={(editedDraft.suggestedDados as SuggestedForm).notes ?? ''}
                  onChange={(e) => patchSuggested({ notes: e.target.value })}
                  rows={3}
                  className="sgp-input-app w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {(editedDraft.suggestedDados as SuggestedForm).osNumber ? (
                <div className="sm:col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
                  Referência OS (lida):{' '}
                  <span className="text-slate-200">
                    {(editedDraft.suggestedDados as SuggestedForm).osNumber}
                  </span>
                </div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Prioridade sugerida
                </label>
                <select
                  value={(editedDraft.suggestedDados as SuggestedForm).priorityHint ?? 'media'}
                  onChange={(e) =>
                    patchSuggested({
                      priorityHint: e.target.value as 'alta' | 'media' | 'baixa',
                    })
                  }
                  className="sgp-input-app w-full rounded-lg px-3 py-2 text-sm"
                >
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 ring-1 ring-white/[0.05]">
            <h2 className="font-heading text-lg text-slate-100">Itens / etapas inferidos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Estrutura proposta (opção → área → etapa). Edite títulos e tempos planeados
              em minutos.
            </p>
            <DraftStructureEditor draft={editedDraft} onChange={setEditedDraft} />
          </section>

          {ingest && ingest.extractedFacts.length > 0 ? (
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <h3 className="text-sm font-semibold text-slate-300">Factos extraídos</h3>
              <ul className="mt-3 space-y-2 text-xs text-slate-400">
                {ingest.extractedFacts.slice(0, 24).map((f) => (
                  <li key={f.key} className="flex justify-between gap-4 border-b border-white/[0.04] pb-2 last:border-0">
                    <span className="font-mono text-slate-500">{f.key}</span>
                    <span className="min-w-0 flex-1 text-right text-slate-300">
                      {String(f.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleCriarEsteira}
              className="sgp-cta-primary disabled:opacity-45"
            >
              {submitting ? 'A criar…' : 'Criar esteira no SGP+'}
            </button>
            <button
              type="button"
              disabled={processing || submitting}
              onClick={resetJourney}
              className="sgp-cta-secondary"
            >
              Novo documento
            </button>
          </div>
        </div>
      ) : null}
    </PageCanvas>
  )
}

/**
 * Identificadores do processamento ARGOS para chamados — sem expor stack nem URLs internas.
 */
function ArgosSupportReference({ ingest }: { ingest: ArgosDocumentIngestResult }) {
  const { showToast } = useSgpErrorSurface()

  async function copySupportLine() {
    const text = `Pedido ARGOS: ${ingest.requestId}\nCorrelação: ${ingest.correlationId}`
    try {
      await navigator.clipboard.writeText(text)
      showToast('Referência copiada para a área de transferência.', 'success')
    } catch {
      showToast(
        'Não foi possível copiar automaticamente. Anote os identificadores manualmente.',
        'error',
      )
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Rastreabilidade (suporte)
        </p>
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-400 break-all">
          <span className="text-slate-500">Pedido </span>
          {ingest.requestId}
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-slate-400 break-all">
          <span className="text-slate-500">Correlação </span>
          {ingest.correlationId}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void copySupportLine()}
        className="shrink-0 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-sgp-gold/35 hover:bg-white/[0.07]"
      >
        Copiar referência
      </button>
    </div>
  )
}

function StatusPill({ status }: { status: ArgosDocumentIngestResult['status'] }) {
  const cls =
    status === 'completed'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
      : status === 'partial'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
        : 'border-rose-500/30 bg-rose-500/10 text-rose-100'
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${cls}`}
    >
      {status === 'completed'
        ? 'Concluído'
        : status === 'partial'
          ? 'Parcial'
          : 'Falhou'}
    </span>
  )
}

function Field(props: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-400">{props.label}</label>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="sgp-input-app w-full rounded-lg px-3 py-2 text-sm"
      />
    </div>
  )
}

function DraftStructureEditor(props: {
  draft: ConveyorDraftV1
  onChange: (d: ConveyorDraftV1) => void
}) {
  const { draft, onChange } = props

  function update(mut: (d: ConveyorDraftV1) => void) {
    const n = cloneDraft(draft)
    mut(n)
    onChange(n)
  }

  return (
    <div className="mt-5 space-y-6">
      {draft.options.map((opt, oi) => (
        <div
          key={`opt-${opt.orderIndex}-${oi}`}
          className="rounded-xl border border-white/[0.07] bg-sgp-app-panel-deep/80 p-4"
        >
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Opção {oi + 1}
          </label>
          <input
            value={opt.title}
            onChange={(e) =>
              update((d) => {
                d.options[oi]!.title = e.target.value
              })
            }
            className="sgp-input-app mt-1 w-full rounded-lg px-3 py-2 text-sm font-medium"
          />
          <div className="mt-4 space-y-4 pl-2 border-l border-white/[0.08]">
            {opt.areas.map((area, ai) => (
              <div key={`area-${area.orderIndex}-${ai}`}>
                <label className="text-[11px] font-semibold text-slate-500">Área</label>
                <input
                  value={area.title}
                  onChange={(e) =>
                    update((d) => {
                      d.options[oi]!.areas[ai]!.title = e.target.value
                    })
                  }
                  className="sgp-input-app mt-1 w-full rounded-lg px-3 py-2 text-sm"
                />
                <div className="mt-3 space-y-2 pl-2">
                  {area.steps.map((st, si) => (
                    <div
                      key={`st-${st.orderIndex}-${si}`}
                      className="grid gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 sm:grid-cols-[1fr_120px]"
                    >
                      <div>
                        <label className="text-[10px] uppercase text-slate-600">Etapa</label>
                        <input
                          value={st.title}
                          onChange={(e) =>
                            update((d) => {
                              d.options[oi]!.areas[ai]!.steps[si]!.title = e.target.value
                            })
                          }
                          className="sgp-input-app mt-0.5 w-full rounded-lg px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-slate-600">Min</label>
                        <input
                          type="number"
                          min={0}
                          value={st.plannedMinutes ?? 0}
                          onChange={(e) =>
                            update((d) => {
                              const n = Number(e.target.value)
                              d.options[oi]!.areas[ai]!.steps[si]!.plannedMinutes =
                                Number.isFinite(n) ? n : 0
                            })
                          }
                          className="sgp-input-app mt-0.5 w-full rounded-lg px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
