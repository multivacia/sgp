import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageCanvas } from '../../../components/ui/PageCanvas'
import type { AdminAuditEventType } from '../../../domain/admin/adminAudit.types'
import { ADMIN_AUDIT_EVENT_TYPES } from '../../../domain/admin/adminAudit.types'
import { reportClientError } from '../../../lib/errors'
import { listAdminAuditEvents } from '../../../services/admin/adminAuditApiService'

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function eventLabel(t: AdminAuditEventType): string {
  const map: Record<AdminAuditEventType, string> = {
    admin_user_created: 'Usuário criado',
    admin_user_updated: 'Usuário atualizado',
    admin_user_activated: 'Conta ativada',
    admin_user_deactivated: 'Conta inativada',
    admin_user_soft_deleted: 'Usuário removido (soft delete)',
    admin_user_restored: 'Usuário restaurado',
    admin_user_password_reset: 'Redefinição administrativa de senha',
    admin_user_force_password_change: 'Forçar troca de senha',
    admin_user_collaborator_linked: 'Colaborador vinculado',
    admin_user_collaborator_unlinked: 'Colaborador desvinculado',
    role_permissions_updated: 'Permissões do papel atualizadas',
  }
  return map[t] ?? t
}

function metadataSummary(meta: Record<string, unknown> | null): string {
  if (!meta || Object.keys(meta).length === 0) return '—'
  try {
    return JSON.stringify(meta)
  } catch {
    return '—'
  }
}

export function AdminAuditTrailPage() {
  const { pathname } = useLocation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof listAdminAuditEvents>>['rows']
  >([])
  const [total, setTotal] = useState(0)

  const [eventFilter, setEventFilter] = useState<string>('')
  const [targetUserFilter, setTargetUserFilter] = useState('')
  const [limit] = useState(100)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const { rows: data, total: t } = await listAdminAuditEvents({
        eventType: eventFilter || undefined,
        targetUserId: targetUserFilter.trim() || undefined,
        limit,
        offset: 0,
      })
      setRows(data)
      setTotal(t)
    } catch (e) {
      const n = reportClientError(e, {
        module: 'admin',
        action: 'audit_trail_load',
        route: pathname,
      })
      setError(n.userMessage)
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [eventFilter, targetUserFilter, limit, pathname])

  useEffect(() => {
    void load()
  }, [load])

  const eventOptions = useMemo(
    () => [{ value: '', label: 'Todos os tipos' }, ...ADMIN_AUDIT_EVENT_TYPES.map((t) => ({ value: t, label: eventLabel(t) }))],
    [],
  )

  return (
    <PageCanvas>
      <div className="flex flex-col gap-6">
        <header className="sgp-header-card flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sgp-gold-warm/90">
              Governança
            </p>
            <h1 className="sgp-page-title mt-1">
              Trilha administrativa
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Registro de ações críticas sobre usuários de acesso (sem dados sensíveis).
            </p>
          </div>
          <Link
            to="/app/usuarios"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sgp-gold/35 hover:text-white"
          >
            ← Usuários
          </Link>
        </header>

        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-sgp-app-panel-deep/40 p-4 md:flex-row md:flex-wrap md:items-end md:gap-4">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-xs font-semibold text-slate-400">
            Tipo de evento
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sgp-gold/40"
            >
              {eventOptions.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1.5 text-xs font-semibold text-slate-400">
            ID do usuário alvo (UUID)
            <input
              value={targetUserFilter}
              onChange={(e) => setTargetUserFilter(e.target.value)}
              placeholder="opcional"
              className="rounded-xl border border-white/10 bg-sgp-void/80 px-3 py-2 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sgp-gold/40"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/10 px-4 py-2.5 text-sm font-bold text-sgp-gold-warm transition hover:bg-sgp-gold/18"
          >
            Aplicar filtros
          </button>
        </div>

        <p className="text-xs text-slate-500">
          {total} evento(s) encontrado(s) (limite {limit} mais recentes).
        </p>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-100/95"
          >
            {error}
          </div>
        )}

        {loading && (
          <p className="text-sm text-slate-500">Carregando trilha…</p>
        )}

        {!loading && !error && rows.length === 0 && (
          <p className="text-sm text-slate-500">Sem eventos para os filtros actuais.</p>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="sgp-table-shell">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr
                  className="border-b border-white/[0.08] text-white shadow-inner"
                  style={{ background: 'var(--sgp-gradient-header)' }}
                >
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Quando</th>
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Evento</th>
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Actor</th>
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Alvo</th>
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Colab.</th>
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Metadados</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      {formatDt(r.occurredAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {eventLabel(r.eventType)}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-400" title={r.actorEmail ?? r.actorUserId ?? ''}>
                      {r.actorEmail ?? r.actorUserId ?? '—'}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-400" title={r.targetUserEmail ?? r.targetUserId ?? ''}>
                      {r.targetUserEmail ?? r.targetUserId ?? '—'}
                    </td>
                    <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-slate-500">
                      {r.targetCollaboratorId ?? '—'}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 font-mono text-xs text-slate-500" title={metadataSummary(r.metadata)}>
                      {metadataSummary(r.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </PageCanvas>
  )
}
