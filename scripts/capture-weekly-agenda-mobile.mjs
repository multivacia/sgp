/**
 * Prova de runtime — Agenda da semana (Playwright + API mockada).
 *
 * Cenários:
 *   pr2-mobile (default) — abas filtram colunas em viewport 390px
 *   pr3-desktop — drawer atenção + FAB/gaveta backlog em 1280px
 *   pr3-mobile — PR-3 drawers + regressão abas mobile em 390px
 *   pr4-desktop — DnD + salvar/publicar em 1280px
 *   pr4-mobile — salvar rascunho após DnD em 390px
 *   pr4-mid-drag — screenshot no meio do arraste backlog→grade (gaveta fechada + banner)
 *   pr4-drag-follow-trail — vídeo + frames do gesto; prova overlay segue ponteiro
 *   pr4-day-tab-drop — plan|* → day-tab|* (mobile; colaborador mantido, dia muda)
 *   pr4-mobile-reorder — reorder na mesma célula (mobile; scroll + save)
 *   pr4-touch-reorder-probe — investigação reorder: mouse desktop vs mouse/touch mobile
 *
 * Uso:
 *   node scripts/capture-weekly-agenda-mobile.mjs [baseUrl]
 *   node scripts/capture-weekly-agenda-mobile.mjs --scenario pr3-desktop [baseUrl]
 *   node scripts/capture-weekly-agenda-mobile.mjs --scenario pr3-mobile [baseUrl]
 *   node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-desktop [baseUrl]
 *   node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-mobile [baseUrl]
 *   node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-mid-drag [baseUrl]
 *   node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-drag-follow-trail [baseUrl]
 *   node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-day-tab-drop [baseUrl]
 *   node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-mobile-reorder [baseUrl]
 *   node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-touch-reorder-probe [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  installWeeklyAgendaRoutes,
  installWeeklyAgendaPr4Routes,
  mockBacklogPr3,
  mockWeekPr2,
  mockWeekPr3,
  weekdayDates,
} from './lib/weekly-agenda-capture-fixtures.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../docs/discovery')

const args = process.argv.slice(2)
const scenarioFlag = args.find((a) => a.startsWith('--scenario='))
  ? args.find((a) => a.startsWith('--scenario=')).split('=')[1]
  : args.includes('--scenario')
    ? args[args.indexOf('--scenario') + 1]
    : null
const baseUrl =
  args.find((a) => a.startsWith('http')) ??
  args.filter((a) => !a.startsWith('--') && a !== scenarioFlag)[0] ??
  'http://localhost:5174'
const scenario = scenarioFlag ?? 'pr2-mobile'

async function runPr2Mobile(page, labels = {}) {
  const monCardText = labels.monCardText ?? 'Recuperar espuma — SEG'
  const tueCardText = labels.tueCardText ?? 'Aplicar revestimento — TER'
  const outPath = path.join(outDir, 'pr2-mobile-day-filter.png')
  const monday = weekdayDates[0]
  const tuesday = weekdayDates[1]

  await page.goto(`${baseUrl}/app/agenda-semanal`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="weekly-agenda-day-tabs"]', { timeout: 60000 })

  const colVisible = async (day) =>
    page.locator(`[data-testid="weekly-agenda-day-col-${day}"]`).evaluate((el) => {
      const style = window.getComputedStyle(el)
      return style.display !== 'none'
    })

  await page.getByTestId(`weekly-agenda-day-tab-${monday}`).click()
  await page.waitForTimeout(300)
  const monOnly =
    (await colVisible(monday)) &&
    !(await colVisible(tuesday)) &&
    (await page.getByText(monCardText).isVisible())

  await page.getByTestId(`weekly-agenda-day-tab-${tuesday}`).click()
  await page.waitForTimeout(300)
  const tueOnly =
    (await colVisible(tuesday)) &&
    !(await colVisible(monday)) &&
    (await page.getByText(tueCardText).isVisible())

  if (!monOnly || !tueOnly) {
    throw new Error(JSON.stringify({ monOnly, tueOnly }))
  }

  await mkdir(outDir, { recursive: true })
  await page.screenshot({ path: outPath, fullPage: true })

  return {
    screenshot: outPath,
    monOnly,
    tueOnly,
    selectedLabel: await page.getByTestId('weekly-agenda-mobile-selected-day').innerText(),
  }
}

async function runPr3Flows(page, { mobile }) {
  const attentionPath = path.join(outDir, mobile ? 'pr3-mobile-attention-drawer.png' : 'pr3-attention-drawer.png')
  const backlogPath = path.join(outDir, mobile ? 'pr3-mobile-backlog-drawer.png' : 'pr3-backlog-drawer.png')

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
  if (drawerText.includes('Aplicar plano da esteira')) {
    // sync panel action from reused component
  }

  await mkdir(outDir, { recursive: true })
  await page.screenshot({ path: attentionPath, fullPage: false })

  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-testid="weekly-agenda-attention-drawer"]', {
    state: 'detached',
    timeout: 5000,
  })

  const badgeText = await page.getByTestId('weekly-agenda-backlog-fab-badge').innerText()
  if (badgeText !== '2') {
    throw new Error(`Expected backlog badge 2 (API count), got: ${badgeText}`)
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
  if (backlogText.includes('Atribuir') || backlogText.includes('Adicionar ao plano')) {
    throw new Error('Backlog drawer must be read-only (no assign actions)')
  }

  await page.screenshot({ path: backlogPath, fullPage: false })

  let mobileRegression = null
  if (mobile) {
    await page.keyboard.press('Escape')
    await page.waitForSelector('[data-testid="weekly-agenda-backlog-drawer"]', {
      state: 'detached',
      timeout: 5000,
    })
    mobileRegression = await runPr2Mobile(page, {
      monCardText: 'Recuperar espuma — divergente',
    })
  }

  return {
    attentionScreenshot: attentionPath,
    backlogScreenshot: backlogPath,
    attentionCount: chipText.match(/\d+/)?.[0],
    backlogBadge: badgeText,
    mobileRegression,
  }
}

async function dragWeeklyAgendaItem(page, sourceTestId, targetTestId) {
  const source = page.getByTestId(sourceTestId)
  const target = page.getByTestId(targetTestId)
  await source.scrollIntoViewIfNeeded()
  const sBox = await source.boundingBox()
  const tBox = await target.boundingBox()
  if (!sBox || !tBox) {
    throw new Error(`Missing bounding box for drag ${sourceTestId} -> ${targetTestId}`)
  }
  const sx = sBox.x + sBox.width / 2
  const sy = sBox.y + sBox.height / 2
  const tx = tBox.x + tBox.width / 2
  const ty = tBox.y + tBox.height / 2
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + 12, sy + 12, { steps: 4 })
  await page.mouse.move(tx, ty, { steps: 30 })
  await page.waitForTimeout(300)
  await page.mouse.up()
  await page.waitForTimeout(900)
}

async function waitForWeeklyAgendaDirty(page, timeout = 8000) {
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="weekly-agenda-save-draft"]')
      return btn instanceof HTMLButtonElement && !btn.disabled
    },
    { timeout },
  )
}

async function runPr4Flows(page, { mobile, pr4Api, appBaseUrl, mobileSaveOnly = false }) {
  const monday = weekdayDates[0]
  const tuesday = weekdayDates[1]
  const wednesday = weekdayDates[2]

  await page.goto(`${appBaseUrl}/app/agenda-semanal`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="weekly-agenda-board"]', { timeout: 60000 })
  await page.waitForTimeout(500)

  // 1) Backlog → célula (terça)
  if (mobile) {
    await page.getByTestId(`weekly-agenda-day-tab-${tuesday}`).click()
    await page.waitForTimeout(400)
  }
  await page.getByTestId('weekly-agenda-backlog-fab').click()
  await page.waitForSelector('[data-testid="weekly-agenda-backlog-drawer"]', { timeout: 10000 })
  await page.waitForSelector('[data-testid="weekly-agenda-backlog-card-act-backlog-1"]', {
    timeout: 10000,
  })
  {
    let backlogDropped = false
    for (let attempt = 0; attempt < 3 && !backlogDropped; attempt += 1) {
      const source = page.getByTestId('weekly-agenda-backlog-card-act-backlog-1')
      const target = page.getByTestId(`weekly-agenda-cell-drop-col-1-${tuesday}`)
      const sBox = await source.boundingBox()
      const tBox = await target.boundingBox()
      if (!sBox || !tBox) {
        throw new Error('Missing bounding box for backlog drag')
      }
      await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(sBox.x + 12, sBox.y + 12, { steps: 4 })
      await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, { steps: 30 })
      await page.waitForTimeout(300)
      await page.mouse.up()
      try {
        await waitForWeeklyAgendaDirty(page, 3000)
        backlogDropped = true
      } catch {
        await page.waitForTimeout(500)
      }
    }
    if (!backlogDropped) {
      const count = await page
        .locator('[data-testid^="weekly-agenda-plan-card-"]:not([data-testid*="menu"])')
        .count()
      const dirty = await page.getByTestId('weekly-agenda-save-draft').isEnabled()
      throw new Error(
        `Backlog drag did not dirty draft after retries (cards=${count}, dirty=${dirty})`,
      )
    }
  }
  try {
    await waitForWeeklyAgendaDirty(page)
  } catch {
    /* already dirty */
  }
  if (
    !(await page
      .getByTestId('weekly-agenda-board')
      .getByText('Do backlog — PR4')
      .isVisible())
  ) {
    throw new Error('Backlog item not visible in board after drag')
  }
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-testid="weekly-agenda-backlog-drawer"]', {
    state: 'detached',
    timeout: 5000,
  })

  if (mobileSaveOnly) {
    await page.getByTestId('weekly-agenda-save-draft').click()
    await page.waitForSelector('[data-testid="weekly-agenda-success-msg"]', { timeout: 10000 })
    if (pr4Api.getMetrics().saveCalls < 1) {
      throw new Error('Expected save/patch API call on mobile')
    }
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="weekly-agenda-board"]', { timeout: 60000 })
    if (mobile) {
      await page.getByTestId(`weekly-agenda-day-tab-${tuesday}`).click()
      await page.waitForTimeout(400)
    }
    if (
      !(await page
        .getByTestId('weekly-agenda-board')
        .getByText('Do backlog — PR4')
        .isVisible())
    ) {
      throw new Error('Mobile save: backlog item missing after reload')
    }
    await page.getByTestId('weekly-agenda-publish').click()
    await page.waitForSelector('[data-testid="weekly-agenda-success-msg"]', { timeout: 10000 })
    const statusText = await page.getByTestId('weekly-agenda-plan-status').innerText()
    if (!statusText.includes('Publicado')) {
      throw new Error(`Mobile publish: expected published status, got ${statusText}`)
    }
    const screenshotPath = path.join(outDir, 'pr4-mobile-save-dnd.png')
    await mkdir(outDir, { recursive: true })
    await page.screenshot({ path: screenshotPath, fullPage: true })
    return {
      screenshot: screenshotPath,
      saveCalls: pr4Api.getMetrics().saveCalls,
      publishCalls: pr4Api.getMetrics().publishCalls,
      itemCount: pr4Api.getWeekState().plan.items.length,
      published: pr4Api.getWeekState().plan.status,
      mobileSaveOnly: true,
    }
  }

  // 2) Planejado → outra célula (item TER → SEG)
  if (mobile) {
    await page.getByTestId(`weekly-agenda-day-tab-${tuesday}`).click()
    await page.waitForTimeout(400)
    await dragWeeklyAgendaItem(
      page,
      'weekly-agenda-plan-card-item-tue',
      `weekly-agenda-day-tab-${monday}`,
    )
    await page.getByTestId(`weekly-agenda-day-tab-${monday}`).click()
    await page.waitForTimeout(400)
  } else {
    await dragWeeklyAgendaItem(
      page,
      'weekly-agenda-plan-card-item-tue',
      `weekly-agenda-cell-drop-col-1-${monday}`,
    )
  }
  const mondayCell = page.getByTestId(`weekly-agenda-cell-col-1-${monday}`)
  if (!(await mondayCell.locator('[data-testid="weekly-agenda-plan-card-item-tue"]').isVisible())) {
    throw new Error('Planned item did not move to Monday cell')
  }

  // 3) Planejado → outro dia (aba em mobile; célula na quarta em desktop — abas são lg:hidden)
  if (mobile) {
    await page.getByTestId(`weekly-agenda-day-tab-${wednesday}`).scrollIntoViewIfNeeded()
    await dragWeeklyAgendaItem(
      page,
      'weekly-agenda-plan-card-item-first',
      `weekly-agenda-day-tab-${wednesday}`,
    )
    await page.getByTestId(`weekly-agenda-day-tab-${wednesday}`).click()
    await page.waitForTimeout(300)
  } else {
    await dragWeeklyAgendaItem(
      page,
      'weekly-agenda-plan-card-item-first',
      `weekly-agenda-cell-drop-col-1-${wednesday}`,
    )
  }
  const wedCell = page.getByTestId(`weekly-agenda-cell-col-1-${wednesday}`)
  if (mobile) {
    await page.getByTestId(`weekly-agenda-day-tab-${wednesday}`).click()
    await page.waitForTimeout(300)
  }
  if (!(await wedCell.locator('[data-testid="weekly-agenda-plan-card-item-first"]').isVisible())) {
    throw new Error('Plan item did not move to Wednesday')
  }

  // 4) Reordenar na mesma célula (segunda-feira: segundo antes do primeiro restante)
  if (!mobile) {
    await page.getByTestId(`weekly-agenda-day-tab-${monday}`).click().catch(() => {})
  } else {
    await page.getByTestId(`weekly-agenda-day-tab-${monday}`).click()
    await page.waitForTimeout(300)
  }
  {
    const source = page.getByTestId('weekly-agenda-plan-card-item-second')
    const target = page.getByTestId('weekly-agenda-plan-card-item-tue')
    const sBox = await source.boundingBox()
    const tBox = await target.boundingBox()
    if (!sBox || !tBox) throw new Error('Missing bounding box for reorder drag')
    await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(sBox.x + 12, sBox.y + 12, { steps: 4 })
    await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, { steps: 30 })
    await page.waitForTimeout(300)
    await page.mouse.up()
    await page.waitForTimeout(900)
  }
  const mondayCards = page.getByTestId(`weekly-agenda-cell-col-1-${monday}`)
  const cardLocators = mondayCards.locator(
    '[data-testid^="weekly-agenda-plan-card-"]:not([data-testid*="menu"])',
  )
  const cardCount = await cardLocators.count()
  let secondIdx = -1
  let tueIdx = -1
  for (let i = 0; i < cardCount; i += 1) {
    const text = await cardLocators.nth(i).innerText()
    if (text.includes('Segundo item — SEG')) secondIdx = i
    if (text.includes('Item na TER')) tueIdx = i
  }
  if (secondIdx < 0 || tueIdx < 0 || secondIdx >= tueIdx) {
    throw new Error(`Reorder failed: secondIdx=${secondIdx}, tueIdx=${tueIdx} (expected second before tue)`)
  }

  // 5) Salvar rascunho + reload → persistência via API mock
  await page.getByTestId('weekly-agenda-save-draft').click()
  await page.waitForSelector('[data-testid="weekly-agenda-success-msg"]', { timeout: 10000 })
  const beforeReload = pr4Api.getWeekState().plan.items.map((i) => i.activityNodeId)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="weekly-agenda-board"]', { timeout: 60000 })
  if (pr4Api.getMetrics().saveCalls < 1) {
    throw new Error('Expected at least one save/patch API call')
  }
  if (!(await page.locator('[data-testid^="weekly-agenda-plan-card-"]:not([data-testid*="menu"])').filter({ hasText: 'Do backlog — PR4' }).isVisible())) {
    throw new Error('Saved backlog item missing after reload')
  }
  const afterReload = pr4Api.getWeekState().plan.items.map((i) => i.activityNodeId)
  if (afterReload.length !== beforeReload.length) {
    throw new Error('Week state item count changed unexpectedly after reload')
  }

  // 6) Publicar → botão desabilita + status publicado
  await page.getByTestId('weekly-agenda-publish').click()
  await page.waitForSelector('[data-testid="weekly-agenda-success-msg"]', { timeout: 10000 })
  if (pr4Api.getMetrics().publishCalls < 1) {
    throw new Error('Expected publish API call')
  }
  const statusText = await page.getByTestId('weekly-agenda-plan-status').innerText()
  if (!statusText.includes('Publicado')) {
    throw new Error(`Expected published status, got: ${statusText}`)
  }
  if (!(await page.getByTestId('weekly-agenda-publish').isDisabled())) {
    throw new Error('Publish button should be disabled after publish')
  }

  const screenshotName = mobile ? 'pr4-mobile-save-dnd.png' : 'pr4-desktop-dnd-save-publish.png'
  const screenshotPath = path.join(outDir, screenshotName)
  await mkdir(outDir, { recursive: true })
  await page.screenshot({ path: screenshotPath, fullPage: !mobile })

  return {
    screenshot: screenshotPath,
    saveCalls: pr4Api.getMetrics().saveCalls,
    publishCalls: pr4Api.getMetrics().publishCalls,
    itemCount: pr4Api.getWeekState().plan.items.length,
    published: pr4Api.getWeekState().plan.status,
  }
}

