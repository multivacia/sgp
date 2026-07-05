export const weekStart = '2026-06-29'
export const weekEnd = '2026-07-03'
export const weekdayDates = [
  '2026-06-29',
  '2026-06-30',
  '2026-07-01',
  '2026-07-02',
  '2026-07-03',
]

export const mockSessionIdle = {
  idleTimeoutMinutes: 60,
  idleWarningMinutes: 5,
  lastActivityAt: new Date().toISOString(),
  idleExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
}

export const mockUser = {
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

export const mockCollaborators = [
  {
    id: 'col-1',
    full_name: 'Carlos',
    code: 'COL-001',
    status: 'ACTIVE',
    is_active: true,
  },
]

/** Payload PR-2: grade com 2 dias, sem itens de atenção. */
export const mockWeekPr2 = {
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

/** Payload PR-3: 1 divergência + 1 fora do plano. */
export const mockWeekPr3 = {
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
      activityNodeId: 'act-out',
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

export const mockBacklogPr3 = {
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

export function jsonRoute(body) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  }
}

export async function installWeeklyAgendaRoutes(page, { week, backlog = null }) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill(jsonRoute({ data: { user: mockUser, sessionIdle: mockSessionIdle } })),
  )
  await page.route('**/api/v1/operational-planning/week**', (route) =>
    route.fulfill(jsonRoute({ data: week })),
  )
  await page.route('**/api/v1/collaborators**', (route) =>
    route.fulfill(jsonRoute({ data: mockCollaborators })),
  )
  if (backlog) {
    await page.route('**/api/v1/operational-planning/backlog**', (route) =>
      route.fulfill(jsonRoute({ data: backlog })),
    )
  }
}

