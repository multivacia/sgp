/** Capítulo 17 — Importação por documento (PDF fictício gerado em memória; resultado mockado). */
import { h, ok } from '../mock-api.mjs'
import { DOCUMENT_INGEST_RESULT } from '../fixtures/document-import.mjs'

const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
)

const handlers = () => [
  h('POST', '/api/v1/conveyors/document-draft', () => ok(DOCUMENT_INGEST_RESULT, { documentDraftExecutionMode: 'local' })),
]

async function upload(page) {
  await page.locator('input[type="file"]').setInputFiles({ name: 'OS-EXEMPLO-0001.pdf', mimeType: 'application/pdf', buffer: PDF })
  const process = page.getByRole('button', { name: /Processar|Enviar|Interpretar/ })
  if (await process.count()) await process.first().click()
  await page.getByText('Revisão da OS importada').waitFor()
  await page.waitForLoadState('networkidle')
}

const NOTE = 'Resultado do interpretador mockado (fixtures/document-import.mjs, schema draft v1.1.0); o PDF enviado é um arquivo fictício mínimo gerado em memória.'

export default [
  {
    id: 'cap17-01',
    slug: 'nova-esteira-por-documento',
    match: 'Tela Nova esteira por documento logo após o envio',
    route: '/app/importar-os',
    viewport: { width: 1440, height: 1700 },
    scenario: 'Envio do PDF fictício OS-EXEMPLO-0001: áreas 1 (envio) e 2 (situação do rascunho) lado a lado e o painel Revisão da OS importada com os quatro contadores e as seções de itens.',
    notes: `${NOTE} Recorte termina nas Pendências de revisão; as seções de itens (Reaproveitar da Matriz, Revisar similaridade…) seguem abaixo — ver cap17-02. Observação de auditoria: textos "Ficheiro selecionado" (pt-PT) e "Tipo: TASK" (jargão) aparecem na tela.`,
    handlers,
    async run({ page, shot }) {
      await upload(page)
      const { clipToBottomOf } = await import('../clip.mjs')
      const pend = page.getByText('Pendências de revisão', { exact: false }).first()
      await shot(null, { clip: await clipToBottomOf(page, pend, { withSidebar: false, extra: 60 }) })
    },
  },
  {
    id: 'cap17-02',
    slug: 'revisar-similaridade',
    match: 'Cartão de item em Revisar similaridade',
    route: '/app/importar-os',
    viewport: { width: 1440, height: 1900 },
    scenario: 'Cartão "Revestimento couro volante" em Revisar similaridade com Aceitar sugestão, Escolher alternativa (lista aberta), Criar como novo item e Ignorar item.',
    notes: NOTE,
    handlers,
    async run({ page, shot }) {
      await upload(page)
      const card = page.getByRole('listitem').filter({ hasText: 'Revestimento couro volante' }).filter({ has: page.getByRole('button', { name: 'Escolher alternativa' }) })
      await card.getByRole('button', { name: 'Escolher alternativa' }).click()
      const opened = page.getByRole('listitem').filter({ hasText: 'Revestimento couro volante' }).filter({ has: page.getByRole('button', { name: 'Ocultar alternativas' }) })
      await opened.getByText('Revestir assentos').first().waitFor()
      await opened.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await shot(opened, { pad: 12 })
    },
  },
]
