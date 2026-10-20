/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QuickTimeEntryDrawer } from './QuickTimeEntryDrawer'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import type { TimeEntryCandidatesResult } from '../../services/my-activities/myActivitiesApiService'

const mocks = vi.hoisted(() => ({
  listTimeEntryCandidates: vi.fn(),
  postConveyorStepTimeEntry: vi.fn(),
}))

vi.mock('../../services/my-activities/myActivitiesApiService', () => ({
  listTimeEntryCandidates: mocks.listTimeEntryCandidates,
  TIME_ENTRY_CANDIDATES_PAGE_SIZE: 50,
}))
vi.mock('../../services/conveyors/conveyorStepAssignmentsApiService', () => ({
  postConveyorStepTimeEntry: mocks.postConveyorStepTimeEntry,
}))
vi.mock('../../services/conveyors/conveyorsApiService', () => ({
  patchConveyorStepCompletion: vi.fn(),
}))
vi.mock('../../services/my-activities/extraTimeEntriesApiService', () => ({
  listExtraTimeEntryDescriptions: vi.fn(async () => []),
  listMyExtraTimeEntries: vi.fn(async () => ({ items: [], unavailableReason: null })),
  createMyExtraTimeEntry: vi.fn(),
}))
const stable = vi.hoisted(() => ({
  auth: { user: { id: 'u-1', collaboratorId: 'collab-1' }, ready: true },
  errorSurface: { presentBlocking: () => {} },
}))
vi.mock('../../lib/use-auth', () => ({ useAuth: () => stable.auth }))
vi.mock('../../lib/errors/SgpErrorPresentation', () => ({
  useSgpErrorSurface: () => stable.errorSurface,
}))

/** 21 tarefas sintéticas: a lista original parava na 50ª (Ombreira, tarefa 11). */
function candidate(n: number, task: string): TimeEntryCandidateItem {
  return {
    conveyorId: 'os-7467',
    conveyorCode: '7467',
    conveyorName: 'OS 7467',
    clientName: null,
    vehicleLabel: null,
    plate: null,
    stepNodeId: `step-${n}`,
    stepName: `Atividade ${n}`,
    activityTitle: `Atividade ${n}`,
    taskTitle: task,
    areaName: 'Setor',
    sectorTitle: 'Setor',
    roleInStep: 'primary',
    assignmentType: 'COLLABORATOR',
    plannedMinutes: 30,
    realizedMinutes: 0,
    pendingMinutes: 30,
    isAssignedToMe: true,
    requiresJustification: false,
    isOutOfSequence: false,
    hasPreviousPendingStep: false,
    requiresOutOfSequenceJustification: false,
    canPointTime: true,
    previousOpenCount: 0,
    previousOpenActivities: [],
    awaitingPreviousActivities: [],
    canCompleteStep: false,
  } as TimeEntryCandidateItem
}

function result(items: TimeEntryCandidateItem[], nextCursor: string | null): TimeEntryCandidatesResult {
  return { items, nextCursor, collaboratorId: 'collab-1', unavailableReason: null }
}

const page1 = Array.from({ length: 50 }, (_, i) => candidate(i + 1, i < 43 ? 'Tarefa' : 'Ombreira'))
const page2 = Array.from({ length: 26 }, (_, i) => candidate(51 + i, i < 19 ? 'Forros de portas' : 'Revestir Painel'))

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function renderDrawer() {
  return render(<QuickTimeEntryDrawer open onClose={() => {}} />)
}

function loadMoreButton() {
  return within(screen.getByTestId('quick-time-entry-load-more')).getByRole('button')
}

