/** Capítulo 8 — Planejamento semanal. */
import { h, ok } from '../mock-api.mjs'
import { clipToBottomOf } from '../clip.mjs'
import path from 'node:path'
import { composePanels } from '../compose.mjs'
import { runServerBridge } from '../server/run.mjs'
import { renderXlsxSheets, xlsxRenderAvailable } from '../xlsx-render.mjs'
import { backlogPayload, factoryIntakePayload, weekPayload } from '../fixtures/planning.mjs'

export const planningHandlers = (weekOpts = {}) => () => [
  h('GET', '/api/v1/operational-planning/week', () => ok(weekPayload(weekOpts))),
  h('GET', '/api/v1/operational-planning/backlog', () => ok(backlogPayload())),
  h('GET', '/api/v1/operational-planning/factory-intake', () => ok(factoryIntakePayload())),
  h('GET', '/api/v1/operational-planning/week-activity', () => ok({ data: [], meta: { count: 0, hasMore: false } })),
]

const MAIN = [
  {
    id: 'cap08-01',
    slug: 'planejamento-da-semana',
    match: 'Planejamento da Semana — cabeçalho com a navegação de semana',
    route: '/app/planejamento-semanal?weekStart=2026-06-29',
    scenario: 'Semana 29/06–03/07/2026 com revisão em planejamento (plano publicado ativo + alterações não publicadas) e quadro colaborador × dia preenchido.',
    viewport: { width: 1440, height: 2600 },
    notes: 'Viewport alto para incluir cabeçalho e quadro na mesma imagem; recorte sem o menu lateral.',
    handlers: planningHandlers(),
    async run({ page, shot }) {
      const board = page.getByTestId('planning-collaborators-column')
      await board.waitFor()
      await page.getByText('Desmontar painéis').first().waitFor()
      await shot(null, { clip: await clipToBottomOf(page, board, { withSidebar: false }) })
    },
  },
]

async function openAddModal(page) {
  const card = page.getByText('Revestir assentos').first()
  await card.waitFor()
  const backlogCard = page
    .getByTestId('planning-backlog-scroll-area')
    .getByText('Cortar tapetes', { exact: true })
    .locator('xpath=ancestor::*[.//button[normalize-space()="Adicionar ao plano"]][1]')
  await backlogCard.getByRole('button', { name: 'Adicionar ao plano' }).click()
  const dialog = page.getByRole('heading', { name: 'Adicionar ao plano' }).locator('xpath=ancestor::*[contains(@class,"rounded")][1]')
  await dialog.waitFor()
  return dialog
}

MAIN.push(
  {
    id: 'cap08-02',
    slug: 'capacidade-diaria-ultrapassada',
    match: 'Aviso "Capacidade diária ultrapassada"',
    route: '/app/planejamento-semanal?weekStart=2026-06-29',
    scenario:
      'Adicionar ao plano "Cortar tapetes" (90 min pendentes) para Carlos Demo na quarta 01/07, que já tem 7 h planejadas (capacidade 8 h) → aviso Capacidade diária ultrapassada.',
    handlers: planningHandlers(),
    async run({ page, shot }) {
      const dialog = await openAddModal(page)
      await page.getByRole('button', { name: 'Carlos Demo', exact: true }).click()
      await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
      await page.getByText('Capacidade diária ultrapassada').waitFor()
      await shot()
    },
  },
  {
    id: 'cap08-03',
    slug: 'adicionar-ao-plano',
    match: 'Janela "Adicionar ao plano"',
    route: '/app/planejamento-semanal?weekStart=2026-06-29',
    scenario:
      'Janela Adicionar ao plano para "Cortar tapetes" (ET-0109): atalhos "Cadastrados na atividade" (Carlos Demo, Diana Exemplo), campo Dia e Minutos planejados com o tempo restante (90 min).',
    notes:
      'Observação de auditoria: no tema Light Executive a janela é renderizada com fundo escuro e o título "Adicionar ao plano" fica com contraste muito baixo (OperationalPlanningPage.tsx, modal ~L2275).',
    handlers: planningHandlers(),
    async run({ page, shot }) {
      const dialog = await openAddModal(page)
      await page.getByRole('button', { name: 'Diana Exemplo', exact: true }).click()
      await shot()
    },
  },
)

MAIN.push({
  id: 'cap08-04',
  slug: 'paineis-diagnostico',
  match: 'Os três painéis de diagnóstico lado a lado',
  route: '/app/planejamento-semanal?weekStart=2026-06-29',
  scenario: 'Painéis Esteiras aguardando encaixe, Pendências de sincronização e Fora do planejado.',
  staticStatus: 'BLOCKED',
  notes:
    'DIVERGÊNCIA: no código atual os três painéis não são exibidos no Planejamento. Eles ficam em abas secundárias do painel lateral que estão desligadas por flag: SHOW_PLANNING_SECONDARY_TABS = false (src/features/operational-planning/planningUiFlags.ts) e activeSidePanelTab é forçado para "backlog" (OperationalPlanningPage.tsx ~L1572). Mesmo quando ativos, são abas (um painel por vez), não lado a lado. Pendências de sincronização e Fora do planejado estão acessíveis na gaveta "Itens de atenção" da Agenda da semana (ver cap09-05); "Esteiras aguardando encaixe" (FactoryIntakePanel) não tem acesso visível. O cartão "Pendências de sincronização" do Planejamento ainda diz "revise na aba Pendências", aba que não aparece. Recomendação: revisar o texto do manual (cap. 8) ou reativar a flag.',
  async run() {},
})

MAIN.push({
  id: 'cap08-05',
  slug: 'exportacoes-comparadas',
  match: 'As duas exportações comparadas',
  route: null,
  scenario:
    'Planilhas REAIS geradas pelos builders do backend (operational-planning.export.ts e operational-planning.weekly-view.export.ts) para a semana fictícia 29/06–03/07/2026; renderizadas localmente e comparadas: "Planejamento" (uma linha por atividade) e "Visão semanal" (matriz colaborador × dia).',
  notes:
    'Imagem composta de duas renderizações por LibreOffice headless (não é captura do Excel). Os .xlsx gerados estão preservados como evidência (extraFiles).',
  extraFiles: ['cap08-05-planejamento.xlsx', 'cap08-05-visao-semanal.xlsx'],
  async run({ context, outDir }) {
    if (!xlsxRenderAvailable()) return { status: 'REQUIRES_EXTERNAL_VIEWER', notes: 'LibreOffice/pdftoppm indisponíveis; .xlsx preservados.' }
    const planning = path.join(outDir, 'cap08-05-planejamento.xlsx')
    const weekly = path.join(outDir, 'cap08-05-visao-semanal.xlsx')
    runServerBridge('planning-exports', [planning, weekly])
    const [p1] = await renderXlsxSheets(planning, { dpi: 80 })
    const [w1] = await renderXlsxSheets(weekly, { dpi: 110 })
    await composePanels(context, {
      panels: [
        { caption: 'Exportar Excel — aba "Planejamento" (uma linha por atividade)', buffer: p1 },
        { caption: 'Exportar visão semanal — aba "Visão semanal" (colaborador × dia)', buffer: w1 },
      ],
      columns: 1,
      width: 1800,
      file: path.join(outDir, 'cap08-05-exportacoes-comparadas.png'),
    })
  },
})

export default MAIN
