/** Capítulo 16 — Cadastros e administração. */
import { h, ok } from '../mock-api.mjs'

export default [
  {
    id: 'cap16-01',
    slug: 'colaboradores-operacionais',
    match: 'Tela Colaboradores operacionais',
    route: '/app/colaboradores',
    scenario: 'Colaboradores operacionais: filtros Buscar, Setor, Papel operacional e Situação; tabela com Colaborador, Setor, Usuário (acesso), Atualizado e Situação; menu de ações da linha de Carlos Demo aberto.',
    async run({ page, shot }) {
      const row = page.getByRole('row').filter({ hasText: 'Carlos Demo' })
      await row.waitFor()
      await row.locator('button[aria-haspopup="menu"]').click()
      await page.getByRole('menuitem', { name: 'Editar…' }).waitFor()
      await shot()
    },
  },
  {
    id: 'cap16-02',
    slug: 'editar-colaborador',
    match: 'Janela Editar colaborador',
    route: '/app/colaboradores',
    viewport: { width: 1440, height: 1500 },
    scenario: 'Editar colaborador de Diana Exemplo: quadros Capacidade operacional e PIN do Modo Fábrica, selo "Aguardando troca" (PIN deve ser trocado no próximo acesso) e botão Redefinir PIN.',
    async run({ page, shot }) {
      const row = page.getByRole('row').filter({ hasText: 'Diana Exemplo' })
      await row.waitFor()
      await row.locator('button[aria-haspopup="menu"]').click()
      await page.getByRole('menuitem', { name: 'Editar…' }).click()
      await page.getByText('Aguardando troca').waitFor()
      await page.getByRole('button', { name: 'Redefinir PIN' }).waitFor()
      await page.waitForLoadState('networkidle')
      const panel = page.getByRole('heading', { name: 'Editar colaborador' }).locator('xpath=ancestor::*[contains(@class,"rounded")][1]')
      await shot(panel, { pad: 12 })
    },
  },
  {
    id: 'cap16-03',
    slug: 'capacidade-operacional',
    match: 'Aba Capacidade operacional',
    route: '/app/configuracoes-operacionais',
    viewport: { width: 1440, height: 1400 },
    scenario: 'Configurações operacionais → aba Capacidade operacional: Capacidade padrão (8 h/dia, Salvar padrão) e tabela Ajustes por colaborador (Eduardo Teste com ajuste individual de 6 h).',
    handlers: () => [h('GET', '/api/v1/admin/operational-settings/sectors', () => ok([]))],
    async run({ page, shot }) {
      await page.getByRole('button', { name: 'Capacidade operacional' }).click()
      await page.getByText('Ajustes por colaborador').waitFor()
      await page.waitForLoadState('networkidle')
      await page.getByText('Eduardo Teste').first().waitFor()
      await shot()
    },
  },
]
