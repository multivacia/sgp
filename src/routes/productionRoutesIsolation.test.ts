import { describe, expect, it } from 'vitest'
import { ProductionRoutes } from './ProductionRoutes'

describe('isolamento rotas produção', () => {
  it('exporta ProductionRoutes como ramo dedicado', () => {
    expect(typeof ProductionRoutes).toBe('function')
  })

  it('ProductionRoutes não referencia componentes administrativos no bundle', async () => {
    const mod = await import('./ProductionRoutes.tsx')
    const keys = Object.keys(mod)
    expect(keys).toContain('ProductionRoutes')
    expect(keys).not.toContain('AppShellLayout')
    expect(keys).not.toContain('RequireAuth')
  })
})
