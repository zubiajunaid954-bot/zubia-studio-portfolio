// CRUNCH TIME: "Squash the Bugs". Pure game logic (no React / three), so it runs the same everywhere
// and can be tested headless. Bugs crawl along the studio path from the BUG TRACKER door to
// RELEASE DAY; the player builds Unity Turrets, C# Lasers, Blender Freezers and Unreal Cannons.

export const GW = 11 // board size in tiles
export const GH = 8
// the path, in tile coordinates (starts and ends just off the board)
const PTS = [
  [-1, 1],
  [2, 1],
  [2, 6],
  [5, 6],
  [5, 1],
  [8, 1],
  [8, 6],
  [11, 6],
]
export const toWorld = (cx, cz) => [cx - (GW - 1) / 2, cz - (GH - 1) / 2]
export const PATH = PTS.map(([x, z]) => toWorld(x, z))

const SEGS = []
let total = 0
for (let i = 0; i < PATH.length - 1; i++) {
  const [ax, az] = PATH[i]
  const [bx, bz] = PATH[i + 1]
  const len = Math.hypot(bx - ax, bz - az)
  SEGS.push({ ax, az, bx, bz, len, start: total, dx: (bx - ax) / len, dz: (bz - az) / len })
  total += len
}
export const PATH_LEN = total

/** position and heading at distance d along the path */
export function posAt(d, out = {}) {
  let s = SEGS[SEGS.length - 1]
  for (const seg of SEGS) {
    if (d <= seg.start + seg.len) {
      s = seg
      break
    }
  }
  const t = Math.max(0, Math.min(s.len, d - s.start))
  out.x = s.ax + s.dx * t
  out.z = s.az + s.dz * t
  out.rot = Math.atan2(s.dx, s.dz)
  return out
}

// tiles the path covers (not buildable)
export const PATH_CELLS = new Set()
for (let i = 0; i < PTS.length - 1; i++) {
  const [ax, az] = PTS[i]
  const [bx, bz] = PTS[i + 1]
  const n = Math.max(Math.abs(bx - ax), Math.abs(bz - az))
  for (let k = 0; k <= n; k++) {
    const x = Math.round(ax + ((bx - ax) * k) / n)
    const z = Math.round(az + ((bz - az) * k) / n)
    if (x >= 0 && x < GW && z >= 0 && z < GH) PATH_CELLS.add(x + ',' + z)
  }
}
// a few desks and plants decorate the studio floor (not buildable either)
export const DECOR = [
  { cx: 0, cz: 4, kind: 'plant' },
  { cx: 10, cz: 0, kind: 'plant' },
  { cx: 3, cz: 3, kind: 'desk' },
  { cx: 6, cz: 4, kind: 'desk' },
  { cx: 9, cz: 3, kind: 'plant' },
  { cx: 0, cz: 7, kind: 'desk' },
]
const DECOR_CELLS = new Set(DECOR.map((d) => d.cx + ',' + d.cz))
export const buildable = (cx, cz) => cx >= 0 && cx < GW && cz >= 0 && cz < GH && !PATH_CELLS.has(cx + ',' + cz) && !DECOR_CELLS.has(cx + ',' + cz)

// Towers don't shoot by themselves: they are YOUR launchers. Tap the board and the nearest tower
// fires its own kind of shot at the bug you tapped (auto-aimed to the closest bug).
export const TOWERS = {
  unity: { name: 'Unity Turret', short: 'Quick homing shot', cost: 50, dmg: 26, splash: 0.4, speed: 1.6, icon: '🔫' },
  laser: { name: 'C# Laser', short: 'Instant beam, big hit', cost: 90, dmg: 44, splash: 0, speed: 0, icon: '🔺' },
  freeze: { name: 'Blender Freeze', short: 'Frost blast slows bugs', cost: 70, dmg: 9, splash: 1.3, slow: 0.4, slowFor: 2.6, speed: 1.1, icon: '❄️' },
  cannon: { name: 'Unreal Cannon', short: 'Huge splash', cost: 120, dmg: 38, splash: 1.3, speed: 0.7, icon: '💣' },
}
// with no towers yet, the shot comes from the Release Day pad
const HOTFIX = { name: 'Hotfix', dmg: 16, splash: 0.5, speed: 1.2 }
export const TOWER_IDS = Object.keys(TOWERS)
export const MAX_LVL = 3
export const upgradeCost = (t) => Math.round(TOWERS[t.type].cost * 0.8 * t.lvl)
export const sellValue = (t) => {
  let spent = TOWERS[t.type].cost
  for (let l = 1; l < t.lvl; l++) spent += Math.round(TOWERS[t.type].cost * 0.8 * l)
  return Math.round(spent * 0.7)
}
// fire intensity grows every wave
export const waveHeat = (wave) => 1 + 0.14 * Math.max(0, wave - 1)
export const statsOf = (t, wave = 1) => {
  const b = TOWERS[t.type]
  const m = (1 + 0.5 * (t.lvl - 1)) * waveHeat(wave)
  return {
    dmg: b.dmg * m,
    splash: b.splash ? b.splash * (1 + 0.1 * (t.lvl - 1)) * (1 + 0.03 * Math.max(0, wave - 1)) : 0,
    slow: b.slow ? Math.max(0.2, b.slow - 0.07 * (t.lvl - 1)) : 1,
    slowFor: b.slowFor || 0,
    range: b.splash || 0.35, // shown as the blast ring
  }
}

