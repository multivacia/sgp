/** Capítulo 6 — Esteiras. */
import { h, ok } from '../mock-api.mjs'
import { clipToBottomOf, sidebarRight, unionClip } from '../clip.mjs'
import {
  conveyorDetail,
  nodeWorkload,
  operationalEvents,
  stepAssignees,
  stepTimeEntries,
} from '../fixtures/conveyors.mjs'

/** Handlers do detalhe GET /conveyors/:id e chamadas satélite (plano, carga, eventos, alocações). */
export const detailHandlers = (overrides = {}) => () => {
  const d = conveyorDetail(overrides)
  const id = d.id
  const base = `/api/v1/conveyors/${id}`
  return [
    h('GET', base, () => ok(d)),
    h('GET', `${base}/operational-plan`, () => ok(null, { hasPlan: false })),
    h('GET', `${base}/node-workload`, () => ok(nodeWorkload(d))),
    h('GET', `${base}/operational-events`, () => ok(operationalEvents(d), { limit: 50 })),
    h('GET', new RegExp(`^${base}/steps/([^/]+)/assignees$`), ({ url }) => ok(stepAssignees(d, url.pathname.split('/')[6]))),
    h('GET', new RegExp(`^${base}/steps/([^/]+)/sequence-check$`), () =>
      ok({
        targetFound: true,
        isOutOfSequence: false,
        hasPreviousPendingStep: false,
        requiresJustification: false,
        previousOpenCount: 0,
        previousOpenActivities: [],
        allPreviousOpenActivities: [],
        awaitingPreviousActivities: [],
      }),
    ),
    h('GET', new RegExp(`^${base}/steps/([^/]+)/time-entries$`), ({ url }) => ok(stepTimeEntries(d, url.pathname.split('/')[6]))),
  ]
}

const ITEMS_EXTRA = []

const structureHeading = (page) => page.getByText('Estrutura operacional', { exact: true })

