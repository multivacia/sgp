import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type {
  ConveyorHealthAnalysisHistoryItem,
  ConveyorHealthAnalysisV1,
} from '../../domain/conveyors/conveyorHealth.types'
import {
  buildConveyorHealthTrendSummary,
  friendlyHealthAnalysisMessage,
  summarizeConveyorHealthAnalysis,
  summarizeConveyorHealthMeta,
} from '../../domain/conveyors/conveyorHealthDisplay'
import { reportClientError } from '../../lib/errors'
import {
  getConveyorHealthAnalysisHistory,
  getLatestConveyorHealthAnalysis,
  postConveyorHealthAnalysis,
} from '../../services/conveyors/conveyorsApiService'

function riskBadgeTone(v: string | undefined): string {
  const raw = (v ?? '').toLowerCase()
  if (raw.includes('alto') || raw.includes('high') || raw.includes('crítico')) {
    return 'border-rose-400/25 bg-rose-500/[0.12] text-rose-100'
  }
  if (raw.includes('médio') || raw.includes('medio') || raw.includes('medium')) {
    return 'border-amber-400/25 bg-amber-500/[0.12] text-amber-100'
  }
  if (raw.includes('baixo') || raw.includes('low')) {
    return 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-100'
  }
  return 'border-white/10 bg-white/[0.04] text-slate-200'
}

type Props = {
  conveyorId: string
}

