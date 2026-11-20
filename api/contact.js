// POST /api/contact  { name, email, subject, message, website, elapsed }
// Module 5: the contact form backend.
//  1. server-side validation (the browser checks are only for convenience; this is the real gate)
//  2. invisible spam protection: honeypot field, "too fast to be human" timer, per-IP rate limit,
//     link / spam-phrase checks and a duplicate-message check
//  3. delivery through the Resend email API (RESEND_API_KEY in .env, never in the code)
//  4. a log line with Resend's message id for every sent email (delivery evidence), without the
//     visitor's email address or message text
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/
export const LIMITS = { name: 80, email: 120, subject: 120, message: 3000 }
const MIN_SECONDS = 3 // nobody reads the page and types a real message in under 3 seconds
const SPAM = /\b(viagra|cialis|casino|betting|crypto ?(investment|trading)|forex signals?|seo (services|ranking)|backlinks?|guest post|loan offer|bitcoin doubler|whatsapp me|telegram me)\b/i

// strip control characters; one-line fields also lose line breaks (blocks email header injection)
const clean = (v, max, multiline = false) => {
  let s = String(v ?? '').replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, ' ')
  if (multiline) s = s.replace(/\r\n?/g, '\n').replace(/\n{4,}/g, '\n\n\n')
  return s.trim().slice(0, max)
}
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function validate(body) {
  const v = {
    name: clean(body?.name, LIMITS.name),
    email: clean(body?.email, LIMITS.email).toLowerCase(),
    subject: clean(body?.subject, LIMITS.subject),
    message: clean(body?.message, LIMITS.message, true),
  }
  const errors = {}
  if (v.name.length < 2) errors.name = 'Please enter your name.'
  else if (/https?:|www\.|[<>]/i.test(v.name)) errors.name = 'Please enter just your name.'
  if (!EMAIL.test(v.email)) errors.email = 'Please enter a valid email address.'
  if (v.subject.length < 3) errors.subject = 'Please add a short subject (3+ characters).'
  if (v.message.length < 10) errors.message = 'Please write at least 10 characters.'
  else if ((v.message.match(/https?:\/\/|www\./gi) || []).length > 3) errors.message = 'Please include at most 3 links.'
  else if (SPAM.test(v.message) || SPAM.test(v.subject)) errors.message = 'This message looks like spam. Please rephrase it or email me directly.'
  return { v, errors }
}

// best-effort limits, remembered per server instance: 3 messages per visitor per 10 minutes,
// 30 per hour overall, and no identical message twice within an hour
const hits = new Map()
let global = []
const recent = new Map()
function limited(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000)
  global = global.filter((t) => now - t < 60 * 60 * 1000)
  if (list.length >= 3 || global.length >= 30) return true
  list.push(now)
  global.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) hits.clear()
  return false
}
function duplicate(v) {
  const now = Date.now()
  for (const [k, t] of recent) if (now - t > 60 * 60 * 1000) recent.delete(k)
  const key = (v.email + '|' + v.message).toLowerCase().replace(/\s+/g, ' ')
  if (recent.has(key)) return true
  recent.set(key, now)
  return false
}

async function send(v) {
  const key = (process.env.RESEND_API_KEY || '').trim()
  if (!key) throw Object.assign(new Error('RESEND_API_KEY is not set'), { code: 'NO_KEY' })
  const to = process.env.CONTACT_TO || 'zubiajunaid954@gmail.com'
  const from = process.env.CONTACT_FROM || 'Zubia’s Studio <onboarding@resend.dev>'
  const when = new Date().toUTCString()
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 12000)
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: ac.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: v.email,
        subject: `[Portfolio] ${v.subject}`,
        text: `New message from your portfolio's contact form\n\nName: ${v.name}\nEmail: ${v.email}\nSubject: ${v.subject}\nSent: ${when}\n\n${v.message}\n\n(Reply to this email to answer ${v.name} directly.)`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:560px">
  <p style="margin:0 0 4px;color:#888;font-size:12px;letter-spacing:.1em">ZUBIA'S STUDIO · CONTACT DESK</p>
  <h2 style="margin:0 0 12px;font-size:18px">${esc(v.subject)}</h2>
  <p style="margin:0 0 12px"><b>${esc(v.name)}</b> &lt;<a href="mailto:${esc(v.email)}">${esc(v.email)}</a>&gt;<br><span style="color:#888;font-size:12px">${esc(when)}</span></p>
  <div style="white-space:pre-wrap;padding:12px 14px;border-left:3px solid #f0b94a;background:#faf7f0">${esc(v.message)}</div>
  <p style="color:#888;font-size:12px">Reply to this email to answer ${esc(v.name)} directly.</p>
</div>`,
      }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw Object.assign(new Error(`Resend ${r.status}: ${data.message || data.name || 'error'}`), { status: r.status })
    return data.id
  } catch (err) {
    if (err.name === 'AbortError') throw Object.assign(new Error('Resend timed out'), { status: 504 })
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' })
  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Bad request.' })
  }
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').toString().split(',')[0].trim()

  // bots: the hidden "website" field is filled in, or the form was sent impossibly fast.
  // They get a normal-looking success so they don't learn what tripped them, but nothing is sent.
  if (String(body.website || '').trim() || !(Number(body.elapsed) >= MIN_SECONDS * 1000)) {
    console.log(`contact: blocked bot (${String(body.website || '').trim() ? 'honeypot' : 'too fast'})`)
    return res.status(200).json({ ok: true })
  }

  const { v, errors } = validate(body)
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', errors })
  if (limited(ip)) return res.status(429).json({ error: 'You’ve sent a few messages already. Please wait 10 minutes, or email me directly.' })
  if (duplicate(v)) return res.status(409).json({ error: 'I already received this exact message. Thank you! I’ll reply soon.' })

  try {
    const id = await send(v)
    console.log(`contact: sent id=${id} at=${new Date().toISOString()} subject="${v.subject.slice(0, 60)}"`)
    return res.status(200).json({ ok: true, id })
  } catch (err) {
    console.error('contact: send failed:', err.code || err.status || '', err.message)
    recent.clear() // let the visitor retry the same message
    return res.status(err.code === 'NO_KEY' ? 503 : 502).json({
      error: 'Sorry, my message service is having trouble right now. Please email me directly at zubiajunaid954@gmail.com.',
    })
  }
}
