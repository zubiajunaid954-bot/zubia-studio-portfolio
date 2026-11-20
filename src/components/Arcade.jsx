// ZJ Arcade on screen: the coin-insert HUD, the 2D coin drop (no-3D / reduced motion), the CRT boot,
// the game-select menu and the games themselves. The 3D part (walk, coin flick, screen dive) lives in
// Avatar.jsx, Rooms.jsx (the machine) and Studio.jsx (camera).
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useStore, reducedMotion } from '../store'
import { profile } from '../data/content'
import { goTo } from './ZoneRail'
import { play, isMuted, setMuted, onMute } from '../game/sound'
import { FIT_CARDS, loadPresets, checkCustom, OfflineError } from '../game/fit'
import '../arcade.css'
import Quiz from './Quiz'

const loadCrunch = () => import('./Crunch')
const Crunch = lazy(loadCrunch)
// Crunch Time must work offline, so its code is fetched in the background once the page has settled
// (and again when the arcade opens), not only when the game is picked
if (typeof window !== 'undefined') {
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1))
  setTimeout(() => idle(() => loadCrunch().catch(() => {})), 9000)
}

const GAMES = [
  { id: 'fit', title: 'FIT CHECK', tag: 'Is Zubia right for your studio?', icon: '🎯', net: true, ready: true },
  { id: 'quiz', title: 'HOW WELL DO YOU KNOW ZUBIA?', tag: 'Flip cards · beat the clock · earn your rank', icon: '🃏', ready: true },
  { id: 'crunch', title: 'CRUNCH TIME', tag: 'Squash the bugs before release day', icon: '🐞', ready: true, gl: true },
  { id: 'roam', title: 'FREE ROAM', tag: 'Walk my studio and talk to everything', icon: '🧭', ready: true, needs3d: true },
]

function useMuted() {
  const [m, setM] = useState(isMuted)
  useEffect(() => onMute(setM), [])
  return m
}

function Coins() {
  const coins = useStore((s) => s.coins)
  return (
    <span className="arc-coins" title="Explore the studio rooms to earn more coins">
      <i className="arc-coin-ico" aria-hidden="true" />
      <span className="sr-only">Coins:</span> × {coins}
      {coins === 0 && <small className="arc-free">FREE PLAY</small>}
    </span>
  )
}

function MuteBtn() {
  const muted = useMuted()
  return (
    <button className="icon-btn" onClick={() => setMuted(!muted)} aria-pressed={!muted} title={muted ? 'Sound off' : 'Sound on'}>
      {muted ? '🔇' : '🔊'}
      <span className="sr-only">Arcade sound</span>
    </button>
  )
}

// while she walks over and inserts the coin
function InsertHud() {
  const closeArcade = useStore((s) => s.closeArcade)
  const arcade = useStore((s) => s.arcade)
  const skip = () => {
    useStore.getState().spendCoin()
    useStore.getState().setArcade('boot')
  }
  return (
    <div className="arc-hud" role="status" aria-live="polite">
      <span className="arc-hud-title">ZJ ARCADE</span>
      <Coins />
      <span className="arc-hud-msg">{arcade === 'walk' ? 'Heading to the machine…' : 'Inserting coin…'}</span>
      <button className="btn btn-ghost btn-sm" onClick={skip}>
        Skip
      </button>
      <button className="btn btn-ghost btn-sm" onClick={closeArcade}>
        Exit <kbd>Esc</kbd>
      </button>
    </div>
  )
}

