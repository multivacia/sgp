import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  SgpContextActionsMenu,
  type SgpContextActionsMenuItemDef,
} from '../../../components/shell/SgpContextActionsMenu'
import type {
  ExtraTimeEntryDescription,
  ExtraTimeEntryDescriptionStatusFilter,
} from '../../../domain/operational-settings/extraTimeEntryDescriptions.types'
import type { SgpToastVariant } from '../../../components/ui/SgpToast'
import {
  createExtraTimeEntryDescription,
  deleteExtraTimeEntryDescription,
  listExtraTimeEntryDescriptions,
  updateExtraTimeEntryDescription,
} from '../../../services/operational-settings/extraTimeEntryDescriptionsApiService'

type Props = {
  onError: (err: unknown, action: string) => void
  onToast: (message: string, variant?: SgpToastVariant) => void
}

type ExtraTimeDescriptionFormPayload = {
  description: string
  internalNote: string | null
  sortOrder: number
  isActive: boolean
}

export function ExtraTimeEntryDescriptionsTab({ onError, onToast }: Props) {
  const [items, setItems] = useState<ExtraTimeEntryDescription[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<ExtraTimeEntryDescriptionStatusFilter>('active')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; row: ExtraTimeEntryDescription }
    | null
  >(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listExtraTimeEntryDescriptions({ q, status })
      setItems(data)
    } catch (err) {
      onError(err, 'operational_settings_extra_time_entry_descriptions_load')
    } finally {
      setLoading(false)
    }
  }, [onError, q, status])

  useEffect(() => {
    void load()
  }, [load])

  const emptyText = useMemo(() => {
    if (q.trim().length > 0) return 'Nenhuma descrição encontrada para a busca.'
    if (status !== 'all') return 'Nenhuma descrição neste status.'
    return 'Nenhuma descrição cadastrada.'
  }, [q, status])

  return (
    <section className="mt-6">
      <div className="sgp-panel sgp-panel-hover">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-100">
                Descrições de apontamentos
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Cadastro de descrições para apontamentos de horas fora de esteiras/STEP.
              </p>
            </div>
            <button
              type="button"
              className="sgp-cta-primary !px-4 !py-2 text-sm"
              onClick={() => setModal({ mode: 'create' })}
            >
              Nova descrição
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(240px,1fr)_220px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Busca
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar descrição"
                className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ExtraTimeEntryDescriptionStatusFilter)
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
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr
                className="border-b border-white/[0.08] text-white shadow-inner"
                style={{ background: 'var(--sgp-gradient-header)' }}
              >
                <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Descrição
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Status
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Ordem
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Atualizado em
                </th>
                <th className="w-36 whitespace-nowrap px-4 py-4 text-right font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Carregando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
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
                      label: row.isActive ? 'Inativar' : 'Ativar',
                      onClick: () => {
                        void (async () => {
                          try {
                            await updateExtraTimeEntryDescription(row.id, {
                              isActive: !row.isActive,
                            })
                            onToast(row.isActive ? 'Descrição inativada.' : 'Descrição ativada.')
                            await load()
                          } catch (err) {
                            onError(
                              err,
                              'operational_settings_extra_time_entry_descriptions_toggle_status',
                            )
                          }
                        })()
                      },
                    },
                    {
                      label: 'Excluir',
                      destructive: true,
                      onClick: () => {
                        if (!window.confirm('Excluir esta descrição? A ação é irreversível.')) return
                        void (async () => {
                          try {
                            await deleteExtraTimeEntryDescription(row.id)
                            onToast('Descrição excluída.')
                            await load()
                          } catch (err) {
                            onError(
                              err,
                              'operational_settings_extra_time_entry_descriptions_delete',
                            )
                          }
                        })()
                      },
                    },
                  ]
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-medium text-slate-100">
                        <p>{row.description}</p>
                        {row.internalNote ? (
                          <p className="mt-1 text-xs text-slate-400">{row.internalNote}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.isActive
                              ? 'bg-emerald-400/15 text-emerald-200'
                              : 'bg-slate-500/20 text-slate-300'
                          }`}
                        >
                          {row.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.sortOrder}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(row.updatedAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <SgpContextActionsMenu menuKey={`extra-desc-${row.id}`} items={menuItems} />
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
        <ExtraTimeEntryDescriptionModal
          mode={modal.mode}
          initial={
            modal.mode === 'edit'
              ? {
                  description: modal.row.description,
                  internalNote: modal.row.internalNote ?? '',
                  sortOrder: modal.row.sortOrder,
                  isActive: modal.row.isActive,
                }
              : undefined
          }
          onClose={() => setModal(null)}
          onSave={async (payload) => {
            try {
              if (modal.mode === 'create') {
                await createExtraTimeEntryDescription(payload)
                onToast('Descrição criada.')
              } else {
                await updateExtraTimeEntryDescription(modal.row.id, payload)
                onToast('Descrição atualizada.')
              }
              setModal(null)
              await load()
            } catch (err) {
              onError(err, 'operational_settings_extra_time_entry_descriptions_save')
            }
          }}
        />
      ) : null}
    </section>
  )
}

function ExtraTimeEntryDescriptionModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit'
  initial?: {
    description: string
    internalNote: string
    sortOrder: number
    isActive: boolean
  }
  onClose: () => void
  onSave: (payload: ExtraTimeDescriptionFormPayload) => void | Promise<void>
}) {
  const [description, setDescription] = useState(initial?.description ?? '')
  const [internalNote, setInternalNote] = useState(initial?.internalNote ?? '')
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
          {mode === 'create' ? 'Nova descrição' : 'Editar descrição'}
        </h2>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Descrição <span className="text-rose-300/90">*</span>
          <input
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setErr(null)
            }}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Ordem de exibição
          <input
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Observação interna (opcional)
          <textarea
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            rows={3}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
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
              const d = description.trim()
              if (d.length < 3) {
                setErr('Descrição deve ter no mínimo 3 caracteres.')
                return
              }
              const order = Number.parseInt(sortOrder, 10)
              if (!Number.isFinite(order) || order < 0) {
                setErr('Informe uma ordem válida (0 ou maior).')
                return
              }
              void onSave({
                description: d,
                sortOrder: order,
                isActive,
                internalNote: internalNote.trim() || null,
              })
            }}
            className="sgp-cta-primary !px-4 !py-2 text-sm"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