/** PR-4 fix: captura o instante do meio do arraste (mouse ainda pressionado). */
async function runPr4MidDrag(page, { appBaseUrl }) {
  const tuesday = weekdayDates[1]
  const screenshotPath = path.join(outDir, 'pr4-mid-drag-backlog.png')

  await page.goto(`${appBaseUrl}/app/agenda-semanal`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="weekly-agenda-board"]', { timeout: 60000 })

  await page.getByTestId('weekly-agenda-backlog-fab').click()
  await page.waitForSelector('[data-testid="weekly-agenda-backlog-drawer"]', { timeout: 10000 })

  const source = page.getByTestId('weekly-agenda-backlog-card-act-backlog-1')
  const target = page.getByTestId(`weekly-agenda-cell-drop-col-1-${tuesday}`)
  await target.scrollIntoViewIfNeeded()
  const sBox = await source.boundingBox()
  const tBox = await target.boundingBox()
  if (!sBox || !tBox) {
    throw new Error('Missing bounding box for mid-drag capture')
  }

  const sx = sBox.x + sBox.width / 2
  const sy = sBox.y + sBox.height / 2
  const tx = tBox.x + tBox.width / 2
  const ty = tBox.y + tBox.height / 2

  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + 12, sy + 12, { steps: 4 })
  await page.mouse.move(tx, ty, { steps: 24 })
  await page.waitForTimeout(350)

  await page.waitForSelector('[data-testid="weekly-agenda-placing-banner"]', { timeout: 5000 })
  await page.waitForSelector('[data-testid="weekly-agenda-backlog-drawer"]', {
    state: 'detached',
    timeout: 5000,
  })

  const bannerText = await page.getByTestId('weekly-agenda-placing-banner').innerText()
  if (!bannerText.includes('Do backlog — PR4')) {
    throw new Error(`Placing banner missing item title: ${bannerText}`)
  }
  if (!(await page.getByTestId('weekly-agenda-board').isVisible())) {
    throw new Error('Board not visible during mid-drag')
  }

  await page.waitForSelector('[data-testid="weekly-agenda-drag-overlay"]', { timeout: 5000 })
  if (await page.getByTestId('weekly-agenda-dirty-hint').isVisible()) {
    throw new Error('Dirty hint should be hidden during backlog drag (single attention message)')
  }

  await mkdir(outDir, { recursive: true })
  await page.screenshot({ path: screenshotPath, fullPage: true })

  await page.mouse.up()
  await page.waitForTimeout(400)

  return {
    screenshot: screenshotPath,
    bannerVisible: true,
    drawerClosed: true,
    dragOverlayVisible: true,
    dirtyHintSuppressed: true,
  }
}

