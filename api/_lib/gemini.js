// Minimal Google Gemini REST client (no SDK needed). The key comes from GEMINI_API_KEY.
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/'
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001'
export const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash-lite'
export const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.8-flash'
export const BACKUP_MODEL = process.env.GEMINI_BACKUP_MODEL || 'gemini-flash-lite-latest'
export const DIMS = 768

function key() {
  const k = (process.env.GEMINI_API_KEY || '').trim()
  if (!k) throw Object.assign(new Error('GEMINI_API_KEY is not set'), { code: 'NO_KEY' })
  return k
}

async function call(model, method, body, timeoutMs = 20000) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  let r
  try {
    r = await fetch(`${BASE}${model}:${method}`, {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw Object.assign(new Error(err.name === 'AbortError' ? 'Gemini timed out' : err.message), { status: 503 })
  } finally {
    clearTimeout(timer)
  }
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const e = new Error(data?.error?.message || `Gemini error ${r.status}`)
    e.status = r.status
    throw e
  }
  return data
}

const normalise = (v) => {
  const n = Math.hypot(...v) || 1
  return v.map((x) => x / n)
}

/** Embed many texts (documents) in batches of up to 100. */
export async function embedDocuments(texts) {
  const out = []
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100)
    const data = await call(EMBED_MODEL, 'batchEmbedContents', {
      requests: batch.map((text) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: DIMS,
      })),
    })
    for (const e of data.embeddings) out.push(normalise(e.values))
  }
  return out
}

/** Embed one search query. */
export async function embedQuery(text) {
  const req = { content: { parts: [{ text }] }, taskType: 'RETRIEVAL_QUERY', outputDimensionality: DIMS }
  let data
  try {
    data = await call(EMBED_MODEL, 'embedContent', req, 8000)
  } catch (err) {
    if (err.code === 'NO_KEY' || ![429, 500, 502, 503, 504].includes(err.status)) throw err
    await new Promise((r) => setTimeout(r, 800)) // busy: one quick retry
    data = await call(EMBED_MODEL, 'embedContent', req, 8000)
  }
  return normalise(data.embedding.values)
}

/** Generate a JSON answer. contents: [{ role: 'user'|'model', text }] */
export async function generateJSON({ system, contents, schema, temperature = 0.4, maxTokens = 700, timeouts = [15000, 20000] }) {
  const body = (thinking) => ({
    systemInstruction: { parts: [{ text: system }] },
    contents: contents.map((c) => ({ role: c.role, parts: [{ text: c.text }] })),
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
      responseSchema: schema,
      thinkingConfig: { thinkingLevel: thinking },
    },
  })
  // Gemini models are sometimes "experiencing high demand" (503) or rate-limited (429).
  // Try the main model, then the backups, then one short pause and a last round, all within the time budget.
  const tries = [
    [CHAT_MODEL, 'minimal', timeouts[0]],
    [BACKUP_MODEL, 'minimal', timeouts[0]],
    [FALLBACK_MODEL, 'low', timeouts[1]],
  ]
  const budget = Date.now() + timeouts[0] + timeouts[1]
  let data
  let lastErr
  for (let round = 0; round < 2 && !data; round++) {
    if (round) await new Promise((r) => setTimeout(r, 1200))
    for (const [model, thinking, ms] of tries) {
      const left = budget - Date.now()
      if (left < 2500) break
      try {
        data = await call(model, 'generateContent', body(thinking), Math.min(ms, left))
        break
      } catch (err) {
        if (err.code === 'NO_KEY') throw err
        lastErr = err
        if (err.status && ![429, 500, 502, 503, 504].includes(err.status)) break // a real error: don't retry
      }
    }
  }
  if (!data) throw lastErr || Object.assign(new Error('Gemini unavailable'), { status: 503 })
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '{}'
  return JSON.parse(text)
}
