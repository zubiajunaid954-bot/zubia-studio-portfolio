// Captures the screenshots used in the project report from the live site.
// Usage: node scripts/report-shots.mjs [url]   (needs Microsoft Edge; saves to docs/screenshots/report)
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')

const URL = process.argv[2] || 'https://zubia-junaid-portfolio.vercel.app/'
const OUT = 'docs/screenshots/report'
fs.mkdirSync(OUT, { recursive: true })
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p))
const browser = await chromium.launch({ executablePath: EDGE, headless: false, args: ['--ignore-gpu-blocklist'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

async function desktop() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` })
  const step = async (n, fn) => {
    try {
      await fn()
      console.log('ok', n)
    } catch (e) {
      console.log('FAIL', n, e.message.split('\n')[0])
    }
  }

  await page.goto(URL, { waitUntil: 'networkidle' })
  await step('01-intro', async () => {
    await wait(2500)
    await shot('01-intro')
  })
  await step('02-lobby', async () => {
    const skip = page.locator('.intro button:has-text("Skip")')
    if (await skip.count()) await skip.first().click()
    await wait(4000)
    await shot('02-lobby')
  })
  const rooms = ['about', 'skills', 'career', 'projects', 'achievements', 'showreel', 'contact']
  for (const [i, id] of rooms.entries()) {
    await step(id, async () => {
      await page.click(`.nav a[href="#${id}"]`)
      await wait(3200)
      await shot(`${String(i + 3).padStart(2, '0')}-${id}`)
    })
  }
  await step('10-project-modal', async () => {
    await page.click('.nav a[href="#projects"]')
    await wait(2500)
    await page.locator('.proj-hit').first().click()
    await wait(1500)
    await shot('10-project-modal')
    await page.keyboard.press('Escape')
    await wait(800)
  })
  await step('11-chatbot', async () => {
    await page.click('.chat-fab')
    await wait(600)
    await page.fill('.chat-input input, .chat-input textarea', 'What games has Zubia made in Unity?')
    await page.keyboard.press('Enter')
    await page.waitForSelector('.msg.assistant:not(.typing) >> nth=1', { timeout: 40000 }).catch(() => {})
    await wait(2500)
    await shot('11-chatbot')
    await page.click('.chat-panel button[aria-label="Close chat"]')
    await wait(600)
  })
  await step('12-themes', async () => {
    await page.click('.nav a[href="#home"]')
    await wait(2000)
    const names = await page.$$eval('.theme-opt', (b) => b.map((x) => x.textContent.trim()))
    for (const [i] of names.entries()) {
      await page.click('.theme-picker > .icon-btn')
      await wait(300)
      await page.locator('.theme-opt').nth(i).click()
      await wait(1800)
      await shot(`12-theme-${i + 1}`)
    }
    // back to the first theme
    await page.click('.theme-picker > .icon-btn')
    await page.locator('.theme-opt').first().click()
    await wait(1000)
  })
  await step('13-arcade', async () => {
    await page.click('.arcade-btn')
    await wait(3500)
    await shot('13-arcade-insert')
    await page.click('.arc-hud button:has-text("Skip")')
    await page.waitForSelector('.arc-menu', { timeout: 10000 })
    await wait(1200)
    await shot('14-arcade-menu')
  })
  await step('15-fit', async () => {
    await page.click('.arc-game:has-text("FIT CHECK")')
    await wait(2500)
    const cards = page.locator('.fit-front')
    for (let i = 0; i < 3; i++) {
      await cards.nth(i).click()
      await wait(1200)
    }
    await wait(1200)
    await shot('15-fit-check')
    await page.keyboard.press('Escape')
    await wait(1200)
  })
  await step('16-quiz', async () => {
    await page.waitForSelector('.arc-menu', { timeout: 6000 })
    await page.click('.arc-game:has-text("KNOW")')
    await wait(1500)
    const go = page.locator('.arc-screen button:has-text("Start"), .arc-screen button:has-text("Play")')
    if (await go.count()) await go.first().click()
    await wait(1500)
    await shot('16-quiz')
    await page.keyboard.press('Escape')
    await wait(1200)
  })
  await step('17-crunch', async () => {
    await page.waitForSelector('.arc-menu', { timeout: 6000 })
    await page.click('.arc-game:has-text("CRUNCH")')
    await page.waitForSelector('.crunch-go', { timeout: 15000 })
    await wait(600)
    await shot('17-crunch-intro')
    await page.click('.crunch-go')
    await wait(800)
    const box = await page.locator('.crunch-stage canvas').boundingBox()
    // place two towers on buildable tiles near the path, then start the wave and fire
    for (const [fx, fy] of [
      [0.36, 0.42],
      [0.55, 0.6],
    ]) {
      await page.locator('.crunch-tower').first().click()
      await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
      await wait(300)
    }
    await page.click('.crunch-next')
    await wait(5000)
    for (let i = 0; i < 4; i++) {
      await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.5)
      await wait(250)
    }
    await shot('18-crunch-play')
    await page.keyboard.press('Escape')
    await wait(1500)
  })
  await step('19-roam', async () => {
    if (!(await page.locator('.arc-menu').count())) {
      await page.click('.arcade-btn')
      await wait(800)
      await page.click('.arc-hud button:has-text("Skip")')
      await page.waitForSelector('.arc-menu', { timeout: 10000 })
    }
    await page.click('.arc-game:has-text("FREE ROAM")')
    await wait(3000)
    await page.keyboard.down('d')
    await wait(1200)
    await page.keyboard.up('d')
    await wait(800)
    await shot('19-free-roam')
    await page.keyboard.press('Escape')
    await wait(1500)
  })
  await ctx.close()
}

async function mobile() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await ctx.addInitScript(() => sessionStorage.setItem('zj-intro', '1'))
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(URL, { waitUntil: 'networkidle' })
  await wait(5000)
  await page.screenshot({ path: `${OUT}/20-mobile-home.png` })
  await page.evaluate(() => document.getElementById('projects').scrollIntoView())
  await wait(3500)
  await page.screenshot({ path: `${OUT}/21-mobile-projects.png` })
  await page.evaluate(() => document.getElementById('contact').scrollIntoView())
  await wait(3500)
  await page.screenshot({ path: `${OUT}/22-mobile-contact.png` })
  console.log('ok mobile')
  await ctx.close()
}

await desktop()
await mobile()
console.log('page errors:', errors)
await browser.close()