async function readDragOverlaySample(page, mouseX, mouseY) {
  return page.evaluate(
    ({ mx, my }) => {
      const overlay = document.querySelector('[data-testid="weekly-agenda-drag-overlay"]')
      if (!overlay) return { error: 'no-overlay' }
      const rect = overlay.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      let wrapperTransform = 'none'
      let node = overlay.parentElement
      while (node && node !== document.body) {
        const t = getComputedStyle(node).transform
        if (t && t !== 'none') {
          wrapperTransform = t
          break
        }
        node = node.parentElement
      }
      return {
        mouseX: mx,
        mouseY: my,
        overlayCenter: { x: centerX, y: centerY },
        centerDeltaFromMouse: { dx: centerX - mx, dy: centerY - my },
        wrapperTransform,
        dragOver: [...document.querySelectorAll('[data-drag-over="true"]')].map((e) =>
          e.getAttribute('data-testid'),
        ),
      }
    },
    { mx: mouseX, my: mouseY },
  )
}

/** Vídeo + ≥4 frames durante arraste; overlay deve acompanhar ponteiro (não congelado). */
async function runPr4DragFollowTrail(page, { appBaseUrl }) {
  const tuesday = weekdayDates[1]
  const frameDir = path.join(outDir, 'pr4-drag-follow-trail-frames')
  await mkdir(frameDir, { recursive: true })

  await page.goto(`${appBaseUrl}/app/agenda-semanal`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="weekly-agenda-board"]', { timeout: 60000 })

  await page.getByTestId('weekly-agenda-backlog-fab').click()
  await page.waitForSelector('[data-testid="weekly-agenda-backlog-drawer"]', { timeout: 10000 })

  const source = page.getByTestId('weekly-agenda-backlog-card-act-backlog-1')
  const target = page.getByTestId(`weekly-agenda-cell-drop-col-1-${tuesday}`)
  await target.scrollIntoViewIfNeeded()

  const sBox = await source.boundingBox()
  const tBox = await target.boundingBox()
  if (!sBox || !tBox) throw new Error('Missing bounding box for drag-follow trail')

  const sx = sBox.x + sBox.width / 2
  const sy = sBox.y + sBox.height / 2
  const tx = tBox.x + tBox.width / 2
  const ty = tBox.y + tBox.height / 2

  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.waitForTimeout(150)
  await page.mouse.move(sx + 12, sy + 12, { steps: 3 })
  await page.waitForSelector('[data-testid="weekly-agenda-drag-overlay"]', { timeout: 5000 })

  const waypoints = [
    { x: sx + 40, y: sy + 80, label: 'wp1' },
    { x: sx + (tx - sx) * 0.35, y: sy + (ty - sy) * 0.35, label: 'wp2' },
    { x: sx + (tx - sx) * 0.65, y: sy + (ty - sy) * 0.65, label: 'wp3' },
    { x: tx, y: ty, label: 'wp4-over-cell' },
  ]

  const samples = []
  for (let i = 0; i < waypoints.length; i += 1) {
    const wp = waypoints[i]
    await page.mouse.move(wp.x, wp.y, { steps: 18 })
    await page.waitForTimeout(150)
    const sample = await readDragOverlaySample(page, wp.x, wp.y)
    const framePath = path.join(frameDir, `${String(i + 1).padStart(2, '0')}-${wp.label}.png`)
    await page.screenshot({ path: framePath })
    samples.push({ ...sample, label: wp.label, frame: framePath })
  }

  await page.mouse.up()
  await page.waitForTimeout(400)

  const centers = samples.filter((s) => s.overlayCenter).map((s) => s.overlayCenter)
  if (centers.length < 3) throw new Error('Too few overlay position samples')

  let maxTravel = 0
  for (let i = 1; i < centers.length; i += 1) {
    maxTravel = Math.max(
      maxTravel,
      Math.hypot(centers[i].x - centers[0].x, centers[i].y - centers[0].y),
    )
  }
  if (maxTravel < 80) {
    throw new Error(
      `Overlay center moved only ${maxTravel.toFixed(0)}px across waypoints — frozen overlay suspected`,
    )
  }

  const deltas = samples.filter((s) => s.centerDeltaFromMouse).map((s) => s.centerDeltaFromMouse)
  const maxCenterError = Math.max(
    ...samples.map((s) =>
      s.centerDeltaFromMouse
        ? Math.hypot(s.centerDeltaFromMouse.dx, s.centerDeltaFromMouse.dy)
        : 999,
    ),
  )
  if (maxCenterError > 24) {
    throw new Error(
      `Overlay center too far from pointer (max ${maxCenterError.toFixed(0)}px) — portal/modifier misaligned`,
    )
  }

  const deltaSpread =
    deltas.length > 0
      ? Math.max(
          ...deltas.map((d) => Math.abs(d.dx - deltas[0].dx)),
          ...deltas.map((d) => Math.abs(d.dy - deltas[0].dy)),
        )
      : 999
  if (deltaSpread > 8) {
    throw new Error(
      `Grab offset unstable across frames (${deltaSpread.toFixed(1)}px spread) — modifier may use stale transform`,
    )
  }

  return {
    samples,
    maxTravelPx: maxTravel,
    maxCenterErrorPx: maxCenterError,
    deltaSpreadPx: deltaSpread,
    anyDragOver: samples.some((s) => (s.dragOver?.length ?? 0) > 0),
    frameDir,
  }
}

