// ZJ Arcade FIT CHECK: score the 10 preset requirement cards once and save them to
// api/_data/fit.json, so the cards flip instantly for every visitor.
// Run it again after changing knowledge/ or the projects (after npm run index).
// Usage: npm run fit
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const { score, PRESETS } = await import(pathToFileURL(path.join(root, 'api/fit.js')).href)

let results = null
for (let attempt = 1; attempt <= 3 && !results; attempt++) {
  try {
    results = await score(PRESETS, [60000, 60000])
  } catch (err) {
    console.log(`attempt ${attempt} failed: ${err.message}`)
  }
}
if (!results) {
  console.error('Could not score the presets. Try again in a minute.')
  process.exit(1)
}
const out = path.join(root, 'api/_data/fit.json')
fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), results }, null, 2))
for (const r of results) console.log(`${String(r.score).padStart(2)}/10  ${r.label}  (${r.verdict})`)
console.log('saved', path.relative(root, out))
