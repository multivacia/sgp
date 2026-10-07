/** Capítulo 10 — Minha fila (sessão de colaborador: Carlos Demo). */
import { h, ok } from '../mock-api.mjs'
import { collaboratorUser } from '../fixtures/common.mjs'
import { workQueuePayload } from '../fixtures/work-queue.mjs'
import { JUSTIFICATIONS } from '../fixtures/time-entries.mjs'

const handlers = (opts) => () => [
  h('GET', '/api/v1/me/work-queue', () => ok(workQueuePayload(opts), { collaboratorId: 'col-carlos', unavailableReason: null })),
  h('GET', '/api/v1/me/time-entry-justifications', () => ok(JUSTIFICATIONS)),
  h('GET', '/api/v1/me/time-entry-candidates', () => ok([], { collaboratorId: 'col-carlos', unavailableReason: null })),
  h('GET', '/api/v1/me/extra-time-entry-descriptions', () => ok([])),
  h('GET', '/api/v1/me/extra-time-entries', () => ok([], { total: 0 })),
]

const base = {
  route: '/app/minha-fila',
  user: collaboratorUser,
}

function card(page, title) {
  return page.getByRole('heading', { name: title }).locator('xpath=ancestor::li[1]')
}

export default [
  {
    ...base,
    id: 'cap10-01',
    slug: 'minha-fila',
    match: 'tela Minha fila com o painel de números',
    scenario: 'Colaborador Carlos Demo em 01/07/2026: painel de números, seletor de data e grupos Atrasadas, Hoje e Concluídas.',
    viewport: { width: 1440, height: 1900 },
    handlers: handlers(),
    async run({ page, shot }) {
      await page.getByRole('heading', { name: 'Desmontar bancos' }).waitFor()
      const { clipToBottomOf } = await import('../clip.mjs')
      await shot(null, { clip: await clipToBottomOf(page, card(page, 'Desmontar bancos'), { withSidebar: false }) })
    },
  },
  {
    ...base,
    id: 'cap10-02',
    slug: 'cartao-proxima-recomendada',
    match: 'cartão da fila com o selo Próxima atividade recomendada',
    scenario: 'Cartão "Desmontar painéis" com o selo de próxima atividade recomendada, tempo previsto e botões Apontar horas e Abrir Esteira.',
    handlers: handlers(),
    async run({ page, shot }) {
      const c = card(page, 'Desmontar painéis')
      await c.waitFor()
      await shot(c, { pad: 12 })
    },
  },
  {
    ...base,
    id: 'cap10-03',
    slug: 'faixa-acima-da-capacidade',
    match: 'faixa amarela de planejamento acima da capacidade',
    scenario: 'Dia com 10 h planejadas para 8 h de capacidade: faixa amarela acima do grupo Atrasadas.',
    handlers: handlers({ overload: true }),
    async run({ page, shot }) {
      const strip = page.getByText('Planejamento acima da capacidade do dia', { exact: false })
      await strip.waitFor()
      const { unionClip, sidebarRight } = await import('../clip.mjs')
      const firstCard = card(page, 'Recuperar espuma')
      const clip = await unionClip([strip, firstCard], 16)
      const left = await sidebarRight(page)
      await shot(null, { clip: { ...clip, x: left + 8, width: page.viewportSize().width - left - 16 } })
    },
  },
  {
    ...base,
    id: 'cap10-04',
    slug: 'execucao-rapida',
    match: 'gaveta Execução rápida aberta a partir do cartão',
    scenario: 'Botão Apontar horas do cartão "Desmontar painéis" → gaveta Execução rápida com data, tempo, quantidade e Salvar apontamento e concluir atividade.',
    viewport: { width: 1440, height: 1300 },
    handlers: handlers(),
    async run({ page, shot }) {
      await card(page, 'Desmontar painéis').getByRole('button', { name: 'Apontar horas' }).click()
      await page.getByRole('button', { name: 'Salvar apontamento e concluir atividade' }).waitFor()
      await page.getByLabel(/Tempo \(minutos\)/i).fill('180')
      await shot(null, { clip: { x: 0, y: 0, width: 1440, height: 930 } })
    },
  },
]
