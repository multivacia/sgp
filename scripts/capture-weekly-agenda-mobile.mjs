/**
 * Prova de runtime (Chromium 390px): abas filtram colunas da grade.
 * Usa a app Vite real com API mockada (login indisponível neste ambiente).
 *
 * Uso: node scripts/capture-weekly-agenda-mobile.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const baseUrl = process.argv[2] ?? 'http://localhost:5174'
const outDir = path.join(__dirname, '../docs/discovery')
const outPath = path.join(outDir, 'pr2-mobile-day-filter.png')

const weekStart = '2026-06-29'
const weekEnd = '2026-07-03'
const weekdayDates = [
  '2026-06-29',
  '2026-06-30',
  '2026-07-01',
  '2026-07-02',
  '2026-07-03',
]

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
        id: 'item-mon',
        conveyorId: 'conv-1',
        conveyorTitle: 'ET-001 · Reforma bancos',
        activityNodeId: 'act-mon',
        taskTitle: 'Tapeçaria',
        sectorTitle: 'Montagem',
        activityTitle: 'Recuperar espuma — SEG',
        assignedCollaboratorId: 'col-1',
        assignedCollaboratorName: 'Carlos',
        plannedDate: '2026-06-29',
        plannedOrder: 0,
        plannedMinutes: 120,
        status: 'ACTIVE',
        notes: null,
        realizedMinutes: 0,
        activityOperationalStatus: 'PENDING',
        syncStatus: 'SYNCED',
      },
      {
        id: 'item-tue',
        conveyorId: 'conv-2',
        conveyorTitle: 'ET-002 · Reforma teto',
        activityNodeId: 'act-tue',
        taskTitle: 'Tapeçaria',
        sectorTitle: 'Acabamento',
        activityTitle: 'Aplicar revestimento — TER',
        assignedCollaboratorId: 'col-1',
        assignedCollaboratorName: 'Carlos',
        plannedDate: '2026-06-30',
        plannedOrder: 0,
        plannedMinutes: 90,
        status: 'ACTIVE',
        notes: null,
        realizedMinutes: 15,
        activityOperationalStatus: 'IN_PROGRESS',
        syncStatus: 'SYNCED',
      },
    ],
  },
  summary: { plannedMinutes: 210, plannedItems: 2, collaboratorsCount: 1 },
  capacityByCollaboratorDay: [
    {
      collaboratorId: 'col-1',
      date: '2026-06-29',
      capacityMinutes: 480,
      plannedMinutes: 120,
    },
    {
      collaboratorId: 'col-1',
      date: '2026-06-30',
      capacityMinutes: 480,
      plannedMinutes: 90,
    },
  ],
  executionOutsidePlanSummary: {
    totalMinutes: 0,
    entriesCount: 0,
    activitiesCount: 0,
    conveyorsCount: 0,
  },
  executionOutsidePlanEntries: [],
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

function jsonRoute(body) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
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

try {
  await page.goto(`${baseUrl}/app/agenda-semanal`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="weekly-agenda-day-tabs"]', { timeout: 60000 })

  const monday = weekdayDates[0]
  const tuesday = weekdayDates[1]

  const colVisible = async (day) =>
    page.locator(`[data-testid="weekly-agenda-day-col-${day}"]`).evaluate((el) => {
      const style = window.getComputedStyle(el)
      return style.display !== 'none'
    })

  const cardText = async (activityId) => {
    const cell = page.locator(`[data-testid="weekly-agenda-cell-col-1-${activityId === 'mon' ? monday : tuesday}"]`)
    return cell.innerText()
  }

  await page.getByTestId(`weekly-agenda-day-tab-${monday}`).click()
  await page.waitForTimeout(300)
  const monOnly =
    (await colVisible(monday)) &&
    !(await colVisible(tuesday)) &&
    (await page.getByText('Recuperar espuma — SEG').isVisible())

  await page.getByTestId(`weekly-agenda-day-tab-${tuesday}`).click()
  await page.waitForTimeout(300)
  const tueOnly =
    (await colVisible(tuesday)) &&
    !(await colVisible(monday)) &&
    (await page.getByText('Aplicar revestimento — TER').isVisible())

  if (!monOnly || !tueOnly) {
    throw new Error(JSON.stringify({ monOnly, tueOnly }))
  }

  await mkdir(outDir, { recursive: true })
  await page.screenshot({ path: outPath, fullPage: true })

  console.log(`OK screenshot: ${outPath}`)
  console.log(
    JSON.stringify({
      monOnly,
      tueOnly,
      selectedLabel: await page.getByTestId('weekly-agenda-mobile-selected-day').innerText(),
    }),
  )
} finally {
  await browser.close()
}