// no 3D (or reduced motion): the coin spins and drops into a slot on screen
function CoinDrop() {
  const setArcade = useStore((s) => s.setArcade)
  const [phase, setPhase] = useState('drop')
  useEffect(() => {
    const fast = reducedMotion
    const t1 = setTimeout(() => play('glint'), 100)
    const t2 = setTimeout(
      () => {
        play('clink')
        useStore.getState().spendCoin()
        setPhase('in')
      },
      fast ? 150 : 950,
    )
    const t3 = setTimeout(
      () => {
        play('boot')
        setPhase('boot')
      },
      fast ? 300 : 1400,
    )
    const t4 = setTimeout(() => setArcade('menu'), fast ? 600 : 2300)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [setArcade])
  return (
    <div className={'arc-drop ' + phase} role="status" aria-live="polite">
      <div className="arc-drop-door">
        <div className="arc-drop-coin" aria-hidden="true">
          <span>ZJ</span>
        </div>
        <div className="arc-drop-slot" aria-hidden="true" />
        <p>{phase === 'drop' ? 'INSERT COIN' : 'CREDIT 1'}</p>
      </div>
      {phase === 'boot' && <div className="arc-crt-on" aria-hidden="true" />}
    </div>
  )
}

// the camera dives into the screen: the CRT powers on over it
function Boot() {
  const setArcade = useStore((s) => s.setArcade)
  useEffect(() => {
    play('boot')
    if (navigator.onLine !== false) loadPresets().catch(() => {}) // so the Fit Check cards flip instantly
    loadCrunch().catch(() => {})
    const t = setTimeout(() => setArcade('menu'), reducedMotion ? 200 : 1500)
    return () => clearTimeout(t)
  }, [setArcade])
  return (
    <div className="arc-boot" aria-hidden="true">
      <div className="arc-crt-on" />
    </div>
  )
}

function SignalLost({ onBack, onQuiz, onCrunch }) {
  useEffect(() => play('lost'), [])
  return (
    <div className="arc-lost" role="alert">
      <div className="arc-lost-noise" aria-hidden="true" />
      <p className="arc-lost-ico" aria-hidden="true">
        📡
      </p>
      <h2>SIGNAL LOST</h2>
      <p>This game needs the internet. Try Crunch Time or the Quiz while you're offline!</p>
      <div className="arc-lost-cta">
        <button className="btn btn-primary" onClick={onQuiz} autoFocus>
          🃏 Play the Quiz
        </button>
        <button className="btn btn-primary" onClick={onCrunch}>
          🐞 Play Crunch Time
        </button>
        <button className="btn btn-ghost" onClick={onBack}>
          ◀ Back to games
        </button>
      </div>
    </div>
  )
}

function Menu({ onPick }) {
  const lite = useStore((s) => s.lite)
  const noWebGL = useStore((s) => s.noWebGL)
  const [focus, setFocus] = useState(0)
  const refs = useRef([])
  useEffect(() => refs.current[0]?.focus(), [])
  const onKey = (e) => {
    const cols = window.innerWidth >= 720 ? 2 : 1
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key]
    if (!step) return
    e.preventDefault()
    const n = (focus + step + GAMES.length) % GAMES.length
    setFocus(n)
    refs.current[n]?.focus()
    play('move')
  }
  return (
    <div className="arc-menu">
      <p className="arc-kicker">SELECT A GAME</p>
      <div className="arc-games" role="list" onKeyDown={onKey}>
        {GAMES.map((g, i) => {
          const off = !g.ready || (g.needs3d && lite) || (g.gl && noWebGL)
          return (
            <button
              key={g.id}
              ref={(el) => (refs.current[i] = el)}
              role="listitem"
              className={'arc-game' + (off ? ' locked' : '')}
              onFocus={() => setFocus(i)}
              onClick={() => (off ? play('locked') : onPick(g.id))}
              aria-disabled={off}
              style={{ '--i': i }}
            >
              <span className="arc-game-ico" aria-hidden="true">
                {g.icon}
              </span>
              <span className="arc-game-text">
                <strong>{g.title}</strong>
                <small>{g.tag}</small>
              </span>
              <span className="arc-game-tags">
                {!g.ready ? (
                  <em className="soon">🔒 COMING NEXT</em>
                ) : (g.needs3d && lite) || (g.gl && noWebGL) ? (
                  <em className="soon">3D VIEW ONLY</em>
                ) : (
                  <>
                    <em>{g.net ? 'ONLINE' : g.id === 'roam' ? 'PLAY' : 'OFFLINE OK'}</em>
                    <b aria-hidden="true">▶</b>
                  </>
                )}
              </span>
            </button>
          )
        })}
      </div>
      <p className="arc-foot">Every room you visit in the studio earns a bonus coin.</p>
    </div>
  )
}

// ---------------- FIT CHECK ----------------
const rankOf = (m) => (m >= 80 ? 'Strong match' : m >= 60 ? 'Good match' : m >= 40 ? 'Partial match' : 'Low match')