/** PR-4: plano salvo com 2 itens na mesma célula (reorder) + 1 item em outro dia (move). */
export const mockWeekPr4 = {
  hasPlan: true,
  week: { weekStartDate: weekStart, weekEndDate: weekEnd, weekdayDates },
  plan: {
    id: 'plan-pr4',
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    status: 'DRAFT',
    publishedAt: null,
    createdAt: '2026-06-29T12:00:00.000Z',
    updatedAt: '2026-06-29T12:00:00.000Z',
    items: [
      {
        id: 'item-first',
        conveyorId: 'conv-1',
        conveyorTitle: 'ET-001 · Reforma bancos',
        activityNodeId: 'act-first',
        taskTitle: 'Tapeçaria',
        sectorTitle: 'Montagem',
        activityTitle: 'Primeiro item — SEG',
        assignedCollaboratorId: 'col-1',
        assignedCollaboratorName: 'Carlos',
        plannedDate: weekdayDates[0],
        plannedOrder: 0,
        plannedMinutes: 60,
        status: 'ACTIVE',
        notes: null,
        realizedMinutes: 0,
        activityOperationalStatus: 'PENDING',
        syncStatus: 'SYNCED',
      },
      {
        id: 'item-second',
        conveyorId: 'conv-1',
        conveyorTitle: 'ET-001 · Reforma bancos',
        activityNodeId: 'act-second',
        taskTitle: 'Tapeçaria',
        sectorTitle: 'Montagem',
        activityTitle: 'Segundo item — SEG',
        assignedCollaboratorId: 'col-1',
        assignedCollaboratorName: 'Carlos',
        plannedDate: weekdayDates[0],
        plannedOrder: 1,
        plannedMinutes: 45,
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
        activityTitle: 'Item na TER',
        assignedCollaboratorId: 'col-1',
        assignedCollaboratorName: 'Carlos',
        plannedDate: weekdayDates[1],
        plannedOrder: 0,
        plannedMinutes: 90,
        status: 'ACTIVE',
        notes: null,
        realizedMinutes: 0,
        activityOperationalStatus: 'PENDING',
        syncStatus: 'SYNCED',
      },
    ],
  },
  summary: { plannedMinutes: 195, plannedItems: 3, collaboratorsCount: 1 },
  capacityByCollaboratorDay: [
    {
      collaboratorId: 'col-1',
      date: weekdayDates[0],
      capacityMinutes: 480,
      plannedMinutes: 105,
    },
    {
      collaboratorId: 'col-1',
      date: weekdayDates[1],
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

export const mockBacklogPr4 = {
  items: [
    {
      conveyorId: 'conv-3',
      conveyorTitle: 'ET-003 · Backlog',
      clientName: null,
      vehicleDescription: null,
      licensePlate: null,
      taskTitle: 'Tapeçaria',
      sectorTitle: 'Montagem',
      activityNodeId: 'act-backlog-1',
      activityTitle: 'Do backlog — PR4',
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
  ],
  meta: { limit: 100 },
}

function mapSaveItemsToPlanItems(items, previousItems = []) {
  const prevByActivity = new Map(previousItems.map((i) => [i.activityNodeId, i]))
  const backlogByActivity = new Map(
    mockBacklogPr4.items.map((i) => [i.activityNodeId, i]),
  )
  return items.map((it, idx) => {
    const prev = prevByActivity.get(it.activityNodeId)
    const backlog = backlogByActivity.get(it.activityNodeId)
    return {
      id: prev?.id ?? `saved-${it.activityNodeId}-${idx}`,
      conveyorId: it.conveyorId,
      conveyorTitle: prev?.conveyorTitle ?? backlog?.conveyorTitle ?? 'ET · Salvo',
      activityNodeId: it.activityNodeId,
      taskTitle: prev?.taskTitle ?? backlog?.taskTitle ?? 'Tapeçaria',
      sectorTitle: prev?.sectorTitle ?? backlog?.sectorTitle ?? 'Montagem',
      activityTitle:
        prev?.activityTitle ?? backlog?.activityTitle ?? `Atividade ${it.activityNodeId}`,
      assignedCollaboratorId: it.assignedCollaboratorId,
      assignedCollaboratorName: 'Carlos',
      plannedDate: it.plannedDate,
      plannedOrder: it.plannedOrder,
      plannedMinutes: it.plannedMinutes,
      status: 'ACTIVE',
      notes: it.notes ?? null,
      realizedMinutes: prev?.realizedMinutes ?? 0,
      activityOperationalStatus: prev?.activityOperationalStatus ?? 'PENDING',
      syncStatus: 'SYNCED',
      conveyorOperationalPlanItemId: it.conveyorOperationalPlanItemId ?? null,
    }
  })
}

function applySaveBodyToWeek(week, body) {
  const next = structuredClone(week)
  next.hasPlan = true
  next.plan = {
    ...next.plan,
    id: next.plan?.id ?? 'plan-pr4',
    weekStartDate: body.weekStartDate,
    weekEndDate: body.weekEndDate,
    status: next.plan?.status ?? 'DRAFT',
    items: mapSaveItemsToPlanItems(body.items, next.plan?.items ?? []),
    updatedAt: new Date().toISOString(),
  }
  next.summary = {
    plannedMinutes: next.plan.items.reduce((s, i) => s + (i.plannedMinutes ?? 0), 0),
    plannedItems: next.plan.items.length,
    collaboratorsCount: 1,
  }
  return next
}

/** Rotas stateful para PR-4: GET/PATCH/publish persistem em memória na sessão Playwright. */
export async function installWeeklyAgendaPr4Routes(page) {
  let weekState = structuredClone(mockWeekPr4)
  const backlogState = structuredClone(mockBacklogPr4)
  const metrics = { saveCalls: 0, publishCalls: 0 }

  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill(jsonRoute({ data: { user: mockUser, sessionIdle: mockSessionIdle } })),
  )
  await page.route('**/api/v1/collaborators**', (route) =>
    route.fulfill(jsonRoute({ data: mockCollaborators })),
  )
  await page.route('**/api/v1/operational-planning/backlog**', (route) =>
    route.fulfill(jsonRoute({ data: backlogState })),
  )

  await page.route('**/api/v1/operational-planning/week**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (method === 'GET' && url.includes('/operational-planning/week?')) {
      return route.fulfill(jsonRoute({ data: weekState }))
    }

    if (method === 'PATCH' && url.includes('/operational-planning/week/')) {
      const body = route.request().postDataJSON()
      weekState = applySaveBodyToWeek(weekState, body)
      metrics.saveCalls += 1
      return route.fulfill(jsonRoute({ data: weekState }))
    }

    if (method === 'POST' && url.includes('/publish')) {
      weekState.plan.status = 'PUBLISHED'
      weekState.plan.publishedAt = new Date().toISOString()
      metrics.publishCalls += 1
      return route.fulfill(jsonRoute({ data: { published: true } }))
    }

    if (method === 'POST' && url.endsWith('/operational-planning/week')) {
      const body = route.request().postDataJSON()
      weekState = applySaveBodyToWeek(weekState, body)
      metrics.saveCalls += 1
      return route.fulfill(jsonRoute({ data: weekState }))
    }

    return route.continue()
  })

  return {
    getWeekState: () => weekState,
    getMetrics: () => ({ ...metrics }),
  }
}
