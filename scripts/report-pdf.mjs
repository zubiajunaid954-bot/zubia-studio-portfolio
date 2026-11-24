// Prints an HTML file to PDF with Microsoft Edge (headings become PDF bookmarks).
// Usage: node scripts/report-pdf.mjs <in.html> <out.pdf>   (normally run by scripts/build_report.py)
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')

const html = path.resolve(process.argv[2] || 'docs/report/report.html')
const out = path.resolve(process.argv[3] || 'docs/report/Zubia_Junaid_Portfolio_Report.pdf')
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p))
const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage()
await page.goto('file:///' + html.replace(/\\/g, '/'), { waitUntil: 'load' })
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true, outline: true, tagged: true })
await browser.close()
console.log('printed', out)
