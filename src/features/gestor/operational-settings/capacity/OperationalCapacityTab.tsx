import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  SgpToast,
  type SgpToastVariant,
} from '../../../../components/ui/SgpToast'
import type { AdminCollaborator } from '../../../../domain/collaborators/collaborator.types'
import type {
  CollaboratorCapacityResolved,
  OperationalCapacitySettings,
} from '../../../../domain/operational-capacity'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../../../lib/errors'
import { useSgpErrorSurface } from '../../../../lib/errors/SgpErrorPresentation'
import {
  COLABS_DEFAULT_PAGE_SIZE,
  COLABS_PAGE_SIZE_OPTIONS,
} from '../../../../lib/admin/collaboratorsListUrlState'
import { listAdminCollaborators } from '../../../../services/admin/adminCollaboratorsApiService'
import { listOperationalSectors } from '../../../../services/admin/operationalSettingsApiService'
import {
  deleteCollaboratorCapacityOverride,
  getCollaboratorCapacityResolved,
  getOperationalCapacitySettings,
  updateOperationalCapacitySettings,
  upsertCollaboratorCapacityOverride,
} from '../../../../services/operationalCapacity.service'
import type { OperationalSectorRow } from '../../../../domain/operational-settings/operationalCatalog.types'
import { CapacityOverrideModal } from './CapacityOverrideModal'
import {
  CollaboratorCapacityOverridesTable,
  type CapacityRowModel,
} from './CollaboratorCapacityOverridesTable'
import { DefaultCapacityCard } from './DefaultCapacityCard'

type ToastState = { message: string; variant: SgpToastVariant } | null

