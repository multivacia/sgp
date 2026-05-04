import { describe, expect, it } from 'vitest'
import type { ArgosDocumentIngestResult } from '../../../domain/argos/ingest-response.types'
import {
  normalizeV11DraftForEditing,
  stripLegacyDraftNotesText,
} from './draftV11EditorNormalize'

describe('draftV11EditorNormalize', () => {
  it('remove texto legado Release 3 das observações', () => {
    const raw =
      'Draft consolidado com base na interpretação intermediária disponível; ainda genérico em relação ao domínio de negócio (Release 3).'
    expect(stripLegacyDraftNotesText(raw)).toBeUndefined()
  })

  it('reconstrói etapas apenas a partir de serviceItems', () => {
    const ingest = {
      extractedItems: {
        serviceItems: [
          { description: 'Serviço válido A', confidence: 0.9 },
          { description: 'Serviço válido B', confidence: 0.8 },
        ],
        partItems: [],
        operationalNotes: ['Nota operacional'],
      },
    } as unknown as ArgosDocumentIngestResult

    const draft = normalizeV11DraftForEditing(ingest, {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'x' },
      options: [
        {
          orderIndex: 1,
          title: 'ruído',
          areas: [
            {
              orderIndex: 1,
              title: 'área',
              steps: [{ orderIndex: 1, title: 'producer' }],
            },
          ],
        },
      ],
      warnings: [],
      humanReviewRequired: true,
    })

    const titles = draft.options[0]?.areas[0]?.steps.map((s) => s.title) ?? []
    expect(titles).toEqual(['Serviço válido A', 'Serviço válido B'])
    expect(titles.some((t) => /producer/i.test(t))).toBe(false)
  })

  it('importação Bravo (TD9): não promove operationalNotes para Observações do formulário', () => {
    const ingest = {
      sourceDocument: { provider: 'BRAVO', documentType: 'OS_OR_BUDGET' },
      extractedItems: {
        serviceItems: [{ description: 'Serviço A', confidence: 0.9 }],
        partItems: [],
        operationalNotes: ['Executar com cuidado.'],
      },
    } as unknown as ArgosDocumentIngestResult

    const draft = normalizeV11DraftForEditing(ingest, {
      schemaVersion: '1.1.0',
      suggestedDados: { title: '7452', notes: 'texto antigo' },
      options: [],
      warnings: [],
      humanReviewRequired: true,
    })

    expect(draft.suggestedDados?.notes).toBeUndefined()
  })

  it('prioriza operationalNotes nas observações quando existirem', () => {
    const ingest = {
      extractedItems: {
        serviceItems: [{ description: 'Um serviço', confidence: 0.9 }],
        partItems: [],
        operationalNotes: ['Executar com cuidado.'],
      },
    } as unknown as ArgosDocumentIngestResult

    const draft = normalizeV11DraftForEditing(ingest, {
      schemaVersion: '1.1.0',
      suggestedDados: {
        notes:
          'Draft consolidado com base na interpretação intermediária disponível; ainda genérico em relação ao domínio de negócio (Release 3).',
      },
      options: [],
      warnings: [],
      humanReviewRequired: true,
    })

    expect(draft.suggestedDados?.notes).toBe('Executar com cuidado.')
  })

  it('não monta etapa com texto financeiro/tabular ou código isolado', () => {
    const ingest = {
      document: { fileName: 'os-bravo.pdf' },
      extractedItems: {
        serviceItems: [
          { description: '342', confidence: 0.9 },
          { description: 'UN @ 1,000 5502,750', confidence: 0.9 },
          { description: 'Total R$ 10,00', confidence: 0.9 },
          { description: 'Serviço limpo', confidence: 0.9 },
        ],
        partItems: [],
        operationalNotes: [],
      },
    } as unknown as ArgosDocumentIngestResult

    const draft = normalizeV11DraftForEditing(ingest, {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'OS VALORES', notes: 'Pagamento PIX' },
      options: [],
      warnings: [],
      humanReviewRequired: true,
    })

    expect(draft.options[0]?.areas[0]?.steps.map((s) => s.title)).toEqual(['Serviço limpo'])
    expect(draft.suggestedDados?.title).toBe('os-bravo')
    expect(String(draft.suggestedDados?.notes ?? '').toLowerCase()).not.toContain('pagamento')
  })

  it('não monta etapa com decimal monetário isolado (ex. totais extraídos sem rótulo)', () => {
    const ingest = {
      document: { fileName: 'x.pdf' },
      extractedItems: {
        serviceItems: [
          { description: '16816,36', confidence: 0.9 },
          { description: '13681,15', confidence: 0.9 },
          { description: 'OMBREIRA DIANTEIRA - AJUSTE', confidence: 0.9 },
        ],
        partItems: [],
        operationalNotes: ['Observação com 30497,51 fraude'],
      },
    } as unknown as ArgosDocumentIngestResult

    const draft = normalizeV11DraftForEditing(ingest, {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'Esteira' },
      options: [],
      warnings: [],
      humanReviewRequired: true,
    })

    expect(draft.options[0]?.areas[0]?.steps.map((s) => s.title)).toEqual([
      'OMBREIRA DIANTEIRA - AJUSTE',
    ])
    expect(String(draft.suggestedDados?.notes ?? '')).not.toMatch(/30497,51/)
  })
})
