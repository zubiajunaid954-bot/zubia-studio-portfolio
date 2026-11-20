// ZJ Arcade sound pack: small synthesised sounds (WebAudio, no files to download).
// One shared mute switch, remembered per visitor.
let ctx = null
let master = null
const KEY = 'zj-arcade-sound'

let muted = (() => {
  try {
    return localStorage.getItem(KEY) === '0'
  } catch {
    return false
  }
})()
const listeners = new Set()

export const isMuted = () => muted
export function setMuted(m) {
  muted = m
  try {
    localStorage.setItem(KEY, m ? '0' : '1')
  } catch {
    /* storage blocked */
  }
  listeners.forEach((f) => f(m))
}
export const onMute = (f) => (listeners.add(f), () => listeners.delete(f))

function audio() {
  if (muted) return null
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      master = ctx.createGain()
      master.gain.value = 0.55
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx.state === 'running' || ctx.state === 'suspended' ? ctx : null
  } catch {
    return null
  }
}

// one tone with an attack/decay envelope, optional pitch slide
function tone(c, { f, f2, t = 0, d = 0.12, type = 'square', v = 0.06, out = master }) {
  const o = c.createOscillator()
  const g = c.createGain()
  const at = c.currentTime + t
  o.type = type
  o.frequency.setValueAtTime(f, at)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + d)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(v, at + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, at + d)
  o.connect(g).connect(out)
  o.start(at)
  o.stop(at + d + 0.02)
}

// short filtered noise burst (whooshes, clicks)
function noise(c, { t = 0, d = 0.15, v = 0.05, freq = 2000, q = 1, type = 'bandpass', sweep }) {
  const len = Math.ceil(c.sampleRate * d)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filt = c.createBiquadFilter()
  filt.type = type
  filt.Q.value = q
  const at = c.currentTime + t
  filt.frequency.setValueAtTime(freq, at)
  if (sweep) filt.frequency.exponentialRampToValueAtTime(sweep, at + d)
  const g = c.createGain()
  g.gain.setValueAtTime(v, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + d)
  src.connect(filt).connect(g).connect(master)
  src.start(at)
}