describe('QuickTimeEntryDrawer — "Carregar mais"', () => {
  beforeEach(() => {
    mocks.listTimeEntryCandidates.mockReset()
    mocks.postConveyorStepTimeEntry.mockReset()
  })
  afterEach(() => cleanup())

  it('lista para na 50ª atividade (Ombreira) e "Carregar mais" alcança Revestir Painel', async () => {
    mocks.listTimeEntryCandidates
      .mockResolvedValueOnce(result(page1, 'c1'))
      .mockResolvedValueOnce(result(page2, null))
    renderDrawer()

    expect(await screen.findByText('Atividade 50')).toBeTruthy()
    expect(screen.queryByText('Atividade 51')).toBeNull()

    fireEvent.click(loadMoreButton())
    expect(await screen.findByText('Atividade 76')).toBeTruthy()
    expect(screen.getAllByText('Revestir Painel').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('quick-time-entry-load-more')).toBeNull()
    expect(mocks.listTimeEntryCandidates.mock.calls.map((c) => c[0].cursor)).toEqual([null, 'c1'])
    expect(mocks.listTimeEntryCandidates.mock.calls[1][0]).toMatchObject({ limit: 50 })
  })

  it('erro na página seguinte mantém itens, mostra erro e "Tentar novamente" usa o mesmo cursor sem duplicar', async () => {
    mocks.listTimeEntryCandidates
      .mockResolvedValueOnce(result(page1, 'c1'))
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValueOnce(result(page2, null))
    renderDrawer()
    await screen.findByText('Atividade 50')

    fireEvent.click(loadMoreButton())
    await waitFor(() => expect(within(screen.getByTestId('quick-time-entry-load-more')).getByRole('alert')).toBeTruthy())
    expect(screen.getByText('Atividade 1')).toBeTruthy()
    expect(loadMoreButton().textContent).toBe('Tentar novamente')

    fireEvent.click(loadMoreButton())
    await screen.findByText('Atividade 76')
    expect(screen.getAllByText('Atividade 51')).toHaveLength(1)
    expect(mocks.listTimeEntryCandidates.mock.calls.map((c) => c[0].cursor)).toEqual([null, 'c1', 'c1'])
  })

  it('cliques repetidos durante o carregamento não geram requisições simultâneas', async () => {
    const more = deferred<TimeEntryCandidatesResult>()
    mocks.listTimeEntryCandidates
      .mockResolvedValueOnce(result(page1, 'c1'))
      .mockReturnValueOnce(more.promise)
    renderDrawer()
    await screen.findByText('Atividade 50')

    const btn = loadMoreButton()
    fireEvent.click(btn)
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(mocks.listTimeEntryCandidates).toHaveBeenCalledTimes(2)
    expect((loadMoreButton() as HTMLButtonElement).disabled).toBe(true)
    await act(async () => {
      more.resolve(result(page2, null))
    })
    expect(await screen.findByText('Atividade 76')).toBeTruthy()
  })

  it('apontamento em atividade da página 2 recarrega a partir da 1ª página com a mesma pesquisa e checkbox', async () => {
    mocks.listTimeEntryCandidates.mockImplementation(async (opts: { cursor?: string | null }) =>
      opts.cursor ? result(page2, null) : result(page1, 'c1'),
    )
    mocks.postConveyorStepTimeEntry.mockResolvedValue({})
    renderDrawer()
    await screen.findByText('Atividade 50')

    fireEvent.change(screen.getByLabelText('Pesquisar atividades'), { target: { value: '7467' } })
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() =>
      expect(mocks.listTimeEntryCandidates).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: '7467', includeUnassigned: true, cursor: null }),
      ),
    )
    await screen.findByText('Atividade 50')
    fireEvent.click(loadMoreButton())
    const card = (await screen.findByText('Atividade 70')).closest('li')!
    fireEvent.click(within(card).getByRole('button', { name: 'Apontar' }))

    fireEvent.change(screen.getByLabelText(/Tempo \(minutos\)/), { target: { value: '15' } })
    mocks.listTimeEntryCandidates.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar apontamento' }))

    await waitFor(() => expect(mocks.postConveyorStepTimeEntry).toHaveBeenCalledTimes(1))
    expect(mocks.postConveyorStepTimeEntry.mock.calls[0][1]).toBe('step-70')
    await waitFor(() => expect(mocks.listTimeEntryCandidates).toHaveBeenCalledTimes(1))
    expect(mocks.listTimeEntryCandidates.mock.calls[0][0]).toMatchObject({
      q: '7467',
      includeUnassigned: true,
      cursor: null,
    })
    await screen.findByText('Atividade 50')
    expect(screen.queryByText('Atividade 70')).toBeNull()
    expect(loadMoreButton()).toBeTruthy()
  })

  it('mudança de pesquisa durante "Carregar mais": a página antiga não contamina a nova lista', async () => {
    const staleMore = deferred<TimeEntryCandidatesResult>()
    mocks.listTimeEntryCandidates
      .mockResolvedValueOnce(result(page1, 'c1'))
      .mockReturnValueOnce(staleMore.promise)
      .mockResolvedValueOnce(result([candidate(900, 'Outra OS')], null))
    renderDrawer()
    await screen.findByText('Atividade 50')

    fireEvent.click(loadMoreButton())
    fireEvent.change(screen.getByLabelText('Pesquisar atividades'), { target: { value: 'outra' } })
    await screen.findByText('Atividade 900')
    await act(async () => {
      staleMore.resolve(result(page2, null))
    })
    expect(screen.queryByText('Atividade 51')).toBeNull()
    expect(screen.queryByText('Atividade 1')).toBeNull()
    expect(screen.getByText('Atividade 900')).toBeTruthy()
  })
})
