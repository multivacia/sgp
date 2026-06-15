import { describe, expect, it } from 'vitest'
import { resolveProductionCredentialStatus } from '../modules/production/production-credential-status.js'

describe('resolveProductionCredentialStatus', () => {
  it('sem credencial retorna NEEDS_INITIAL_PIN', () => {
    expect(
      resolveProductionCredentialStatus({
        hasCredential: false,
        enabled: null,
        lockedUntil: null,
      }),
    ).toBe('NEEDS_INITIAL_PIN')
  })

  it('credencial desabilitada retorna DISABLED', () => {
    expect(
      resolveProductionCredentialStatus({
        hasCredential: true,
        enabled: false,
        lockedUntil: null,
      }),
    ).toBe('DISABLED')
  })

  it('credencial bloqueada retorna LOCKED', () => {
    const future = new Date(Date.now() + 60_000)
    expect(
      resolveProductionCredentialStatus(
        {
          hasCredential: true,
          enabled: true,
          lockedUntil: future,
        },
        Date.now(),
      ),
    ).toBe('LOCKED')
  })

  it('credencial habilitada e desbloqueada retorna READY', () => {
    expect(
      resolveProductionCredentialStatus({
        hasCredential: true,
        enabled: true,
        lockedUntil: null,
      }),
    ).toBe('READY')
  })
})