/** plan|* → day-tab|*: mutação applyPlanToDayTabDrop (colaborador mantido, só muda plannedDate). */
async function runPr4DayTabDrop(page, { pr4Api, appBaseUrl }) {
  const monday = weekdayDates[0]
  const wednesday = weekdayDates[2]
  const screenshotPath = path.join(outDir, 'pr4-day-tab-drop.png')

  await page.goto(`${appBaseUrl}/app/agenda-semanal`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="weekly-agenda-day-tabs"]', { timeout: 60000 })
  await page.getByTestId(`weekly-agenda-day-tab-${monday}`).click()
  await page.waitForTimeout(400)

  const beforeItem = pr4Api
    .getWeekState()
    .plan.items.find((i) => i.id === 'item-first')
  if (!beforeItem || beforeItem.plannedDate !== monday || beforeItem.assignedCollaboratorId !== 'col-1') {
    throw new Error('Fixture item-first must start on monday/col-1')
  }

  await dragWeeklyAgendaItem(
    page,
    'weekly-agenda-plan-card-item-first',
    `weekly-agenda-day-tab-${wednesday}`,
  )
  await waitForWeeklyAgendaDirty(page)

  await page.getByTestId(`weekly-agenda-day-tab-${wednesday}`).click()
  await page.waitForTimeout(400)
  const wedCell = page.getByTestId(`weekly-agenda-cell-col-1-${wednesday}`)
  if (!(await wedCell.locator('[data-testid="weekly-agenda-plan-card-item-first"]').isVisible())) {
    throw new Error('item-first not visible on wednesday after day-tab drop')
  }

  await page.getByTestId(`weekly-agenda-day-tab-${monday}`).click()
  await page.waitForTimeout(400)
  const monCell = page.getByTestId(`weekly-agenda-cell-col-1-${monday}`)
  if (await monCell.locator('[data-testid="weekly-agenda-plan-card-item-first"]').isVisible()) {
    throw new Error('item-first still on monday — day-tab drop did not move date')
  }

  await page.getByTestId('weekly-agenda-save-draft').click()
  await page.waitForSelector('[data-testid="weekly-agenda-success-msg"]', { timeout: 10000 })

  const saved = pr4Api.getWeekState().plan.items.find((i) => i.id === 'item-first')
  if (!saved) throw new Error('item-first missing after save')
  if (saved.plannedDate !== wednesday) {
    throw new Error(`Expected plannedDate ${wednesday}, got ${saved.plannedDate}`)
  }
  if (saved.assignedCollaboratorId !== 'col-1') {
    throw new Error(`Expected collaborator col-1 kept, got ${saved.assignedCollaboratorId}`)
  }

  const wednesdayItems = pr4Api
    .getWeekState()
    .plan.items.filter((i) => i.plannedDate === wednesday && i.assignedCollaboratorId === 'col-1')
    .sort((a, b) => a.plannedOrder - b.plannedOrder)
  if (wednesdayItems[0]?.id !== 'item-first') {
    throw new Error('plannedOrder not recalculated: item-first should be first on wednesday')
  }

  await page.getByTestId(`weekly-agenda-day-tab-${wednesday}`).click()
  await page.waitForTimeout(300)
  await mkdir(outDir, { recursive: true })
  await page.screenshot({ path: screenshotPath, fullPage: true })

  return {
    screenshot: screenshotPath,
    dropTarget: `day-tab|${wednesday}`,
    plannedDate: saved.plannedDate,
    assignedCollaboratorId: saved.assignedCollaboratorId,
    plannedOrder: saved.plannedOrder,
    mondayRemaining: pr4Api
      .getWeekState()
      .plan.items.filter((i) => i.plannedDate === monday)
      .map((i) => i.id),
  }
}

