import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSupportTicketsEnabled } from './env'

describe('support feature flag frontend', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('retorna true quando VITE_SUPPORT_TICKETS_ENABLED=1', () => {
    vi.stubEnv('VITE_SUPPORT_TICKETS_ENABLED', '1')
    expect(isSupportTicketsEnabled()).toBe(true)
  })

  it('retorna false quando VITE_SUPPORT_TICKETS_ENABLED=0', () => {
    vi.stubEnv('VITE_SUPPORT_TICKETS_ENABLED', '0')
    expect(isSupportTicketsEnabled()).toBe(false)
  })
})
