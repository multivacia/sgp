import { describe, expect, it } from 'vitest'
import {
  GESTAO_NAV_ITEMS,
  navItemVisible,
} from '../../../lib/shell/app-nav-config'
import {
  PERMISSION_BACKUPS_CREATE,
  PERMISSION_BACKUPS_DOWNLOAD,
  PERMISSION_BACKUPS_VIEW,
  PERMISSION_OPERATIONAL_SETTINGS_MANAGE,
} from '../../../lib/permissions/permissionCodes'
import {
  BACKUP_STATUS_LABELS,
  formatBackupSize,
} from '../../../domain/backups/backups.types'

describe('nav Configurações operacionais + backups', () => {
  it('exige anyOf operational_settings.manage ou backups.view', () => {
    const item = GESTAO_NAV_ITEMS.find(
      (entry) => entry.to === '/app/configuracoes-operacionais',
    )
    expect(item?.anyOfPermissions).toEqual([
      PERMISSION_OPERATIONAL_SETTINGS_MANAGE,
      PERMISSION_BACKUPS_VIEW,
    ])
  })

  it('visível com apenas backups.view', () => {
    const item = GESTAO_NAV_ITEMS.find(
      (entry) => entry.to === '/app/configuracoes-operacionais',
    )!
    const can = (code: string) => code === PERMISSION_BACKUPS_VIEW
    const canAny = (codes: string[]) => codes.some((c) => can(c))
    expect(navItemVisible(item, can, canAny)).toBe(true)
  })

  it('oculto sem permissões relevantes', () => {
    const item = GESTAO_NAV_ITEMS.find(
      (entry) => entry.to === '/app/configuracoes-operacionais',
    )!
    const can = () => false
    const canAny = () => false
    expect(navItemVisible(item, can, canAny)).toBe(false)
  })
})

describe('visibilidade de ações de backup (regras de UI)', () => {
  function canShowCreate(can: (c: string) => boolean): boolean {
    return can(PERMISSION_BACKUPS_CREATE)
  }
  function canShowDownload(
    can: (c: string) => boolean,
    status: string,
    integrity: string,
  ): boolean {
    return (
      can(PERMISSION_BACKUPS_DOWNLOAD) &&
      status === 'COMPLETED' &&
      integrity === 'VALID'
    )
  }
  function canShowBackupsTab(can: (c: string) => boolean): boolean {
    return can(PERMISSION_BACKUPS_VIEW)
  }

  it('aba escondida sem view', () => {
    expect(canShowBackupsTab(() => false)).toBe(false)
  })

  it('aba visível com view', () => {
    expect(canShowBackupsTab((c) => c === PERMISSION_BACKUPS_VIEW)).toBe(true)
  })

  it('botão create condicional', () => {
    expect(canShowCreate((c) => c === PERMISSION_BACKUPS_VIEW)).toBe(false)
    expect(canShowCreate((c) => c === PERMISSION_BACKUPS_CREATE)).toBe(true)
  })

  it('botão download condicional a status/integridade', () => {
    const can = (c: string) => c === PERMISSION_BACKUPS_DOWNLOAD
    expect(canShowDownload(can, 'COMPLETED', 'VALID')).toBe(true)
    expect(canShowDownload(can, 'FAILED', 'VALID')).toBe(false)
    expect(canShowDownload(can, 'COMPLETED', 'INVALID')).toBe(false)
  })

  it('labels e tamanho não expõem path', () => {
    expect(BACKUP_STATUS_LABELS.COMPLETED).toBe('Concluído')
    expect(formatBackupSize(2048)).toContain('KB')
    expect(formatBackupSize(null)).toBe('—')
  })
})
