/** Capítulo 19 — Mensagens, bloqueios e como agir (chamados de suporte). */
import { h, ok } from '../mock-api.mjs'
import { collaboratorUser } from '../fixtures/common.mjs'
import { panelHandlers } from './cap05.mjs'
import { workQueuePayload } from '../fixtures/work-queue.mjs'

/** Falha de rede real (conexão abortada) no carregamento do Painel operacional. */
const networkFailureHandlers = () => [
  h('GET', '/api/v1/conveyors', () => ({ abort: 'connectionrefused' })),
  h('GET', '/api/v1/conveyors/health-analysis/summary', () => ({ abort: 'connectionrefused' })),
  h('POST', '/api/v1/support/tickets', () =>
    ok({
      id: '7b0c2f1e-0000-4000-8000-000000000001',
      code: 'CHM-2026-000123',
      status: 'OPEN',
      notificationSummary: { email: 'SENT', whatsapp: 'SENT' },
      createdAt: '2026-07-01T13:05:00.000Z',
    }),
  ),
]

const TICKETS = [
  ['CHM-2026-000123', 'OPEN', 'ERRO', 'HIGH', 'Painel operacional não carrega', '2026-07-01T13:05:00.000Z', '2026-07-01T13:05:00.000Z'],
  ['CHM-2026-000118', 'IN_PROGRESS', 'BLOQUEIO_OPERACIONAL', 'MEDIUM', 'Não consigo apontar na atividade Revestir painéis', '2026-06-30T18:20:00.000Z', '2026-07-01T11:40:00.000Z'],
  ['CHM-2026-000102', 'RESOLVED', 'DUVIDA', 'LOW', 'Como usar a Alocação em lote', '2026-06-25T14:00:00.000Z', '2026-06-26T09:15:00.000Z'],
].map(([code, status, category, severity, title, createdAt, updatedAt], i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  code,
  status,
  category,
  severity,
  title,
  description: 'Descrição fictícia para o manual.',
  createdByUserId: 'user-ana-demo',
  createdByCollaboratorId: 'col-ana',
  moduleName: null,
  routePath: '/app/backlog',
  context: {},
  requestId: null,
  correlationId: null,
  createdAt,
  updatedAt,
}))

async function triggerNetworkError(page) {
  const dialog = page.getByRole('alertdialog')
  await dialog.waitFor()
  await dialog.getByText('Sistema indisponível no momento').waitFor()
  return dialog
}

async function openFilledTicket(page) {
  const dialog = await triggerNetworkError(page)
  const message = (await dialog.locator('#sgp-blocking-error-desc').innerText()).trim()
  await dialog.getByRole('button', { name: 'Entendi' }).click()
  await page.getByRole('button', { name: 'Abrir chamado' }).first().click()
  const form = page.getByRole('dialog').filter({ hasText: 'Registrar chamado' })
  await form.getByLabel('Categoria').selectOption('ERRO')
  await form.getByLabel('Assunto').fill('Painel operacional não carrega')
  await form.getByLabel('Descrição').fill(`Ao abrir o Painel operacional apareceu a mensagem:\n${message}`)
  await form.getByLabel('Isso está me impedindo de continuar').check()
  return form
}

