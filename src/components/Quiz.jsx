// ZJ Arcade game 2: HOW WELL DO YOU KNOW ZUBIA? A 5-round card quiz with a timer, combos, ranks and an
// unlockable holographic player card. Fully offline; when online, each answer also brings a
// "Did you know?" line from the RAG assistant.
import { useCallback, useEffect, useRef, useState } from 'react'
import { reducedMotion } from '../store'
import { profile } from '../data/content'
import { play } from '../game/sound'
import { deal, ROUNDS, TIME, points, comboMult, rankOf, CARD_STATS, CARD_OVR } from '../game/quiz'
import { askAssistant } from '../lib/assistant'
import '../quiz.css'

const FACE = '/img/avatar-face.png'
const LETTERS = ['A', 'B', 'C', 'D']
const readBest = () => {
  try {
    return +localStorage.getItem('zj-quiz-best') || 0
  } catch {
    return 0
  }
}

function Ticker({ value }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (reducedMotion) return setShown(value)
    let raf
    const from = shown
    const t0 = performance.now()
    const step = (t) => {
      const u = Math.min(1, (t - t0) / 600)
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - u, 3))))
      if (u < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  return shown
}

// Zubia's holographic player card: tilts with the pointer, rainbow foil follows the light
function HoloCard({ locked, rank }) {
  const ref = useRef(null)
  const move = (e) => {
    const el = ref.current
    if (!el || locked || reducedMotion) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', (0.5 - y) * 18 + 'deg')
    el.style.setProperty('--ry', (x - 0.5) * 22 + 'deg')
    el.style.setProperty('--mx', x * 100 + '%')
    el.style.setProperty('--my', y * 100 + '%')
  }
  const leave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }
  return (
    <div className={'holo-wrap' + (locked ? ' locked' : '')} onPointerMove={move} onPointerLeave={leave}>
      <div className="holo" ref={ref} aria-label={locked ? 'Locked player card' : 'Zubia Junaid player card'} role="img">
        <div className="holo-foil" aria-hidden="true" />
        <div className="holo-top">
          <div className="holo-ovr">
            <b>{CARD_OVR}</b>
            <span>OVR</span>
          </div>
          <div className="holo-pos">
            GAMEPLAY
            <br />
            DEV · VR
          </div>
        </div>
        <img className="holo-face" src={FACE} alt="" width="120" height="120" />
        <p className="holo-name">ZUBIA JUNAID</p>
        <p className="holo-role">Game Developer · Unity · VR/XR</p>
        <ul className="holo-stats">
          {CARD_STATS.map(([k, label, v]) => (
            <li key={k} title={label}>
              <b>{v}</b> {k}
            </li>
          ))}
        </ul>
        <p className="holo-foot">
          {locked ? '🔒' : rank.icon} {locked ? 'LOCKED' : `Unlocked as ${rank.title}`}
        </p>
      </div>
      {locked && (
        <p className="holo-lock">
          <span aria-hidden="true">🔒</span> Get 3 or more right to unlock Zubia’s holo card
        </p>
      )}
    </div>
  )
}

