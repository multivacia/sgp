/** Capítulo 11 — Minha jornada (sessão de colaborador: Carlos Demo). */
import { h, ok } from '../mock-api.mjs'
import { collaboratorUser } from '../fixtures/common.mjs'
import { journeyPayload } from '../fixtures/journey.mjs'

export default [
  {
    id: 'cap11-01',
    slug: 'periodo-e-filtros',
    match: 'Período e filtros aberto, com o intervalo personalizado',
    route: '/app/jornada?periodPreset=custom&periodFrom=2026-06-15&periodTo=2026-07-01',
    user: collaboratorUser,
    scenario: 'Minha jornada de Carlos Demo com "Período e filtros" aberto, recorte "Personalizado" (15/06–01/07/2026) e a linha Janela visível.',
    handlers: () => [
      h('GET', '/api/v1/my-operational-journey', () =>
        ok(journeyPayload(['col-carlos'], { periodPreset: 'custom', from: '2026-06-15', to: '2026-07-01' })),
      ),
    ],
    async run({ page, shot }) {
      const summary = page.getByText('Período e filtros', { exact: true })
      await summary.waitFor()
      const details = summary.locator('xpath=ancestor::details[1]')
      if (!(await details.evaluate((d) => d.open))) await summary.click()
      await page.getByText('Janela:', { exact: false }).waitFor()
      await shot(details, { pad: 16 })
    },
  },
]
