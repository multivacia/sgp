/**
 * Prova de runtime (PR-3): chip Atenção abre drawer; FAB backlog abre gaveta com contador.
 * Usa a app Vite real com API mockada.
 *
 * Uso: node scripts/capture-weekly-agenda-pr3.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const baseUrl = process.argv[2] ?? 'http://localhost:5174'
const outDir = path.join(__dirname, '../docs/discovery')
const attentionPath = path.join(outDir, 'pr3-attention-drawer.png')
const backlogPath = path.join(outDir, 'pr3-backlog-drawer.png')

const weekStart = '2026-06-29'
const weekEnd = '2026-07-03'
const weekdayDates = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03']

const mockSessionIdle = {
  idleTimeoutMinutes: 60,
  idleWarningMinutes: 5,
  lastActivityAt: new Date().toISOString(),
  idleExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
}

const mockUser = {
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'admin@multivacia.com',
  role: 'ADMIN',
  roleId: '11111111-1111-1111-1111-111111111111',
  collaboratorId: null,
  isActive: true,
  avatarUrl: null,
  mustChangePassword: false,
  passwordChangedAt: '2026-01-01T00:00:00.000Z',
  permissions: ['conveyors.create', 'dashboard.view_operational'],
}

const mockWeek = {
  hasPlan: true,
  week: { weekStartDate: weekStart, weekEndDate: weekEnd, weekdayDates },
  plan: {
    id: 'plan-demo',
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    status: 'DRAFT',
    publishedAt: null,
    createdAt: '2026-06-29T12:00:00.000Z',
    updatedAt: '2026-06-29T12:00:00.000Z',
    items: [
      {
        id: 'item-div',
        conveyorId: 'conv-1',
        conveyorTitle: 'ET-001 · Reforma bancos',
        activityNodeId: 'act-div',
        taskTitle: 'Tapeçaria',
        sectorTitle: 'Montagem',
        activityTitle: 'Recuperar espuma — divergente',
        assignedCollaboratorId: 'col-1',
        assignedCollaboratorName: 'Carlos',
        plannedDate: '2026-06-29',
        plannedOrder: 0,
        plannedMinutes: 120,
        status: 'ACTIVE',
        notes: null,
        realizedMinutes: 0,
        activityOperationalStatus: 'PENDING',
        syncStatus: 'DIVERGED',
        syncDifferences: [
          {
            code: 'PLANNED_MINUTES_CHANGED',
            message: 'Minutos divergentes',
            planValue: '180',
            factoryValue: '120',
          },
        ],
        conveyorOperationalPlanItemId: 'copi-1',
      },
    ],
  },
  summary: { plannedMinutes: 120, plannedItems: 1, collaboratorsCount: 1 },
  capacityByCollaboratorDay: [
    {
      collaboratorId: 'col-1',
      date: '2026-06-29',
      capacityMinutes: 480,
      plannedMinutes: 120,
    },
  ],
  executionOutsidePlanSummary: {
    totalMinutes: 45,
    entriesCount: 1,
    activitiesCount: 1,
    conveyorsCount: 1,
  },
  executionOutsidePlanEntries: [
    {
      id: 'entry-1',
      conveyorId: 'conv-9',
      conveyorTitle: 'ET-009 · Extra',
      taskTitle: 'Acabamento',
      sectorTitle: 'Polimento',
      activityTitle: 'Lixar painel',
      collaboratorId: 'col-2',
      collaboratorName: 'Ana',
      minutes: 45,
      entryAt: '2026-06-30T14:30:00.000Z',
      entryOrigin: 'ASSIGNED',
      exceptionJustification: null,
      notes: null,
    },
  ],
}

const mockCollaborators = [
  {
    id: 'col-1',
    full_name: 'Carlos',
    code: 'COL-001',
    status: 'ACTIVE',
    is_active: true,
  },
]

const mockBacklog = {
  items: [
    {
      conveyorId: 'conv-3',
      conveyorTitle: 'ET-003 · Reforma teto',
      clientName: 'Cliente X',
      vehicleDescription: 'Sprinter',
      licensePlate: 'ABC1D23',
      taskTitle: 'Tapeçaria',
      sectorTitle: 'Montagem',
      activityNodeId: 'act-backlog-1',
      activityTitle: 'Cortar tecido — backlog',
      plannedMinutes: 90,
      realizedMinutes: 0,
      pendingMinutes: 90,
      assignedCollaborators: [],
      assignedTeams: [],
      isOutOfSequence: false,
      previousOpenCount: 0,
      isOverdue: false,
      hasAssignees: false,
    },
    {
      conveyorId: 'conv-4',
      conveyorTitle: 'ET-004 · Bancos',
      clientName: null,
      vehicleDescription: null,
      licensePlate: null,
      taskTitle: 'Tapeçaria',
      sectorTitle: 'Acabamento',
      activityNodeId: 'act-backlog-2',
      activityTitle: 'Costurar capa — backlog',
      plannedMinutes: 60,
      realizedMinutes: 10,
      pendingMinutes: 50,
      assignedCollaborators: [{ id: 'col-2', fullName: 'Maria' }],
      assignedTeams: [],
      isOutOfSequence: true,
      previousOpenCount: 1,
      isOverdue: true,
      hasAssignees: true,
    },
  ],
  meta: { limit: 100 },
}

function jsonRoute(body) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
})
const page = await context.newPage()

await page.route('**/api/v1/auth/me', (route) =>
  route.fulfill(jsonRoute({ data: { user: mockUser, sessionIdle: mockSessionIdle } })),
)
await page.route('**/api/v1/operational-planning/week**', (route) =>
  route.fulfill(jsonRoute({ data: mockWeek })),
)
await page.route('**/api/v1/collaborators**', (route) =>
  route.fulfill(jsonRoute({ data: mockCollaborators })),
)
await page.route('**/api/v1/operational-planning/backlog**', (route) =>
  route.fulfill(jsonRoute({ data: mockBacklog })),
)

