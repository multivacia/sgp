import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  SgpContextActionsMenu,
  type SgpContextActionsMenuItemDef,
} from '../../../components/shell/SgpContextActionsMenu'
import type {
  TimeEntryJustification,
  TimeEntryJustificationCategory,
  TimeEntryJustificationStatusFilter,
} from '../../../domain/operational-settings/timeEntryJustifications.types'
import {
  TIME_ENTRY_JUSTIFICATION_CATEGORIES,
  TIME_ENTRY_JUSTIFICATION_CATEGORY_LABELS,
} from '../../../domain/operational-settings/timeEntryJustifications.types'
import type { SgpToastVariant } from '../../../components/ui/SgpToast'
import {
  activateTimeEntryJustification,
  createTimeEntryJustification,
  deactivateTimeEntryJustification,
  listTimeEntryJustifications,
  updateTimeEntryJustification,
} from '../../../services/operational-settings/timeEntryJustificationsApiService'

type Props = {
  onError: (err: unknown, action: string) => void
  onToast: (message: string, variant?: SgpToastVariant) => void
}

type FormPayload = {
  label: string
  description: string | null
  category: TimeEntryJustificationCategory | null
  requiresComplement: boolean
  sortOrder: number
  isActive: boolean
}

export function TimeEntryJustificationsTab({ onError, onToast }: Props) {
  const [items, setItems] = useState<TimeEntryJustification[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<TimeEntryJustificationStatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; row: TimeEntryJustification }
    | null
  >(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listTimeEntryJustifications({ q, status })
      setItems(data)
    } catch (err) {
      onError(err, 'operational_settings_time_entry_justifications_load')
    } finally {
      setLoading(false)
    }
  }, [onError, q, status])

  useEffect(() => {
    void load()
  }, [load])

  const emptyText = useMemo(() => {
    if (q.trim().length > 0) return 'Nenhuma justificativa encontrada para a busca.'
    if (status !== 'all') return 'Nenhuma justificativa neste status.'
    return 'Nenhuma justificativa cadastrada.'
  }, [q, status])

  return (
    <section className="mt-6">
      <div className="sgp-panel sgp-panel-hover">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-100">
                Justificativas Operacionais
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Catálogo padronizado para apontamentos por exceção de alocação e fora de sequência.
              </p>
            </div>
            <button
              type="button"
              className="sgp-cta-primary !px-4 !py-2 text-sm"
              onClick={() => setModal({ mode: 'create' })}
            >
              Nova justificativa
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(240px,1fr)_220px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Busca
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar justificativa"
                className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as TimeEntryJustificationStatusFilter)
                }
                className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 sgp-table-shell">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr
                className="border-b border-white/[0.08] text-white shadow-inner"
                style={{ background: 'var(--sgp-gradient-header)' }}
              >
                <th className="px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Justificativa
                </th>
                <th className="px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Categoria
                </th>
                <th className="px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Complemento
                </th>
                <th className="px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Ordem
                </th>
                <th className="px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Ativo
                </th>
                <th className="w-36 px-4 py-4 text-right font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Carregando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const menuItems: SgpContextActionsMenuItemDef[] = [
                    {
                      label: 'Editar',
                      onClick: () => setModal({ mode: 'edit', row }),
                    },
                    {
                      label: row.isActive ? 'Desativar' : 'Ativar',
                      onClick: () => {
                        void (async () => {
                          try {
                            if (row.isActive) {
                              await deactivateTimeEntryJustification(row.id)
                              onToast('Justificativa desativada.')
                            } else {
                              await activateTimeEntryJustification(row.id)
                              onToast('Justificativa ativada.')
                            }
                            await load()
                          } catch (err) {
                            onError(err, 'operational_settings_time_entry_justifications_toggle')
                          }
                        })()
                      },
                    },
                  ]
                  const categoryLabel =
                    row.category &&
                    row.category in TIME_ENTRY_JUSTIFICATION_CATEGORY_LABELS
                      ? TIME_ENTRY_JUSTIFICATION_CATEGORY_LABELS[
                          row.category as TimeEntryJustificationCategory
                        ]
                      : row.category ?? '—'
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-medium text-slate-100">
                        <p>{row.label}</p>
                        {row.description ? (
                          <p className="mt-1 text-xs text-slate-400">{row.description}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{categoryLabel}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {row.requiresComplement ? 'Obrigatório' : 'Opcional'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.sortOrder}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.isActive
                              ? 'bg-emerald-400/15 text-emerald-200'
                              : 'bg-slate-500/20 text-slate-300'
                          }`}
                        >
                          {row.isActive ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <SgpContextActionsMenu
                            menuKey={`time-entry-justification-${row.id}`}
                            items={menuItems}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal ? (
        <JustificationFormModal
          mode={modal.mode}
          initial={
            modal.mode === 'edit'
              ? {
                  label: modal.row.label,
                  description: modal.row.description ?? '',
                  category: (modal.row.category as TimeEntryJustificationCategory | null) ?? null,
                  requiresComplement: modal.row.requiresComplement,
                  sortOrder: modal.row.sortOrder,
                  isActive: modal.row.isActive,
                }
              : undefined
          }
          onClose={() => setModal(null)}
          onSave={async (payload) => {
            try {
              if (modal.mode === 'create') {
                await createTimeEntryJustification(payload)
                onToast('Justificativa criada.')
              } else {
                await updateTimeEntryJustification(modal.row.id, payload)
                onToast('Justificativa atualizada.')
              }
              setModal(null)
              await load()
            } catch (err) {
              onError(err, 'operational_settings_time_entry_justifications_save')
            }
          }}
        />
      ) : null}
    </section>
  )
}

function JustificationFormModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit'
  initial?: {
    label: string
    description: string
    category: TimeEntryJustificationCategory | null
    requiresComplement: boolean
    sortOrder: number
    isActive: boolean
  }
  onClose: () => void
  onSave: (payload: FormPayload) => void | Promise<void>
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState<TimeEntryJustificationCategory | ''>(
    initial?.category ?? '',
  )
  const [requiresComplement, setRequiresComplement] = useState(
    initial?.requiresComplement ?? false,
  )
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 100))
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [err, setErr] = useState<string | null>(null)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-sgp-navy/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-navy to-sgp-void p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-lg font-bold text-slate-100">
          {mode === 'create' ? 'Nova justificativa' : 'Editar justificativa'}
        </h2>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Justificativa <span className="text-rose-300/90">*</span>
          <input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value)
              setErr(null)
            }}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Descrição
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Categoria
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as TimeEntryJustificationCategory | '')
            }
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          >
            <option value="">—</option>
            {TIME_ENTRY_JUSTIFICATION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {TIME_ENTRY_JUSTIFICATION_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Ordem
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
        </label>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={requiresComplement}
            onChange={(e) => setRequiresComplement(e.target.checked)}
            className="rounded border-white/20 bg-sgp-void"
          />
          Exige complemento
        </label>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-white/20 bg-sgp-void"
          />
          Ativo
        </label>
        {err ? <p className="mt-2 text-sm text-rose-200/90">{err}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/12 px-4 py-2 text-sm font-bold text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              const trimmed = label.trim()
              if (!trimmed) {
                setErr('Informe a justificativa.')
                return
              }
              const order = Number.parseInt(sortOrder, 10)
              if (!Number.isInteger(order) || order < 0) {
                setErr('Ordem inválida.')
                return
              }
              void onSave({
                label: trimmed,
                description: description.trim() || null,
                category: category || null,
                requiresComplement,
                sortOrder: order,
                isActive,
              })
            }}
            className="sgp-cta-primary !px-4 !py-2 text-sm"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
