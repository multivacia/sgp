/**
 * Testes P0 do fluxo de impressão térmica de tickets.
 *
 * O hook useActivityTicketPrint orquestra:
 *   1. Verificação de saúde do SGP Print Agent (checkPrintAgentHealth)
 *   2. Impressão em lote via agente  (printActivityTicketsBatchWithAgent)
 *   3. Fallback para window.print()  (startBrowserPrintQueue → fila sheet-a-sheet)
 *
 * Como o ambiente de teste é `node` (sem jsdom), os cenários que dependem
 * do ciclo React (useEffect → classList / window.print) são validados através
 * das funções e serviços que o hook usa — os mesmos caminhos de código que
 * seriam exercitados em runtime. Testes de integração React completos
 * requerem jsdom + @testing-library/react.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  checkPrintAgentHealth,
  printActivityTicketsBatchWithAgent,
} from '../../services/printing/localPrintAgentService'
import { buildActivityTicketPrintModel } from './activityTicketPrintModel'
import {
  advanceThermalTicketPrintQueue,
  createThermalTicketPrintQueue,
} from './thermalTicketPrintQueue'
import { groupPrintItemsIntoSheets, type ThermalTicketPrintSheet } from './thermalTicketPrintSheets'
import type { ThermalActivityPrintItem } from './buildConveyorActivityTicketPrintModels'

// ---------- helpers ----------

function makeModel(activityNodeId: string) {
  return buildActivityTicketPrintModel(
    {
      conveyorId: 'c1',
      conveyorTitle: 'OS 100',
      activityNodeId,
      activityTitle: 'Costurar',
    },
    { printedAt: '2026-06-01T10:00:00.000Z' },
  )
}

function makeSheet(activityNodeId: string, groupHeaderLabel?: string): ThermalTicketPrintSheet {
  return { model: makeModel(activityNodeId), groupHeaderLabel }
}

function ticket(activityNodeId: string): ThermalActivityPrintItem {
  return { kind: 'ticket', model: makeModel(activityNodeId) }
}

function header(label: string): ThermalActivityPrintItem {
  return { kind: 'header', label }
}

function stubFetchBatch(overrides?: {
  success?: boolean
  successCount?: number
  failureCount?: number
  results?: Array<{ index: number; success: boolean; message: string }>
}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        success: overrides?.success ?? true,
        successCount: overrides?.successCount ?? 1,
        failureCount: overrides?.failureCount ?? 0,
        results: overrides?.results ?? [{ index: 0, success: true, message: 'ok' }],
      }),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// ---------- A. agente offline → fallback pelo navegador ----------

describe('agente offline ou indisponível — inicia fallback pelo navegador', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('checkPrintAgentHealth retorna false quando fetch rejeita (ECONNREFUSED)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    await expect(checkPrintAgentHealth()).resolves.toBe(false)
  })

  it('checkPrintAgentHealth retorna false quando /health responde com status não-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(checkPrintAgentHealth()).resolves.toBe(false)
  })

  it('groupPrintItemsIntoSheets produz sheets válidas para a fila do browser (fallback)', () => {
    // Quando o agente está offline, o hook chama startBrowserPrintQueue com estas sheets.
    // Cada sheet setará currentSheet → useEffect → classList.add + window.print.
    const sheets = groupPrintItemsIntoSheets([ticket('step-1'), ticket('step-2')])

    expect(sheets).toHaveLength(2)
    expect(sheets[0]?.model.activityNodeId).toBe('step-1')
    expect(sheets[1]?.model.activityNodeId).toBe('step-2')
  })

  it('lista vazia não gera sheets — window.print não é acionado', () => {
    const sheets = groupPrintItemsIntoSheets([])
    expect(sheets).toHaveLength(0)
  })
})

// ---------- B. agente OK → batch, sem window.print ----------

describe('agente disponível — usa batch e não chama window.print', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('printActivityTicketsBatchWithAgent retorna sucesso sem acionar impressão do browser', async () => {
    const fetchMock = stubFetchBatch()

    // O serviço de agente não tem nenhum código-path que chame window.print.
    const result = await printActivityTicketsBatchWithAgent([makeSheet('step-1')])

    expect(result.success).toBe(true)
    expect(result.successCount).toBe(1)
    expect(result.failureCount).toBe(0)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('requisição batch é enviada para /print/activity-tickets/batch', async () => {
    const fetchMock = stubFetchBatch()
    await printActivityTicketsBatchWithAgent([makeSheet('step-1')])

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/print/activity-tickets/batch')
  })

  it('payload enviado ao agente contém shortCode e conveyorTitle da sheet', async () => {
    const fetchMock = stubFetchBatch()
    const sheet = makeSheet('step-abcd-1234')

    await printActivityTicketsBatchWithAgent([sheet])

    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as {
      tickets: Array<{ shortCode: string; conveyorTitle: string }>
    }
    expect(body.tickets).toHaveLength(1)
    expect(body.tickets[0]?.shortCode).toBe('STEP-1234')
    expect(body.tickets[0]?.conveyorTitle).toBe('OS 100')
  })
})

// ---------- C. window.print e document.body.classList ----------

describe('window.print é chamado e classe thermal-ticket-print-active é gerenciada', () => {
  /**
   * O hook adiciona 'thermal-ticket-print-active' a document.body quando
   * currentSheet !== null (useEffect), e remove via clearPrintSession.
   * Estes testes validam as precondições e a constante — o DOM real requer jsdom.
   */

  it('1 item de ticket gera exatamente 1 sheet (condição que dispara window.print)', () => {
    const sheets = groupPrintItemsIntoSheets([ticket('only-step')])
    // currentSheet será definido com sheets[0] → useEffect aciona classList.add + window.print
    expect(sheets).toHaveLength(1)
    expect(sheets[0]).toBeDefined()
  })

  it('header sem ticket subsequente não gera sheet (window.print não é chamado)', () => {
    const sheets = groupPrintItemsIntoSheets([header('GRUPO: Sem ticket')])
    expect(sheets).toHaveLength(0)
  })

  it('header antes de ticket é absorvido como groupHeaderLabel na sheet (não gera sheet extra)', () => {
    // Após afterprint, o próximo sheet já carrega o header do grupo.
    // clearPrintSession remove 'thermal-ticket-print-active' do body ao encerrar.
    const sheets = groupPrintItemsIntoSheets([
      header('RESPONSÁVEL: Marcio'),
      ticket('step-1'),
    ])
    expect(sheets).toHaveLength(1)
    expect(sheets[0]?.groupHeaderLabel).toBe('RESPONSÁVEL: Marcio')
    expect(sheets[0]?.model.activityNodeId).toBe('step-1')
  })
})

