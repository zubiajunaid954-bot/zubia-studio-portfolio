// Shared helpers for talking to the RAG assistant (/api/chat), speech input and spoken answers.
export async function askAssistant(question, history = []) {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history: history.slice(-6) }),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok || !data.answer) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

export const SpeechRec = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

function pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => /en/i.test(v.lang) && /female|zira|aria|jenny|samantha|google uk english female/i.test(v.name)) ||
    voices.find((v) => /en-(GB|US|IN)/i.test(v.lang)) ||
    voices[0]
  )
}

export function speak(text) {
  if (!canSpeak) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/https?:\/\/\S+/g, '').replace(/[*_#]/g, ''))
  const v = pickVoice()
  if (v) u.voice = v
  u.rate = 1.02
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel()
}

/** Start listening; calls onText(partial) while speaking and onDone(finalText) at the end. */
export function listen({ onText, onDone, onEnd }) {
  if (!SpeechRec) return null
  const rec = new SpeechRec()
  rec.lang = 'en-US'
  rec.interimResults = true
  let finalText = ''
  rec.onresult = (e) => {
    let text = ''
    for (const res of e.results) text += res[0].transcript
    onText?.(text)
    if (e.results[e.results.length - 1].isFinal) finalText = text
  }
  rec.onend = () => {
    onEnd?.()
    if (finalText) onDone?.(finalText)
  }
  rec.onerror = () => onEnd?.()
  stopSpeaking()
  rec.start()
  return rec
}