export function OperationalCapacityTab() {
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()
  const [toast, setToast] = useState<ToastState>(null)

  const pushToast = useCallback((message: string, variant: SgpToastVariant = 'success') => {
    setToast({ message, variant })
  }, [])

  const [settings, setSettings] = useState<OperationalCapacitySettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsErr, setSettingsErr] = useState<string | null>(null)
  const [savingDefault, setSavingDefault] = useState(false)

  const [sectors, setSectors] = useState<OperationalSectorRow[]>([])
  const [search, setSearch] = useState('')
  const [draftSearch, setDraftSearch] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(COLABS_DEFAULT_PAGE_SIZE)

  const [collabsLoading, setCollabsLoading] = useState(true)
  const [collabs, setCollabs] = useState<AdminCollaborator[]>([])
  const [total, setTotal] = useState(0)

  const [capLoading, setCapLoading] = useState(false)
  const [capById, setCapById] = useState<
    Record<string, { resolved: CollaboratorCapacityResolved | null; failed: boolean }>
  >({})

  const [modalCollab, setModalCollab] = useState<AdminCollaborator | null>(null)
  const [modalResolved, setModalResolved] = useState<CollaboratorCapacityResolved | null>(null)
  const [modalSaving, setModalSaving] = useState(false)

  const govErr = useCallback(
    (err: unknown, action: string) => {
      const n = reportClientError(err, {
        module: 'governanca',
        action,
        route: pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        return n.userMessage
      }
      return n.userMessage
    },
    [pathname, presentBlocking],
  )

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true)
    setSettingsErr(null)
    try {
      const s = await getOperationalCapacitySettings()
      setSettings(s)
    } catch (e) {
      setSettingsErr(
        govErr(e, 'operational_capacity_settings_load') ??
          'Não foi possível carregar a capacidade operacional.',
      )
    } finally {
      setSettingsLoading(false)
    }
  }, [govErr])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    void (async () => {
      try {
        const rows = await listOperationalSectors()
        setSectors(rows)
      } catch (e) {
        govErr(e, 'operational_capacity_sectors_load')
      }
    })()
  }, [govErr])

  useEffect(() => {
    const t = setTimeout(() => setSearch(draftSearch.trim()), 350)
    return () => clearTimeout(t)
  }, [draftSearch])

  const listParams = useMemo(
    () => ({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      search: search || undefined,
      sectorId: sectorId || undefined,
      status: 'ACTIVE' as const,
    }),
    [page, pageSize, search, sectorId],
  )

  const loadCollaborators = useCallback(async () => {
    setCollabsLoading(true)
    try {
      const { items, total: t } = await listAdminCollaborators(listParams)
      setCollabs(items)
      setTotal(t)
    } catch (e) {
      govErr(e, 'operational_capacity_collabs_list')
      setCollabs([])
      setTotal(0)
    } finally {
      setCollabsLoading(false)
    }
  }, [govErr, listParams])

  useEffect(() => {
    void loadCollaborators()
  }, [loadCollaborators])

  useEffect(() => {
    setPage(1)
  }, [search, sectorId, pageSize])

  const loadCapacitiesFor = useCallback(
    async (items: AdminCollaborator[]) => {
      if (items.length === 0) {
        setCapById({})
        return
      }
      setCapLoading(true)
      const next: Record<string, { resolved: CollaboratorCapacityResolved | null; failed: boolean }> =
        {}
      const settled = await Promise.allSettled(
        items.map((c) => getCollaboratorCapacityResolved(c.id)),
      )
      settled.forEach((r, i) => {
        const id = items[i]!.id
        if (r.status === 'fulfilled') {
          next[id] = { resolved: r.value, failed: false }
        } else {
          next[id] = { resolved: null, failed: true }
        }
      })
      setCapById(next)
      setCapLoading(false)
    },
    [],
  )

  useEffect(() => {
    if (collabsLoading) return
    void loadCapacitiesFor(collabs)
  }, [collabs, collabsLoading, loadCapacitiesFor])

  const tableRows: CapacityRowModel[] = useMemo(
    () =>
      collabs.map((c) => ({
        collaborator: c,
        resolved: capById[c.id]?.resolved ?? null,
        failed: capById[c.id]?.failed ?? false,
      })),
    [capById, collabs],
  )

  const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1)

  async function openModal(c: AdminCollaborator) {
    setModalCollab(c)
    setModalResolved(null)
    try {
      const r = await getCollaboratorCapacityResolved(c.id)
      setModalResolved(r)
    } catch (e) {
      govErr(e, 'operational_capacity_collab_get')
      setModalCollab(null)
    }
  }

  const defaultMinutesForModal =
    settings?.defaultDailyMinutes ??
    modalResolved?.defaultDailyMinutes ??
    480

  return (
    <section className="mt-6 space-y-8">
      {toast ? (
        <SgpToast
          fixed
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}

      <DefaultCapacityCard
        settings={settings}
        loading={settingsLoading}
        saving={savingDefault}
        error={settingsErr}
        onSave={async (defaultDailyMinutes) => {
          setSavingDefault(true)
          setSettingsErr(null)
          try {
            const next = await updateOperationalCapacitySettings({ defaultDailyMinutes })
            setSettings(next)
            pushToast('Capacidade atualizada com sucesso.')
          } catch (e) {
            setSettingsErr(
              govErr(e, 'operational_capacity_settings_save') ??
                'Não foi possível salvar a capacidade padrão.',
            )
          } finally {
            setSavingDefault(false)
          }
          await loadCapacitiesFor(collabs)
        }}
      />

      <div className="sgp-panel sgp-panel-hover">
        <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
          Ajustes por colaborador
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Lista os colaboradores ativos e mostra a capacidade efetiva para hoje. Para alterar um
          registo, utilize editar ou remover o ajuste para voltar ao padrão global.
        </p>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Buscar nome
            </span>
            <input
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="Nome, e-mail…"
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Setor</span>
            <select
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            >
              <option value="">Todos</option>
              {sectors
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Por página
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            >
              {COLABS_PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {collabsLoading
            ? 'A carregar colaboradores…'
            : `${total} registo(s) · página ${page} de ${maxPage}`}
        </p>

        <CollaboratorCapacityOverridesTable
          rows={tableRows}
          loading={collabsLoading || capLoading}
          onEdit={(c) => void openModal(c)}
          onRemove={(c) => {
            if (
              !window.confirm(
                `Remover o ajuste de capacidade de ${c.fullName}? Voltará ao padrão global.`,
              )
            ) {
              return
            }
            void (async () => {
              try {
                await deleteCollaboratorCapacityOverride(c.id)
                pushToast('Ajuste removido; volta ao padrão global.')
                await loadCapacitiesFor(collabs)
              } catch (e) {
                pushToast(
                  govErr(e, 'operational_capacity_override_delete') ??
                    'Não foi possível remover o ajuste.',
                  'error',
                )
              }
            })()
          }}
        />

        {!collabsLoading && total > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
            <p className="text-xs">
              A mostrar{' '}
              <span className="tabular-nums font-medium text-slate-300">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
              </span>{' '}
              de <span className="tabular-nums font-medium text-slate-300">{total}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
                disabled={page >= maxPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Seguinte
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {modalCollab && modalResolved ? (
        <CapacityOverrideModal
          key={modalCollab.id}
          collaborator={modalCollab}
          resolved={modalResolved}
          defaultDailyMinutes={defaultMinutesForModal}
          saving={modalSaving}
          onClose={() => {
            setModalCollab(null)
            setModalResolved(null)
          }}
          onRestoreDefault={async () => {
            setModalSaving(true)
            try {
              await deleteCollaboratorCapacityOverride(modalCollab.id)
              pushToast('Capacidade restaurada ao padrão global.')
              setModalCollab(null)
              setModalResolved(null)
              await loadCapacitiesFor(collabs)
            } catch (e) {
              pushToast(
                govErr(e, 'operational_capacity_override_delete_modal') ??
                  'Não foi possível restaurar o padrão.',
                'error',
              )
            } finally {
              setModalSaving(false)
            }
          }}
          onSave={async ({ dailyMinutes, effectiveFrom, effectiveTo }) => {
            setModalSaving(true)
            try {
              await upsertCollaboratorCapacityOverride({
                collaboratorId: modalCollab.id,
                dailyMinutes,
                effectiveFrom,
                effectiveTo,
                isActive: true,
              })
              pushToast('Capacidade atualizada com sucesso.')
              setModalCollab(null)
              setModalResolved(null)
              await loadCapacitiesFor(collabs)
            } catch (e) {
              pushToast(
                govErr(e, 'operational_capacity_override_save') ??
                  'Não foi possível salvar o ajuste do colaborador.',
                'error',
              )
            } finally {
              setModalSaving(false)
            }
          }}
        />
      ) : null}

      {modalCollab && !modalResolved ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-sgp-navy/55 p-4 backdrop-blur-sm"
          role="alert"
        >
          <p className="rounded-xl border border-white/10 bg-sgp-navy px-6 py-4 text-sm text-slate-200">
            A carregar dados de capacidade…
          </p>
        </div>
      ) : null}
    </section>
  )
}
