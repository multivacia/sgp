/** Capítulo 12 — Jornada gerencial (Jornada por colaborador). */
import { h, ok } from '../mock-api.mjs'
import { journeyPayload } from '../fixtures/journey.mjs'
import { sidebarRight, unionClip } from '../clip.mjs'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { runServerBridge } from '../server/run.mjs'
import { renderXlsxSheets, xlsxRenderAvailable } from '../xlsx-render.mjs'

const IDS = ['col-carlos', 'col-bruno', 'col-diana']
const ROUTE = `/app/gestao/jornada-colaborador?colaboradorIds=${IDS.join(',')}`

export const journeyHandlers = () => [
  h('GET', '/api/v1/collaborators/operational-journey', ({ query }) =>
    ok(journeyPayload((query.get('collaboratorIds') ?? IDS.join(',')).split(','))),
  ),
]

export default [
  {
    id: 'cap12-01',
    slug: 'quadro-de-consulta',
    match: 'Quadro de consulta com três colaboradores selecionados',
    route: ROUTE,
    scenario: 'Três colaboradores (Carlos Demo, Bruno Exemplo, Diana Exemplo) na faixa de iniciais, popover de busca aberto e a linha de confirmação dos nomes.',
    handlers: journeyHandlers,
    async run({ page, shot }) {
      await page.getByText('3 colaboradores:', { exact: false }).waitFor()
      await page.getByRole('button', { name: 'Adicionar colaborador à jornada' }).click()
      await page.waitForTimeout(400)
      const exp = await page.getByRole('button', { name: 'Exportar Excel' }).boundingBox()
      const left = await sidebarRight(page)
      await shot(null, { clip: { x: left, y: 70, width: 1440 - left, height: exp.y + exp.height + 40 - 70 } })
    },
    notes:
      'Observação de auditoria: o popover de busca abre sobre a linha de confirmação dos nomes ("3 colaboradores: …"), que fica parcialmente encoberta enquanto o popover está aberto (comportamento real).',
  },
  {
    id: 'cap12-02',
    slug: 'resumo-do-escopo',
    match: 'Resumo do escopo com os quatro números',
    route: ROUTE,
    viewport: { width: 1440, height: 1800 },
    scenario: 'Escopo de 3 colaboradores: quatro números (alocações, previsto estrutural, minutos apontados no período e acumulado), painel Cobertura de tempo e painel Pressão de atraso.',
    notes:
      'Observação: a tela não tem um título literal "Resumo do escopo"; entre os quatro números e os painéis de Cobertura/Pressão aparece também o bloco "Extra esteira (período)".',
    handlers: journeyHandlers,
    async run({ page, shot }) {
      const first = page.getByText('Alocações (escopo)', { exact: true })
      await first.waitFor()
      const last = page.getByText('Contagem por situação', { exact: false })
      await first.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.mouse.move(0, 0)
      const left = await sidebarRight(page)
      const clip = await unionClip([first, last], 40)
      await shot(null, { clip: { x: left + 8, y: clip.y, width: 1440 - left - 16, height: clip.height } })
    },
  },
  {
    id: 'cap12-03',
    slug: 'exportacao-aba-resumo',
    match: 'Aba Resumo da exportação',
    route: null,
    scenario:
      'Planilha REAL de "Exportar Excel" da Jornada por colaborador (buildOperationalJourneyExportWorkbookBuffer do backend) para Carlos Demo, Bruno Exemplo e Diana Exemplo (25/06–01/07/2026): aba Resumo com uma linha por colaborador e a linha Total geral destacada.',
    notes: 'Renderização da aba Resumo por LibreOffice headless (não é captura do Excel). O .xlsx gerado está preservado como evidência (extraFiles).',
    extraFiles: ['cap12-03-jornada-export.xlsx'],
    async run({ outDir }) {
      if (!xlsxRenderAvailable()) return { status: 'REQUIRES_EXTERNAL_VIEWER', notes: 'LibreOffice/pdftoppm indisponíveis; .xlsx preservado.' }
      const xlsx = path.join(outDir, 'cap12-03-jornada-export.xlsx')
      runServerBridge('journey-export', [xlsx])
      const [resumo] = await renderXlsxSheets(xlsx, { dpi: 110 })
      await writeFile(path.join(outDir, 'cap12-03-exportacao-aba-resumo.png'), resumo)
    },
  },
]
