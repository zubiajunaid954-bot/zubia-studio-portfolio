// RAG step 1-4: collect -> chunk -> embed -> store.
// Reads knowledge/*.md (CV facts) and the projects in src/data/content.js, splits them into
// chunks, embeds each chunk with Gemini (gemini-embedding-001, 768 dims) and writes the vector
// index to api/_data/index.json, which the /api/chat function searches.
// Usage: npm run index
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// load .env (no dependency needed)
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const { embedDocuments, EMBED_MODEL, DIMS } = await import(pathToFileURL(path.join(root, 'api/_lib/gemini.js')).href)
const { projects, categories } = await import(pathToFileURL(path.join(root, 'src/data/content.js')).href)

const MAX = 700 // characters per chunk
const docs = []

// --- knowledge files (front matter: title, anchor) ---
for (const file of fs.readdirSync(path.join(root, 'knowledge')).filter((f) => f.endsWith('.md')).sort()) {
  const raw = fs.readFileSync(path.join(root, 'knowledge', file), 'utf8').replace(/^﻿/, '')
  const fm = raw.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/)
  const meta = Object.fromEntries((fm ? fm[1] : '').split(/\r?\n/).map((l) => l.split(/:\s*/)).filter((p) => p.length >= 2).map(([k, ...v]) => [k.trim(), v.join(': ').trim()]))
  const body = (fm ? fm[2] : raw).trim()
  docs.push({ source: file, title: meta.title || file, anchor: meta.anchor || 'home', text: body })
}

// --- projects ---
for (const p of projects) {
  const cat = categories.find((c) => c.id === p.cat)?.label || p.cat
  const specs = Object.entries(p.specs || {}).map(([k, v]) => `${k}: ${v}`).join('; ')
  const links = (p.links || []).map((l) => `${l.label}: ${l.href}`).join('; ')
  const text = [
    `${p.title} is a ${p.kind} (${cat} project). ${p.tagline}.`,
    p.summary,
    `Highlights: ${p.highlights.join('; ')}.`,
    specs && `Details: ${specs}.`,
    `Technology: ${p.stack.join(', ')}.`,
    links && `Links: ${links}.`,
    p.video && 'A trailer is available on its card in the Project Gallery.',
  ].filter(Boolean).join('\n\n')
  docs.push({ source: 'projects', title: `Project: ${p.title}`, anchor: 'projects', projectId: p.id, text })
}

// --- chunking: paragraphs packed up to MAX characters, each chunk prefixed with its title ---
const chunks = []
for (const d of docs) {
  const paras = d.text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  let buf = ''
  const flush = () => {
    if (!buf) return
    chunks.push({ id: `c${chunks.length}`, title: d.title, anchor: d.anchor, projectId: d.projectId, source: d.source, text: `${d.title}\n${buf}` })
    buf = ''
  }
  for (const para of paras) {
    if (buf && buf.length + para.length + 2 > MAX) flush()
    buf = buf ? `${buf}\n\n${para}` : para
  }
  flush()
}

console.log(`${docs.length} documents -> ${chunks.length} chunks. Embedding with ${EMBED_MODEL}...`)
const vectors = await embedDocuments(chunks.map((c) => c.text))
const index = {
  model: EMBED_MODEL,
  dims: DIMS,
  built: new Date().toISOString(),
  chunks: chunks.map((c, i) => ({ ...c, v: vectors[i].map((x) => Math.round(x * 1e5) / 1e5) })),
}
fs.mkdirSync(path.join(root, 'api/_data'), { recursive: true })
fs.writeFileSync(path.join(root, 'api/_data/index.json'), JSON.stringify(index))
console.log('wrote api/_data/index.json', (fs.statSync(path.join(root, 'api/_data/index.json')).size / 1024).toFixed(0), 'KB')