const SOUNDS = {
  // bonus coin pop: the classic two-note "ching"
  coin: (c) => {
    tone(c, { f: 988, d: 0.09, v: 0.05 })
    tone(c, { f: 1319, t: 0.08, d: 0.32, v: 0.05 })
  },
  // coin out of the pocket: a soft metallic glint
  glint: (c) => {
    tone(c, { f: 2637, d: 0.18, type: 'sine', v: 0.03 })
    tone(c, { f: 3520, t: 0.05, d: 0.22, type: 'sine', v: 0.02 })
  },
  // flick: a quick airy whoosh
  flick: (c) => noise(c, { d: 0.22, v: 0.06, freq: 900, sweep: 4000, q: 0.8 }),
  // the coin dropping into the slot: metallic clink + rattle down the chute
  clink: (c) => {
    tone(c, { f: 3100, d: 0.14, type: 'triangle', v: 0.07 })
    tone(c, { f: 4650, d: 0.1, type: 'sine', v: 0.04 })
    tone(c, { f: 2480, t: 0.09, d: 0.12, type: 'triangle', v: 0.045 })
    tone(c, { f: 1860, t: 0.17, d: 0.1, type: 'triangle', v: 0.03 })
    noise(c, { t: 0.05, d: 0.25, v: 0.03, freq: 5000, q: 3 })
  },
  // the machine boots: power-up sweep + a little fanfare
  boot: (c) => {
    tone(c, { f: 110, f2: 880, d: 0.45, type: 'sawtooth', v: 0.035 })
    const notes = [523, 659, 784, 1047, 784, 1047, 1319]
    notes.forEach((f, i) => tone(c, { f, t: 0.42 + i * 0.09, d: i === notes.length - 1 ? 0.5 : 0.12, v: 0.045 }))
    notes.forEach((f, i) => tone(c, { f: f / 2, t: 0.42 + i * 0.09, d: 0.12, type: 'triangle', v: 0.03 }))
  },
  // menu
  move: (c) => tone(c, { f: 660, d: 0.05, v: 0.03 }),
  select: (c) => {
    tone(c, { f: 784, d: 0.07, v: 0.045 })
    tone(c, { f: 1175, t: 0.06, d: 0.16, v: 0.045 })
  },
  back: (c) => {
    tone(c, { f: 660, d: 0.07, v: 0.04 })
    tone(c, { f: 440, t: 0.06, d: 0.14, v: 0.04 })
  },
  locked: (c) => tone(c, { f: 196, f2: 150, d: 0.18, type: 'square', v: 0.04 }),
  // cards
  flip: (c) => noise(c, { d: 0.16, v: 0.05, freq: 1800, sweep: 600, q: 1.2 }),
  scan: (c) => [0, 1, 2, 3].forEach((i) => tone(c, { f: 880 + i * 220, t: i * 0.07, d: 0.05, type: 'sine', v: 0.025 })),
  // score reveal: a rising arpeggio, longer for higher scores (0..10)
  score: (c, n = 5) => {
    const scale = [392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319, 1568]
    for (let i = 0; i <= n; i++) tone(c, { f: scale[i], t: i * 0.045, d: i === n ? 0.3 : 0.07, v: 0.035 })
  },
  meter: (c) => tone(c, { f: 1568, d: 0.25, type: 'sine', v: 0.03 }),
  // quiz
  correct: (c, combo = 1) => {
    const base = 659 * Math.pow(1.06, Math.min(6, combo - 1))
    tone(c, { f: base, d: 0.08, v: 0.045 })
    tone(c, { f: base * 1.5, t: 0.07, d: 0.2, v: 0.045 })
  },
  wrong: (c) => {
    tone(c, { f: 220, f2: 140, d: 0.28, type: 'sawtooth', v: 0.035 })
    tone(c, { f: 233, f2: 150, d: 0.28, type: 'square', v: 0.02 })
  },
  tick: (c) => tone(c, { f: 1200, d: 0.04, type: 'sine', v: 0.03 }),
  combo: (c) => [0, 1, 2].forEach((i) => tone(c, { f: 1047 * Math.pow(1.26, i), t: i * 0.05, d: 0.09, type: 'triangle', v: 0.035 })),
  fanfare: (c) => {
    const n = [523, 523, 523, 659, 784, 659, 784, 1047]
    const tt = [0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.7, 0.85]
    n.forEach((f, i) => tone(c, { f, t: tt[i], d: i === n.length - 1 ? 0.6 : 0.1, v: 0.045 }))
    n.forEach((f, i) => tone(c, { f: f / 2, t: tt[i], d: 0.1, type: 'triangle', v: 0.03 }))
  },
  unlock: (c) => {
    noise(c, { d: 0.5, v: 0.04, freq: 600, sweep: 6000, q: 0.7 })
    ;[784, 988, 1175, 1568].forEach((f, i) => tone(c, { f, t: 0.15 + i * 0.07, d: 0.35, type: 'sine', v: 0.03 }))
  },
  // crunch time
  pew: (c) => tone(c, { f: 1400, f2: 500, d: 0.07, type: 'square', v: 0.018 }),
  zap: (c) => {
    tone(c, { f: 180, f2: 900, d: 0.18, type: 'sawtooth', v: 0.022 })
    noise(c, { d: 0.18, v: 0.015, freq: 4000, q: 2 })
  },
  freeze: (c) => {
    noise(c, { d: 0.35, v: 0.035, freq: 7000, sweep: 2500, q: 1.5 })
    tone(c, { f: 2093, d: 0.25, type: 'sine', v: 0.018 })
  },
  thump: (c) => tone(c, { f: 160, f2: 60, d: 0.16, type: 'sine', v: 0.06 }),
  boom: (c) => {
    noise(c, { d: 0.45, v: 0.07, freq: 900, sweep: 120, q: 0.7, type: 'lowpass' })
    tone(c, { f: 90, f2: 40, d: 0.35, type: 'sine', v: 0.06 })
  },
  squash: (c, type) => {
    const f = type === 'boss' ? 90 : type === 'crash' ? 200 : type === 'glitch' ? 700 : 420
    tone(c, { f, f2: f * 0.45, d: type === 'boss' ? 0.8 : 0.1, type: 'square', v: 0.03 })
    noise(c, { d: type === 'boss' ? 0.9 : 0.08, v: 0.03, freq: 1500, q: 1 })
  },
  leak: (c) => {
    tone(c, { f: 330, f2: 220, d: 0.2, type: 'square', v: 0.035 })
    tone(c, { f: 220, f2: 150, t: 0.12, d: 0.25, type: 'square', v: 0.035 })
  },
  wave: (c) => [392, 523, 659].forEach((f, i) => tone(c, { f, t: i * 0.08, d: 0.14, type: 'square', v: 0.035 })),
  bossroar: (c) => {
    tone(c, { f: 70, f2: 45, d: 1.1, type: 'sawtooth', v: 0.05 })
    tone(c, { f: 73, f2: 48, d: 1.1, type: 'sawtooth', v: 0.04 })
    noise(c, { d: 1.0, v: 0.04, freq: 400, q: 0.8, type: 'lowpass' })
  },
  cleared: (c) => [523, 659, 784, 1047].forEach((f, i) => tone(c, { f, t: i * 0.07, d: 0.16, v: 0.035 })),
  lose: (c) => [392, 349, 311, 262].forEach((f, i) => tone(c, { f, t: i * 0.22, d: 0.3, type: 'triangle', v: 0.05 })),
  build: (c) => {
    tone(c, { f: 300, f2: 600, d: 0.08, type: 'square', v: 0.03 })
    noise(c, { t: 0.06, d: 0.08, v: 0.03, freq: 2500, q: 2 })
  },
  upgrade: (c) => [659, 880, 1175].forEach((f, i) => tone(c, { f, t: i * 0.06, d: 0.12, type: 'triangle', v: 0.035 })),
  sell: (c) => {
    tone(c, { f: 1319, d: 0.08, v: 0.035 })
    tone(c, { f: 988, t: 0.07, d: 0.14, v: 0.035 })
  },
  // no internet
  lost: (c) => {
    tone(c, { f: 440, f2: 110, d: 0.6, type: 'sawtooth', v: 0.035 })
    noise(c, { d: 0.6, v: 0.025, freq: 3000, q: 0.5, type: 'highpass' })
  },
}

export function play(kind, arg) {
  const c = audio()
  if (!c || !SOUNDS[kind]) return
  try {
    SOUNDS[kind](c, arg)
  } catch {
    /* audio not available */
  }
}
