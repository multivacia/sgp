import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { PageCanvas } from '../../../components/ui/PageCanvas'
import {
  SgpToast,
  type SgpToastVariant,
} from '../../../components/ui/SgpToast'
import type { SystemSettingItem } from '../../../domain/system-settings/systemSettings.types'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../../lib/errors'
import { useSgpErrorSurface } from '../../../lib/errors/SgpErrorPresentation'
import { PERMISSION_SYSTEM_SETTINGS_MANAGE } from '../../../lib/permissions/permissionCodes'
import { useAuth } from '../../../lib/use-auth'
import {
  listSystemSettings,
  updateSystemSetting,
} from '../../../services/systemSettings/systemSettingsApiService'
import {
  SESSION_IDLE_TIMEOUT_KEY,
  SESSION_IDLE_WARNING_KEY,
  sessionSettingsUpdateKeys,
  validateSessionSettingsDraft,
} from './systemSettingsValidation'

type ToastState = { message: string; variant: SgpToastVariant } | null

export function SystemSettingsPage() {
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()
  const { can } = useAuth()
  const canManage = can(PERMISSION_SYSTEM_SETTINGS_MANAGE)

  const [items, setItems] = useState<SystemSettingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [draftTimeoutMinutes, setDraftTimeoutMinutes] = useState('')
  const [draftWarningMinutes, setDraftWarningMinutes] = useState('')

  const timeoutSetting = useMemo(
    () => items.find((item) => item.key === SESSION_IDLE_TIMEOUT_KEY) ?? null,
    [items],
  )
  const warningSetting = useMemo(
    () => items.find((item) => item.key === SESSION_IDLE_WARNING_KEY) ?? null,
    [items],
  )

  const pushToast = (message: string, variant: SgpToastVariant = 'success') => {
    setToast({ message, variant })
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listSystemSettings()
      setItems(data)
      setDraftTimeoutMinutes(
        data.find((item) => item.key === SESSION_IDLE_TIMEOUT_KEY)?.value ?? '',
      )
      setDraftWarningMinutes(
        data.find((item) => item.key === SESSION_IDLE_WARNING_KEY)?.value ?? '',
      )
    } catch (err) {
      const n = reportClientError(err, {
        module: 'system_settings',
        action: 'load',
        route: pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else if (n.status === 403) {
        pushToast(
          'Você não tem permissão para alterar configurações sistêmicas.',
          'error',
        )
      } else {
        pushToast(n.userMessage, 'error')
      }
    } finally {
      setLoading(false)
    }
  }, [pathname, presentBlocking])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canManage) {
      pushToast(
        'Você não tem permissão para alterar configurações sistêmicas.',
        'error',
      )
      return
    }

    const validationError = validateSessionSettingsDraft({
      timeoutMinutes: draftTimeoutMinutes,
      warningMinutes: draftWarningMinutes,
    })
    if (validationError) {
      pushToast(validationError, 'error')
      return
    }

    const timeoutValue = Number.parseInt(draftTimeoutMinutes.trim(), 10)
    const warningValue = Number.parseInt(draftWarningMinutes.trim(), 10)
    const storedTimeout = Number.parseInt(timeoutSetting?.value ?? '0', 10)
    const storedWarning = Number.parseInt(warningSetting?.value ?? '0', 10)
    const updateKeys = sessionSettingsUpdateKeys(
      timeoutValue,
      warningValue,
      storedTimeout,
      storedWarning,
    )

    setSaving(true)
    try {
      const updates: Record<string, SystemSettingItem> = {}
      for (const key of updateKeys) {
        const value =
          key === SESSION_IDLE_TIMEOUT_KEY ? timeoutValue : warningValue
        updates[key] = await updateSystemSetting(key, { value })
      }
      const updatedTimeout = updates[SESSION_IDLE_TIMEOUT_KEY]
      const updatedWarning = updates[SESSION_IDLE_WARNING_KEY]
      setItems((prev) =>
        prev.map((item) => {
          if (item.key === updatedTimeout.key) return updatedTimeout
          if (item.key === updatedWarning.key) return updatedWarning
          return item
        }),
      )
      setDraftTimeoutMinutes(updatedTimeout.value)
      setDraftWarningMinutes(updatedWarning.value)
      pushToast('Configuração atualizada com sucesso.')
    } catch (err) {
      const n = reportClientError(err, {
        module: 'system_settings',
        action: 'save',
        route: pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else if (n.status === 403) {
        pushToast(
          'Você não tem permissão para alterar configurações sistêmicas.',
          'error',
        )
      } else {
        pushToast(n.userMessage, 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageCanvas>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-100">Configurações do sistema</h1>
        <p className="text-sm text-slate-400">
          Parâmetros sistêmicos sensíveis do SGP Web.
        </p>
      </div>

      <SystemSettingsForm
        canManage={canManage}
        draftTimeoutMinutes={draftTimeoutMinutes}
        draftWarningMinutes={draftWarningMinutes}
        loading={loading}
        saving={saving}
        timeoutSetting={timeoutSetting}
        warningSetting={warningSetting}
        onDraftTimeoutChange={setDraftTimeoutMinutes}
        onDraftWarningChange={setDraftWarningMinutes}
        onReload={() => void load()}
        onSubmit={(e) => void handleSubmit(e)}
      />

      {toast ? (
        <SgpToast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </PageCanvas>
  )
}

function SystemSettingsForm({
  canManage,
  draftTimeoutMinutes,
  draftWarningMinutes,
  loading,
  saving,
  timeoutSetting,
  warningSetting,
  onDraftTimeoutChange,
  onDraftWarningChange,
  onReload,
  onSubmit,
}: {
  canManage: boolean
  draftTimeoutMinutes: string
  draftWarningMinutes: string
  loading: boolean
  saving: boolean
  timeoutSetting: SystemSettingItem | null
  warningSetting: SystemSettingItem | null
  onDraftTimeoutChange: (value: string) => void
  onDraftWarningChange: (value: string) => void
  onReload: () => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-2xl border border-slate-700/60 bg-sgp-night/40 p-6">
        <h2 className="text-base font-semibold text-slate-100">Segurança de sessão</h2>
        <p className="mt-2 text-sm text-slate-400">
          Após esse período sem atividade, o usuário precisará fazer login novamente.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-slate-400">Carregando configurações…</p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-slate-200">
              Tempo de inatividade da sessão
              <input
                type="number"
                min={5}
                max={480}
                step={1}
                inputMode="numeric"
                value={draftTimeoutMinutes}
                onChange={(e) => onDraftTimeoutChange(e.target.value)}
                disabled={!canManage || saving}
                className="mt-2 w-full rounded-xl border border-slate-600/70 bg-sgp-void px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/60 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block text-sm font-medium text-slate-200">
              Avisar antes de expirar
              <input
                type="number"
                min={1}
                max={30}
                step={1}
                inputMode="numeric"
                value={draftWarningMinutes}
                onChange={(e) => onDraftWarningChange(e.target.value)}
                disabled={!canManage || saving}
                className="mt-2 w-full rounded-xl border border-slate-600/70 bg-sgp-void px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/60 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <p className="text-sm text-slate-400">
              Valor atual: timeout {timeoutSetting?.value ?? '—'} minutos; aviso{' '}
              {warningSetting?.value ?? '—'} minutos
            </p>
            <p className="text-sm text-slate-500">
              A alteração pode levar até 60 segundos para refletir em novas validações de
              sessão.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!canManage || saving}
                className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={onReload}
                disabled={saving}
                className="rounded-xl border border-slate-600/70 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Recarregar
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
