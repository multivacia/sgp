import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LoginBrandPanel } from './LoginBrandPanel'

vi.mock('../shell/FineGridOverlay', () => ({
  FineGridOverlay: () => null,
}))

vi.mock('./HexPatternBackground', () => ({
  HexPatternBackground: () => null,
}))

describe('LoginBrandPanel', () => {
  it('não renderiza menções a ARGOS quando o branding está desligado', () => {
    const html = renderToStaticMarkup(createElement(LoginBrandPanel))

    expect(html).not.toContain('ARGOS')
    expect(html).toContain('Bem-vindo ao SGP')
    expect(html).toContain('focada em profundidade, contraste')
  })
})
