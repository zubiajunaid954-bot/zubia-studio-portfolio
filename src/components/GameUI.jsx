// Free Roam Mode on screen: the arcade "INSERT COIN" intro, the HUD (discoveries, sound, exit),
// the RPG-style dialogue box where objects answer through the RAG assistant, discovery toasts
// and the completion card. Only rendered while the game is running.
import { useEffect, useRef, useState } from 'react'
import { useStore, reducedMotion } from '../store'
import { SPOTS, sfx, joy } from '../game/world'
import { askAssistant, speak, stopSpeaking, listen, SpeechRec, canSpeak } from '../lib/assistant'
import { profile } from '../data/content'
import { goTo } from './ZoneRail'

const FACE = '/img/avatar-face.png'
const readPref = (k, d) => {
  try {
    const v = localStorage.getItem(k)
    return v === null ? d : v === '1'
  } catch {
    return d
  }
}
const writePref = (k, v) => {
  try {
    localStorage.setItem(k, v ? '1' : '0')
  } catch {
    /* storage blocked */
  }
}

function Typewriter({ text, onDone }) {
  const [n, setN] = useState(reducedMotion ? text.length : 0)
  useEffect(() => {
    if (reducedMotion) return onDone?.()
    setN(0)
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id)
          onDone?.()
          return v
        }
        return v + 2
      })
    }, 28)
    return () => clearInterval(id)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps
  return <>{text.slice(0, n)}</>
}

function StartScreen() {
  const beginPlay = useStore((s) => s.beginPlay)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const muted = !readPref('zj-game-sound', true)
    const a = setTimeout(() => {
      sfx('coin', muted)
      setReady(true)
    }, 650)
    const b = setTimeout(beginPlay, reducedMotion ? 700 : 1900)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [beginPlay])
  return (
    <div className="game-start" role="status" aria-live="assertive">
      <p className={'arcade-text' + (ready ? ' ready' : '')}>{ready ? 'PLAYER 1 READY' : 'INSERT COIN'}</p>
      <p className="arcade-sub">FREE ROAM · ZUBIA'S STUDIO</p>
    </div>
  )
}