async function mouseReorderSameCell(page, monday) {
  const source = page.getByTestId('weekly-agenda-plan-card-item-second')
  const target = page.getByTestId('weekly-agenda-plan-card-item-first')
  await source.scrollIntoViewIfNeeded()
  await target.scrollIntoViewIfNeeded()
  const sBox = await source.boundingBox()
  const tBox = await target.boundingBox()
  if (!sBox || !tBox) return { ok: false, reason: 'missing-bbox' }

  const sx = sBox.x + sBox.width / 2
  const sy = sBox.y + sBox.height / 2
  const tx = tBox.x + tBox.width / 2
  const ty = tBox.y + tBox.height / 2

  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + 12, sy + 12, { steps: 4 })
  await page.mouse.move(tx, ty, { steps: 30 })
  await page.waitForTimeout(300)
  await page.mouse.up()
  await page.waitForTimeout(600)

  const mondayCards = page.getByTestId(`weekly-agenda-cell-col-1-${monday}`)
  const cardLocators = mondayCards.locator(
    '[data-testid^="weekly-agenda-plan-card-"]:not([data-testid*="menu"])',
  )
  const cardCount = await cardLocators.count()
  let secondIdx = -1
  let firstIdx = -1
  for (let i = 0; i < cardCount; i += 1) {
    const text = await cardLocators.nth(i).innerText()
    if (text.includes('Segundo item — SEG')) secondIdx = i
    if (text.includes('Primeiro item — SEG')) firstIdx = i
  }
  return {
    ok: secondIdx >= 0 && firstIdx >= 0 && secondIdx < firstIdx,
    secondIdx,
    firstIdx,
  }
}

