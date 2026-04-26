import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../lib/api/apiErrors'
import { isNetworkOrBackendUnavailableError } from '../../../services/collaborators/collaboratorsServiceFactory'

/**
 * O submit em modo `auto` usa a mesma política que o restante do projeto:
 * fallback local só quando `isNetworkOrBackendUnavailableError` é verdadeiro.
 */
describe('Nova Esteira — política de rede para modo auto', () => {
  it('TypeError (rede) permite fallback para mock local com UX explícita', () => {
    expect(isNetworkOrBackendUnavailableError(new TypeError('Failed to fetch'))).toBe(
      true,
    )
  })

  it('422 de validação não dispara fallback — deve mostrar erro ao utilizador', () => {
    expect(
      isNetworkOrBackendUnavailableError(
        new ApiError('Dados inválidos.', 422, { code: 'VALIDATION_ERROR' }),
      ),
    ).toBe(false)
  })

  it('5xx de aplicação não dispara fallback (contrário de 502/503/504 de proxy)', () => {
    expect(isNetworkOrBackendUnavailableError(new ApiError('x', 500))).toBe(false)
  })

  it.each([502, 503, 504] as const)(
    'status %s (proxy/backend) dispara fallback como no restante do projeto',
    (status) => {
      expect(isNetworkOrBackendUnavailableError(new ApiError('x', status))).toBe(
        true,
      )
    },
  )
})
