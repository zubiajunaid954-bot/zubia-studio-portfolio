// Free Roam Mode: the walkable studio. Collision boxes for walls and furniture, the objects you
// can talk to, keyboard input, and tiny sound effects. Pure data + helpers (no React).
import { ROOM, HALF, COUNT, LANE_Z, roomX, CAM_DIR } from '../three/layout'

export const AVATAR_R = 0.32

// furniture footprints in each room's local coordinates: [x0, x1, z0, z1]
const FURNITURE = [
  [[-0.5, 2.5, -2.1, -1.1], [2.3, 3.3, 0.0, 1.8]], // lobby: desk, seats
  [[-2.5, -0.7, -3.4, -2.8], [-0.4, 2.2, -3.1, -2.0], [0.2, 1.6, -1.6, -0.8]], // about: shelf, sofa, table
  [[-1.0, 2.5, -2.9, -1.7], [0.4, 1.1, -1.6, -0.9], [2.5, 3.0, -2.9, -1.9], [-3.0, -2.2, -3.3, -2.5], [2.3, 2.9, -0.9, -0.3]], // skills
  [[-2.95, -2.05, -2.75, -1.85], [-1.25, -0.35, -1.95, -1.05], [0.45, 1.35, -2.75, -1.85], [2.15, 3.05, -1.95, -1.05]], // career posts
  [[-0.85, 1.45, -1.4, -0.8], [2.35, 3.2, -1.1, -0.3], [2.35, 3.2, 0.05, 0.85]], // projects: bench, arcades
  [[-2.7, 0.7, -3.4, -2.7], [0.55, 3.35, -1.9, -0.9]], // trophies: shelf, podium
  [[-2.55, -1.95, -3.3, -2.7], [2.95, 3.55, -3.3, -2.7], [-0.6, 2.4, -1.65, -0.75], [-0.3, 2.7, -0.4, 0.6]], // screening: speakers, seats
  [[0.0, 2.4, -2.55, -1.45], [0.85, 1.55, -1.65, -0.95], [-2.8, -2.0, -2.85, -1.95]], // contact: desk, chair, mailbox
]

const BOXES = FURNITURE.flatMap((list, i) => list.map(([x0, x1, z0, z1]) => [x0 + roomX(i), x1 + roomX(i), z0, z1]))
const X_MIN = -HALF + 0.3
const X_MAX = roomX(COUNT - 1) + HALF - 0.3
const Z_MIN = -HALF + 0.35
const Z_MAX = HALF - 0.3
const DOOR = [LANE_Z - 0.95, LANE_Z + 0.95] // the doorway in every partition wall

function blocked(x, z) {
  if (x < X_MIN || x > X_MAX || z < Z_MIN || z > Z_MAX) return true
  // partition walls between rooms (passable only through the doorway on the path)
  for (let i = 0; i < COUNT - 1; i++) {
    const wx = roomX(i) + HALF
    if (Math.abs(x - wx) < AVATAR_R + 0.1 && (z < DOOR[0] || z > DOOR[1])) return true
  }
  for (const [x0, x1, z0, z1] of BOXES) {
    const cx = Math.max(x0, Math.min(x, x1))
    const cz = Math.max(z0, Math.min(z, z1))
    if ((x - cx) ** 2 + (z - cz) ** 2 < AVATAR_R * AVATAR_R) return true
  }
  return false
}

/** Move from (x, z) by (dx, dz), sliding along walls. Returns the new [x, z]. */
export function moveWithCollision(x, z, dx, dz) {
  let nx = x
  let nz = z
  if (!blocked(x + dx, z)) nx = x + dx
  if (!blocked(nx, z + dz)) nz = z + dz
  return [nx, nz]
}

// screen-relative directions on the floor (the camera looks diagonally into the studio)
const fwd = { x: -CAM_DIR.x, z: -CAM_DIR.z }
const fl = Math.hypot(fwd.x, fwd.z)
export const SCREEN_UP = { x: fwd.x / fl, z: fwd.z / fl }
export const SCREEN_RIGHT = { x: -SCREEN_UP.z, z: SCREEN_UP.x }