export const BUGS = {
  bug: { name: 'Bug', hp: 24, speed: 1.6, reward: 3, size: 1, color: '#7bd36b', leak: 1 },
  glitch: { name: 'Glitch', hp: 15, speed: 2.7, reward: 4, size: 0.8, color: '#4fd3ff', leak: 1 },
  crash: { name: 'Crash', hp: 105, speed: 1.05, reward: 10, size: 1.35, color: '#ff8a4c', leak: 2 },
  boss: { name: 'MERGE CONFLICT', hp: 4200, speed: 0.55, reward: 250, size: 2.3, color: '#c46bff', leak: 20 },
}

export const WAVES = 10
const WAVE_PLAN = [
  [['bug', 8, 0.95]],
  [['bug', 13, 0.75]],
  [['bug', 9, 0.8], ['glitch', 6, 0.55]],
  [['glitch', 10, 0.5], ['bug', 10, 0.6]],
  [['bug', 10, 0.6], ['crash', 3, 1.6]],
  [['glitch', 14, 0.42], ['crash', 4, 1.3]],
  [['bug', 16, 0.45], ['crash', 5, 1.1], ['glitch', 10, 0.4]],
  [['glitch', 22, 0.32], ['crash', 7, 1.0]],
  [['crash', 9, 0.9], ['bug', 20, 0.36], ['glitch', 14, 0.3]],
  [['boss', 1, 0], ['glitch', 12, 0.5], ['crash', 6, 1.2]],
]
/** spawn schedule for wave n (1-based): [{ type, at }] */
export function waveSpawns(n) {
  const list = []
  let groupStart = 0
  for (const [type, count, gap] of WAVE_PLAN[n - 1]) {
    for (let i = 0; i < count; i++) list.push({ type, at: groupStart + i * gap })
    groupStart += type === 'boss' ? 4 : count * gap * 0.55 // groups overlap a little
  }
  return list.sort((a, b) => a.at - b.at)
}
export const hpScale = (n) => 1 + 0.2 * (n - 1) + 0.02 * (n - 1) * (n - 1)

// ---- the player's fireballs ----
// You start with ONE fireball. Squashing bugs raises your score, and score milestones give you
// one more fireball slot each. Used fireballs recharge one at a time, faster in later waves.
export const POINTS = { bug: 10, glitch: 15, crash: 40, boss: 500 }
export const SLOT_AT = [60, 180, 380, 650, 1000] // score needed for fireball 2, 3, 4, 5, 6
export const maxCharges = (score) => 1 + SLOT_AT.filter((s) => score >= s).length
export const nextSlotAt = (score) => SLOT_AT.find((s) => score < s) ?? null
export const rechargeOf = (wave) => Math.max(0.45, 1.05 - 0.06 * Math.max(0, wave - 1))
// for the HUD: the fire level is the wave number
export const blasterOf = (wave) => ({ lvl: Math.max(1, wave), recharge: rechargeOf(wave) })

