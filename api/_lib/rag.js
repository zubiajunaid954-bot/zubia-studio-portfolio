// RAG step 5: retrieval. Cosine similarity over the stored vectors plus a small keyword bonus,
// so exact names ("Spikes Rush", "TechCami") always rank well.
import fs from 'node:fs'
import path from 'node:path'
import { embedQuery } from './gemini.js'

let INDEX = null
function load() {
  if (!INDEX) INDEX = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'api/_data/index.json'), 'utf8'))
  return INDEX
}

const STOP = new Set('the a an and or of to in on for with is are was were be what which who how does do did her his she you your me my about tell can any has have i it this that from at by as'.split(' '))
const words = (s) => (s.toLowerCase().match(/[a-z0-9+#.]+/g) || []).filter((w) => w.length > 2 && !STOP.has(w))

export async function retrieve(query, k = 6) {
  const { chunks } = load()
  const qv = await embedQuery(query)
  const qw = words(query)
  const scored = chunks.map((c) => {
    let s = 0
    for (let i = 0; i < qv.length; i++) s += qv[i] * c.v[i]
    const text = c.text.toLowerCase()
    const hits = qw.filter((w) => text.includes(w)).length
    s += Math.min(0.12, hits * 0.03)
    return { c, s }
  })
  scored.sort((a, b) => b.s - a.s)
  const best = scored[0]?.s ?? 0
  return scored.filter((x, i) => i < k && (i < 3 || x.s > best - 0.12)).map(({ c, s }) => ({ ...c, score: Math.round(s * 1000) / 1000 }))
}
