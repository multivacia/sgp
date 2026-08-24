import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  SgpContextActionsMenu,
  type SgpContextActionsMenuItemDef,
} from '../../../components/shell/SgpContextActionsMenu'
import type { SgpToastVariant } from '../../../components/ui/SgpToast'
import type {
  CreateStepAbortReasonInput,
  StepAbortReason,
  StepAbortReasonStatusFilter,
} from '../../../domain/conveyors/stepAbortReasons'
import {
  activateStepAbortReason,
  createStepAbortReason,
  deactivateStepAbortReason,
  listStepAbortReasons,
  updateStepAbortReason,
} from '../../../services/operational-settings/stepAbortReasonsApiService'

type Props = {
  onError: (err: unknown, action: string) => void
  onToast: (message: string, variant?: SgpToastVariant) => void
}

type FormPayload = {
  code?: string
  label: string
  description: string | null
  requiresComplement: boolean
  sortOrder: number
  isActive: boolean
}

function sanitizeCodeInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9_]/g, '')
}

export function StepAbortReasonsTab({ onError, onToast }: Props) {
  const [items, setItems] = useState<StepAbortReason[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StepAbortReasonStatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; row: StepAbortReason }
    | null
  >(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listStepAbortReasons({ q, status })
      setItems(data)
    } catch (err) {
      onError(err, 'operational_settings_step_abort_reasons_load')
    } finally {
      setLoading(false)
    }
  }, [onError, q, status])

  useEffect(() => {
    void load()
  }, [load])

  const emptyText = useMemo(() => {
    if (q.trim().length > 0) return 'Nenhum motivo encontrado para a busca.'
    if (status !== 'all') return 'Nenhum motivo neste status.'
    return 'Nenhum motivo cadastrado.'
  }, [q, status])

  return (
    <section className="mt-6">
      <div className="sgp-panel sgp-panel-hover">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-100">
                Motivos de dispensa
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Catálogo padronizado para abortar/dispensar etapas (STEP) da esteira.
              </p>
            </div>
            <button
              type="button"
              className="sgp-cta-primary !px-4 !py-2 text-sm"
              onClick={() => setModal({ mode: 'create' })}
            >
              Novo motivo
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(240px,1fr)_220px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Busca
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar por código ou motivo"
                className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as StepAbortReasonStatusFilter)
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
                  Código
                </th>
                <th className="px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                  Motivo
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
                              await deactivateStepAbortReason(row.code)
                              onToast('Motivo desativado.')
                            } else {
                              await activateStepAbortReason(row.code)
                              onToast('Motivo ativado.')
                            }
                            await load()
                          } catch (err) {
                            onError(err, 'operational_settings_step_abort_reasons_toggle')
                          }
                        })()
                      },
                    },
                  ]
                  return (
                    <tr
                      key={row.code}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-200">
                        {row.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-100">
                        <p>{row.label}</p>
                        {row.description ? (
                          <p className="mt-1 text-xs text-slate-400">{row.description}</p>
                        ) : null}
                      </td>
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
                            menuKey={`step-abort-reason-${row.code}`}
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
        <StepAbortReasonFormModal
          mode={modal.mode}
          initial={
            modal.mode === 'edit'
              ? {
                  code: modal.row.code,
                  label: modal.row.label,
                  description: modal.row.description ?? '',
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
                const input: CreateStepAbortReasonInput = {
                  code: payload.code!,
                  label: payload.label,
                  description: payload.description,
                  requiresComplement: payload.requiresComplement,
                  sortOrder: payload.sortOrder,
                  isActive: payload.isActive,
                }
                await createStepAbortReason(input)
                onToast('Motivo criado.')
              } else {
                await updateStepAbortReason(modal.row.code, {
                  label: payload.label,
                  description: payload.description,
                  requiresComplement: payload.requiresComplement,
                  sortOrder: payload.sortOrder,
                  isActive: payload.isActive,
                })
                onToast('Motivo atualizado.')
              }
              setModal(null)
              await load()
            } catch (err) {
              onError(err, 'operational_settings_step_abort_reasons_save')
            }
          }}
        />
      ) : null}
    </section>
  )
}

function StepAbortReasonFormModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit'
  initial?: {
    code: string
    label: string
    description: string
    requiresComplement: boolean
    sortOrder: number
    isActive: boolean
  }
  onClose: () => void
  onSave: (payload: FormPayload) => void | Promise<void>
}) {
  const [code, setCode] = useState(initial?.code ?? '')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
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
          {mode === 'create' ? 'Novo motivo' : 'Editar motivo'}
        </h2>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Código <span className="text-rose-300/90">*</span>
          <input
            value={code}
            readOnly={mode === 'edit'}
            onChange={(e) => {
              if (mode === 'edit') return
              setCode(sanitizeCodeInput(e.target.value))
              setErr(null)
            }}
            className={`sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 font-mono text-sm text-slate-200 ${
              mode === 'edit' ? 'cursor-not-allowed opacity-70' : ''
            }`}
          />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Motivo <span className="text-rose-300/90">*</span>
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
              const trimmedCode = sanitizeCodeInput(code.trim())
              const trimmedLabel = label.trim()
              if (mode === 'create' && !trimmedCode) {
                setErr('Informe o código.')
                return
              }
              if (!trimmedLabel) {
                setErr('Informe o motivo.')
                return
              }
              const order = Number.parseInt(sortOrder, 10)
              if (!Number.isInteger(order) || order < 0) {
                setErr('Ordem inválida.')
                return
              }
              void onSave({
                ...(mode === 'create' ? { code: trimmedCode } : {}),
                label: trimmedLabel,
                description: description.trim() || null,
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
