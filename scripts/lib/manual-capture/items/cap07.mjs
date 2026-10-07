/** Capítulo 7 — Apontamentos. */
import { h, ok } from '../mock-api.mjs'
import { JUSTIFICATIONS, TIME_ENTRY_CANDIDATES } from '../fixtures/time-entries.mjs'
import { panelHandlers } from './cap05.mjs'
import { detailHandlers } from './cap06.mjs'
import { conveyorDetail, stepTimeEntries } from '../fixtures/conveyors.mjs'

export const quickEntryHandlers = () => [
  ...panelHandlers(),
  h('GET', '/api/v1/me/time-entry-candidates', ({ query }) => {
    const items = query.get('includeUnassigned') === 'true' ? TIME_ENTRY_CANDIDATES : TIME_ENTRY_CANDIDATES.filter((c) => c.isAssignedToMe)
    return ok(items, { collaboratorId: 'col-carlos', unavailableReason: null })
  }),
  h('GET', '/api/v1/me/time-entry-justifications', () => ok(JUSTIFICATIONS)),
  h('GET', '/api/v1/me/extra-time-entry-descriptions', () => ok([])),
  h('GET', '/api/v1/me/extra-time-entries', () => ok([], { total: 0 })),
]

export default [
  {
    id: 'cap07-01',
    slug: 'gaveta-apontar-horas',
    match: 'Gaveta Apontar horas na aba Esteira',
    route: '/app/backlog',
    viewport: { width: 1440, height: 2400 },
    scenario:
      'Botão "Apontar horas" da barra superior → aba Esteira; "Buscar outras atividades" marcado com pesquisa "Veículo" → blocos Minhas atividades e Fora da sua alocação; cartões com Previsto/Realizado/Pendente, Apontar e Concluir atividade.',
    notes: 'Viewport alto para mostrar os dois blocos da gaveta numa única imagem; recorte na própria gaveta.',
    handlers: quickEntryHandlers,
    async run({ page, shot }) {
      await page.getByRole('button', { name: 'Apontar horas' }).click()
      await page.getByText('Buscar outras atividades').click()
      await page.getByPlaceholder(/Esteira, cliente, veículo/).fill('Veículo')
      await page.waitForLoadState('networkidle')
      await page.getByText('Fora da sua alocação', { exact: false }).first().waitFor()
      await page.waitForTimeout(600)
      const drawer = page.getByText('Execução rápida').locator('xpath=ancestor::*[@role="dialog" or contains(@class,"fixed")][1]')
      const box = await drawer.boundingBox()
      const last = page.getByText('Aplicar tecido').last()
      const lb = await last.boundingBox()
      await shot(null, { clip: { x: box.x, y: 0, width: box.width, height: Math.min(2400, lb.y + 175) } })
    },
  },
  {
    id: 'cap07-02',
    slug: 'registrar-tempo-fora-de-sequencia',
    match: 'Formulário Registrar tempo com a faixa de fora de sequência',
    route: '/app/backlog',
    viewport: { width: 1440, height: 1800 },
    scenario:
      'Apontar horas → "Apontar" na atividade "Revestir painéis" (ET-0103) que tem 2 atividades anteriores pendentes → formulário Registrar tempo com a faixa de fora de sequência e os botões Salvar apontamento / Salvar apontamento e concluir atividade.',
    handlers: quickEntryHandlers,
    async run({ page, shot }) {
      await page.getByRole('button', { name: 'Apontar horas' }).click()
      const card = page
        .getByText('Revestir painéis', { exact: true })
        .locator('xpath=ancestor::*[.//button[normalize-space()="Apontar"]][1]')
      await card.getByRole('button', { name: 'Apontar', exact: true }).click()
      await page.getByText('confirme o apontamento').waitFor()
      await page.waitForLoadState('networkidle')
      await page.getByLabel(/Tempo \(minutos\)/i).fill('60')
      await page.locator('select').filter({ hasText: 'Selecione uma justificativa' }).selectOption('just-1')
      const drawer = page.getByText('Execução rápida').locator('xpath=ancestor::*[@role="dialog" or contains(@class,"fixed")][1]')
      const box = await drawer.boundingBox()
      const btn = await page.getByRole('button', { name: 'Salvar apontamento e concluir atividade' }).boundingBox()
      await shot(null, { clip: { x: box.x, y: 0, width: box.width, height: btn.y + btn.height + 24 } })
    },
  },
  {
    id: 'cap07-03',
    slug: 'apontamento-gerencial',
    match: 'Tela Apontamento gerencial',
    route: '/app/gestao/apontamento/step-3?conveyorId=conv-101',
    viewport: { width: 1440, height: 1700 },
    scenario:
      'Apontamento gerencial da atividade "Recuperar espuma" (ET-0101): bloco Novo lançamento com o motivo obrigatório preenchido e, abaixo, lista de lançamentos com Editar… e Remover….',
    handlers: () => {
      const d = conveyorDetail()
      const base = stepTimeEntries(d, 'step-3')[0]
      return [
        h('GET', '/api/v1/conveyors/conv-101/steps/step-3/time-entries', () =>
          ok([
            base,
            {
              ...base,
              id: 'te-step-3-b',
              minutes: 30,
              entryAt: '2026-06-29T19:00:00.000Z',
              createdAt: '2026-06-29T19:05:00.000Z',
              updatedAt: '2026-06-29T19:05:00.000Z',
              isDelegated: true,
              recordedByAppUserId: 'user-ana-demo',
              recordedByUserEmail: 'ana.demo@sgp.example',
              delegationReason: 'Colaborador sem acesso ao totem no turno.',
            },
          ]),
        ),
        ...detailHandlers()(),
      ]
    },
    async run({ page, shot }) {
      await page.getByRole('heading', { name: 'Novo lançamento' }).waitFor()
      await page.waitForLoadState('networkidle')
      await page.getByLabel(/Motivo do registro em nome do colaborador/).fill('Apontamento esquecido no turno de ontem.')
      const last = page.getByRole('button', { name: 'Remover…' }).last()
      await last.waitFor()
      const { clipToBottomOf } = await import('../clip.mjs')
      await shot(null, { clip: await clipToBottomOf(page, last, { withSidebar: false, extra: 40 }) })
    },
  },
]
