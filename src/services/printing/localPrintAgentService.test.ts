import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkPrintAgentHealth, getPrintAgentBaseUrl } from './localPrintAgentService'

describe('localPrintAgentService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('usa URL padrao do agente local', () => {
    expect(getPrintAgentBaseUrl()).toBe('http://127.0.0.1:8765')
  })

  it('checkPrintAgentHealth retorna true quando /health responde ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    )

    await expect(checkPrintAgentHealth()).resolves.toBe(true)
  })

  it('checkPrintAgentHealth retorna false quando fetch falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(checkPrintAgentHealth()).resolves.toBe(false)
  })
})