export function fireAt(g, x, z) {
  if (g.over) return null
  if (g.charges < 1) {
    g.events.push({ e: 'empty' })
    return null
  }
  // auto-aim: the bug closest to where you tapped (generous on phones)
  let tgt = null
  let bd = 1.2 * 1.2
  for (const en of g.enemies) {
    if (!en.alive) continue
    const d = (en.x - x) ** 2 + (en.z - z) ** 2
    if (d < bd) {
      bd = d
      tgt = en
    }
  }
  const tx = tgt ? tgt.x : x
  const tz = tgt ? tgt.z : z
  // the nearest tower fires (or the Release Day pad when there are none)
  let from = null
  let best = Infinity
  for (const t of g.towers) {
    const d = (t.x - tx) ** 2 + (t.z - tz) ** 2
    if (d < best) {
      best = d
      from = t
    }
  }
  const ox = from ? from.x : PATH[PATH.length - 1][0] - 0.4
  const oz = from ? from.z : PATH[PATH.length - 1][1]
  const heat = waveHeat(g.wave)
  const st = from ? statsOf(from, g.wave) : { dmg: HOTFIX.dmg * heat, splash: HOTFIX.splash, slow: 1, slowFor: 0 }
  const type = from ? from.type : 'hotfix'
  g.charges -= 1
  g.shotsFired += 1
  if (from) {
    from.fx = 0.3
    from.aim = Math.atan2(tx - from.x, tz - from.z)
  }
  if (type === 'laser') {
    // instant beam: hits the bug right away
    from.firing = 0.2
    from.tx = tx
    from.tz = tz
    if (tgt) damage(g, tgt, st.dmg)
    g.events.push({ e: 'zap', x: tx, z: tz })
    return true
  }
  const speed = from ? TOWERS[type].speed : HOTFIX.speed
  const dist = Math.hypot(tx - ox, tz - oz)
  g.shots.push({
    kind: type === 'freeze' ? 'frost' : type === 'cannon' ? 'shell' : 'fire',
    target: tgt ? tgt.id : null,
    fx: ox,
    fz: oz,
    x: ox,
    z: oz,
    y: 0.8,
    tx,
    tz,
    t: 0,
    dur: (0.12 + dist * 0.05) / speed,
    dmg: st.dmg,
    splash: st.splash,
    slow: st.slow,
    slowFor: st.slowFor,
    lvl: g.wave,
    alive: true,
  })
  g.events.push({ e: type === 'cannon' ? 'boomfire' : type === 'freeze' ? 'frostfire' : 'fire', x: ox, z: oz })
  return true
}

export function createGame() {
  return {
    coffee: 150,
    lives: 20,
    wave: 0,
    waveActive: false,
    queue: [],
    clock: 0,
    nextId: 1,
    enemies: [],
    towers: [],
    shots: [],
    over: null, // null | 'won' | 'lost'
    kills: 0,
    leaked: 0,
    built: 0,
    charges: 1,
    chargeT: 0,
    score: 0,
    shotsFired: 0,
    events: [],
  }
}

export function startWave(g) {
  if (g.waveActive || g.over || g.wave >= WAVES) return false
  g.wave += 1
  g.waveActive = true
  g.clock = 0
  g.queue = waveSpawns(g.wave)
  g.events.push({ e: 'wave', n: g.wave })
  return true
}

export function placeTower(g, type, cx, cz) {
  const def = TOWERS[type]
  if (!def || g.coffee < def.cost || !buildable(cx, cz) || g.towers.some((t) => t.cx === cx && t.cz === cz)) return null
  const [x, z] = toWorld(cx, cz)
  const t = { id: g.nextId++, type, cx, cz, x, z, lvl: 1, cd: 0, aim: 0, target: null, fx: 0 }
  g.towers.push(t)
  g.coffee -= def.cost
  g.built += 1
  g.events.push({ e: 'build', t })
  return t
}
export function upgradeTower(g, t) {
  if (t.lvl >= MAX_LVL) return false
  const c = upgradeCost(t)
  if (g.coffee < c) return false
  g.coffee -= c
  t.lvl += 1
  g.events.push({ e: 'upgrade', t })
  return true
}
export function sellTower(g, t) {
  g.coffee += sellValue(t)
  g.towers = g.towers.filter((x) => x !== t)
  g.events.push({ e: 'sell', t })
}

const tmp = {}
function spawn(g, type) {
  const def = BUGS[type]
  const hp = Math.round(def.hp * (type === 'boss' ? 1 : hpScale(g.wave)))
  posAt(0, tmp)
  g.enemies.push({ id: g.nextId++, type, hp, max: hp, d: 0, x: tmp.x, z: tmp.z, rot: tmp.rot, slow: 1, slowT: 0, hitT: 0, alive: true })
  if (type === 'boss') g.events.push({ e: 'boss' })
}