async function touchReorderSameCell(page, monday) {
  const source = page.getByTestId('weekly-agenda-plan-card-item-second')
  const target = page.getByTestId('weekly-agenda-plan-card-item-first')
  await source.scrollIntoViewIfNeeded()
  await target.scrollIntoViewIfNeeded()
  const sBox = await source.boundingBox()
  const tBox = await target.boundingBox()
  if (!sBox || !tBox) return { ok: false, reason: 'missing-bbox' }

  const sx = Math.round(sBox.x + sBox.width / 2)
  const sy = Math.round(sBox.y + sBox.height / 2)
  const tx = Math.round(tBox.x + tBox.width / 2)
  const ty = Math.round(tBox.y + tBox.height / 2)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: sx, y: sy }],
  })
  await page.waitForTimeout(250)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: sx + 20, y: sy + 20 }],
  })
  await page.waitForTimeout(50)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: tx, y: ty }],
  })
  await page.waitForTimeout(100)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(700)

  const mondayCards = page.getByTestId(`weekly-agenda-cell-col-1-${monday}`)
  const cardLocators = mondayCards.locator(
    '[data-testid^="weekly-agenda-plan-card-"]:not([data-testid*="menu"])',
  )
  const cardCount = await cardLocators.count()
  let secondIdx = -1
  let firstIdx = -1
  for (let i = 0; i < cardCount; i += 1) {
    const text = await cardLocators.nth(i).innerText()
    if (text.includes('Segundo item — SEG')) secondIdx = i
    if (text.includes('Primeiro item — SEG')) firstIdx = i
  }
  return {
    ok: secondIdx >= 0 && firstIdx >= 0 && secondIdx < firstIdx,
    secondIdx,
    firstIdx,
  }
}

