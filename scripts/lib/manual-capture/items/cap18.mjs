/** Capítulo 18 — Saúde operacional (linhas/totais calculados pelas funções reais do backend). */
import { h, ok } from '../mock-api.mjs'
import { runServerBridge } from '../server/run.mjs'

const data = () => runServerBridge('operational-health')
const handlers = () => [
  h('GET', '/api/v1/collaborators/operational-health-summary', () => ok(data().summary, data().meta)),
  h('GET', /^\/api\/v1\/collaborators\/[^/]+\/operational-health-snapshot$/, ({ url }) =>
    ok(data().snapshots[decodeURIComponent(url.pathname.split('/')[4])]),
  ),
]
const NOTE =
  'Linhas, sinais e totais produzidos por mapSnapshotToOperationalHealthSummaryRow / computeOperationalHealthSummaryTotals reais (server/src) a partir de snapshots fictícios (scripts/lib/manual-capture/server/operational-health.ts).'

export default [
  {
    id: 'cap18-01',
    slug: 'saude-operacional',
    match: 'Tela Saúde operacional dos colaboradores',
    route: '/app/colaboradores/saude-operacional',
    viewport: { width: 1440, height: 1500 },
    scenario: 'Saúde operacional com 6 colaboradores fictícios: filtros (Janela, inativos, Busca local, Estado operacional), seis cartões de resumo e primeiras linhas da tabela (Estado, Risco, Carga pendente, Uso, Sinais).',
    notes: NOTE,
    handlers,
    async run({ page, shot }) {
      await page.getByText('Carlos Demo').first().waitFor()
      await page.waitForLoadState('networkidle')
      const { clipToBottomOf } = await import('../clip.mjs')
      const row = page.getByRole('row').filter({ hasText: 'Diana Exemplo' })
      await shot(null, { clip: await clipToBottomOf(page, row, { withSidebar: false, extra: 8 }) })
    },
  },
  {
    id: 'cap18-02',
    slug: 'painel-de-detalhe',
    match: 'Painel de detalhe aberto à direita',
    route: '/app/colaboradores/saude-operacional',
    viewport: { width: 1440, height: 1100 },
    scenario: 'Detalhe de Carlos Demo aberto à direita: blocos Capacidade, Carga, Apontamentos recentes e Qualidade dos dados, com o aviso fixo no rodapé.',
    notes: `${NOTE} Observação de auditoria: no tema Light Executive o painel usa fundo em degradê escuro e o título do bloco "Carga" fica quase invisível (CollaboratorHealthSnapshotPanel.tsx).`,
    handlers,
    async run({ page, shot }) {
      const row = page.getByRole('row').filter({ hasText: 'Carlos Demo' })
      await row.waitFor()
      await row.getByRole('button').last().click()
      await page.getByText('Qualidade dos dados', { exact: false }).first().waitFor()
      await page.waitForLoadState('networkidle')
      await shot()
    },
  },
]
