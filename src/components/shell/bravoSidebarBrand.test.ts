import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BRAVO_HOME_URL } from '../../lib/external-links'
import {
  BravoSidebarBrand,
  bravoSidebarBrandWrapperClass,
  bravoSidebarLogoImageClass,
  bravoSidebarLogoLinkClass,
} from './BravoSidebarBrand'

describe('bravoSidebarBrandWrapperClass', () => {
  it('oculta no rail desktop e mantém no drawer mobile', () => {
    expect(bravoSidebarBrandWrapperClass(false)).toBe('mb-3 flex justify-center')
    expect(bravoSidebarBrandWrapperClass(true)).toBe('mb-3 flex justify-center md:hidden')
  })
})

describe('BravoSidebarBrand', () => {
  it('renderiza link externo seguro para a home da Bravo', () => {
    const html = renderToStaticMarkup(createElement(BravoSidebarBrand, { rail: false }))

    expect(html).toContain(`href="${BRAVO_HOME_URL}"`)
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('aria-label="Abrir home page da Bravo"')
    expect(html).toContain('alt="Bravo"')
    expect(html).toContain('object-contain')
    expect(html).toContain('w-[148px]')
    expect(html).toContain('max-h-[50px]')
    expect(html).toContain('max-w-[142px]')
  })

  it('expõe classes de tamanho do logo para o sidebar expandido', () => {
    expect(bravoSidebarLogoLinkClass()).toContain('w-[148px]')
    expect(bravoSidebarLogoLinkClass()).toContain('min-h-14')
    expect(bravoSidebarLogoImageClass()).toContain('max-w-[142px]')
    expect(bravoSidebarLogoImageClass()).toContain('max-h-[50px]')
  })

  it('aplica ocultação no rail desktop via wrapper', () => {
    const html = renderToStaticMarkup(createElement(BravoSidebarBrand, { rail: true }))

    expect(html).toContain('md:hidden')
  })
})
