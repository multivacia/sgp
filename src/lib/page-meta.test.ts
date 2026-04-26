import { describe, expect, it } from 'vitest'
import { pageTitleForPath } from './page-meta'

describe('pageTitleForPath — matrizes', () => {
  it('mantém título clássico para nova matriz', () => {
    expect(pageTitleForPath('/app/matrizes-operacao/nova')).toBe('Nova matriz de operação')
  })

  it('usa título de lista para raiz matrizes', () => {
    expect(pageTitleForPath('/app/matrizes-operacao')).toBe('Matrizes de operação')
  })

  it('não confunde sub-rota /nova com título de lista', () => {
    expect(pageTitleForPath('/app/matrizes-operacao/nova')).not.toBe('Matrizes de operação')
  })
})

describe('pageTitleForPath — chamados', () => {
  it('usa título Chamados', () => {
    expect(pageTitleForPath('/app/chamados')).toBe('Chamados')
  })
})