export const roomIndexAt = (x) => Math.min(COUNT - 1, Math.max(0, Math.round(x / ROOM)))

// the things you can walk up to and talk about (world positions; zone = which room)
export const SPOTS = [
  {
    id: 'reception', zone: 0, x: roomX(0) + 1.0, z: -0.75, label: 'Reception',
    intro: 'Welcome to my studio! I am Zubia, a game developer. What would you like to know about me?',
    ask: ['Tell me about yourself', 'What kind of games do you make?'],
  },
  {
    id: 'portrait', zone: 1, x: roomX(1) + 2.6, z: -1.4, label: 'Portrait wall',
    intro: "That's me! I study Computer Science & IT, specialising in Gaming & Animation.",
    ask: ['Where do you study?', 'What do you focus on?'],
  },
  {
    id: 'workstation', zone: 2, x: roomX(2) + 1.8, z: -1.25, label: 'Workstation',
    intro: 'This is where I build. These monitors run my main tools.',
    ask: ['Which game engines do you use?', 'What programming languages do you know?'],
  },
  {
    id: 'career', zone: 3, x: roomX(3) + 0.0, z: -0.55, label: 'Career path',
    intro: 'Each sign on this path is a step in my career, from university to three game studios.',
    ask: ['Where have you interned?', 'What did you do at Game Storm Studios?'],
  },
  {
    id: 'gallery', zone: 4, x: roomX(4) + 0.3, z: -0.45, label: 'Poster wall',
    intro: 'My project wall! VR, shooters, horror, runners and more.',
    ask: ['What is your final year project?', 'Tell me about The Unbroken Oath'],
  },
  {
    id: 'trophies', zone: 5, x: roomX(5) + 1.95, z: -0.55, label: 'Trophy podium',
    intro: 'My proudest moments live here.',
    ask: ['What did you win?', 'Which game jams have you joined?'],
  },
  {
    id: 'cinema', zone: 6, x: roomX(6) - 1.4, z: -1.85, label: 'Cinema screen',
    intro: 'My showreel plays on this screen. I made it in After Effects.',
    ask: ['How was this website made?', 'Can I play any of your games?'],
  },
  {
    id: 'mailbox', zone: 7, x: roomX(7) - 1.95, z: -1.5, label: 'Mailbox',
    intro: "Want to work together? Drop me a line. I'm open to game developer roles and internships.",
    ask: ['How can I contact you?', 'Are you open to internships?'],
  },
]
export const TALK_RADIUS = 1.45

// ---------------------------------------------------------------- keyboard input
// on-screen joystick (phones): x = right, y = down, each -1..1
export const joy = { x: 0, y: 0, active: false }

export const keys = new Set()
let attached = false
export function attachKeys() {
  if (attached) return
  attached = true
  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)
  window.addEventListener('keydown', (e) => {
    if (typing(e)) return
    const k = e.key.toLowerCase()
    keys.add(k)
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k) && document.body.classList.contains('in-game')) e.preventDefault()
  })
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))
  window.addEventListener('blur', () => keys.clear())
}

// ---------------------------------------------------------------- tiny synth sound effects
let ctx = null
export function sfx(kind, muted) {
  if (muted) return
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    const notes = { coin: [988, 1319], discover: [523, 659, 784], complete: [523, 659, 784, 1047, 784, 1047], talk: [660] }[kind] || [440]
    const step = kind === 'complete' ? 0.12 : 0.08
    notes.forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = kind === 'talk' ? 'sine' : 'square'
      o.frequency.value = f
      const t = ctx.currentTime + i * step
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(kind === 'talk' ? 0.04 : 0.06, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.6)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + step * 1.8)
    })
  } catch {
    /* audio not available */
  }
}
