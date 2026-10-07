/** Capítulo 9 — Agenda da semana (reaproveita o padrão de scripts/capture-weekly-agenda-mobile.mjs). */
import { planningHandlers } from './cap08.mjs'

const ROUTE = '/app/agenda-semanal?weekStart=2026-06-29'
const BOARD = '[data-testid="weekly-agenda-board"]'

async function openBacklog(page) {
  await page.getByTestId('weekly-agenda-backlog-fab').click()
  await page.getByTestId('weekly-agenda-backlog-drawer').waitFor()
}

export default [
  {
    id: 'cap09-01',
    slug: 'agenda-da-semana',
    match: 'Agenda da Semana — cabeçalho com navegação de semana e selo de estado',
    route: ROUTE,
    scenario: 'Agenda da semana 29/06–03/07/2026: cabeçalho com navegação e selo de estado, faixa de resumo com botão Atenção e grade colaborador × dia preenchida.',
    handlers: planningHandlers(),
    async run({ page, shot }) {
      await page.waitForSelector(BOARD)
      await page.getByTestId('weekly-agenda-attention-chip').waitFor()
      await shot()
    },
  },
  {
    id: 'cap09-02',
    slug: 'arraste-em-andamento',
    match: 'arraste em andamento',
    route: ROUTE,
    scenario: 'Arraste do cartão "Cortar tapetes" do backlog até a célula de Diana Exemplo na quinta 02/07, capturado durante o gesto (faixa "Arrastando…" e célula de destino destacada).',
    handlers: planningHandlers(),
    async run({ page, shot }) {
      await page.waitForSelector(BOARD)
      await openBacklog(page)
      const source = page.getByTestId('weekly-agenda-backlog-card-conv-109-a1')
      const target = page.getByTestId('weekly-agenda-cell-drop-col-diana-2026-07-02')
      await target.scrollIntoViewIfNeeded()
      const s = await source.boundingBox()
      const t = await target.boundingBox()
      await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2)
      await page.mouse.down()
      await page.mouse.move(s.x + s.width / 2 + 12, s.y + s.height / 2 + 12, { steps: 4 })
      await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 24 })
      await page.getByTestId('weekly-agenda-placing-banner').waitFor()
      await page.getByTestId('weekly-agenda-drag-overlay').waitFor()
      await page.waitForTimeout(300)
      await shot(null, { settle: 50 })
      await page.mouse.up()
    },
  },
  {
    id: 'cap09-03',
    slug: 'gaveta-backlog-operacional',
    match: 'gaveta "Backlog operacional" aberta',
    route: ROUTE,
    scenario: 'Botão "+ Backlog" → gaveta Backlog operacional com o convite "Alocar tudo em lote" (4 itens) e os cartões de atividade.',
    handlers: planningHandlers(),
    async run({ page, shot }) {
      await page.waitForSelector(BOARD)
      await openBacklog(page)
      await page.getByTestId('weekly-agenda-backlog-batch-invite').waitFor()
      await shot()
    },
  },
  {
    id: 'cap09-04',
    slug: 'alocacao-em-lote',
    match: 'tela "Alocação em lote"',
    route: ROUTE,
    scenario: 'Convite do backlog → "Alocar tudo em lote": tela de alocação com progresso, bloco Sugestão e botões de atribuir, escolher outra pessoa e deixar para depois.',
    handlers: planningHandlers(),
    async run({ page, shot }) {
      await page.waitForSelector(BOARD)
      await openBacklog(page)
      await page.getByTestId('weekly-agenda-backlog-batch-start').click()
      await page.getByTestId('weekly-agenda-batch-queue-overlay').waitFor()
      await page.getByTestId('weekly-agenda-batch-queue-item-title').waitFor()
      await shot()
    },
  },
  {
    id: 'cap09-05',
    slug: 'gaveta-itens-de-atencao',
    match: 'gaveta "Itens de atenção"',
    route: ROUTE,
    scenario: 'Botão Atenção → gaveta Itens de atenção com Pendências de sincronização (1 item divergente, botão Aplicar plano da esteira) e Fora do planejado (1 apontamento).',
    handlers: planningHandlers(),
    async run({ page, shot }) {
      await page.waitForSelector(BOARD)
      await page.getByTestId('weekly-agenda-attention-chip').click()
      await page.getByTestId('weekly-agenda-attention-drawer').waitFor()
      await page.getByText('Fora do planejado').first().waitFor()
      await shot()
    },
  },
]
