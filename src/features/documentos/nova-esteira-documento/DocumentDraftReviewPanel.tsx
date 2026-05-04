import { useState } from 'react'
import type { ArgosMatchingPlanItemV11 } from '../../../domain/argos/draft-v1.types'
import type { ArgosDocumentIngestResult } from '../../../domain/argos/ingest-response.types'
import {
  buildDocumentDraftReviewModel,
  formatPlannedMinutes,
  getSuggestedActionLabel,
  getSuggestedActionTone,
  shouldShowAcceptSuggestedButton,
  type MatchingPlanEntry,
} from './documentDraftReview'
import {
  buildAcceptanceSummary,
  getReviewItemDecision,
  type ReviewAcceptanceState,
  type ReviewItemCurrentDecision,
} from './documentReviewAcceptance'

type OnReviewDecisionFn = (payload: {
  itemKey: string
  currentDecision: ReviewItemCurrentDecision
  selectedAlternativeMatrixNodeId?: string
}) => void

export function DocumentDraftReviewPanel({
  ingest,
  acceptanceState,
  onReviewDecision,
}: {
  ingest: ArgosDocumentIngestResult
  acceptanceState?: ReviewAcceptanceState
  onReviewDecision?: OnReviewDecisionFn
}) {
  const model = buildDocumentDraftReviewModel(ingest)
  const state = acceptanceState ?? {}
  const acceptanceSummary = buildAcceptanceSummary(model, state)
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <h2 className="font-heading text-lg text-slate-100">Revisão da OS importada</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <p>Origem: {model.sourceSummary.provider ?? 'Não informado'}</p>
          <p>Tipo: {model.sourceSummary.documentType ?? 'Não informado'}</p>
          <p>Número: {model.sourceSummary.documentNumber ?? 'Não informado'}</p>
          <p>Status: {model.sourceSummary.status}</p>
          <p>Veículo: {vehicleText(model.vehicleSummary)}</p>
          <p>Placa mascarada: {model.vehicleSummary.maskedPlate ?? 'Não informado'}</p>
          <p>Confiança global: {model.sourceSummary.confidencePercent ?? 'Não informado'}</p>
        </div>
      </section>

      {model.redactionSummary ? (
        <section className="rounded-2xl border border-sky-500/30 bg-sky-500/[0.07] p-6">
          <h3 className="text-sm font-semibold text-sky-100">Dados protegidos removidos</h3>
          <p className="mt-1 text-sm text-sky-50/90">
            Dados pessoais removidos: {model.redactionSummary.personalDataRemoved ? 'Sim' : 'Não'}{' '}
            · Dados financeiros removidos:{' '}
            {model.redactionSummary.financialDataRemoved ? 'Sim' : 'Não'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {model.redactionSummary.removedCategories.map((item) => (
              <span
                key={item.code}
                className="rounded-full border border-sky-300/30 bg-sky-500/15 px-2 py-0.5 text-xs text-sky-100"
              >
                {item.label}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Serviços extraídos" value={model.counters.totalServices} />
        <KpiCard label="Itens reaproveitados (plano)" value={model.counters.totalReuseExisting} />
        <KpiCard label="Revisar similaridade" value={model.counters.totalReviewSimilar} />
        <KpiCard label="Novos sugeridos" value={model.counters.totalCreateNew} />
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm">
        <p className="text-slate-100">
          Pendências de revisão: {acceptanceSummary.pendingTotal}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Alternativas selecionadas: {acceptanceSummary.alternativesSelected} · Ignorados pelo
          revisor: {acceptanceSummary.ignoredByUser}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Itens similares pendentes: {acceptanceSummary.pendingReviewSimilar} · Itens novos
          pendentes: {acceptanceSummary.pendingCreateNew}
        </p>
        {acceptanceSummary.pendingTotal === 0 ? (
          <p className="mt-2 text-xs text-emerald-300">Revisão obrigatória concluída.</p>
        ) : null}
      </section>

      <MatchingEntriesSection
        title="Reaproveitar da Matriz"
        subtitle="Atividades com alta similaridade. Pode manter o candidato ou escolher uma alternativa."
        tone="reuse"
        entries={model.matchingPlanEntries.filter(
          (e) => e.item.suggestedAction === 'REUSE_EXISTING',
        )}
        acceptanceState={state}
        onReviewDecision={onReviewDecision}
      />
      <MatchingEntriesSection
        title="Revisar similaridade"
        subtitle="Confirme se esta atividade representa corretamente o serviço extraído da OS."
        tone="review"
        entries={model.matchingPlanEntries.filter(
          (e) => e.item.suggestedAction === 'REVIEW_SIMILAR',
        )}
        acceptanceState={state}
        onReviewDecision={onReviewDecision}
      />
      <MatchingEntriesSection
        title="Nova atividade sugerida"
        subtitle="Nenhuma atividade suficientemente parecida foi encontrada."
        tone="new"
        entries={model.matchingPlanEntries.filter((e) => e.item.suggestedAction === 'CREATE_NEW')}
        acceptanceState={state}
        onReviewDecision={onReviewDecision}
      />
      <MatchingEntriesSection
        title="Ignorar"
        subtitle="Itens que não devem virar etapa operacional nesta esteira."
        tone="ignore"
        entries={model.matchingPlanEntries.filter((e) => e.item.suggestedAction === 'IGNORE')}
        acceptanceState={state}
        onReviewDecision={onReviewDecision}
      />

      {model.partsExcludedFromOperationalUiCount > 0 ? (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 ring-1 ring-white/[0.04]">
          <p className="text-xs leading-relaxed text-slate-400">
            Foram identificados itens de peça ou insumo no documento de origem; o SGP não utiliza esta
            informação para montar a esteira nem para controlo de stock — apenas atividades de serviço
            entram no fluxo operacional.
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <h3 className="text-sm font-semibold text-slate-100">Observações operacionais</h3>
        {model.operationalNotes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Não foram identificadas observações operacionais adicionais.
          </p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
            {model.operationalNotes.map((note, idx) => (
              <li key={`${idx}-${note}`}>{note}</li>
            ))}
          </ul>
        )}
      </section>

      {model.counters.hasReviewRequiredItems ? (
        <section className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-4 text-sm text-amber-100">
          Existem itens que exigem decisão explícita antes da criação oficial da esteira.
        </section>
      ) : null}
    </div>
  )
}

function vehicleText(v: ReturnType<typeof buildDocumentDraftReviewModel>['vehicleSummary']): string {
  const parts = [v.model, v.year ? String(v.year) : undefined, v.color].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : 'Não informado'
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-100">{value}</p>
    </div>
  )
}

type SectionTone = 'reuse' | 'review' | 'new' | 'ignore'

function MatchingEntriesSection({
  title,
  subtitle,
  entries,
  acceptanceState,
  onReviewDecision,
  tone,
}: {
  title: string
  subtitle: string
  entries: MatchingPlanEntry[]
  acceptanceState: ReviewAcceptanceState
  onReviewDecision?: OnReviewDecisionFn
  tone: SectionTone
}) {
  if (entries.length === 0) return null
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      <ul className="mt-3 space-y-3">
        {entries.map((entry) => (
          <MatchingPlanEntryCard
            key={entry.itemKey}
            entry={entry}
            tone={tone}
            acceptanceState={acceptanceState}
            onReviewDecision={onReviewDecision}
          />
        ))}
      </ul>
    </section>
  )
}

function MatchingPlanEntryCard({
  entry,
  tone,
  acceptanceState,
  onReviewDecision,
}: {
  entry: MatchingPlanEntry
  tone: SectionTone
  acceptanceState: ReviewAcceptanceState
  onReviewDecision?: OnReviewDecisionFn
}) {
  const item = entry.item
  const dec = getReviewItemDecision(item, acceptanceState[entry.itemKey])
  const toneCls = cardToneClass(item.suggestedAction, tone)
  const [showAlts, setShowAlts] = useState(false)
  const alts = item.alternativeCandidates ?? []
  const hasAlts = alts.length > 0

  return (
    <li
      className={`rounded-xl border px-3 py-3 text-sm text-slate-200 ${toneCls}`}
    >
      <p className="font-medium">{item.extractedServiceDescription}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-300">
          {getSuggestedActionLabel(item.suggestedAction)} · Confiança:{' '}
          {typeof item.confidence === 'number'
            ? `${Math.round(item.confidence * 100)}%`
            : 'Não informada'}
        </span>
        {tone === 'reuse' ? (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-100">
            Reaproveitamento sugerido
          </span>
        ) : null}
      </div>
      {item.matchReason ? (
        <p className="mt-1 text-xs text-slate-300">Motivo: {item.matchReason}</p>
      ) : null}
      <PrimaryCandidateBlock item={item} />

      {item.matchedMatrixNodeId ? (
        <p className="mt-1 font-mono text-[11px] text-slate-500">
                  Matriz (suporte): {item.matchedMatrixNodeId}
                  {item.matchedMatrixNodeType ? ` · Tipo: ${item.matchedMatrixNodeType}` : ''}
        </p>
      ) : null}

      <DecisionStatusLine action={item.suggestedAction} decision={dec} />

      {tone === 'reuse' ? (
        <ReuseDecisionRow
          entry={entry}
          hasAlts={hasAlts}
          showAlts={showAlts}
          onToggleAlts={() => setShowAlts((v) => !v)}
          onReviewDecision={onReviewDecision}
        />
      ) : null}

      {tone === 'review' || tone === 'new' ? (
        <>
          {tone === 'review' ? (
            <p className="mt-2 text-xs font-medium text-amber-100/90">
              Confirme se esta atividade representa corretamente o serviço extraído da OS.
            </p>
          ) : null}
          {tone === 'new' && !hasAlts ? (
            <p className="mt-2 text-xs text-slate-400">
              Confirme como novo item na esteira ou escolha uma alternativa, se listada.
            </p>
          ) : null}
          <MandatoryDecisionRow
            entry={entry}
            hasAlts={hasAlts}
            showAlts={showAlts}
            onToggleAlts={() => setShowAlts((v) => !v)}
            onReviewDecision={onReviewDecision}
            allowIgnore
            showAcceptSuggested={shouldShowAcceptSuggestedButton(item)}
          />
        </>
      ) : null}

      {hasAlts && showAlts ? (
        <AlternativesList
          entry={entry}
          alternatives={alts}
          acceptanceState={acceptanceState}
          onPick={(matrixNodeId) =>
            onReviewDecision?.({
              itemKey: entry.itemKey,
              currentDecision: 'SELECT_ALTERNATIVE',
              selectedAlternativeMatrixNodeId: matrixNodeId,
            })
          }
        />
      ) : null}
    </li>
  )
}

function cardToneClass(
  action: ArgosMatchingPlanItemV11['suggestedAction'],
  section: SectionTone,
): string {
  if (section === 'ignore') return 'border-white/[0.08] bg-white/[0.03]'
  const t = getSuggestedActionTone(action)
  if (t === 'success') return 'border-emerald-500/30 bg-emerald-500/[0.08]'
  if (t === 'warning') return 'border-amber-500/30 bg-amber-500/[0.08]'
  if (t === 'danger') return 'border-rose-500/30 bg-rose-500/[0.08]'
  return 'border-white/[0.08] bg-white/[0.03]'
}

function PrimaryCandidateBlock({ item }: { item: ArgosMatchingPlanItemV11 }) {
  if (!item.reusedStructure) return null
  const rs = item.reusedStructure
  const subtree = item.subtreeSummary
  const ms = item.matrixSubtree
  const previewAreas = (ms?.areas ?? []).slice(0, 4)
  return (
    <div className="mt-2 space-y-1 text-xs text-slate-300">
      <p>
        Atividade: {rs.activity ?? 'Não informado'} · Setor: {rs.sector ?? 'Não informado'} ·
        Etapa: {rs.step ?? 'Não informado'} · Tempo: {formatPlannedMinutes(rs.plannedMinutes)} ·
        Time: {rs.teamName ?? 'Não informado'} · Responsável:{' '}
        {rs.collaboratorName ?? 'Não informado'}
      </p>
      {subtree ? (
        <div className="rounded border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-sky-100/90">
          <p className="font-medium">Estrutura da Matriz sugerida</p>
          <p>
            Tipo: {subtree.rootNodeType} · Áreas: {subtree.totalAreas} · Etapas:{' '}
            {subtree.totalActivities} · Minutos totais: {subtree.totalPlannedMinutes}
          </p>
          {subtree.previewActivities?.length ? (
            <p>Exemplos: {subtree.previewActivities.slice(0, 3).join(' | ')}</p>
          ) : null}
          <p>
            Ao aceitar, esta estrutura representa um reaproveitamento composto da Matriz (não um
            item novo simples).
          </p>
        </div>
      ) : null}
      {rs.kind === 'MATRIX_SUBTREE' && ms?.areas?.length ? (
        <details className="mt-2 rounded border border-amber-400/25 bg-amber-500/[0.07] px-2 py-1 text-amber-50/95">
          <summary className="cursor-pointer font-medium text-amber-100">
            Estrutura da Matriz sugerida — {ms.rootTitle}
          </summary>
          <p className="mt-2 text-[11px] text-amber-100/90">
            Áreas: {ms.totalAreas} · Etapas: {ms.totalActivities} · Minutos:{' '}
            {ms.totalPlannedMinutes}
            {ms.subtreeTruncated ? (
              <span className="block text-amber-200/90">
                Aviso: resposta truncada por volume ({ms.subtreeWarning ?? 'revisar na Matriz'}).
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-[11px] font-medium text-amber-50">
            Ao aceitar, esta estrutura substituirá o item simples por áreas e etapas da Matriz.
          </p>
          <ul className="mt-2 space-y-2 text-[11px]">
            {previewAreas.map((a) => (
              <li key={a.matrixNodeId}>
                <span className="font-semibold text-slate-100">{a.title}</span>
                <span className="text-slate-400">
                  {' '}
                  ({a.activities.length} etapa(s), {formatPlannedMinutes(a.plannedMinutes)})
                </span>
                <ul className="mt-1 list-disc pl-4 text-slate-300">
                  {a.activities.slice(0, 3).map((ac) => (
                    <li key={ac.matrixNodeId}>{ac.title}</li>
                  ))}
                  {a.activities.length > 3 ? (
                    <li className="text-slate-500">… mais {a.activities.length - 3}</li>
                  ) : null}
                </ul>
              </li>
            ))}
          </ul>
          {(ms.areas?.length ?? 0) > previewAreas.length ? (
            <p className="mt-1 text-[10px] text-slate-500">
              … e mais {((ms.areas?.length ?? 0) - previewAreas.length).toString()} área(s). Expanda
              para ver o detalhe completo quando disponível no payload.
            </p>
          ) : null}
        </details>
      ) : null}
    </div>
  )
}

function DecisionStatusLine({
  action,
  decision,
}: {
  action: ArgosMatchingPlanItemV11['suggestedAction']
  decision: ReviewItemCurrentDecision
}) {
  if (action === 'IGNORE') {
    return (
      <p className="mt-2 text-xs text-slate-400">
        Não será incluído como etapa operacional na criação desta esteira.
      </p>
    )
  }
  if (action === 'REUSE_EXISTING' && decision === 'PENDING') {
    return (
      <p className="mt-2 text-[11px] text-emerald-200/80">
        Estado: candidato principal pré-selecionado (pode trocar por alternativa).
      </p>
    )
  }
  const label =
    decision === 'PENDING'
      ? 'Decisão pendente'
      : decision === 'ACCEPT_SUGGESTED'
        ? 'Candidato principal aceite'
        : decision === 'SELECT_ALTERNATIVE'
          ? 'Alternativa da matriz selecionada'
          : decision === 'CONFIRM_CREATE_NEW'
            ? 'Confirmado como novo item'
            : decision === 'IGNORE_ITEM'
              ? 'Item ignorado pelo revisor'
              : 'Decisão pendente'
  return (
    <p className="mt-2 text-[11px] text-slate-400">
      Estado: <span className="text-slate-200">{label}</span>
    </p>
  )
}

function ReuseDecisionRow({
  entry,
  hasAlts,
  showAlts,
  onToggleAlts,
  onReviewDecision,
}: {
  entry: MatchingPlanEntry
  hasAlts: boolean
  showAlts: boolean
  onToggleAlts: () => void
  onReviewDecision?: OnReviewDecisionFn
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-100"
        onClick={() =>
          onReviewDecision?.({
            itemKey: entry.itemKey,
            currentDecision: 'ACCEPT_SUGGESTED',
          })
        }
      >
        Manter candidato sugerido
      </button>
      {hasAlts ? (
        <button
          type="button"
          className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] text-slate-200"
          onClick={onToggleAlts}
        >
          {showAlts ? 'Ocultar alternativas' : 'Ver alternativas'}
        </button>
      ) : null}
    </div>
  )
}

function MandatoryDecisionRow({
  entry,
  hasAlts,
  showAlts,
  onToggleAlts,
  onReviewDecision,
  allowIgnore,
  showAcceptSuggested = true,
}: {
  entry: MatchingPlanEntry
  hasAlts: boolean
  showAlts: boolean
  onToggleAlts: () => void
  onReviewDecision?: OnReviewDecisionFn
  allowIgnore: boolean
  showAcceptSuggested?: boolean
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {showAcceptSuggested ? (
        <button
          type="button"
          className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-100"
          onClick={() =>
            onReviewDecision?.({
              itemKey: entry.itemKey,
              currentDecision: 'ACCEPT_SUGGESTED',
            })
          }
        >
          Aceitar sugestão
        </button>
      ) : null}
      {hasAlts ? (
        <button
          type="button"
          className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] text-slate-200"
          onClick={onToggleAlts}
        >
          {showAlts ? 'Ocultar alternativas' : 'Escolher alternativa'}
        </button>
      ) : null}
      <button
        type="button"
        className="rounded-lg border border-rose-400/35 bg-rose-500/15 px-2 py-1 text-[11px] font-semibold text-rose-100"
        onClick={() =>
          onReviewDecision?.({
            itemKey: entry.itemKey,
            currentDecision: 'CONFIRM_CREATE_NEW',
          })
        }
      >
        Criar como novo item
      </button>
      {allowIgnore ? (
        <button
          type="button"
          className="rounded-lg border border-white/12 px-2 py-1 text-[11px] text-slate-400"
          onClick={() =>
            onReviewDecision?.({
              itemKey: entry.itemKey,
              currentDecision: 'IGNORE_ITEM',
            })
          }
        >
          Ignorar item
        </button>
      ) : null}
    </div>
  )
}

function AlternativesList({
  entry,
  alternatives,
  acceptanceState,
  onPick,
}: {
  entry: MatchingPlanEntry
  alternatives: NonNullable<ArgosMatchingPlanItemV11['alternativeCandidates']>
  acceptanceState: ReviewAcceptanceState
  onPick: (matrixNodeId: string) => void
}) {
  const selected = acceptanceState[entry.itemKey]?.selectedAlternativeMatrixNodeId
  return (
    <ul className="mt-3 space-y-2 rounded-lg border border-white/[0.06] bg-black/20 p-3">
      {alternatives.map((alt) => (
        <li key={alt.matrixNodeId} className="text-xs text-slate-300">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-slate-100">{alt.activity}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {alt.sector ?? '—'} · {alt.step ?? '—'} · {formatPlannedMinutes(alt.plannedMinutes)}{' '}
                · {Math.round(alt.confidence * 100)}%
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{alt.matchReason}</p>
              <p className="mt-1 font-mono text-[10px] text-slate-600">{alt.matrixNodeId}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded border border-sgp-gold/40 px-2 py-1 text-[11px] text-sgp-gold"
              onClick={() => onPick(alt.matrixNodeId)}
            >
              {selected === alt.matrixNodeId ? 'Selecionado' : 'Usar esta'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