const MAIN = [
  {
    id: 'cap06-01',
    slug: 'detalhe-esteira',
    match: 'detalhe de uma esteira em andamento, com cabeçalho',
    route: '/app/esteiras/conv-101',
    viewport: { width: 1440, height: 1100 },
    scenario: 'Detalhe da esteira ET-0101 (Em andamento): cabeçalho, selo de situação, resumo operacional e dados básicos.',
    notes:
      'DIVERGÊNCIA PARCIAL: no código atual (EsteiraDetalhePage.tsx) o bloco Estrutura operacional fica abaixo de Dados básicos, Pendência e concentração, Plano Operacional e Eventos operacionais — não aparece junto do resumo numa mesma tela. A imagem cobre cabeçalho/situação/resumo/dados básicos; a estrutura está em cap06-02.',
    handlers: detailHandlers(),
    async run({ page, shot }) {
      await structureHeading(page).waitFor()
      const dados = page.getByText('Dados básicos', { exact: true }).locator('xpath=ancestor::section[1]')
      await shot(null, { clip: await clipToBottomOf(page, dados, { withSidebar: false }) })
    },
  },
  {
    id: 'cap06-02',
    slug: 'estrutura-operacional',
    match: 'bloco Estrutura operacional do detalhe',
    route: '/app/esteiras/conv-101',
    viewport: { width: 1440, height: 3200 },
    scenario: 'Bloco Estrutura operacional: Tarefa 1 → Setor 1 (Tapeçaria) → atividades numeradas com tempo previsto.',
    notes:
      'Observação de auditoria: cada atividade exibe abaixo o painel "STEP · Equipe e apontamentos" (StepAnaliticoPanel), com o termo técnico STEP visível ao usuário; o manual não menciona esse painel.',
    handlers: detailHandlers(),
    async run({ page, shot }) {
      await structureHeading(page).waitFor()
      const section = structureHeading(page).locator('xpath=ancestor::section[1]')
      await section.evaluate((el) => el.scrollIntoView({ block: 'start' }))
      const lastOfArea1 = page.locator('#sgp-step-step-5')
      const a = await section.boundingBox()
      const b = await lastOfArea1.boundingBox()
      await shot(null, { clip: { x: a.x - 8, y: a.y - 8, width: a.width + 16, height: b.y + b.height - a.y + 24 } })
    },
  },
  {
    id: 'cap06-04',
    slug: 'cabecalho-acoes-status',
    match: 'cabeçalho do detalhe de uma esteira Em andamento',
    route: '/app/esteiras/conv-101',
    scenario: 'Cabeçalho da esteira Em andamento com selo de situação e botões Finalizar esteira, Cancelar esteira, Voltar para planejamento e Voltar para backlog.',
    handlers: detailHandlers(),
    async run({ page, shot }) {
      const btn = page.getByRole('button', { name: 'Voltar para backlog' })
      await btn.waitFor()
      const header = btn.locator('xpath=ancestor::*[contains(@class,"rounded-2xl")][1]')
      await shot(header, { pad: 12 })
    },
  },
  {
    id: 'cap06-05',
    slug: 'atividade-dispensada-e-concluida',
    match: 'duas linhas de atividade lado a lado',
    route: '/app/esteiras/conv-101',
    viewport: { width: 1440, height: 3200 },
    scenario: 'Na estrutura: "Remover revestimento antigo" concluída (botão Reabrir atividade) e "Aplicar manta acústica" Dispensada (botão Restaurar).',
    notes: 'As linhas aparecem empilhadas (layout real da lista); o recorte mostra as duas linhas na mesma imagem.',
    handlers: detailHandlers(),
    async run({ page, shot }) {
      await page.getByRole('button', { name: 'Restaurar' }).waitFor()
      await page.locator('#sgp-step-step-2').evaluate((el) => el.scrollIntoView({ block: 'start' }))
      const clip = await unionClip([page.locator('#sgp-step-step-2'), page.locator('#sgp-step-step-4')], 12)
      await shot(null, { clip })
    },
  },
]

ITEMS_EXTRA.push(
  {
    id: 'cap06-03',
    slug: 'nova-esteira-estrutura',
    match: 'passo Estrutura da tela Nova esteira',
    route: '/app/nova-esteira',
    scenario: 'Nova esteira no passo Estrutura: catálogo "Bases e extras" à esquerda (matrizes fictícias) e a esteira em montagem à direita com a base "Reforma de bancos" aplicada.',
    async run({ page, shot }) {
      await page.getByTitle('Ir para: Estrutura').click()
      await page.getByRole('heading', { name: 'Sua esteira em montagem' }).waitFor()
      await page.getByRole('button', { name: 'Usar esta base' }).first().click()
      await page.waitForLoadState('networkidle')
      await page.getByText('Base já incluída nesta matriz.').waitFor()
      await shot()
    },
  },
  {
    id: 'cap06-06',
    slug: 'incluir-novo-item',
    match: 'janela Incluir novo item',
    route: '/app/esteiras/conv-101/alterar',
    scenario: 'Alterar esteira ET-0101 → aba Estrutura → botão "Incluir novo item": janela com Motivo da inclusão e os quatro cartões de modo.',
    handlers: detailHandlers(),
    async run({ page, shot }) {
      await page.getByRole('button', { name: /Estrutura/ }).first().click()
      await page.getByRole('button', { name: 'Incluir novo item' }).click()
      const panel = page.getByTestId('late-structure-append-panel')
      await panel.waitFor()
      await panel.locator('textarea').first().fill('Cliente solicitou incluir os apoios de cabeça.')
      await page.waitForLoadState('networkidle')
      await shot(null, { clip: { x: 0, y: 0, width: 1440, height: 960 } })
    },
  },
)

export default [...MAIN, ...ITEMS_EXTRA].sort((a, b) => a.id.localeCompare(b.id))
