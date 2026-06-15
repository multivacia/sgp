import { describe, expect, it } from 'vitest'
import {
  SHOW_ARGOS_HEALTH_UI,
  SHOW_ARGOS_LOGIN_BRANDING,
  SHOW_ARGOS_SIDEBAR_FAMILY,
} from './argosUiFlags'

describe('argosUiFlags', () => {
  it('mantém seções ARGOS desabilitadas temporariamente na UI', () => {
    expect(SHOW_ARGOS_HEALTH_UI).toBe(false)
    expect(SHOW_ARGOS_SIDEBAR_FAMILY).toBe(false)
    expect(SHOW_ARGOS_LOGIN_BRANDING).toBe(false)
  })
})