export default [
  {
    id: 'cap19-01',
    slug: 'barra-superior-chamados',
    match: 'Barra superior da área autenticada com o botão Abrir chamado',
    route: '/app/minha-fila',
    user: collaboratorUser,
    scenario: 'Sessão de colaborador (Carlos Demo): barra superior com "Abrir chamado" (com foco) ao lado de "Apontar horas" e menu lateral no agrupamento Colaborador mostrando o item Chamados.',
    notes: 'O destaque do botão é o foco de teclado real (Tab); recorte da barra superior + menu lateral.',
    handlers: () => [h('GET', '/api/v1/me/work-queue', () => ok(workQueuePayload(), { collaboratorId: 'col-carlos', unavailableReason: null }))],
    async run({ page, shot }) {
      await page.getByRole('link', { name: 'Chamados' }).waitFor()
      await page.getByRole('button', { name: 'Abrir chamado' }).focus()
      await shot(null, { clip: { x: 0, y: 0, width: 1440, height: 560 } })
    },
  },
  {
    id: 'cap19-02',
    slug: 'nao-foi-possivel-continuar',
    match: 'Janela "Não foi possível continuar"',
    route: '/app/backlog',
    scenario: 'Falha de comunicação real (requisição /api/v1/conveyors abortada pelo Playwright) no Painel operacional → janela "Não foi possível continuar" com "Sistema indisponível no momento", mensagem, Código de suporte e Entendi.',
    handlers: networkFailureHandlers,
    allowUnexpected: [],
    async run({ page, shot }) {
      const dialog = await triggerNetworkError(page)
      await shot(dialog.locator('xpath=./div[1]'), { pad: 24 })
    },
  },
  {
    id: 'cap19-03',
    slug: 'abrir-chamado-preenchido',
    match: 'Janela Abrir chamado preenchida',
    route: '/app/backlog',
    scenario: 'Após a falha, "Abrir chamado" preenchido: Categoria Erro, Assunto, Descrição com a mensagem e o Código de suporte copiados, "Isso está me impedindo de continuar" marcado, botões Cancelar e Registrar chamado.',
    handlers: networkFailureHandlers,
    async run({ page, shot }) {
      await openFilledTicket(page)
      const panel = page.getByRole('heading', { name: 'Abrir chamado' }).locator('xpath=ancestor::*[contains(@class,"rounded-2xl")][1]')
      await shot(panel, { pad: 24 })
    },
  },
  {
    id: 'cap19-04',
    slug: 'chamado-registrado',
    match: 'Janela Chamado registrado com sucesso',
    route: '/app/backlog',
    scenario: 'Envio do chamado (POST /support/tickets mockado com sucesso) → janela de sucesso com Protocolo e linhas E-mail e WhatsApp.',
    handlers: networkFailureHandlers,
    async run({ page }) {
      const form = await openFilledTicket(page)
      const posted = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/api/v1/support/tickets'))
      await form.getByRole('button', { name: 'Registrar chamado' }).click()
      await posted
      await page.waitForTimeout(1500)
      const visible = await page.getByText('Protocolo:', { exact: false }).count()
      if (visible > 0) throw new Error('A janela de sucesso apareceu: reavaliar o bloqueio e capturar normalmente.')
      return {
        status: 'BLOCKED',
        notes:
          'DIVERGÊNCIA/DEFEITO: o POST /api/v1/support/tickets é enviado e responde 200 (protocolo CHM-2026-000123), mas a janela "Chamado registrado" nunca aparece. Em src/features/support/OpenSupportTicketDialog.tsx o botão Registrar chamado chama setSuccessResult(result) e em seguida onClose(); o AppHeader fecha o diálogo (open=false) e o componente retorna null logo no início (`if (!open) return null`, ~L38), desmontando também o SupportTicketSuccessDialog renderizado dentro dele (~L141). Recomendação: corrigir o componente (renderizar o diálogo de sucesso fora do retorno antecipado) antes de capturar; até lá, revisar o texto do manual que promete o protocolo na tela.',
      }
    },
  },
  {
    id: 'cap19-05',
    slug: 'chamados',
    match: 'Tela Chamados com o quadro de filtros',
    route: '/app/chamados',
    scenario: 'Tela Chamados: quadro de filtros e lista com Protocolo, Status, Categoria, Severidade, Assunto, Criado em, Última atualização e botões Detalhe e Copiar protocolo.',
    handlers: () => [h('GET', '/api/v1/support/tickets', () => ok({ items: TICKETS, total: TICKETS.length }))],
    async run({ page, shot }) {
      await page.getByText('CHM-2026-000123').first().waitFor()
      await shot()
    },
  },
]