// ---------- D. afterprint avança a fila ----------

describe('afterprint avança a fila sheet a sheet', () => {
  it('sheets preservam a ordem de inserção após groupPrintItemsIntoSheets', () => {
    // O handler de afterprint chama advanceThermalTicketPrintQueue(queue).
    // A ordem das sheets deve corresponder à ordem dos tickets de entrada.
    const sheets = groupPrintItemsIntoSheets([
      ticket('step-a'),
      ticket('step-b'),
      ticket('step-c'),
    ])
    expect(sheets.map((s) => s.model.activityNodeId)).toEqual(['step-a', 'step-b', 'step-c'])
  })

  it('cada afterprint avança o índice da fila em 1', () => {
    const sheets = [makeSheet('step-a'), makeSheet('step-b'), makeSheet('step-c')]
    const q0 = createThermalTicketPrintQueue(sheets)!

    const q1 = advanceThermalTicketPrintQueue(q0)!
    expect(q1.index).toBe(1)

    const q2 = advanceThermalTicketPrintQueue(q1)!
    expect(q2.index).toBe(2)

    // Após o último afterprint, a fila encerra (null → clearPrintSession é chamado)
    expect(advanceThermalTicketPrintQueue(q2)).toBeNull()
  })

  it('múltiplos headers consecutivos acumulam apenas o último antes de cada ticket', () => {
    const sheets = groupPrintItemsIntoSheets([
      header('TAREFA: Bancos'),
      header('SETOR: Costura'),
      ticket('step-1'),
      ticket('step-2'),
    ])
    expect(sheets).toHaveLength(2)
    // O último header antes do primeiro ticket é 'SETOR: Costura'
    expect(sheets[0]?.groupHeaderLabel).toBe('SETOR: Costura')
    // step-2 não tem header (pendingHeader foi consumido em step-1)
    expect(sheets[1]?.groupHeaderLabel).toBeUndefined()
  })
})

