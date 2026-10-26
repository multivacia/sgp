import { afterEach, describe, expect, it, vi } from 'vitest'
import { GESTAO_NAV_ITEMS, navItemVisible } from '../../../lib/shell/app-nav-config'
import {
  PERMISSION_SYSTEM_SETTINGS_MANAGE,
  PERMISSION_SYSTEM_SETTINGS_VIEW,
} from '../../../lib/permissions/permissionCodes'
import { ApiError } from '../../../lib/api/apiErrors'
import {
  getDatabaseRestoreStatus,
  startDatabaseRestore,
} from '../../../services/databaseBackups/databaseBackupsApiService'
import { formatBackupSize, restoreConfirmationMatches } from './databaseBackupsCopy'

vi.mock('../../../lib/api/client', () => ({
  requestJson: vi.fn(),
  requestJsonEnvelope: vi.fn(),
}))

import { requestJson } from '../../../lib/api/client'

describe('Backups da base — menu', () => {
  const item = GESTAO_NAV_ITEMS.find((e) => e.to === '/app/configuracoes/sistema/backups')

  it('fica em Estrutura e administração e exige system_settings.manage', () => {
    expect(item?.navGroup).toBe('estrutura_administracao')
    expect(item?.permission).toBe(PERMISSION_SYSTEM_SETTINGS_MANAGE)
  })

  it('não aparece para quem só tem system_settings.view', () => {
    const can = (code: string) => code === PERMISSION_SYSTEM_SETTINGS_VIEW
    expect(navItemVisible(item!, can, () => false)).toBe(false)
  })
})

describe('Backups da base — confirmação e formatação', () => {
  it('libera o restore só com o nome exato da base', () => {
    expect(restoreConfirmationMatches('sgp_prod', 'sgp_prod')).toBe(true)
    expect(restoreConfirmationMatches(' sgp_prod ', 'sgp_prod')).toBe(true)
    expect(restoreConfirmationMatches('SGP_PROD', 'sgp_prod')).toBe(false)
    expect(restoreConfirmationMatches('', '')).toBe(false)
  })

  it('formata tamanho em KB/MB', () => {
    expect(formatBackupSize(2048)).toBe('2 KB')
    expect(formatBackupSize(5 * 1024 * 1024)).toBe('5 MB')
  })
})

describe('databaseBackupsApiService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('envia arquivo e nome da base no restore', async () => {
    vi.mocked(requestJson).mockResolvedValue({ status: 'running' })
    await startDatabaseRestore({ fileName: 'sgp_20261019-030000_scheduled.dump', databaseName: 'sgp' })
    expect(requestJson).toHaveBeenCalledWith('POST', '/api/v1/admin/database-backups/restore', {
      body: { fileName: 'sgp_20261019-030000_scheduled.dump', databaseName: 'sgp' },
    })
  })

  it('trata o 503 do modo manutenção como andamento do restore', async () => {
    vi.mocked(requestJson).mockRejectedValue(
      new ApiError('manutenção', 503, { details: { maintenance: true, restorePhase: 'restore' } }),
    )
    await expect(getDatabaseRestoreStatus()).resolves.toEqual({ maintenance: true, phase: 'restore' })
  })

  it('outros erros continuam sendo erros', async () => {
    vi.mocked(requestJson).mockRejectedValue(new ApiError('x', 503))
    await expect(getDatabaseRestoreStatus()).rejects.toBeInstanceOf(ApiError)
  })

  it('devolve o resultado final quando a API volta', async () => {
    vi.mocked(requestJson).mockResolvedValue({ status: 'success', migrationsNotice: 'aviso' })
    await expect(getDatabaseRestoreStatus()).resolves.toEqual({
      maintenance: false,
      job: { status: 'success', migrationsNotice: 'aviso' },
    })
  })
})