/** plan|* reorder na mesma célula em viewport mobile (com scroll). */
async function runPr4MobileReorder(page, { pr4Api, appBaseUrl }) {
  const monday = weekdayDates[0]
  const screenshotPath = path.join(outDir, 'pr4-mobile-reorder.png')

  await page.goto(`${appBaseUrl}/app/agenda-semanal`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="weekly-agenda-day-tabs"]', { timeout: 60000 })
  await page.getByTestId(`weekly-agenda-day-tab-${monday}`).click()
  await page.waitForTimeout(400)

  const outcome = await mouseReorderSameCell(page, monday)
  if (!outcome.ok) {
    throw new Error(`Mobile reorder failed: ${JSON.stringify(outcome)}`)
  }

  await waitForWeeklyAgendaDirty(page)
  await page.getByTestId('weekly-agenda-save-draft').click()
  await page.waitForSelector('[data-testid="weekly-agenda-success-msg"]', { timeout: 10000 })

  const mondayItems = pr4Api
    .getWeekState()
    .plan.items.filter((i) => i.plannedDate === monday && i.assignedCollaboratorId === 'col-1')
    .sort((a, b) => a.plannedOrder - b.plannedOrder)
  if (mondayItems[0]?.id !== 'item-second' || mondayItems[1]?.id !== 'item-first') {
    throw new Error(
      `Expected item-second first, item-first second; got ${mondayItems.map((i) => i.id).join(',')}`,
    )
  }

  await mkdir(outDir, { recursive: true })
  await page.screenshot({ path: screenshotPath, fullPage: true })

  return {
    screenshot: screenshotPath,
    reorderOutcome: outcome,
    mondayOrder: mondayItems.map((i) => ({ id: i.id, plannedOrder: i.plannedOrder })),
  }
}