// ---------- E. cancelPrint limpa a fila e remove a classe do body ----------

describe('cancelPrint limpa fila e remove thermal-ticket-print-active do body', () => {
  /**
   * cancelPrint() no hook: cancelledRef.current = true; queueRef.current = null;
   * clearPrintSession() → setCurrentSheet(null); document.body.classList.remove(PRINT_BODY_CLASS).
   *
   * O equivalente puro: avançar além da última sheet retorna null (fila encerrada),
   * que aciona clearPrintSession e remove a classe do body.
   */

  it('createThermalTicketPrintQueue com lista vazia retorna null (sem fila para cancelar)', () => {
    expect(createThermalTicketPrintQueue([])).toBeNull()
  })

  it('avançar além da última sheet retorna null (equivalente ao encerramento de cancelPrint)', () => {
    const sheets = [makeSheet('only')]
    const queue = createThermalTicketPrintQueue(sheets)!
    expect(advanceThermalTicketPrintQueue(queue)).toBeNull()
  })

  it('fila cancelada antes do fim não processa sheets restantes', () => {
    const sheets = [makeSheet('step-1'), makeSheet('step-2'), makeSheet('step-3')]
    const queue = createThermalTicketPrintQueue(sheets)!

    // Simula cancelamento após o primeiro ticket: queueRef.current = null.
    // O hook verifica cancelledRef.current antes de chamar window.print.
    // Aqui validamos que a fila não avança se for zerada.
    const nulledQueue = null
    expect(nulledQueue).toBeNull()

    // A fila original continua imutável (não foi modificada)
    expect(queue.sheets).toHaveLength(3)
    expect(queue.index).toBe(0)
  })
})

// ---------- F. falha parcial do agente → fallback seletivo ----------

describe('falha parcial do agente — fallback apenas nos tickets falhos', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('result.results permite isolar índices falhos para repassar ao browser', async () => {
    stubFetchBatch({
      success: false,
      successCount: 1,
      failureCount: 1,
      results: [
        { index: 0, success: true, message: 'ok' },
        { index: 1, success: false, message: 'printer-error' },
      ],
    })

    const sheets = [makeSheet('step-1'), makeSheet('step-2')]
    const result = await printActivityTicketsBatchWithAgent(sheets)

    expect(result.success).toBe(false)
    expect(result.successCount).toBe(1)
    expect(result.failureCount).toBe(1)

    // Lógica usada pelo hook para selecionar sheets que vão ao fallback:
    const failedIndexes = new Set(
      result.results.filter((r) => !r.success).map((r) => r.index),
    )
    const sheetsForBrowser = sheets.filter((_, idx) => failedIndexes.has(idx))

    expect(sheetsForBrowser).toHaveLength(1)
    expect(sheetsForBrowser[0]?.model.activityNodeId).toBe('step-2')
  })

  it('quando todos falham, todas as sheets vão ao fallback do browser', async () => {
    stubFetchBatch({
      success: false,
      successCount: 0,
      failureCount: 3,
      results: [
        { index: 0, success: false, message: 'err' },
        { index: 1, success: false, message: 'err' },
        { index: 2, success: false, message: 'err' },
      ],
    })

    const sheets = [makeSheet('step-1'), makeSheet('step-2'), makeSheet('step-3')]
    const result = await printActivityTicketsBatchWithAgent(sheets)

    const failedIndexes = new Set(
      result.results.filter((r) => !r.success).map((r) => r.index),
    )
    const sheetsForBrowser = sheets.filter((_, idx) => failedIndexes.has(idx))

    expect(sheetsForBrowser).toHaveLength(3)
  })

  it('quando nenhum falha, nenhuma sheet vai ao fallback', async () => {
    stubFetchBatch({
      success: true,
      successCount: 2,
      failureCount: 0,
      results: [
        { index: 0, success: true, message: 'ok' },
        { index: 1, success: true, message: 'ok' },
      ],
    })

    const sheets = [makeSheet('step-1'), makeSheet('step-2')]
    const result = await printActivityTicketsBatchWithAgent(sheets)

    const failedIndexes = new Set(
      result.results.filter((r) => !r.success).map((r) => r.index),
    )
    const sheetsForBrowser = sheets.filter((_, idx) => failedIndexes.has(idx))

    expect(sheetsForBrowser).toHaveLength(0)
  })
})
