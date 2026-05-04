import type { CollaboratorOperationalHealthSnapshot } from '../../../domain/collaborator-health/collaboratorOperationalHealth.types'
import {
  daysSinceLastEntryVsReference,
  formatLastEntryRelativeDays,
  formatMinutesToHoursLabel,
  getCapacitySourceLabel,
  getDataQualityWarningDisplayMessage,
} from '../../../domain/collaborator-health/collaboratorOperationalHealthDisplay'

type Props = {
  open: boolean
  loading: boolean
  error: string | null
  snapshot: CollaboratorOperationalHealthSnapshot | null
  onClose: () => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-white/[0.06] py-2 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm text-slate-100">{value}</span>
    </div>
  )
}

export function CollaboratorHealthSnapshotPanel({ open, loading, error, snapshot, onClose }: Props) {
  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-sgp-navy/50 backdrop-blur-[1px]"
        aria-label="Fechar painel"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-lg flex-col border-l border-white/[0.08] bg-gradient-to-b from-sgp-void via-[#070d16] to-sgp-navy-deep shadow-[-12px_0_48px_-12px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-4 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sgp-gold/90">
              Saúde operacional
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-50">
              {loading ? 'A carregar…' : snapshot?.collaborator.fullName ?? 'Detalhe'}
            </h2>
            {!loading && snapshot ? (
              <p className="mt-1 text-xs text-slate-500">
                {snapshot.collaborator.code ? `Cód. ${snapshot.collaborator.code} · ` : null}
                {snapshot.collaborator.isActive ? 'Ativo' : 'Inativo'} · Referência{' '}
                {snapshot.referenceDate} · Janela {snapshot.recentDays} dias
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-white/[0.06]"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="text-sm text-slate-400">Carregando saúde operacional…</p>
          ) : error ? (
            <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100/90">
              {error}
            </div>
          ) : snapshot ? (
            <div className="flex flex-col gap-6">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Capacidade</h3>
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3">
                  <Row
                    label="Capacidade diária"
                    value={formatMinutesToHoursLabel(snapshot.capacity.resolvedDailyMinutes)}
                  />
                  <Row
                    label="Capacidade da janela"
                    value={formatMinutesToHoursLabel(snapshot.capacity.windowCapacityMinutes)}
                  />
                  <Row label="Fonte" value={getCapacitySourceLabel(snapshot.capacity.source)} />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Carga</h3>
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3">
                  <Row label="Etapas abertas" value={String(snapshot.workload.openDistinctSteps)} />
                  <Row
                    label="Carga planejada (aberta)"
                    value={formatMinutesToHoursLabel(snapshot.workload.plannedOpenMinutesSum)}
                  />
                  <Row
                    label="Pendência estimada (aberta)"
                    value={formatMinutesToHoursLabel(snapshot.workload.pendingOpenMinutesSum)}
                  />
                  <Row
                    label="Realizado pelo colaborador (nessas etapas)"
                    value={formatMinutesToHoursLabel(snapshot.workload.realizedOpenMinutesSum)}
                  />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Apontamentos recentes
                </h3>
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3">
                  <Row label="Quantidade" value={String(snapshot.recentTimeEntries.entryCount)} />
                  <Row
                    label="Total de minutos"
                    value={formatMinutesToHoursLabel(snapshot.recentTimeEntries.totalMinutes)}
                  />
                  <Row
                    label="Último apontamento"
                    value={
                      snapshot.recentTimeEntries.lastEntryAt
                        ? new Date(snapshot.recentTimeEntries.lastEntryAt).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'
                    }
                  />
                  <Row
                    label="Recência face à data de referência"
                    value={formatLastEntryRelativeDays(
                      daysSinceLastEntryVsReference(
                        snapshot.referenceDate,
                        snapshot.recentTimeEntries.lastEntryAt,
                      ),
                    )}
                  />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Qualidade dos dados
                </h3>
                <ul className="mt-2 space-y-2">
                  {snapshot.dataQuality.warnings.length === 0 ? (
                    <li className="text-sm text-slate-500">Sem avisos adicionais.</li>
                  ) : (
                    snapshot.dataQuality.warnings.map((w) => (
                      <li
                        key={w.code}
                        className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-slate-200"
                      >
                        {getDataQualityWarningDisplayMessage(w.code, w.message)}
                      </li>
                    ))
                  )}
                </ul>
              </section>

              <section className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-3">
                <p className="text-xs text-slate-500">
                  Interpretação ARGOS ainda não habilitada para saúde do colaborador.
                </p>
              </section>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  )
}
