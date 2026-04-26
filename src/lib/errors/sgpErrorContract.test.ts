import { describe, expect, it } from 'vitest'
import {
  ApiError,
  SESSION_REVOKED_CREDENTIALS_CHANGED_CODE,
} from '../api/apiErrors'
import {
  inferCause,
  isBlockingSeverity,
  normalizeClientError,
  presentationPlan,
} from './sgpErrorContract'

describe('normalizeClientError', () => {
  it('classifica rede (NETWORK_ERROR) como crítico e modal', () => {
    const err = new ApiError('x', 503, { code: 'NETWORK_ERROR' })
    const n = normalizeClientError(err)
    expect(n.cause).toBe('rede')
    expect(n.severity).toBe('critico')
    expect(presentationPlan(n).surface).toBe('modal')
  })

  it('classifica 422 como validação relevante (banner)', () => {
    const err = new ApiError('Campo X é obrigatório.', 422)
    const n = normalizeClientError(err)
    expect(n.cause).toBe('validacao')
    expect(n.severity).toBe('relevante')
    expect(presentationPlan(n).surface).toBe('banner')
    expect(isBlockingSeverity(n.severity)).toBe(false)
  })

  it('classifica 403 como permissão impeditiva (modal)', () => {
    const err = new ApiError('Proibido.', 403)
    const n = normalizeClientError(err)
    expect(inferCause(403, undefined)).toBe('permissao')
    expect(n.severity).toBe('impeditivo')
    expect(presentationPlan(n).surface).toBe('modal')
  })

  it('classifica 401 como sessão impeditiva', () => {
    const err = new ApiError('Não autenticado', 401)
    const n = normalizeClientError(err)
    expect(n.cause).toBe('sessao')
    expect(isBlockingSeverity(n.severity)).toBe(true)
  })

  it('401 preserva mensagem operacional do backend quando existir', () => {
    const err = new ApiError('E-mail ou senha inválidos.', 401, {
      code: 'UNAUTHORIZED',
    })
    const n = normalizeClientError(err)
    expect(n.userMessage).toBe('E-mail ou senha inválidos.')
  })

  it('distingue revogação de sessão por credenciais', () => {
    const err = new ApiError('msg', 401, {
      code: SESSION_REVOKED_CREDENTIALS_CHANGED_CODE,
    })
    const n = normalizeClientError(err)
    expect(n.userMessage).toContain('sessão')
    expect(n.userMessage.toLowerCase()).toContain('credenciais')
  })
})