export default function Quiz({ onBack }) {
  const [phase, setPhase] = useState('intro') // intro | play | reveal | end
  const [deck, setDeck] = useState(() => deal())
  const [round, setRound] = useState(0)
  const [picked, setPicked] = useState(null) // option index, or -1 when time ran out
  const [left, setLeft] = useState(TIME)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [gained, setGained] = useState(0)
  const [times, setTimes] = useState([])
  const [fact, setFact] = useState(null)
  const [hiScore, setHiScore] = useState(readBest)
  const t0 = useRef(0)
  const lastTick = useRef(TIME)
  const q = deck[round]
  const roundRef = useRef(0)
  roundRef.current = phase === 'end' ? -1 : round

  const start = () => {
    play('select')
    setDeck((d) => (phase === 'end' ? deal() : d))
    setRound(0)
    setScore(0)
    setStreak(0)
    setBest(0)
    setCorrect(0)
    setTimes([])
    begin()
  }
  const begin = () => {
    setPicked(null)
    setFact(null)
    setGained(0)
    setLeft(TIME)
    lastTick.current = TIME
    t0.current = performance.now()
    setPhase('play')
    setTimeout(() => play('flip'), 80)
  }

  const answer = useCallback(
    (i) => {
      if (phase !== 'play') return
      const spent = Math.min(TIME, (performance.now() - t0.current) / 1000)
      const secsLeft = Math.max(0, Math.ceil(TIME - spent))
      setPicked(i)
      setTimes((t) => [...t, spent])
      setPhase('reveal')
      const right = i === q.correct
      if (right) {
        const s = streak + 1
        const p = points(secsLeft, s)
        setStreak(s)
        setBest((b) => Math.max(b, s))
        setCorrect((c) => c + 1)
        setScore((v) => v + p)
        setGained(p)
        play('correct', s)
        if (s >= 2) setTimeout(() => play('combo'), 180)
      } else {
        setStreak(0)
        play('wrong')
      }
      // bonus fact from the assistant (online only); the local fact always shows
      if (navigator.onLine !== false) {
        const r = round
        askAssistant(q.ask)
          .then((d) => roundRef.current === r && setFact(d.answer))
          .catch(() => {})
      }
    },
    [phase, q, streak, round],
  )

  const next = useCallback(() => {
    if (phase !== 'reveal') return
    if (round + 1 >= ROUNDS) {
      setPhase('end')
      return
    }
    setRound((r) => r + 1)
    begin()
  }, [phase, round]) // eslint-disable-line react-hooks/exhaustive-deps

  // the clock
  useEffect(() => {
    if (phase !== 'play') return
    const id = setInterval(() => {
      const l = TIME - (performance.now() - t0.current) / 1000
      setLeft(Math.max(0, l))
      const whole = Math.ceil(l)
      if (whole !== lastTick.current) {
        lastTick.current = whole
        if (whole <= 3 && whole > 0) play('tick')
      }
      if (l <= 0) answer(-1)
    }, 100)
    return () => clearInterval(id)
  }, [phase, answer])

  // the end: rank fanfare, card unlock, best score
  useEffect(() => {
    if (phase !== 'end') return
    play('fanfare')
    if (correct >= 3) setTimeout(() => play('unlock'), 1100)
    if (score > hiScore) {
      setHiScore(score)
      try {
        localStorage.setItem('zj-quiz-best', String(score))
      } catch {
        /* storage blocked */
      }
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard: 1-4 or A-D to answer, Enter / Space for next
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea')) return
      const k = e.key.toLowerCase()
      const n = ['1', '2', '3', '4'].indexOf(k) >= 0 ? +k - 1 : ['a', 'b', 'c', 'd'].indexOf(k)
      if (phase === 'play' && n >= 0) answer(n)
      else if (phase === 'reveal' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, answer, next])

  if (phase === 'intro') {
    return (
      <div className="quiz quiz-intro">
        <button className="btn btn-ghost btn-sm quiz-back" onClick={onBack}>
          ◀ Games
        </button>
        <div className="quiz-deck" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <h2>
          HOW WELL DO YOU
          <br />
          KNOW ZUBIA?
        </h2>
        <ul className="quiz-rules">
          <li>
            <b>{ROUNDS}</b> rounds
          </li>
          <li>
            <b>{TIME}s</b> per card
          </li>
          <li>
            <b>×3</b> max combo
          </li>
        </ul>
        <p className="quiz-sub">Answer fast for bonus points. Get 3+ right to unlock Zubia’s holographic player card.</p>
        <button className="btn btn-primary quiz-go" onClick={start} autoFocus>
          ▶ START
        </button>
        {hiScore > 0 && <p className="quiz-hi">Your best: {hiScore}</p>}
        <p className="quiz-keys">Keys: 1–4 to answer · Enter for next</p>
      </div>
    )
  }

  if (phase === 'end') {
    const rank = rankOf(correct)
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0
    return (
      <div className="quiz quiz-end">
        <div className="quiz-result">
          <p className="quiz-rank-ico" aria-hidden="true">
            {rank.icon}
          </p>
          <p className="quiz-kicker">YOUR RANK</p>
          <h2 className={'quiz-rank ' + rank.id}>{rank.title}</h2>
          <p className="quiz-sub">{rank.line}</p>
          <ul className="quiz-stats">
            <li>
              <b>
                <Ticker value={score} />
              </b>
              Score
            </li>
            <li>
              <b>
                {correct}/{ROUNDS}
              </b>
              Correct
            </li>
            <li>
              <b>{best}</b>
              Best streak
            </li>
            <li>
              <b>{avg.toFixed(1)}s</b>
              Avg answer
            </li>
          </ul>
          {score >= hiScore && score > 0 && <p className="quiz-new">★ NEW PERSONAL BEST ★</p>}
          <div className="quiz-cta">
            <button className="btn btn-primary" onClick={start}>
              ↻ Play again
            </button>
            <a className="btn btn-ghost" href={profile.cv} download>
              Download CV
            </a>
            <button className="btn btn-ghost" onClick={onBack}>
              ◀ Games
            </button>
          </div>
        </div>
        <HoloCard locked={correct < 3} rank={rank} />
      </div>
    )
  }

  const pct = (left / TIME) * 100
  const right = picked === q.correct
  return (
    <div className="quiz">
      <div className="quiz-hud">
        <button className="btn btn-ghost btn-sm" onClick={onBack} aria-label="Quit to the games menu">
          ◀
        </button>
        <div className="quiz-pips" aria-label={`Round ${round + 1} of ${ROUNDS}`}>
          {deck.map((_, i) => (
            <i key={i} className={i < round ? 'done' : i === round ? 'now' : ''} />
          ))}
        </div>
        <div className={'quiz-combo' + (streak >= 2 ? ' on' : '')} aria-live="polite">
          {streak >= 2 ? `🔥 ×${comboMult(streak)}` : ''}
        </div>
        <div className="quiz-score" aria-label="Score">
          <Ticker value={score} />
        </div>
      </div>
      <div className={'quiz-timer' + (left <= 3 && phase === 'play' ? ' hurry' : '')} aria-hidden="true">
        <i style={{ width: (phase === 'play' ? pct : 0) + '%' }} />
        <span>{phase === 'play' ? Math.ceil(left) : ''}</span>
      </div>

      <div className="quiz-q" key={'q' + round}>
        <span className="quiz-q-no">
          CARD {round + 1}/{ROUNDS}
        </span>
        <p>{q.q}</p>
      </div>

      <div className="quiz-opts" role="group" aria-label="Answers">
        {q.opts.map((o, i) => {
          const state = phase === 'reveal' ? (i === q.correct ? ' right' : i === picked ? ' wrong' : ' dim') : ''
          return (
            <button key={round + '-' + i} className={'quiz-opt' + state} onClick={() => answer(i)} disabled={phase !== 'play'} style={{ '--i': i }}>
              <span className="quiz-opt-inner">
                <span className="quiz-opt-face">
                  <kbd>{LETTERS[i]}</kbd>
                  {o.text}
                </span>
                <span className="quiz-opt-back">
                  <b aria-hidden="true">{i === q.correct ? '✔' : '✘'}</b>
                  {o.text}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {phase === 'reveal' && (
        <div className={'quiz-reveal' + (right ? ' good' : ' bad')} aria-live="assertive">
          <p className="quiz-verdict">
            {picked === -1 ? '⏰ TIME UP!' : right ? `✔ CORRECT  +${gained}` : '✘ NOT QUITE'}
            {right && streak >= 2 && <span className="quiz-combo-pop">COMBO ×{comboMult(streak)}</span>}
          </p>
          <p className="quiz-fact">{q.fact}</p>
          {fact && (
            <p className="quiz-dyk">
              <b>💬 Zubia says:</b> {fact}
            </p>
          )}
          <button className="btn btn-primary" onClick={next} autoFocus>
            {round + 1 >= ROUNDS ? 'See my rank ▶' : 'Next card ▶'}
          </button>
        </div>
      )}
    </div>
  )
}
