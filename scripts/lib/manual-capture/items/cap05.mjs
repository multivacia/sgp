/** Capítulo 5 — Painel operacional. */
import path from 'node:path'
import { h, ok } from '../mock-api.mjs'
import { composePanels } from '../compose.mjs'
import { CONVEYOR_LIST } from '../fixtures/conveyors.mjs'

export const panelHandlers = () => [
  h('GET', '/api/v1/conveyors', () => ok(CONVEYOR_LIST)),
  h('GET', '/api/v1/conveyors/health-analysis/summary', () => ok([], { limit: 500 })),
]

async function openPanel(page, baseUrl, bucketLabel) {
  await page.goto(`${baseUrl}/app/backlog`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: `Filtrar por ${bucketLabel}` }).click()
  await page.waitForLoadState('networkidle')
}

export default [
  {
    id: 'cap05-01',
    slug: 'painel-operacional-filtro-ativo',
    match: 'Painel operacional com os seis cartões no alto',
    route: '/app/backlog',
    scenario: 'Cartão "Em execução" ativo como filtro; lista mostra esteiras com Situação "Em andamento" e "A iniciar" (rótulos diferentes do cartão).',
    handlers: panelHandlers,
    async run({ page, shot, baseUrl }) {
      await openPanel(page, baseUrl, 'Em execução')
      await page.getByText('ET-0102').first().waitFor()
      await shot(null, { fullPage: true })
    },
  },
  {
    id: 'cap05-02',
    slug: 'esteira-antes-depois-prazo',
    match: 'Mesma esteira em dois momentos',
    route: null,
    scenario:
      'Composição de duas capturas reais da mesma esteira ET-0103 (prazo 06/07/2026): relógio em 01/07 (contada em Em execução) e em 08/07 (contada em Em atraso, ausente de Em execução).',
    notes: 'Imagem composta (duas capturas reais lado a lado via HTML local), conforme regra de comparação.',
    handlers: panelHandlers,
    async run({ context, baseUrl, outDir }) {
      const panels = []
      for (const [when, bucket, caption] of [
        ['2026-07-01T13:00:00.000Z', 'Em execução', 'Antes do prazo (01/07/2026) — ET-0103 contada em Em execução'],
        ['2026-07-08T13:00:00.000Z', 'Em atraso', 'Depois do prazo (08/07/2026) — ET-0103 contada em Em atraso'],
      ]) {
        const p = await context.newPage()
        await p.setViewportSize({ width: 1440, height: 1500 })
        await p.clock.setFixedTime(new Date(when))
        await openPanel(p, baseUrl, bucket)
        await p.getByText('ET-0103').first().waitFor()
        const cards = p.locator('.sgp-kpi-card').first().locator('..')
        await cards.evaluate((el) => el.scrollIntoView({ block: 'start' }))
        await p.mouse.move(0, 0)
        const table = p.locator('table').first()
        const a = await cards.boundingBox()
        const b = await table.boundingBox()
        const buffer = await p.screenshot({
          clip: { x: a.x - 12, y: Math.max(0, a.y - 12), width: a.width + 24, height: b.y + b.height - a.y + 24 },
        })
        panels.push({ caption, buffer })
        await p.close()
      }
      await composePanels(context, {
        panels,
        columns: 1,
        width: 1300,
        file: path.join(outDir, 'cap05-02-esteira-antes-depois-prazo.png'),
      })
    },
  },
]