function damage(g, en, amount) {
  if (!en.alive) return
  en.hp -= amount
  en.hitT = 0.12
  if (en.hp <= 0) {
    en.alive = false
    g.kills += 1
    g.coffee += BUGS[en.type].reward
    const before = maxCharges(g.score)
    g.score += POINTS[en.type]
    if (maxCharges(g.score) > before) {
      g.charges += 1 // a new fireball slot arrives loaded
      g.events.push({ e: 'slot', n: maxCharges(g.score) })
    }
    g.events.push({ e: 'kill', x: en.x, z: en.z, type: en.type })
  }
}

/** advance the game by dt seconds */
export function step(g, dt) {
  if (g.over) return
  // fireballs recharge one at a time
  if (g.charges < maxCharges(g.score)) {
    g.chargeT += dt
    if (g.chargeT >= rechargeOf(g.wave)) {
      g.chargeT = 0
      g.charges += 1
    }
  } else g.chargeT = 0
  // spawning
  if (g.waveActive) {
    g.clock += dt
    while (g.queue.length && g.queue[0].at <= g.clock) spawn(g, g.queue.shift().type)
  }
  // bugs crawl
  for (const en of g.enemies) {
    if (!en.alive) continue
    if (en.slowT > 0) {
      en.slowT -= dt
      if (en.slowT <= 0) en.slow = 1
    }
    en.hitT = Math.max(0, en.hitT - dt)
    en.d += BUGS[en.type].speed * en.slow * dt
    posAt(en.d, tmp)
    en.x = tmp.x
    en.z = tmp.z
    en.rot = tmp.rot
    if (en.d >= PATH_LEN) {
      en.alive = false
      const hit = BUGS[en.type].leak
      g.lives = Math.max(0, g.lives - hit)
      g.leaked += 1
      g.events.push({ e: 'leak', hit })
    }
  }
  // towers only animate (recoil, laser beam): you do the firing
  for (const t of g.towers) {
    t.fx = Math.max(0, t.fx - dt)
    t.firing = Math.max(0, (t.firing || 0) - dt)
  }
  // shots: arc to the target (following it if it moves), then burst
  for (const sh of g.shots) {
    if (!sh.alive) continue
    const en = sh.target ? g.enemies.find((e) => e.id === sh.target && e.alive) : null
    if (en) {
      sh.tx = en.x
      sh.tz = en.z
    }
    sh.t += dt
    const u = Math.min(1, sh.t / sh.dur)
    sh.x = sh.fx + (sh.tx - sh.fx) * u
    sh.z = sh.fz + (sh.tz - sh.fz) * u
    const arc = sh.kind === 'shell' ? 1.4 : sh.kind === 'frost' ? 0.9 : 0.5
    sh.y = 0.8 + Math.sin(Math.PI * u) * (arc + Math.hypot(sh.tx - sh.fx, sh.tz - sh.fz) * 0.1) - 0.65 * u
    if (u < 1) continue
    sh.alive = false
    if (sh.splash > 0) {
      for (const e of g.enemies) {
        if (!e.alive) continue
        const dd = Math.hypot(e.x - sh.tx, e.z - sh.tz)
        if (dd <= sh.splash) {
          damage(g, e, sh.dmg * (1 - (dd / sh.splash) * 0.4))
          if (sh.slow < 1) {
            e.slow = Math.min(e.slow, sh.slow)
            e.slowT = sh.slowFor
          }
        }
      }
    } else if (en) damage(g, en, sh.dmg)
    g.events.push({ e: sh.kind === 'frost' ? 'freeze' : sh.kind === 'shell' ? 'boom' : 'blast', x: sh.tx, z: sh.tz, r: Math.max(0.35, sh.splash), lvl: sh.lvl })
  }
  g.shots = g.shots.filter((s) => s.alive)
  g.enemies = g.enemies.filter((e) => e.alive)
  // wave / game end
  if (g.lives <= 0) {
    g.over = 'lost'
    g.events.push({ e: 'lost' })
    return
  }
  if (g.waveActive && !g.queue.length && !g.enemies.length) {
    g.waveActive = false
    const bonus = 15 + g.wave * 4
    g.coffee += bonus
    g.events.push({ e: 'cleared', n: g.wave, bonus })
    if (g.wave >= WAVES) {
      g.over = 'won'
      g.events.push({ e: 'won' })
    }
  }
}
