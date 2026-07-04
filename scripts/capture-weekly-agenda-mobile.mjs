/**
 * Prova de runtime — Agenda da semana (Playwright + API mockada).
 *
 * Cenários:
 *   pr2-mobile (default) — abas filtram colunas em viewport 390px
 *   pr3-desktop — drawer atenção + FAB/gaveta backlog em 1280px
 *   pr3-mobile — PR-3 drawers + regressão abas mobile em 390px
 *
 * Uso:
 *   node scripts/capture-weekly-agenda-mobile.mjs [baseUrl]
 *   node scripts/capture-weekly-agenda-mobile.mjs --scenario pr3-desktop [baseUrl]
 *   node scripts/capture-weekly-agenda-mobile.mjs --scenario pr3-mobile [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  installWeeklyAgendaRoutes,
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
  } else {
    throw new Error(`Unknown scenario: ${scenario}. Use pr2-mobile, pr3-desktop, or pr3-mobile.`)
  }
} finally {
  await browser.close()
}
