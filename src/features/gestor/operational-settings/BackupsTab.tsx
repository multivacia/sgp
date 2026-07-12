import { useCallback, useEffect, useState } from 'react'
import type { SgpToastVariant } from '../../../components/ui/SgpToast'
import type {
  BackupRun,
  BackupSummary,
  BackupWalSegment,
} from '../../../domain/backups/backups.types'
import {
  BACKUP_INTEGRITY_LABELS,
  BACKUP_KIND_LABELS,
  BACKUP_STATUS_LABELS,
  BACKUP_TRIGGER_LABELS,
  formatBackupSize,
} from '../../../domain/backups/backups.types'
import {
  PERMISSION_BACKUPS_CREATE,
  PERMISSION_BACKUPS_DOWNLOAD,
  PERMISSION_BACKUPS_WAL_DOWNLOAD,
  PERMISSION_BACKUPS_WAL_VIEW,
} from '../../../lib/permissions/permissionCodes'
import { useAuth } from '../../../lib/use-auth'
import {
  downloadBackup,
  downloadWalSegment,
  fetchBackupList,
  fetchBackupSummary,
  fetchWalList,
  syncWalSegments,
  triggerManualBackup,
} from '../../../services/admin/backupsApiService'

type Props = {
  onError: (err: unknown, action: string) => void
  onToast: (message: string, variant?: SgpToastVariant) => void
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

export function BackupsTab({ onError, onToast }: Props) {
  const { can } = useAuth()
  const canCreate = can(PERMISSION_BACKUPS_CREATE)
  const canDownload = can(PERMISSION_BACKUPS_DOWNLOAD)
  const canWalView = can(PERMISSION_BACKUPS_WAL_VIEW)
  const canWalDownload = can(PERMISSION_BACKUPS_WAL_DOWNLOAD)

  const [summary, setSummary] = useState<BackupSummary | null>(null)
  const [items, setItems] = useState<BackupRun[]>([])
  const [walItems, setWalItems] = useState<BackupWalSegment[]>([])
  const [walConfigured, setWalConfigured] = useState(false)
  const [pitrStatus, setPitrStatus] = useState<string>('PENDING_CONFIGURATION')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [syncingWal, setSyncingWal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, list] = await Promise.all([
        fetchBackupSummary(),
        fetchBackupList(),
      ])
      setSummary(s)
      setItems(list.items)
      if (canWalView) {
        const wal = await fetchWalList()
        setWalItems(wal.items)
        setWalConfigured(wal.configured)
        setPitrStatus(wal.pitrStatus)
      }
    } catch (err) {
      onError(err, 'backups_load')
    } finally {
      setLoading(false)
    }
  }, [canWalView, onError])

  useEffect(() => {
    void load()
  }, [load])

  const onRunBackup = async () => {
    setRunning(true)
    try {
      await triggerManualBackup()
      onToast('Backup manual solicitado. Atualize em instantes para acompanhar.')
      await load()
    } catch (err) {
      onError(err, 'backups_trigger')
    } finally {
      setRunning(false)
    }
  }

  const onDownload = async (row: BackupRun) => {
    try {
      await downloadBackup(row.id, row.logicalFileName)
      onToast('Download iniciado.')
    } catch (err) {
      onError(err, 'backups_download')
    }
  }

  const onSyncWal = async () => {
    setSyncingWal(true)
    try {
      const result = await syncWalSegments()
      setWalItems(result.items)
      onToast(`WAL sincronizado: ${result.segmentsUpserted} segmento(s).`)
    } catch (err) {
      onError(err, 'backups_wal_sync')
    } finally {
      setSyncingWal(false)
    }
  }

  const onDownloadWal = async (row: BackupWalSegment) => {
    try {
      await downloadWalSegment(row.id, row.segmentName)
      onToast('Download WAL iniciado.')
    } catch (err) {
      onError(err, 'backups_wal_download')
    }
  }

  if (loading && !summary) {
    return (
      <section className="mt-6">
        <p className="text-sm text-slate-400">Carregando backups…</p>
      </section>
    )
  }

  return (
    <section className="mt-6 space-y-6">
      <div className="sgp-panel sgp-panel-hover">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-100">
              Resumo de backups
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Catálogo administrativo de dumps lógicos. Caminhos físicos e credenciais
              não são exibidos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="sgp-cta-secondary !px-4 !py-2 text-sm"
              onClick={() => void load()}
              disabled={loading}
            >
              Atualizar
            </button>
            {canCreate ? (
              <button
                type="button"
                className="sgp-cta-primary !px-4 !py-2 text-sm"
                onClick={() => void onRunBackup()}
                disabled={running || !summary?.configured}
              >
                {running ? 'Solicitando…' : 'Executar backup agora'}
              </button>
            ) : null}
          </div>
        </div>

        {summary ? (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-slate-500">Situação</dt>
              <dd className="mt-0.5 font-medium text-slate-100">
                {summary.configured
                  ? 'Configurado'
                  : summary.enabled
                    ? 'Habilitado sem diretório'
                    : 'Não configurado'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Automático</dt>
              <dd className="mt-0.5 font-medium text-slate-100">
                {summary.configured && summary.scheduleCron
                  ? `Cron: ${summary.scheduleCron}`
                  : 'Não configurado no servidor'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Retenção</dt>
              <dd className="mt-0.5 font-medium text-slate-100">
                {summary.retentionDays != null
                  ? `${summary.retentionDays} dias`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Ambiente</dt>
              <dd className="mt-0.5 font-medium text-slate-100">
                {summary.environment ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Banco</dt>
              <dd className="mt-0.5 font-medium text-slate-100">
                {summary.databaseName ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Último concluído</dt>
              <dd className="mt-0.5 font-medium text-slate-100">
                {formatDate(summary.lastCompleted?.finishedAt ?? null)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Último íntegro</dt>
              <dd className="mt-0.5 font-medium text-slate-100">
                {formatDate(summary.lastValid?.finishedAt ?? null)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">PITR</dt>
              <dd className="mt-0.5 font-medium text-slate-100">
                {summary.pitrStatus === 'PENDING_CONFIGURATION'
                  ? 'Configuração pendente'
                  : 'Não validado'}
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-slate-500">Nota PITR</dt>
              <dd className="mt-0.5 text-slate-300">{summary.pitrNote}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className="sgp-panel sgp-panel-hover overflow-x-auto">
        <h2 className="font-heading text-lg font-bold text-slate-100">
          Histórico
        </h2>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            {summary?.configured
              ? 'Nenhum backup registrado.'
              : 'Backup não configurado neste ambiente.'}
          </p>
        ) : (
          <table className="mt-4 w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-500">
                <th className="py-2 pr-3 font-medium">Data</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 font-medium">Origem</th>
                <th className="py-2 pr-3 font-medium">Ambiente</th>
                <th className="py-2 pr-3 font-medium">Banco</th>
                <th className="py-2 pr-3 font-medium">Tamanho</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Integridade</th>
                <th className="py-2 pr-3 font-medium">Acionamento</th>
                <th className="py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.05] text-slate-200"
                >
                  <td className="py-2.5 pr-3">
                    {formatDate(row.finishedAt ?? row.startedAt)}
                  </td>
                  <td className="py-2.5 pr-3">
                    {BACKUP_KIND_LABELS[row.backupKind]}
                  </td>
                  <td className="py-2.5 pr-3">{row.logicalFileName}</td>
                  <td className="py-2.5 pr-3">{row.environment}</td>
                  <td className="py-2.5 pr-3">{row.databaseName}</td>
                  <td className="py-2.5 pr-3">
                    {formatBackupSize(row.sizeBytes)}
                  </td>
                  <td className="py-2.5 pr-3">
                    {BACKUP_STATUS_LABELS[row.status]}
                  </td>
                  <td className="py-2.5 pr-3">
                    {BACKUP_INTEGRITY_LABELS[row.integrityStatus]}
                  </td>
                  <td className="py-2.5 pr-3">
                    {BACKUP_TRIGGER_LABELS[row.triggerType]}
                  </td>
                  <td className="py-2.5">
                    {canDownload &&
                    row.status === 'COMPLETED' &&
                    row.integrityStatus === 'VALID' ? (
                      <button
                        type="button"
                        className="text-sgp-gold hover:underline"
                        onClick={() => void onDownload(row)}
                      >
                        Baixar
                      </button>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canWalView ? (
        <div className="sgp-panel sgp-panel-hover overflow-x-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-100">
                Segmentos WAL
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Inventário de arquivos WAL. PITR:{' '}
                {pitrStatus === 'PENDING_CONFIGURATION'
                  ? 'configuração pendente'
                  : 'não validado'}
                . Não interpreta conteúdo WAL.
              </p>
            </div>
            {walConfigured ? (
              <button
                type="button"
                className="sgp-cta-secondary !px-4 !py-2 text-sm"
                disabled={syncingWal}
                onClick={() => void onSyncWal()}
              >
                {syncingWal ? 'Sincronizando…' : 'Sincronizar WAL'}
              </button>
            ) : null}
          </div>
          {!walConfigured ? (
            <p className="mt-4 text-sm text-slate-400">
              Diretório WAL não configurado neste ambiente.
            </p>
          ) : walItems.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              Nenhum segmento catalogado. Use sincronizar após arquivar WAL.
            </p>
          ) : (
            <table className="mt-4 w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-500">
                  <th className="py-2 pr-3 font-medium">Segmento</th>
                  <th className="py-2 pr-3 font-medium">Ambiente</th>
                  <th className="py-2 pr-3 font-medium">Tamanho</th>
                  <th className="py-2 pr-3 font-medium">Arquivado</th>
                  <th className="py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {walItems.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/[0.05] text-slate-200"
                  >
                    <td className="py-2.5 pr-3 font-mono text-xs">
                      {row.segmentName}
                    </td>
                    <td className="py-2.5 pr-3">{row.environment}</td>
                    <td className="py-2.5 pr-3">
                      {formatBackupSize(row.sizeBytes)}
                    </td>
                    <td className="py-2.5 pr-3">
                      {formatDate(row.archivedAt)}
                    </td>
                    <td className="py-2.5">
                      {canWalDownload && row.availableForDownload ? (
                        <button
                          type="button"
                          className="text-sgp-gold hover:underline"
                          onClick={() => void onDownloadWal(row)}
                        >
                          Baixar
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </section>
  )
}
