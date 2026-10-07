/** Capítulo 13 — Modo Fábrica (totem /app/kiosk), sessão de produção mockada. */
import { fail, h, ok } from '../mock-api.mjs'
import { JUSTIFICATIONS, TIME_ENTRY_CANDIDATES } from '../fixtures/time-entries.mjs'
import { KIOSK_COLLABORATORS, productionWorkQueue } from '../fixtures/production.mjs'

const carlos = KIOSK_COLLABORATORS[0]

const kioskHandlers = (opts) => () => [
  h('GET', '/api/v1/production/collaborators', () => ok({ items: KIOSK_COLLABORATORS })),
  h('GET', '/api/v1/production/auth/session', () => fail(401, 'PRODUCTION_SESSION_REQUIRED', 'Sessão de produção não encontrada.')),
  h('POST', '/api/v1/production/auth/login', () => ok({ collaborator: carlos, scope: 'PRODUCTION_MODE', status: 'AUTHENTICATED' })),
  h('GET', '/api/v1/production/me/work-queue', () => ok(productionWorkQueue(opts))),
  h('GET', '/api/v1/production/time-entry-justifications', () => ok(JUSTIFICATIONS)),
  h('GET', '/api/v1/production/me/time-entry-candidates', () =>
    ok(
      TIME_ENTRY_CANDIDATES.filter((c) => !c.isAssignedToMe),
      { collaboratorId: 'col-carlos', unavailableReason: null },
    ),
  ),
]

const base = { route: '/app/kiosk', user: null, viewport: { width: 1280, height: 800 } }
const VP_NOTE = 'Viewport 1280x800 (totem em paisagem).'

async function login(page) {
  await page.getByText('Carlos Demo', { exact: true }).click()
  for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click()
  await page.getByText('Recuperar espuma').first().waitFor()
}

export default [
  {
    ...base,
    id: 'cap13-01',
    slug: 'totem-quem-e-voce',
    match: 'Tela inicial do totem',
    scenario: 'Totem: cabeçalho SGP · Modo Fábrica, "Quem é você?", busca por nome e grade de cartões, com Fernanda Teste (acesso desativado) apagada.',
    notes: VP_NOTE,
    handlers: kioskHandlers(),
    async run({ page, shot }) {
      await page.getByText('Carlos Demo', { exact: true }).waitFor()
      await shot(null, { clip: { x: 0, y: 0, width: 1000, height: 300 } })
    },
  },
  {
    ...base,
    id: 'cap13-02',
    slug: 'teclado-de-pin',
    match: 'Teclado de PIN',
    scenario: 'Carlos Demo selecionado → teclado de PIN com dois dígitos já digitados.',
    notes: `${VP_NOTE} Observação de auditoria: no tema Light Executive os dois pontos ainda não preenchidos ficam praticamente invisíveis (KioskPinPad.tsx); o avatar exibe as iniciais quando não há foto.`,
    handlers: kioskHandlers(),
    async run({ page, shot }) {
      await page.getByText('Carlos Demo', { exact: true }).click()
      await page.getByRole('button', { name: '1', exact: true }).click()
      await page.getByRole('button', { name: '2', exact: true }).click()
      await shot()
    },
  },
  {
    ...base,
    id: 'cap13-03',
    slug: 'cartao-atividade-carrossel',
    match: 'Cartão de atividade no modo carrossel',
    scenario: 'Após o PIN: carrossel com "Recuperar espuma" (Realizado 1 h · Planejado 2 h), percentual do previsto, botões de tempo com 30 min selecionado, evolução da sessão e "Concluir atividade ao registrar".',
    notes: VP_NOTE,
    handlers: kioskHandlers(),
    async run({ page, shot }) {
      await login(page)
      await page.getByRole('button', { name: '30 min', exact: true }).first().click()
      await shot()
    },
  },
  {
    ...base,
    id: 'cap13-04',
    slug: 'tempo-acima-do-previsto',
    match: 'Cartão com a faixa de tempo acima do previsto',
    scenario: 'Atividade com 1h40 realizados de 2 h previstos; escolhido 60 min → faixa "Tempo acima do previsto", justificativa obrigatória e botão "Registrar apontamento (exceção)".',
    notes: VP_NOTE,
    viewport: { width: 1280, height: 1250 },
    handlers: kioskHandlers({ nearLimit: true }),
    async run({ page, shot }) {
      await login(page)
      await page.getByRole('button', { name: '60 min', exact: true }).first().click()
      await page.getByText('Tempo acima do previsto').first().waitFor()
      await page.getByRole('button', { name: 'Registrar apontamento (exceção)' }).waitFor()
      await shot(null, { clip: { x: 0, y: 0, width: 1280, height: 880 } })
    },
  },
  {
    ...base,
    id: 'cap13-05',
    slug: 'outra-atividade-revisao',
    match: 'Fluxo Outra atividade na etapa de revisão',
    scenario: '"+ Outra atividade" → busca "teto" → "Aplicar tecido" (ET-0102) → 30 min + justificativa → etapa de revisão com Colaborador, Atividade, Contexto, Data, Minutos e Justificativa.',
    notes: VP_NOTE,
    handlers: kioskHandlers(),
    async run({ page, shot }) {
      await login(page)
      await page.getByRole('button', { name: '+ Outra atividade' }).click()
      await page.getByPlaceholder('Digite ao menos 2 caracteres…').fill('teto')
      await page.getByText('Aplicar tecido').first().click()
      await page.getByRole('button', { name: '30 min', exact: true }).last().click()
      await page.locator('select').last().selectOption('just-2')
      await page.getByRole('button', { name: 'Continuar' }).click()
      await page.getByRole('button', { name: 'Confirmar apontamento' }).waitFor()
      await shot()
    },
  },
]