try {
  await page.goto(`${baseUrl}/app/agenda-semanal`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="weekly-agenda-attention-chip"]', { timeout: 60000 })

  const chipText = await page.getByTestId('weekly-agenda-attention-chip').innerText()
  if (!chipText.includes('2')) {
    throw new Error(`Expected attention count 2, got: ${chipText}`)
  }

  await page.getByTestId('weekly-agenda-attention-chip').click()
  await page.waitForSelector('[data-testid="weekly-agenda-attention-drawer"]', { timeout: 10000 })
  const drawerText = await page.getByTestId('weekly-agenda-attention-drawer').innerText()
  if (!drawerText.includes('Pendências de sincronização')) {
    throw new Error('Attention drawer missing sync panel')
  }
  if (!drawerText.includes('Fora do planejado')) {
    throw new Error('Attention drawer missing outside-plan panel')
  }
  if (!drawerText.includes('Recuperar espuma — divergente')) {
    throw new Error('Attention drawer missing diverged item')
  }
  if (!drawerText.includes('Lixar painel')) {
    throw new Error('Attention drawer missing outside-plan entry')
  }

  await mkdir(outDir, { recursive: true })
  await page.screenshot({ path: attentionPath, fullPage: false })

  await page.getByRole('button', { name: 'Fechar painel de atenção' }).click()
  await page.waitForSelector('[data-testid="weekly-agenda-attention-drawer"]', {
    state: 'detached',
    timeout: 5000,
  })

  const badgeText = await page.getByTestId('weekly-agenda-backlog-fab-badge').innerText()
  if (badgeText !== '2') {
    throw new Error(`Expected backlog badge 2, got: ${badgeText}`)
  }

  await page.getByTestId('weekly-agenda-backlog-fab').click()
  await page.waitForSelector('[data-testid="weekly-agenda-backlog-drawer"]', { timeout: 10000 })
  const backlogText = await page.getByTestId('weekly-agenda-backlog-drawer').innerText()
  if (!backlogText.includes('Cortar tecido — backlog')) {
    throw new Error('Backlog drawer missing first item')
  }
  if (!backlogText.includes('Costurar capa — backlog')) {
    throw new Error('Backlog drawer missing second item')
  }

  await page.screenshot({ path: backlogPath, fullPage: false })

  console.log(`OK attention: ${attentionPath}`)
  console.log(`OK backlog: ${backlogPath}`)
  console.log(
    JSON.stringify({
      attentionCount: chipText.match(/\d+/)?.[0],
      backlogBadge: badgeText,
      attentionDrawerOk: true,
      backlogDrawerOk: true,
    }),
  )
} finally {
  await browser.close()
}
