import { describe, expect, it } from 'vitest'
import { GESTAO_NAV_ITEMS } from '../../../lib/shell/app-nav-config'
import { PERMISSION_SYSTEM_SETTINGS_VIEW } from '../../../lib/permissions/permissionCodes'

describe('menu de configurações do sistema', () => {
  it('exige permissão system_settings.view', () => {
    const item = GESTAO_NAV_ITEMS.find((entry) => entry.to === '/app/configuracoes/sistema')
    expect(item?.permission).toBe(PERMISSION_SYSTEM_SETTINGS_VIEW)
  })
})
