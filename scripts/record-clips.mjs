// Records clean 1920x1080 footage of the 3D studio for the After Effects promo (Module 3).
// Uses the Microsoft Edge already installed on this PC (no browser download) and the site's
// film mode (?film=1). Needs the dev server running: npm run dev
// Usage: node scripts/record-clips.mjs            -> media-src/recordings/*.webm
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'media-src', 'recordings')
fs.mkdirSync(out, { recursive: true })
const BASE = process.env.SITE || 'http://localhost:5180/'
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p))

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: false, // a visible window: headless Edge has no GPU, so WebGL would not render
  args: ['--ignore-gpu-blocklist', '--window-position=0,0', '--window-size=1940,1180'],
})
const size = { width: 1920, height: 1080 }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null

// warm-up: load the site once so the 3D code and models are cached and every clip starts quickly
{
  const ctx = await browser.newContext({ viewport: size })
  const page = await ctx.newPage()
  await page.goto(BASE + '?film=1', { waitUntil: 'networkidle' })
  await wait(6000)
  await ctx.close()
}

/** clip(name, query, steps): steps(page) drives the camera; the recording starts at page load. */
async function clip(name, query, steps, { theme = process.env.THEME || 'amber', intro = false } = {}) {
  if (ONLY && !ONLY.includes(name)) return
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: out, size } })
  await ctx.addInitScript(
    ([t, i]) => {
      localStorage.setItem('zj-theme', t)
      localStorage.setItem('zj-lite', '0')
      if (!i) sessionStorage.setItem('zj-intro', '1')
    },
    [theme, intro],
  )
  const page = await ctx.newPage()
  await page.goto(BASE + '?film=1' + (query ? '&' + query : ''), { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__studio, null, { timeout: 30000 })
  await steps(page)
  const video = page.video()
  await ctx.close()
  const file = path.join(out, name + '.webm')
  fs.rmSync(file, { force: true })
  fs.renameSync(await video.path(), file)
  console.log('recorded', name)
}

const go = (page, zone) => page.evaluate((z) => window.__studio.getState().setZone(z), zone)
const theme = (page, t) => page.evaluate((x) => window.__studio.getState().setTheme(x), t)

// 1. the welcome: wide shot of the studio, camera swoops down, she walks in and waves
await clip('01-intro', '', async () => wait(9000), { intro: true })

// 2. the full tour, room to room
await clip('02-tour', '', async (page) => {
  await wait(2500)
  for (const z of ['about', 'skills', 'career', 'projects', 'achievements', 'showreel', 'contact']) {
    await go(page, z)
    await wait(2600)
  }
})

// 3. close-ups of single rooms with her gesture (the clip starts in the room)
for (const [name, zone, fz] of [
  ['03-lobby-wave', 'home', 1.55],
  ['04-skills', 'skills', 1.35],
  ['05-career', 'career', 1.25],
  ['06-gallery', 'projects', 1.3],
  ['07-trophies', 'achievements', 1.35],
  ['08-screening', 'showreel', 1.3],
  ['09-contact', 'contact', 1.4],
]) {
  await clip(name, `zone=${zone}&fz=${fz}`, async () => wait(6500))
}

// 4. theme switcher montage
await clip('10-themes', 'zone=skills&fz=1.15', async (page) => {
  await wait(2500)
  for (const t of ['violet', 'forest', 'mono', 'amber']) {
    await theme(page, t)
    await wait(1800)
  }
})

// 5. a slow, wide establishing shot
await clip('11-wide', 'zone=career&fz=0.45', async () => {
  await wait(7000)
})

await browser.close()
