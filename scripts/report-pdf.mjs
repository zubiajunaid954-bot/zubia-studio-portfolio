// Turns docs/report/report.html into docs/report/Zubia_Junaid_Portfolio_Report.pdf (uses Microsoft Edge)
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')

const html = path.resolve('docs/report/report.html')
const out = path.resolve('docs/report/Zubia_Junaid_Portfolio_Report.pdf')
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p))
const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage()
await page.goto('file:///' + html.replace(/\\/g, '/'), { waitUntil: 'load' })
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;font:8px Segoe UI,sans-serif;color:#8a837d;padding:0 16mm;display:flex;justify-content:space-between"><span>Zubia’s Studio · Project Report</span><span class="pageNumber"></span></div>',
})
await browser.close()
console.log('saved', out, Math.round(fs.statSync(out).size / 1024) + ' KB')
