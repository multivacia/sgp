/** Capítulo 14 — Evolução das Esteiras (payload gerado pelo serviço real do backend sobre fixtures). */
import { h, ok } from '../mock-api.mjs'
import { runServerBridge } from '../server/run.mjs'
import { sidebarRight, unionClip } from '../clip.mjs'

const handlers = () => [
  h('GET', '/api/v1/management/conveyor-progress', () => ok(runServerBridge('conveyor-progress'))),
]

const NOTE = 'Payload de /management/conveyor-progress produzido pelo serviceConveyorProgress real (server/src) sobre pool stub com fixtures (scripts/lib/manual-capture/server/conveyor-progress.ts).'

export default [
  {
    id: 'cap14-01',
    slug: 'evolucao-das-esteiras',
    match: 'Tela Evolução das Esteiras completa',
    route: '/app/gestao/evolucao-esteiras',
    scenario: 'Evolução das Esteiras com 4 esteiras: faixa de filtros com Gerar PDF, linha Resumo geral e primeiras linhas da tabela (Previsto, Realizado, Falta, Excedente, Evolução, Eficiência).',
    notes: NOTE,
    handlers,
    async run({ page, shot }) {
      await page.getByText('Resumo geral').first().waitFor()
      await page.getByText('ET-0101').first().waitFor()
      await shot()
    },
  },
  {
    id: 'cap14-02',
    slug: 'atividade-dispensada',
    match: 'Linha de atividade com o selo Dispensada',
    route: '/app/gestao/evolucao-esteiras',
    viewport: { width: 1440, height: 1600 },
    scenario: 'ET-0101 → Bancos dianteiros → Tapeçaria expandidos: "Aplicar manta acústica" Dispensada (Previsto 45 min, Falta e Evolução zerados, Eficiência "Sem tempo previsto") e a linha do setor acima com o previsto reduzido.',
    notes: NOTE,
    handlers,
    async run({ page, shot }) {
      await page.getByRole('button', { name: /Expandir .*Reforma de bancos/ }).first().click()
      await page.getByRole('button', { name: 'Expandir Bancos dianteiros' }).click()
      await page.getByRole('button', { name: 'Expandir Tapeçaria' }).first().click()
      const row = page.getByText('Aplicar manta acústica').first()
      await row.waitFor()
      const sector = page.getByRole('button', { name: 'Recolher Tapeçaria' }).first().locator('xpath=ancestor::tr[1]')
      const act = row.locator('xpath=ancestor::tr[1]')
      await sector.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      const header = page.locator('thead').first()
      const clip = await unionClip([sector, act], 6)
      const left = await sidebarRight(page)
      const hb = await header.boundingBox()
      await shot(null, { clip: { x: left + 8, y: clip.y, width: 1440 - left - 16, height: clip.height } })
      void hb
    },
  },
]