/** Investiga flake de reorder: compara mouse vs touch em viewports desktop/mobile. */
async function runPr4TouchReorderProbe(page, { appBaseUrl, viewportLabel, inputMode }) {
  const monday = weekdayDates[0]
  const attempts = 8
  const results = []

  for (let i = 0; i < attempts; i += 1) {
    await page.goto(`${appBaseUrl}/app/agenda-semanal`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('[data-testid="weekly-agenda-board"]', { timeout: 60000 })
    if (viewportLabel === 'mobile') {
      await page.getByTestId(`weekly-agenda-day-tab-${monday}`).click()
      await page.waitForTimeout(300)
    }
    const outcome =
      inputMode === 'touch'
        ? await touchReorderSameCell(page, monday)
        : await mouseReorderSameCell(page, monday)
    results.push(outcome)
  }

  const successes = results.filter((r) => r.ok).length
  return {
    viewport: viewportLabel,
    inputMode,
    attempts,
    successes,
    failures: attempts - successes,
    flakeRate: `${Math.round(((attempts - successes) / attempts) * 100)}%`,
    samples: results,
  }
}

const browser = await chromium.launch({ headless: true })

try {
  if (scenario === 'pr2-mobile') {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    await installWeeklyAgendaRoutes(page, { week: mockWeekPr2 })
    const result = await runPr2Mobile(page)
    await context.close()
    console.log(`OK scenario=${scenario} screenshot: ${result.screenshot}`)
    console.log(JSON.stringify(result))
  } else if (scenario === 'pr3-desktop') {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    await installWeeklyAgendaRoutes(page, { week: mockWeekPr3, backlog: mockBacklogPr3 })
    const result = await runPr3Flows(page, { mobile: false })
    await context.close()
    console.log(`OK scenario=${scenario}`)
    console.log(JSON.stringify(result))
  } else if (scenario === 'pr3-mobile') {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    await installWeeklyAgendaRoutes(page, { week: mockWeekPr3, backlog: mockBacklogPr3 })
    const result = await runPr3Flows(page, { mobile: true })
    await context.close()
    console.log(`OK scenario=${scenario}`)
    console.log(JSON.stringify(result))
  } else if (scenario === 'pr4-desktop') {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    const pr4Api = await installWeeklyAgendaPr4Routes(page)
    const result = await runPr4Flows(page, { mobile: false, pr4Api, appBaseUrl: baseUrl })
    await context.close()
    console.log(`OK scenario=${scenario}`)
    console.log(JSON.stringify(result))
  } else if (scenario === 'pr4-mobile') {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    const pr4Api = await installWeeklyAgendaPr4Routes(page)
    const result = await runPr4Flows(page, {
      mobile: true,
      pr4Api,
      appBaseUrl: baseUrl,
      mobileSaveOnly: true,
    })
    await context.close()
    console.log(`OK scenario=${scenario}`)
    console.log(JSON.stringify(result))
  } else if (scenario === 'pr4-drag-follow-trail') {
    await mkdir(outDir, { recursive: true })
    const videoDir = path.join(outDir, 'pr4-drag-follow-trail-video-tmp')
    await mkdir(videoDir, { recursive: true })
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      recordVideo: { dir: videoDir, size: { width: 1280, height: 900 } },
    })
    const page = await context.newPage()
    await installWeeklyAgendaPr4Routes(page)
    const result = await runPr4DragFollowTrail(page, { appBaseUrl: baseUrl })
    const video = page.video()
    await page.close()
    await context.close()
    let videoPath = null
    if (video) {
      videoPath = path.join(outDir, 'pr4-drag-follow-trail.webm')
      await video.saveAs(videoPath)
    }
    console.log(`OK scenario=${scenario} video: ${videoPath}`)
    console.log(JSON.stringify({ ...result, video: videoPath }))
  } else if (scenario === 'pr4-mid-drag') {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    await installWeeklyAgendaPr4Routes(page)
    const result = await runPr4MidDrag(page, { appBaseUrl: baseUrl })
    await context.close()
    console.log(`OK scenario=${scenario} screenshot: ${result.screenshot}`)
    console.log(JSON.stringify(result))
  } else if (scenario === 'pr4-day-tab-drop') {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    const pr4Api = await installWeeklyAgendaPr4Routes(page)
    const result = await runPr4DayTabDrop(page, { pr4Api, appBaseUrl: baseUrl })
    await context.close()
    console.log(`OK scenario=${scenario} screenshot: ${result.screenshot}`)
    console.log(JSON.stringify(result))
  } else if (scenario === 'pr4-mobile-reorder') {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    const pr4Api = await installWeeklyAgendaPr4Routes(page)
    const result = await runPr4MobileReorder(page, { pr4Api, appBaseUrl: baseUrl })
    await context.close()
    console.log(`OK scenario=${scenario} screenshot: ${result.screenshot}`)
    console.log(JSON.stringify(result))
  } else if (scenario === 'pr4-touch-reorder-probe') {
    const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const desktopPage = await desktopCtx.newPage()
    await installWeeklyAgendaPr4Routes(desktopPage)
    const desktopMouse = await runPr4TouchReorderProbe(desktopPage, {
      appBaseUrl: baseUrl,
      viewportLabel: 'desktop',
      inputMode: 'mouse',
    })
    await desktopCtx.close()

    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const mobilePage = await mobileCtx.newPage()
    await installWeeklyAgendaPr4Routes(mobilePage)
    const mobileMouse = await runPr4TouchReorderProbe(mobilePage, {
      appBaseUrl: baseUrl,
      viewportLabel: 'mobile',
      inputMode: 'mouse',
    })
    const mobileTouch = await runPr4TouchReorderProbe(mobilePage, {
      appBaseUrl: baseUrl,
      viewportLabel: 'mobile',
      inputMode: 'touch',
    })
    await mobileCtx.close()

    const report = {
      conclusion:
        desktopMouse.failures === 0 &&
        mobileMouse.failures === 0 &&
        mobileTouch.failures === mobileMouse.attempts
          ? 'Not a product bug. Mobile reorder works with pointer/mouse once cards are scrolled into view. CDP Input.dispatchTouchEvent does not activate @dnd-kit TouchSensor in Playwright — document as test-environment limitation, not tablet behavior.'
          : desktopMouse.failures === 0 &&
              mobileMouse.failures > 0 &&
              mobileTouch.failures === mobileMouse.failures
            ? 'Investigate mobile layout/collision — mouse reorder fails even with scrollIntoViewIfNeeded.'
            : desktopMouse.failures > 0
              ? 'Flake also on desktop mouse — investigate product/collision.'
              : mobileTouch.successes > 0 && mobileMouse.failures > 0
                ? 'Touch CDP works but mouse-on-mobile fails — unusual; see samples.'
                : 'Mixed results — see per-mode flake rates.',
      evidence: {
        rootCauseIfMobileMouseWasFailing:
          'Cards below fold (y>viewport) without scrollIntoViewIfNeeded — pointer never hit draggable; drag never started (no opacity-40 / DragOverlay).',
        productTouchSensor:
          'TouchSensor delay=200ms tolerance=6px configured in WeeklyAgendaPage; real tablet touch not emulated by CDP touch.',
      },
      desktopMouse,
      mobileMouse,
      mobileTouch,
    }
    console.log(`OK scenario=${scenario}`)
    console.log(JSON.stringify(report, null, 2))
  } else {
    throw new Error(
      `Unknown scenario: ${scenario}. Use pr2-mobile, pr3-desktop, pr3-mobile, pr4-desktop, pr4-mobile, pr4-mid-drag, pr4-drag-follow-trail, pr4-day-tab-drop, pr4-mobile-reorder, or pr4-touch-reorder-probe.`,
    )
  }
} finally {
  await browser.close()
}
