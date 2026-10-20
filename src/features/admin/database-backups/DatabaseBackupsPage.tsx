import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PageCanvas } from '../../../components/ui/PageCanvas'
import { SgpToast, type SgpToastVariant } from '../../../components/ui/SgpToast'
import type {
  DatabaseBackupItem,
  DatabaseBackupsStatus,
  DatabaseRestoreJob,
  DatabaseRestorePhase,
} from '../../../domain/database-backups/databaseBackups.types'
import { ApiError } from '../../../lib/api/apiErrors'
import { reportClientError } from '../../../lib/errors'
import {
  databaseBackupDownloadUrl,
  getDatabaseBackupsStatus,
  getDatabaseRestoreStatus,
  listDatabaseBackups,
  startDatabaseBackup,
  startDatabaseRestore,
} from '../../../services/databaseBackups/databaseBackupsApiService'
import {
  RESTORE_PHASE_LABEL,
  backupReasonLabel,
  formatBackupDateTime,
  formatBackupSize,
  restoreConfirmationMatches,
} from './databaseBackupsCopy'

type ToastState = { message: string; variant: SgpToastVariant } | null

const POLL_MS = 2000

export function DatabaseBackupsPage() {
  const { pathname } = useLocation()
  const [items, setItems] = useState<DatabaseBackupItem[]>([])
  const [status, setStatus] = useState<DatabaseBackupsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingBackup, setStartingBackup] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [restoreTarget, setRestoreTarget] = useState<DatabaseBackupItem | null>(null)
  const [restorePhase, setRestorePhase] = useState<DatabaseRestorePhase | null>(null)
  const [restoreResult, setRestoreResult] = useState<DatabaseRestoreJob | null>(null)
  const pollRef = useRef<number | null>(null)

  const reportError = useCallback(
    (err: unknown, action: string) => {
      const n = reportClientError(err, { module: 'database_backups', action, route: pathname })
      setToast({ message: n.userMessage, variant: 'error' })
    },
    [pathname],
  )

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    try {
      const [list, st] = await Promise.all([listDatabaseBackups(), getDatabaseBackupsStatus()])
      setItems(list)
      setStatus(st)
      return true
    } catch (err) {
      const maintenance =
        err instanceof ApiError &&
        err.status === 503 &&
        (err.details as { maintenance?: boolean } | undefined)?.maintenance === true
      if (!maintenance) reportError(err, 'load')
      return !maintenance
    } finally {
      setLoading(false)
    }
  }, [reportError])

  async function handleBackupNow() {
    setStartingBackup(true)
    try {
      await startDatabaseBackup()
      setToast({
        message: 'Backup iniciado. Ele aparece na lista depois que a cópia for confirmada no OneDrive.',
        variant: 'success',
      })
    } catch (err) {
      reportError(err, 'backup')
    } finally {
      setStartingBackup(false)
    }
  }

  const pollRestore = useCallback(async () => {
    try {
      const r = await getDatabaseRestoreStatus()
      if (r.maintenance) {
        setRestorePhase(r.phase ?? 'starting')
      } else if (r.job && r.job.status !== 'running') {
        setRestorePhase(null)
        setRestoreResult(r.job)
        void load()
        return
      } else if (r.job) {
        setRestorePhase(r.job.phase)
      }
    } catch (err) {
      setRestorePhase(null)
      reportError(err, 'restore_status')
      return
    }
    pollRef.current = window.setTimeout(() => void pollRestore(), POLL_MS)
  }, [load, reportError])

  useEffect(() => {
    // Página aberta durante um restore (API em manutenção): acompanha o andamento.
    void load().then((loaded) => {
      if (!loaded) {
        setRestorePhase('starting')
        void pollRestore()
      }
    })
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current)
    }
  }, [load, pollRestore])

  async function handleConfirmRestore(databaseName: string) {
    if (!restoreTarget) return
    const fileName = restoreTarget.fileName
    setRestoreTarget(null)
    setRestoreResult(null)
    setRestorePhase('starting')
    try {
      await startDatabaseRestore({ fileName, databaseName })
    } catch (err) {
      setRestorePhase(null)
      reportError(err, 'restore')
      return
    }
    pollRef.current = window.setTimeout(() => void pollRestore(), POLL_MS)
  }

  const lastRun = status?.lastRun ?? null
  const restoring = restorePhase !== null

  return (
    <PageCanvas>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-100">Backups da base</h1>
        <p className="text-sm text-slate-400">
          Backups da base de produção com cópia confirmada no OneDrive da Bravo e ainda presentes na
          VPS.
        </p>
      </div>

      <div className="mx-auto mt-6 max-w-4xl space-y-6">
        {lastRun?.status === 'failure' ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-100"
          >
            <p className="font-semibold">O último backup falhou ({formatBackupDateTime(lastRun.finishedAt)}).</p>
            <p className="mt-1 text-rose-200/90">{lastRun.errorMessage ?? 'Erro não informado.'}</p>
          </div>
        ) : null}

        {restoring ? (
          <div role="status" className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Restauração em andamento — o SGP+ está em manutenção.</p>
            <p className="mt-1">{RESTORE_PHASE_LABEL[restorePhase]}</p>
          </div>
        ) : null}

        {restoreResult ? <RestoreResult job={restoreResult} onClose={() => setRestoreResult(null)} /> : null}

        <section className="rounded-2xl border border-slate-700/60 bg-sgp-night/40 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-300">
              Último backup:{' '}
              {lastRun ? (
                <>
                  <span className={lastRun.status === 'success' ? 'text-emerald-300' : 'text-rose-300'}>
                    {lastRun.status === 'success' ? 'concluído' : 'falhou'}
                  </span>{' '}
                  em {formatBackupDateTime(lastRun.finishedAt)} ({backupReasonLabel(lastRun.reason)})
                </>
              ) : (
                'nenhum registro'
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading || restoring}
                className="rounded-xl border border-slate-600/70 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Atualizar
              </button>
              <button
                type="button"
                onClick={() => void handleBackupNow()}
                disabled={startingBackup || restoring}
                className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {startingBackup ? 'Iniciando…' : 'Fazer backup agora'}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-slate-400">Carregando backups…</p>
          ) : items.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">
              Nenhum backup com cópia confirmada no OneDrive.
            </p>
          ) : (
            <table className="mt-6 w-full text-left text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Motivo</th>
                  <th className="py-2 pr-3">Tamanho</th>
                  <th className="py-2 pr-3">Cópia confirmada</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.fileName} className="border-t border-slate-700/50">
                    <td className="py-2 pr-3">{formatBackupDateTime(item.createdAt)}</td>
                    <td className="py-2 pr-3">{backupReasonLabel(item.reason)}</td>
                    <td className="py-2 pr-3">{formatBackupSize(item.sizeBytes)}</td>
                    <td className="py-2 pr-3">{formatBackupDateTime(item.copyConfirmedAt)}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <a
                        href={databaseBackupDownloadUrl(item.fileName)}
                        download={item.fileName}
                        className="mr-3 text-sky-300 hover:text-sky-200"
                      >
                        Baixar
                      </a>
                      <button
                        type="button"
                        disabled={restoring}
                        onClick={() => setRestoreTarget(item)}
                        className="text-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Restaurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {restoreTarget && status ? (
        <RestoreDialog
          item={restoreTarget}
          databaseName={status.databaseName}
          onCancel={() => setRestoreTarget(null)}
          onConfirm={(typed) => void handleConfirmRestore(typed)}
        />
      ) : null}

      {toast ? (
        <SgpToast message={toast.message} variant={toast.variant} fixed onDismiss={() => setToast(null)} />
      ) : null}
    </PageCanvas>
  )
}