// a thumb joystick for phones: drag to walk (push far to run)
function Joystick() {
  const base = useRef(null)
  const [knob, setKnob] = useState([0, 0])
  const R = 46
  const move = (e) => {
    const r = base.current.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const d = Math.hypot(dx, dy)
    if (d > R) {
      dx = (dx / d) * R
      dy = (dy / d) * R
    }
    joy.x = dx / R
    joy.y = dy / R
    joy.active = true
    setKnob([dx, dy])
  }
  const end = () => {
    joy.x = 0
    joy.y = 0
    joy.active = false
    setKnob([0, 0])
  }
  useEffect(() => end, [])
  return (
    <div
      className={'joystick' + (knob[0] || knob[1] ? ' on' : '')}
      ref={base}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={(e) => joy.active && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
      aria-hidden="true"
    >
      <i style={{ transform: `translate(${knob[0]}px, ${knob[1]}px)` }} />
    </div>
  )
}

function Dialogue({ spot, sound, voice }) {
  const closeTalk = useStore((s) => s.closeTalk)
  const [lines, setLines] = useState([{ who: 'zubia', text: spot.intro }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    setLines([{ who: 'zubia', text: spot.intro }])
    if (voice) speak(spot.intro)
    return () => stopSpeaking()
  }, [spot.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [lines, busy])

  const ask = async (q, viaVoice = false) => {
    const question = q.trim()
    if (!question || busy) return
    setInput('')
    const history = lines.filter((l) => !l.error).map((l) => ({ role: l.who === 'you' ? 'user' : 'assistant', text: l.text }))
    setLines((l) => [...l, { who: 'you', text: question }])
    setBusy(true)
    sfx('talk', !sound)
    try {
      const data = await askAssistant(question, history)
      setLines((l) => [...l, { who: 'zubia', text: data.answer }])
      if (voice || viaVoice) speak(data.answer)
    } catch (err) {
      setLines((l) => [...l, { who: 'zubia', text: err.message, error: true }])
    } finally {
      setBusy(false)
    }
  }

  const mic = () => {
    if (listening) return recRef.current?.stop()
    setListening(true)
    recRef.current = listen({ onText: setInput, onDone: (t) => ask(t, true), onEnd: () => setListening(false) })
  }

  return (
    <section className="dialogue" role="dialog" aria-label={`Talking about ${spot.label}`}>
      <img className="dialogue-face" src={FACE} alt="" width="84" height="84" />
      <div className="dialogue-main">
        <header>
          <strong>Zubia</strong>
          <span>{spot.label}</span>
          <button className="icon-btn" onClick={closeTalk} aria-label="Close conversation (Esc)">
            ✕
          </button>
        </header>
        <div className="dialogue-lines" ref={listRef} aria-live="polite">
          {lines.map((l, i) => (
            <p key={i} className={'dl ' + l.who + (l.error ? ' error' : '')}>
              {l.who === 'zubia' && i === lines.length - 1 && !l.error ? <Typewriter text={l.text} /> : l.text}
            </p>
          ))}
          {busy && <p className="dl zubia thinking">…</p>}
        </div>
        <div className="dialogue-ask">
          {spot.ask.map((q) => (
            <button key={q} onClick={() => ask(q)} disabled={busy}>
              ▸ {q}
            </button>
          ))}
        </div>
        <form
          className="dialogue-input"
          onSubmit={(e) => {
            e.preventDefault()
            ask(input)
          }}
        >
          {SpeechRec && (
            <button type="button" className={'icon-btn mic' + (listening ? ' live' : '')} onClick={mic} aria-pressed={listening} aria-label="Ask by voice">
              🎤
            </button>
          )}
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? 'Listening…' : 'Ask me anything…'} maxLength={500} aria-label="Your question" />
          <button className="btn btn-primary btn-sm" disabled={busy || !input.trim()}>
            Ask
          </button>
        </form>
      </div>
    </section>
  )
}

export default function GameUI() {
  const game = useStore((s) => s.game)
  const exitGame = useStore((s) => s.exitGame)
  const talkSpot = useStore((s) => s.talkSpot)
  const nearSpot = useStore((s) => s.nearSpot)
  const talkTo = useStore((s) => s.talkTo)
  const closeTalk = useStore((s) => s.closeTalk)
  const discovered = useStore((s) => s.discovered)
  const gameDone = useStore((s) => s.gameDone)
  const markGameDone = useStore((s) => s.markGameDone)
  const [sound, setSound] = useState(() => readPref('zj-game-sound', true))
  const [voice, setVoice] = useState(() => readPref('zj-game-voice', false))
  const [toast, setToast] = useState(null)
  const [showDone, setShowDone] = useState(false)
  const [hint, setHint] = useState(true)
  const prevCount = useRef(discovered.length)
  // any touch screen (some phones don't report a "coarse" pointer), or a small screen
  const touch =
    typeof window !== 'undefined' &&
    (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || 'ontouchstart' in window || window.innerWidth < 820)

  useEffect(() => {
    document.body.classList.toggle('in-game', game !== 'off')
    if (game === 'on') {
      setHint(true)
      const t = setTimeout(() => setHint(false), 7000)
      return () => clearTimeout(t)
    }
  }, [game])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || useStore.getState().game === 'off') return
      if (useStore.getState().talkSpot) closeTalk()
      else exitGame()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeTalk, exitGame])

  // discovery pop-ups and the completion card
  useEffect(() => {
    if (discovered.length > prevCount.current) {
      const spot = SPOTS.find((s) => s.id === discovered[discovered.length - 1])
      setToast(`Discovered: ${spot.label}  (${discovered.length}/${SPOTS.length})`)
      sfx('discover', !sound)
      const t = setTimeout(() => setToast(null), 2600)
      prevCount.current = discovered.length
      return () => clearTimeout(t)
    }
    prevCount.current = discovered.length
  }, [discovered]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (game === 'on' && !talkSpot && !gameDone && discovered.length === SPOTS.length) {
      markGameDone()
      setShowDone(true)
      sfx('complete', !sound)
    }
  }, [game, talkSpot, gameDone, discovered.length, markGameDone, sound])

  if (game === 'off') return null
  if (game === 'starting') return <StartScreen />

  const spot = SPOTS.find((s) => s.id === talkSpot)
  const near = SPOTS.find((s) => s.id === nearSpot)
  return (
    <div className="game-ui">
      <div className="hud hud-left">
        <span className="hud-title">FREE ROAM</span>
        <span className="hud-count" aria-label={`${discovered.length} of ${SPOTS.length} discoveries`}>
          {SPOTS.map((s) => (
            <i key={s.id} className={discovered.includes(s.id) ? 'on' : ''} aria-hidden="true" />
          ))}
          <b>
            {discovered.length}/{SPOTS.length}
          </b>
        </span>
      </div>
      <div className="hud hud-right">
        <button
          className={'icon-btn' + (sound ? ' on' : '')}
          onClick={() => {
            setSound(!sound)
            writePref('zj-game-sound', !sound)
          }}
          aria-pressed={sound}
          title="Sound effects"
        >
          {sound ? '🔊' : '🔇'}
        </button>
        {canSpeak && (
          <button
            className={'icon-btn' + (voice ? ' on' : '')}
            onClick={() => {
              setVoice(!voice)
              writePref('zj-game-voice', !voice)
              if (voice) stopSpeaking()
            }}
            aria-pressed={voice}
            title="Read answers aloud"
          >
            🗣
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={exitGame}>
          Exit <kbd>Esc</kbd>
        </button>
      </div>

      {hint && !spot && (
        <p className="game-hint">
          {touch ? 'Drag the joystick to walk (push far to run) · tap the floor to walk there · tap Talk near a ✦' : 'WASD / arrow keys to walk · Shift to run · E to talk · Esc to exit'}
          <br />
          Find all {SPOTS.length} glowing spots in my studio.
        </p>
      )}

      {touch && !spot && !showDone && <Joystick />}

      {touch && near && !spot && (
        <button className="btn btn-primary game-talk" onClick={() => talkTo(near.id)}>
          Talk · {near.label}
        </button>
      )}

      {toast && <div className="game-toast">✦ {toast}</div>}

      {spot && <Dialogue spot={spot} sound={sound} voice={voice} />}

      {showDone && (
        <div className="game-done" role="dialog" aria-label="Studio complete">
          <p className="arcade-text ready">STUDIO COMPLETE</p>
          <p className="game-done-sub">You found all {SPOTS.length} spots in my studio. Thanks for playing!</p>
          <ul className="game-stats">
            <li>
              <b>3</b> studio internships
            </li>
            <li>
              <b>16</b> projects built
            </li>
            <li>
              <b>2nd</b> at GameCon
            </li>
          </ul>
          <div className="game-done-cta">
            <a className="btn btn-primary" href={profile.cv} download>
              Download CV
            </a>
            <button
              className="btn btn-ghost"
              onClick={() => {
                exitGame()
                setTimeout(() => goTo('contact'), 300)
              }}
            >
              Contact me
            </button>
            <button className="btn btn-ghost" onClick={() => setShowDone(false)}>
              Keep exploring
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