function CountUp({ to }) {
  const [n, setN] = useState(reducedMotion ? to : 0)
  useEffect(() => {
    if (reducedMotion) return setN(to)
    let v = 0
    const id = setInterval(() => {
      v += 1
      setN(Math.min(v, to))
      if (v >= to) clearInterval(id)
    }, 45)
    return () => clearInterval(id)
  }, [to])
  return n
}

function Result({ r }) {
  useEffect(() => play('score', r.score), [r.score])
  return (
    <div className="fit-result">
      <p className="fit-score">
        <b>
          <CountUp to={r.score} />
        </b>
        <span>/10</span>
      </p>
      <div className="fit-bar" aria-hidden="true">
        <i style={{ width: r.score * 10 + '%' }} />
      </div>
      <p className="fit-verdict">{r.verdict}</p>
      {r.evidence && <p className="fit-ev">✔ {r.evidence}</p>}
      {r.gap && <p className="fit-gap">△ {r.gap}</p>}
    </div>
  )
}

function FitCard({ card, result, error, flipped, onFlip, onRetry }) {
  return (
    <div className={'fit-card' + (flipped ? ' flipped' : '')}>
      <div className="fit-inner">
        <button className="fit-face fit-front" onClick={onFlip} aria-label={`Check: ${card.label}`} tabIndex={flipped ? -1 : 0} aria-hidden={flipped}>
          <span className="fit-ico" aria-hidden="true">
            {card.icon}
          </span>
          <strong>{card.label}</strong>
          <small>TAP TO CHECK</small>
        </button>
        <div className="fit-face fit-back" aria-hidden={!flipped} aria-live="polite">
          <p className="fit-label">
            <span aria-hidden="true">{card.icon}</span> {card.label}
          </p>
          {result ? (
            <Result r={result} />
          ) : error ? (
            <div className="fit-err">
              <p>{error}</p>
              <button className="btn btn-ghost btn-sm" onClick={onRetry}>
                Try again
              </button>
            </div>
          ) : (
            <div className="fit-scan" role="status">
              <i />
              <span>Scanning her CV…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OtherCard({ onResult, onLost }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    const q = text.trim()
    if (q.length < 2 || busy) return
    setBusy(true)
    setError(null)
    play('scan')
    try {
      const r = await checkCustom(q)
      onResult({ ...r, label: q })
      setText('')
    } catch (err) {
      if (err instanceof OfflineError) onLost()
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className={'fit-card fit-other' + (busy ? ' busy' : '')} onSubmit={submit}>
      <div className="fit-face">
        <span className="fit-ico" aria-hidden="true">
          ✏️
        </span>
        <strong>Other</strong>
        <small>Type your own requirement</small>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="e.g. Shader programming" aria-label="Your requirement" disabled={busy} />
        <button className="btn btn-primary btn-sm" disabled={busy || text.trim().length < 2}>
          {busy ? 'Scanning…' : 'Check'}
        </button>
        {error && <p className="fit-err-inline">{error}</p>}
      </div>
    </form>
  )
}

function FitCheck({ onLost, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [flipped, setFlipped] = useState([])
  const [custom, setCustom] = useState([])
  const closeArcade = useStore((s) => s.closeArcade)

  const load = () => {
    setError(null)
    loadPresets()
      .then(setData)
      .catch((err) => (err instanceof OfflineError ? onLost() : setError(err.message)))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const scores = [...flipped.map((id) => data?.[id]?.score).filter((v) => v !== undefined), ...custom.map((c) => c.score)]
  const match = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) : 0
  const prev = useRef(0)
  useEffect(() => {
    if (scores.length !== prev.current) {
      prev.current = scores.length
      if (scores.length) setTimeout(() => play('meter'), 500)
    }
  }, [scores.length])

  return (
    <div className="fit">
      <div className="fit-head">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          ◀ Games
        </button>
        <div className="fit-title">
          <h2>FIT CHECK</h2>
          <p>Is Zubia right for your studio? Flip the skills you need.</p>
        </div>
      </div>
      <div className="fit-meter" aria-live="polite">
        <div className="fit-meter-top">
          <span>MATCH METER</span>
          <b>{scores.length ? `${match}% · ${rankOf(match)}` : 'Flip a card to start'}</b>
        </div>
        <div className="fit-meter-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={match} aria-label="Match">
          <i style={{ width: match + '%' }} />
        </div>
        <small>
          {scores.length} checked · AI estimate based on Zubia's CV
        </small>
      </div>
      <div className="fit-grid">
        {FIT_CARDS.map((c) => (
          <FitCard
            key={c.id}
            card={c}
            flipped={flipped.includes(c.id)}
            result={flipped.includes(c.id) ? data?.[c.id] : null}
            error={flipped.includes(c.id) && !data ? error : null}
            onFlip={() => {
              play('flip')
              setFlipped((f) => (f.includes(c.id) ? f : [...f, c.id]))
            }}
            onRetry={load}
          />
        ))}
        {custom.map((r) => (
          <FitCard key={r.key} card={{ icon: '✏️', label: r.label }} flipped result={r} />
        ))}
        <OtherCard onLost={onLost} onResult={(r) => setCustom((c) => [...c, { ...r, key: Date.now() }])} />
      </div>
      <div className="fit-cta">
        <a className="btn btn-primary" href={profile.cv} download>
          Download CV
        </a>
        <button
          className="btn btn-ghost"
          onClick={() => {
            closeArcade()
            setTimeout(() => goTo('contact'), 450)
          }}
        >
          Contact Zubia
        </button>
      </div>
    </div>
  )
}

function Screen() {
  const arcade = useStore((s) => s.arcade)
  const setArcade = useStore((s) => s.setArcade)
  const closeArcade = useStore((s) => s.closeArcade)
  const [lost, setLost] = useState(false)
  const pick = (id) => {
    if (id === 'roam') {
      play('select')
      return useStore.getState().arcadeFreeRoam()
    }
    if (id === 'fit') {
      play('select')
      if (navigator.onLine === false) return setLost(true)
      setArcade('fit')
    }
    if (id === 'quiz' || id === 'crunch') {
      play('select')
      setLost(false)
      setArcade(id)
    }
  }
  const back = () => {
    play('back')
    setLost(false)
    setArcade('menu')
  }
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (lost || ['fit', 'quiz', 'crunch'].includes(useStore.getState().arcade)) back()
      else closeArcade()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="arc-screen" role="dialog" aria-modal="true" aria-label="ZJ Arcade">
      <div className="arc-crt" aria-hidden="true" />
      <header className="arc-top">
        <span className="arc-logo">
          ZJ <b>ARCADE</b>
        </span>
        <Coins />
        <span className="arc-top-tools">
          <MuteBtn />
          <button className="btn btn-ghost btn-sm" onClick={closeArcade}>
            Exit <kbd>Esc</kbd>
          </button>
        </span>
      </header>
      <div className={'arc-body' + (arcade === 'crunch' && !lost ? ' full' : '')} key={lost ? 'lost' : arcade}>
        {lost ? (
          <SignalLost onBack={back} onQuiz={() => pick('quiz')} onCrunch={() => pick('crunch')} />
        ) : arcade === 'fit' ? (
          <FitCheck onBack={back} onLost={() => setLost(true)} />
        ) : arcade === 'quiz' ? (
          <Quiz onBack={back} />
        ) : arcade === 'crunch' ? (
          <Suspense fallback={<p className="arc-foot">Loading Crunch Time…</p>}>
            <Crunch onBack={back} />
          </Suspense>
        ) : (
          <Menu onPick={pick} />
        )}
      </div>
    </div>
  )
}

export default function Arcade() {
  const arcade = useStore((s) => s.arcade)
  const closeArcade = useStore((s) => s.closeArcade)
  useEffect(() => {
    document.body.classList.toggle('in-arcade', !!arcade)
  }, [arcade])
  // Esc while she walks / inserts / boots: back to the site
  useEffect(() => {
    if (!['walk', 'insert', 'boot', 'drop'].includes(arcade)) return
    const onKey = (e) => e.key === 'Escape' && closeArcade()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [arcade, closeArcade])
  if (!arcade) return null
  if (arcade === 'walk' || arcade === 'insert') return <InsertHud />
  if (arcade === 'drop') return <CoinDrop />
  if (arcade === 'boot') return <Boot />
  return <Screen />
}
