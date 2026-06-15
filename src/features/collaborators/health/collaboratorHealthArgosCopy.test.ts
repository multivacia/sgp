import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { CollaboratorOperationalHealthSnapshot } from '../../../domain/collaborator-health/collaboratorOperationalHealth.types'
import { CollaboratorHealthSnapshotPanel } from './CollaboratorHealthSnapshotPanel'
import { CollaboratorOperationalHealthPage } from './CollaboratorOperationalHealthPage'

vi.mock('react-router-dom', () => ({
  Link: ({
    children,
    to,
  }: {
    children: React.ReactNode
    to: string
  }) => createElement('a', { href: to }, children),
  useLocation: () => ({ pathname: '/app/colaboradores/saude-operacional' }),
}))

vi.mock('../../../lib/errors/SgpErrorPresentation', () => ({
  useSgpErrorSurface: () => ({ presentBlocking: () => {}, showToast: () => {} }),
}))

vi.mock('../../../lib/shell/transient-context', () => ({
  useRegisterTransientContext: () => {},
}))

vi.mock('../../../services/collaboratorOperationalHealth.service', () => ({
  getCollaboratorOperationalHealthSummary: () =>
    Promise.resolve({ summary: { rows: [] }, meta: { total: 0 } }),
  getCollaboratorOperationalHealthSnapshot: () => Promise.resolve(null),
}))

const snapshotFixture: CollaboratorOperationalHealthSnapshot = {
  schemaVersion: '1',
  snapshotVersion: '1',
  generatedAt: '2026-06-09T12:00:00.000Z',
  referenceDate: '2026-06-09',
  recentDays: 7,
  collaborator: {
    id: 'c-1',
    fullName: 'Colaborador Teste',
    code: 'CT01',
    status: 'active',
    isActive: true,
  },
  capacity: {
    referenceDate: '2026-06-09',
    resolvedDailyMinutes: 480,
    source: 'DEFAULT',
    recentDays: 7,
    windowCapacityMinutes: 3360,
  },
  workload: {
    openDistinctSteps: 2,
    plannedOpenMinutesSum: 120,
    realizedOpenMinutesSum: 60,
    pendingOpenMinutesSum: 60,
    primaryContributorSteps: 1,
    supportContributorSteps: 1,
    teamLinkedSteps: 0,
    collaboratorDirectSteps: 2,
  },
  recentTimeEntries: {
    windowFrom: '2026-06-02',
    windowToExclusive: '2026-06-09',
    totalMinutes: 60,
    entryCount: 1,
    lastEntryAt: '2026-06-08T10:00:00.000Z',
  },
  dataQuality: { warnings: [] },
}

describe('Saúde operacional dos colaboradores — cópia sem ARGOS', () => {
  it('CollaboratorOperationalHealthPage não cita ARGOS no lead', () => {
    const html = renderToStaticMarkup(createElement(CollaboratorOperationalHealthPage))

    expect(html).not.toContain('ARGOS')
    expect(html).toContain('Resumo operacional baseado nos dados atuais do colaborador')
  })

  it('CollaboratorHealthSnapshotPanel não cita ARGOS no aside', () => {
    const html = renderToStaticMarkup(
      createElement(CollaboratorHealthSnapshotPanel, {
        open: true,
        loading: false,
        error: null,
        snapshot: snapshotFixture,
        onClose: () => {},
      }),
    )

    expect(html).not.toContain('ARGOS')
    expect(html).toContain('Interpretação automática ainda não habilitada')
  })
})