function RestoreResult({ job, onClose }: { job: DatabaseRestoreJob; onClose: () => void }) {
  const ok = job.status === 'success'
  return (
    <div
      role="alert"
      className={`rounded-2xl border p-4 text-sm ${
        ok
          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100'
          : 'border-rose-500/35 bg-rose-500/10 text-rose-100'
      }`}
    >
      <p className="font-semibold">
        {ok ? 'Restauração concluída.' : 'A restauração falhou. A base continua como estava.'}
      </p>
      {ok ? (
        <p className="mt-1">{job.migrationsNotice}</p>
      ) : (
        <p className="mt-1">{job.errorMessage}</p>
      )}
      {job.preRestoreBackup ? (
        <p className="mt-1 text-xs opacity-80">Backup de segurança: {job.preRestoreBackup}</p>
      ) : null}
      {job.auditRecorded === false ? (
        <p className="mt-1 text-xs opacity-80">
          Não foi possível registrar o evento na trilha administrativa; o registro está no log da VPS.
        </p>
      ) : null}
      <button type="button" onClick={onClose} className="mt-3 text-xs underline">
        Fechar aviso
      </button>
    </div>
  )
}

function RestoreDialog({
  item,
  databaseName,
  onCancel,
  onConfirm,
}: {
  item: DatabaseBackupItem
  databaseName: string
  onCancel: () => void
  onConfirm: (typed: string) => void
}) {
  const [typed, setTyped] = useState('')
  const matches = restoreConfirmationMatches(typed, databaseName)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-labelledby="database-restore-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel/95 to-sgp-app-panel-deep/98 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="database-restore-title" className="font-heading text-lg font-bold tracking-tight text-slate-50">
          Restaurar a base de produção
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
          <p>
            Backup de <strong>{formatBackupDateTime(item.createdAt)}</strong> ({backupReasonLabel(item.reason)}).
          </p>
          <p className="text-rose-200">
            Esta ação substitui <strong>todos os dados atuais</strong> da base pelos dados do backup.
            Tudo o que foi registrado depois dele será perdido.
          </p>
          <p>
            Durante a restauração o SGP+ fica em manutenção para todos os usuários. Antes de restaurar, é
            feito um backup de segurança da base atual; se ele falhar, nada é alterado. Se a restauração
            falhar, a base continua como estava.
          </p>
          <p>Nenhuma migration é executada. Ao final, a tela indica se é preciso reaplicá-las.</p>
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-200">
          Para confirmar, digite o nome da base: <code className="text-amber-200">{databaseName}</code>
          <input
            type="text"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-600/70 bg-sgp-void px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/60"
          />
        </label>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!matches}
            onClick={() => onConfirm(typed.trim())}
            className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-4 py-2.5 text-sm font-bold text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Restaurar
          </button>
        </div>
      </div>
    </div>
  )
}