export function ConveyorHealthAnalysisCard({ conveyorId }: Props) {
  const location = useLocation()
  const [loadingLatest, setLoadingLatest] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorUser, setErrorUser] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<ConveyorHealthAnalysisHistoryItem[]>([])
  const [result, setResult] = useState<{
    data: ConveyorHealthAnalysisV1
    meta: Record<string, unknown>
  } | null>(null)
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)

  const summary = useMemo(
    () => (result ? summarizeConveyorHealthAnalysis(result.data) : null),
    [result],
  )

  const meta = useMemo(() => {
    if (!result) return null
    return summarizeConveyorHealthMeta(result.data, result.meta)
  }, [result])

  const trend = useMemo(() => {
    if (!result) return null
    const currentId = selectedAnalysisId ?? summarizeConveyorHealthMeta(result.data, result.meta).analysisId
    if (!currentId) {
      return buildConveyorHealthTrendSummary(result.data, null)
    }
    const idx = historyItems.findIndex((i) => i.analysisId === currentId)
    if (idx < 0) return buildConveyorHealthTrendSummary(result.data, null)
    const previous = historyItems[idx + 1]
    return buildConveyorHealthTrendSummary(result.data, previous?.analysis ?? null)
  }, [historyItems, result, selectedAnalysisId])

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true)
    setHistoryError(null)
    try {
      const history = await getConveyorHealthAnalysisHistory(conveyorId, { limit: 10 })
      setHistoryItems(history.data)
      if (!selectedAnalysisId && history.data[0]?.analysisId) {
        setSelectedAnalysisId(history.data[0].analysisId)
      }
    } catch (e) {
      reportClientError(e, {
        module: 'esteiras',
        action: 'conveyor_health_history',
        route: location.pathname,
        entityId: conveyorId,
      })
      setHistoryError('Não foi possível carregar o histórico agora.')
      setHistoryItems([])
    } finally {
      setLoadingHistory(false)
    }
  }, [conveyorId, location.pathname, selectedAnalysisId])

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setLoadingLatest(false)
    setErrorUser(null)
    setResult(null)
    try {
      const r = await postConveyorHealthAnalysis(conveyorId)
      setResult(r)
      const m = summarizeConveyorHealthMeta(r.data, r.meta)
      if (m.analysisId) setSelectedAnalysisId(m.analysisId)
      await fetchHistory()
    } catch (e) {
      reportClientError(e, {
        module: 'esteiras',
        action: 'conveyor_health_analysis',
        route: location.pathname,
        entityId: conveyorId,
      })
      setErrorUser(friendlyHealthAnalysisMessage(e))
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [conveyorId, fetchHistory, location.pathname])

  useEffect(() => {
    let cancelled = false
    setLoadingLatest(true)
    setLoadingHistory(true)
    setErrorUser(null)
    setHistoryError(null)
    setHistoryItems([])
    setSelectedAnalysisId(null)
    ;(async () => {
      try {
        const [latest, history] = await Promise.all([
          getLatestConveyorHealthAnalysis(conveyorId),
          getConveyorHealthAnalysisHistory(conveyorId, { limit: 10 }),
        ])
        if (cancelled) return
        if (latest.data) {
          setResult({
            data: latest.data,
            meta: latest.meta,
          })
          const m = summarizeConveyorHealthMeta(latest.data, latest.meta)
          if (m.analysisId) setSelectedAnalysisId(m.analysisId)
        } else {
          setResult(null)
        }
        setHistoryItems(history.data)
        if (!latest.data && history.data[0]?.analysisId) {
          setSelectedAnalysisId(history.data[0].analysisId)
          const first = history.data[0]
          setResult({
            data: first.analysis,
            meta: {
              analysisId: first.analysisId,
              createdAt: first.createdAt,
              requestId: first.requestId,
              correlationId: first.correlationId,
              routeUsed: first.routeUsed,
              llmUsed: first.llmUsed,
            },
          })
        }
      } catch (e) {
        if (cancelled) return
        reportClientError(e, {
          module: 'esteiras',
          action: 'conveyor_health_latest',
          route: location.pathname,
          entityId: conveyorId,
        })
        setResult(null)
        setHistoryError('Não foi possível carregar o histórico agora.')
        setHistoryItems([])
      } finally {
        if (!cancelled) {
          setLoadingLatest(false)
          setLoadingHistory(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [conveyorId, location.pathname])

  const showIdle = !loadingLatest && !loading && !result && !errorUser

  const applyHistoryItem = useCallback((item: ConveyorHealthAnalysisHistoryItem) => {
    setSelectedAnalysisId(item.analysisId)
    setResult({
      data: item.analysis,
      meta: {
        analysisId: item.analysisId,
        createdAt: item.createdAt,
        requestId: item.requestId,
        correlationId: item.correlationId,
        routeUsed: item.routeUsed,
        llmUsed: item.llmUsed,
      },
    })
    setErrorUser(null)
  }, [])

  return (
    <section className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Análise de saúde operacional
          </p>
          <p className="mt-1 font-heading text-lg font-semibold text-slate-100">
            ARGOS Health
          </p>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-500">
            Avaliação executiva da esteira com base em dados persistidos no SGP. A execução
            continua manual e cada análise salva passa a compor histórico.
          </p>
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading}
          className="sgp-cta-primary inline-flex shrink-0 justify-center px-5 py-2.5 text-sm disabled:opacity-50"
        >
          Analisar saúde com ARGOS
        </button>
      </div>

      {loadingLatest ? (
        <div
          className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-slate-300"
          role="status"
          aria-live="polite"
        >
          Carregando última análise salva…
        </div>
      ) : null}

      {showIdle ? (
        <div className="mt-6 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-5">
          <p className="text-sm text-slate-300">
            Análise ARGOS ainda não executada para esta visualização.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Execute manualmente para obter um resumo executivo da saúde operacional.
          </p>
        </div>
      ) : null}

      {loading ? (
        <div
          className="mt-6 rounded-xl border border-sgp-blue-bright/20 bg-sgp-blue-bright/[0.06] px-4 py-3 text-sm text-slate-200"
          role="status"
          aria-live="polite"
        >
          ARGOS analisando saúde operacional da esteira…
        </div>
      ) : null}

      {errorUser ? (
        <div
          className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100/90"
          role="alert"
        >
          {errorUser}
        </div>
      ) : null}

      {summary && result ? (
        <div className="mt-6 space-y-4">
          {meta?.savedAt ? (
            <p className="text-xs text-slate-500">
              Última análise salva em {new Date(meta.savedAt).toLocaleString('pt-BR')}.
            </p>
          ) : null}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-slate-200">
                Saúde: {summary.overallLabel ?? '—'}
              </span>
              <span className="inline-flex items-center rounded-md border border-sgp-blue-bright/25 bg-sgp-blue-bright/[0.12] px-2 py-1 text-[11px] font-semibold text-blue-100">
                Score: {summary.score !== undefined ? summary.score : '—'}
              </span>
              <span
                className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold ${riskBadgeTone(summary.riskLevel)}`}
              >
                Risco: {summary.riskLevel ?? '—'}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Estado geral
                </dt>
                <dd className="mt-1 text-slate-100">{summary.overallLabel ?? '—'}</dd>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Score
                </dt>
                <dd className="mt-1 tabular-nums text-slate-100">
                  {summary.score !== undefined ? summary.score : '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Nível de risco
                </dt>
                <dd className="mt-1 text-slate-100">{summary.riskLevel ?? '—'}</dd>
              </div>
            </dl>
            {summary.narrative ? (
              <div className="mt-4 rounded-lg border border-white/[0.08] bg-sgp-app-panel-deep/35 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Narrativa principal
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-200">{summary.narrative}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Narrativa principal não devolvida nesta execução.
              </p>
            )}
          </div>

          <details className="group rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 open:bg-white/[0.03]">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                Achados
                <span className="text-xs font-normal text-slate-500">
                  ({summary.findings.length})
                </span>
              </span>
            </summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
              {summary.findings.length > 0 ? (
                summary.findings.map((line, i) => <li key={i}>{line}</li>)
              ) : (
                <li className="list-none pl-0 text-slate-500">Nenhum achado listado.</li>
              )}
            </ul>
          </details>

          <details className="group rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 open:bg-white/[0.03]">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                Gargalos
                <span className="text-xs font-normal text-slate-500">
                  ({summary.bottlenecks.length})
                </span>
              </span>
            </summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
              {summary.bottlenecks.length > 0 ? (
                summary.bottlenecks.map((line, i) => <li key={i}>{line}</li>)
              ) : (
                <li className="list-none pl-0 text-slate-500">Nenhum gargalo listado.</li>
              )}
            </ul>
          </details>

          <details className="group rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 open:bg-white/[0.03]">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                Ações recomendadas
                <span className="text-xs font-normal text-slate-500">
                  ({summary.recommendedActions.length})
                </span>
              </span>
            </summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
              {summary.recommendedActions.length > 0 ? (
                summary.recommendedActions.map((line, i) => <li key={i}>{line}</li>)
              ) : (
                <li className="list-none pl-0 text-slate-500">
                  Nenhuma ação recomendada listada.
                </li>
              )}
            </ul>
          </details>

          <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <p className="text-sm font-semibold text-slate-200">
              Tendência desde a análise anterior
            </p>
            {!trend || !trend.hasComparison ? (
              <p className="mt-2 text-sm text-slate-400">
                Sem análise anterior para comparação.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-slate-300">{trend.label}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>
                    Score:{' '}
                    {trend.scoreDelta == null
                      ? '—'
                      : trend.scoreDelta > 0
                        ? `+${trend.scoreDelta}`
                        : String(trend.scoreDelta)}
                  </span>
                  <span>
                    Risco: {trend.previousRisk ?? '—'} {'->'} {trend.currentRisk ?? '—'}
                  </span>
                  <span>
                    Saúde: {trend.previousHealth ?? '—'} {'->'} {trend.currentHealth ?? '—'}
                  </span>
                </div>
              </>
            )}
          </section>

          <details className="group rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 open:bg-white/[0.03]">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200 marker:content-none [&::-webkit-details-marker]:hidden">
              Histórico de análises
            </summary>
            <div className="mt-3 space-y-2">
              {loadingHistory ? (
                <p className="text-xs text-slate-500">Carregando histórico…</p>
              ) : historyError ? (
                <p className="text-xs text-slate-500">{historyError}</p>
              ) : historyItems.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhuma análise anterior salva.</p>
              ) : (
                historyItems.map((item) => {
                  const selected = selectedAnalysisId === item.analysisId
                  return (
                    <button
                      key={item.analysisId}
                      type="button"
                      onClick={() => applyHistoryItem(item)}
                      className={[
                        'w-full rounded-lg border px-3 py-2 text-left transition',
                        selected
                          ? 'border-sgp-blue-bright/40 bg-sgp-blue-bright/[0.1]'
                          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]',
                      ].join(' ')}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200">
                          {new Date(item.createdAt).toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {selected ? 'Selecionada' : 'Selecionar'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-300">
                        <span>Saúde: {item.healthStatus ?? '—'}</span>
                        <span>Score: {item.score ?? '—'}</span>
                        <span>Risco: {item.riskLevel ?? '—'}</span>
                        <span>Policy: {item.policy}</span>
                        <span>Rota: {item.routeUsed ?? '—'}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </details>

          {meta ? (
            <p className="text-[10px] leading-relaxed text-slate-600">
              analysisId: {meta.analysisId ?? '—'} ·
              requestId: {meta.requestId ?? '—'} · correlationId: {meta.correlationId ?? '—'} ·
              routeUsed: {meta.routeUsed ?? '—'} · llmUsed:{' '}
              {meta.llmUsed === undefined ? '—' : meta.llmUsed ? 'true' : 'false'}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
