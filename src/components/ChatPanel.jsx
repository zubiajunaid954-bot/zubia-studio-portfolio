// Module 4: the RAG chatbot window. Ask about Zubia by typing or by voice (🎤); answers come from
// /api/chat (grounded in her CV and project notes), can be read aloud (🔊), and show clickable
// sources that jump to the matching part of the studio.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { projects } from '../data/content'
import { goTo } from './ZoneRail'

const SUGGESTIONS = [
  'What is your final year project?',
  'Which game engines do you use?',
  'Where have you interned?',
  'What did you win at GameCon?',
  'Can I play any of your games?',
  'How can I contact you?',
]

const FACE = '/img/avatar-face.png' // her 3D avatar's face, rendered in Blender

const SpeechRec = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

function readStore(key, fallback) {
  try {
    const v = sessionStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => /en/i.test(v.lang) && /female|zira|aria|jenny|samantha|google uk english female/i.test(v.name)) ||
    voices.find((v) => /en-(GB|US|IN)/i.test(v.lang)) ||
    voices[0]
  )
}

export default function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState(() => readStore('zj-chat', []))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakAll, setSpeakAll] = useState(() => {
    try {
      return localStorage.getItem('zj-speak') === '1'
    } catch {
      return false
    }
  })
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const recRef = useRef(null)
  const openProject = useStore((s) => s.openProject)
  const setChatOpen = useStore((s) => s.setChatOpen)

  useEffect(() => {
    try {
      sessionStorage.setItem('zj-chat', JSON.stringify(msgs.slice(-30)))
    } catch {
      /* storage blocked */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])

  useEffect(() => {
    setChatOpen(open)
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else if (canSpeak) window.speechSynthesis.cancel()
  }, [open])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const speak = (text) => {
    if (!canSpeak) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text.replace(/https?:\/\/\S+/g, '').replace(/[*_#]/g, ''))
    const v = pickVoice()
    if (v) u.voice = v
    u.rate = 1.02
    window.speechSynthesis.speak(u)
  }

  const ask = async (question, viaVoice = false) => {
    const q = question.trim()
    if (!q || busy) return
    setInput('')
    const history = msgs.filter((m) => !m.error).slice(-6).map((m) => ({ role: m.role, text: m.text }))
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setBusy(true)
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok || !data.answer) throw new Error(data.error || 'Something went wrong. Please try again.')
      setMsgs((m) => [...m, { role: 'assistant', text: data.answer, sources: data.sources || [], topics: data.topics || [] }])
      window.dispatchEvent(new CustomEvent('zj-chat-answer', { detail: data }))
      if (viaVoice || speakAll) speak(data.answer)
    } catch (err) {
      setMsgs((m) => [...m, { role: 'assistant', text: err.message, error: true }])
    } finally {
      setBusy(false)
    }
  }

  const toggleMic = () => {
    if (!SpeechRec) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 1
    let finalText = ''
    rec.onresult = (e) => {
      let text = ''
      for (const res of e.results) text += res[0].transcript
      setInput(text)
      if (e.results[e.results.length - 1].isFinal) finalText = text
    }
    rec.onend = () => {
      setListening(false)
      if (finalText) ask(finalText, true)
    }
    rec.onerror = () => setListening(false)
    recRef.current = rec
    if (canSpeak) window.speechSynthesis.cancel()
    setListening(true)
    rec.start()
  }

  const toggleSpeak = () => {
    const next = !speakAll
    setSpeakAll(next)
    try {
      localStorage.setItem('zj-speak', next ? '1' : '0')
    } catch {
      /* storage blocked */
    }
    if (!next && canSpeak) window.speechSynthesis.cancel()
  }

  const openSource = (s) => {
    setOpen(false)
    if (s.projectId) {
      const p = projects.find((x) => x.id === s.projectId)
      goTo('projects')
      if (p) setTimeout(() => openProject(p), 900)
    } else goTo(s.anchor || 'home')
  }

  return (
    <>
      <button className={'chat-fab' + (open ? ' hidden' : '')} onClick={() => setOpen(true)} aria-label="Ask Zubia's AI assistant">
        <img src={FACE} alt="" width="36" height="36" />
        <span>Ask me anything</span>
      </button>

      {open && (
        <section className="chat-panel" role="dialog" aria-label="Chat with Zubia's AI assistant">
          <header className="chat-head">
            <img src={FACE} alt="" width="40" height="40" />
            <div>
              <strong>Ask Zubia</strong>
              <small>AI assistant</small>
            </div>
            {canSpeak && (
              <button className={'icon-btn chat-tool' + (speakAll ? ' on' : '')} onClick={toggleSpeak} aria-pressed={speakAll} title={speakAll ? 'Stop reading answers aloud' : 'Read answers aloud'}>
                <span aria-hidden="true">{speakAll ? '🔊' : '🔈'}</span>
                <span className="sr-only">Read answers aloud</span>
              </button>
            )}
            <button className="icon-btn chat-tool" onClick={() => setOpen(false)} aria-label="Close chat">
              ✕
            </button>
          </header>

          <div className="chat-list" ref={listRef} aria-live="polite">
            <div className="msg assistant">
              <p>Hi! I'm Zubia's AI assistant. Ask me anything about my projects, skills, experience or achievements. You can also tap 🎤 and just speak.</p>
            </div>
            {msgs.map((m, i) => (
              <div key={i} className={'msg ' + m.role + (m.error ? ' error' : '')}>
                <p>{m.text}</p>
                {m.sources?.length > 0 && (
                  <div className="msg-sources">
                    <span>Sources:</span>
                    {m.sources.map((s) => (
                      <button key={s.title} onClick={() => openSource(s)}>
                        {s.title}
                      </button>
                    ))}
                  </div>
                )}
                {m.role === 'assistant' && !m.error && canSpeak && (
                  <button className="msg-say" onClick={() => speak(m.text)} aria-label="Read this answer aloud">
                    🔊
                  </button>
                )}
              </div>
            ))}
            {busy && (
              <div className="msg assistant typing" aria-label="Thinking">
                <i />
                <i />
                <i />
              </div>
            )}
          </div>

          {msgs.length === 0 && (
            <div className="chat-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
          >
            {SpeechRec && (
              <button type="button" className={'icon-btn mic' + (listening ? ' live' : '')} onClick={toggleMic} aria-pressed={listening} title={listening ? 'Stop listening' : 'Ask by voice'}>
                <span aria-hidden="true">🎤</span>
                <span className="sr-only">{listening ? 'Stop listening' : 'Ask by voice'}</span>
              </button>
            )}
            <label className="sr-only" htmlFor="chat-q">
              Your question
            </label>
            <input id="chat-q" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? 'Listening…' : 'Ask about my work…'} maxLength={500} autoComplete="off" />
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </section>
      )}
    </>
  )
}
