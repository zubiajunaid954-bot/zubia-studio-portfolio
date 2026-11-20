// ZJ Arcade game 3: CRUNCH TIME, "Squash the Bugs". A small tower-defense board in the studio's
// miniature style, in its own 3D canvas. Bugs crawl along the glowing path from the BUG TRACKER door
// to RELEASE DAY. Works offline. Game rules live in src/game/crunch.js.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { reducedMotion } from '../store'
import { profile } from '../data/content'
import { Box, Cyl, Ball, Plant, Sign, usePalette } from '../three/kit'
import { play } from '../game/sound'
import {
  GW,
  GH,
  PATH,
  PATH_CELLS,
  DECOR,
  TOWERS,
  TOWER_IDS,
  BUGS,
  WAVES,
  MAX_LVL,
  toWorld,
  buildable,
  createGame,
  startWave,
  placeTower,
  upgradeTower,
  fireAt,
  blasterOf,
  maxCharges,
  nextSlotAt,
  sellTower,
  upgradeCost,
  sellValue,
  statsOf,
  step,
} from '../game/crunch'
import '../crunch.css'

const CAM_DIR = new THREE.Vector3(0.5, 1.25, 1).normalize()
// portrait screens (phones) look at the board from the side, so its long edge runs down the screen
const CAM_DIR_TALL = new THREE.Vector3(-1, 1.25, 0.5).normalize()
const FREEZE_COL = '#9fe8ff'
const MAX_BUGS = 70
const MAX_SHOTS = 50
const MAX_FX = 36

// throttle rapid-fire sounds
const lastSound = {}
function sfx(kind, arg, gap = 0.05) {
  const now = performance.now() / 1000
  if (now - (lastSound[kind] || 0) < gap) return
  lastSound[kind] = now
  play(kind, arg)
}

// ---------------- camera ----------------
function Framing({ shake }) {
  const { camera, size } = useThree()
  const fit = useRef(60)
  const dir = size.height > size.width * 1.1 ? CAM_DIR_TALL : CAM_DIR
  useEffect(() => {
    camera.position.copy(dir).multiplyScalar(30)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    const inv = camera.matrixWorldInverse
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    const hx = GW / 2 + 0.9
    const hz = GH / 2 + 0.9
    for (const x of [-hx, hx]) for (const z of [-hz, hz]) for (const y of [-0.4, 1.6]) {
      const v = new THREE.Vector3(x, y, z).applyMatrix4(inv)
      minX = Math.min(minX, v.x)
      maxX = Math.max(maxX, v.x)
      minY = Math.min(minY, v.y)
      maxY = Math.max(maxY, v.y)
    }
    fit.current = Math.min(size.width / (maxX - minX), size.height / (maxY - minY)) * 0.98
    camera.zoom = fit.current
    camera.updateProjectionMatrix()
  }, [camera, size, dir])
  useFrame((_, dt) => {
    const s = shake.current
    if (s > 0) {
      shake.current = Math.max(0, s - dt)
      const k = reducedMotion ? 0 : s * 0.5
      camera.position.copy(dir).multiplyScalar(30)
      camera.position.x += (Math.random() - 0.5) * k
      camera.position.z += (Math.random() - 0.5) * k
    } else camera.position.copy(dir).multiplyScalar(30)
  })
  return null
}

// ---------------- board ----------------
// signs turn to face the camera so they stay readable from above
const SIGN_PITCH = -Math.asin(CAM_DIR.y) * 0.75
function FaceCam({ p, children }) {
  const ref = useRef()
  useFrame(({ camera }) => {
    if (ref.current) ref.current.rotation.y = Math.atan2(camera.position.x, camera.position.z)
  })
  return (
    <group ref={ref} position={p}>
      <group rotation={[SIGN_PITCH, 0, 0]}>{children}</group>
    </group>
  )
}

function Board() {
  const tiles = []
  for (let x = 0; x < GW; x++)
    for (let z = 0; z < GH; z++) {
      const [wx, wz] = toWorld(x, z)
      const path = PATH_CELLS.has(x + ',' + z)
      tiles.push(<Box key={x + ',' + z} p={[wx, -0.02, wz]} s={[0.97, 0.06, 0.97]} c={path ? 'dark' : (x + z) % 2 ? 'floor' : 'floor2'} shadow={false} />)
    }
  // the glowing lane along the path, like the studio's
  const lanes = []
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i]
    const [bx, bz] = PATH[i + 1]
    const horiz = az === bz
    lanes.push(
      <Box
        key={i}
        p={[(ax + bx) / 2, 0.04, (az + bz) / 2]}
        s={horiz ? [Math.abs(bx - ax) + 0.08, 0.02, 0.07] : [0.07, 0.02, Math.abs(bz - az) + 0.08]}
        c="accent"
        e={1.3}
        shadow={false}
      />,
    )
  }
  const hw = GW / 2
  const hh = GH / 2
  const [sx, sz] = PATH[0]
  const [ex, ez] = PATH[PATH.length - 1]
  return (
    <group>
      <Box p={[0, -0.5, 0]} s={[GW + 0.8, 0.48, GH + 0.8]} c="base" shadow={false} />
      <Box p={[0, -0.56, 0]} s={[GW + 1.1, 0.06, GH + 1.1]} c="dark" shadow={false} />
      {tiles}
      {lanes}
      {PATH.slice(1, -1).map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.052, z]}>
          <circleGeometry args={[0.16, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      ))}
      {/* back wall with a glowing trim, and the low left wall */}
      <Box p={[0.6, 0, -hh - 0.25]} s={[GW - 1.2, 0.9, 0.16]} c="wall" />
      <Box p={[0.6, 0.9, -hh - 0.2]} s={[GW - 1.2, 0.04, 0.05]} c="accent" e={1.4} shadow={false} />
      <Box p={[-hw - 0.25, 0, 0.9]} s={[0.16, 0.5, GH - 1.6]} c="wall" />
      {/* BUG TRACKER door where the bugs come in */}
      <group position={[sx + 0.35, 0, sz]}>
        <Box p={[0, 0, -0.62]} s={[0.12, 1.25, 0.12]} c="accent" e={1.2} />
        <Box p={[0, 0, 0.62]} s={[0.12, 1.25, 0.12]} c="accent" e={1.2} />
        <Box p={[0, 1.2, 0]} s={[0.12, 0.12, 1.36]} c="accent" e={1.2} />
        <Box p={[-0.05, 0, 0]} s={[0.04, 1.2, 1.15]} c="#0b0b0d" shadow={false} />
        <FaceCam p={[0.1, 1.65, 0]}>
          <Sign p={[0, 0, 0]} size={[2.0, 0.46]} bg="dark" glow={1} lines={[{ text: '🐞 BUG TRACKER', size: 0.2, weight: 800, color: 'accent', spacing: 2 }]} />
        </FaceCam>
      </group>
      {/* RELEASE DAY: the launch pad they must not reach */}
      <group position={[ex - 0.25, 0, ez]}>
        <Box p={[0.35, 0, 0]} s={[1.0, 0.16, 1.4]} c="metal" />
        <Cyl p={[0.45, 0.16, 0]} rad={0.17} h={0.8} c="white" seg={20} />
        <Cyl p={[0.45, 0.96, 0]} rad={0.17} rt={0.01} h={0.36} c="accent" e={1} seg={20} />
        <Box p={[0.45, 0.16, 0]} s={[0.5, 0.22, 0.06]} c="accent" e={0.6} />
        <Box p={[0.45, 0.16, 0]} s={[0.06, 0.22, 0.5]} c="accent" e={0.6} />
        <FaceCam p={[0.2, 1.8, 0]}>
          <Sign p={[0, 0, 0]} size={[2.0, 0.5]} bg="dark" glow={1} lines={[{ text: 'RELEASE DAY 🚀', size: 0.2, weight: 800, color: 'accent', spacing: 2 }]} />
        </FaceCam>
      </group>
      {DECOR.map((d) => {
        const [x, z] = toWorld(d.cx, d.cz)
        return d.kind === 'plant' ? (
          <Plant key={d.cx + ',' + d.cz} p={[x, 0.01, z]} size={0.62} />
        ) : (
          <group key={d.cx + ',' + d.cz} position={[x, 0.01, z]}>
            <Box p={[0, 0, 0]} s={[0.8, 0.42, 0.5]} c="wood" />
            <Box p={[0, 0.42, -0.08]} s={[0.36, 0.24, 0.04]} c="dark" />
            <Box p={[0, 0.47, -0.055]} s={[0.3, 0.16, 0.01]} c="screen" e={0.9} shadow={false} />
          </group>
        )
      })}
    </group>
  )
}

// ---------------- bugs ----------------
const bodyGeo = new THREE.SphereGeometry(1, 16, 12)
const legGeo = new THREE.BoxGeometry(0.024, 0.024, 0.24)
const barGeo = new THREE.PlaneGeometry(0.5, 0.06)
const darkMat = new THREE.MeshStandardMaterial({ color: '#141114', roughness: 0.6 })
const eyeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' })
const pupilMat = new THREE.MeshBasicMaterial({ color: '#111111' })
const barBg = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.55, depthTest: false })
const freezeColor = new THREE.Color(FREEZE_COL)
const white = new THREE.Color('#ffffff')

function BugSlot({ i, g }) {
  const root = useRef()
  const legs = useRef([])
  const bar = useRef()
  const fill = useRef()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 }), [])
  const shell = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2 }), [])
  const fillMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#7dff7a', depthTest: false }), [])
  const base = useMemo(() => new THREE.Color(), [])
  useFrame(({ camera, clock }) => {
    const en = g.current.enemies[i]
    const o = root.current
    if (!en) {
      o.visible = false
      return
    }
    const def = BUGS[en.type]
    o.visible = true
    o.position.set(en.x, 0.05, en.z)
    o.rotation.y = en.rot
    o.scale.setScalar(def.size * 0.85)
    base.set(def.color)
    if (en.slow < 1) base.lerp(freezeColor, 0.55)
    mat.color.copy(base)
    shell.color.copy(base).multiplyScalar(0.62)
    const flash = en.hitT > 0 ? 0.8 : 0
    mat.emissive.copy(flash ? white : base)
    mat.emissiveIntensity = flash || 0.12
    // scuttling legs (and a little bob)
    const ph = en.d * 14 + i
    legs.current.forEach((l, k) => {
      if (l) l.rotation.y = (k % 2 ? 1 : -1) * (0.5 + Math.sin(ph + k * 1.7) * 0.35)
    })
    o.children[0].position.y = 0.2 + Math.abs(Math.sin(ph)) * 0.03
    if (en.type === 'glitch' && !reducedMotion) o.children[0].position.x = Math.sin(clock.elapsedTime * 40 + i) > 0.85 ? 0.06 : 0
    // health bar faces the camera
    const show = en.hp < en.max
    bar.current.visible = show
    if (show) {
      bar.current.quaternion.copy(camera.quaternion)
      const k = Math.max(0, en.hp / en.max)
      fill.current.scale.x = Math.max(0.001, k)
      fill.current.position.x = -0.25 * (1 - k)
      fillMat.color.set(k > 0.5 ? '#7dff7a' : k > 0.25 ? '#ffd84a' : '#ff5a4a')
      bar.current.scale.setScalar(en.type === 'boss' ? 0.7 : 1.2 / def.size)
    }
  })
  const legPos = [
    [-0.2, 0.12],
    [0.2, 0.12],
    [-0.22, 0],
    [0.22, 0],
    [-0.2, -0.12],
    [0.2, -0.12],
  ]
  return (
    <group ref={root} visible={false}>
      <group position={[0, 0.2, 0]}>
        <mesh geometry={bodyGeo} material={mat} scale={[0.24, 0.15, 0.32]} castShadow />
        <mesh geometry={bodyGeo} material={shell} scale={[0.2, 0.1, 0.26]} position={[0, 0.08, -0.03]} />
        <mesh geometry={bodyGeo} material={darkMat} scale={[0.13, 0.11, 0.12]} position={[0, 0.02, 0.3]} />
        <mesh geometry={bodyGeo} material={eyeMat} scale={0.045} position={[-0.06, 0.07, 0.39]} />
        <mesh geometry={bodyGeo} material={eyeMat} scale={0.045} position={[0.06, 0.07, 0.39]} />
        <mesh geometry={bodyGeo} material={pupilMat} scale={0.022} position={[-0.06, 0.075, 0.425]} />
        <mesh geometry={bodyGeo} material={pupilMat} scale={0.022} position={[0.06, 0.075, 0.425]} />
        <mesh geometry={legGeo} material={darkMat} position={[-0.05, 0.14, 0.42]} rotation={[0.9, -0.4, 0]} scale={[1, 1, 0.8]} />
        <mesh geometry={legGeo} material={darkMat} position={[0.05, 0.14, 0.42]} rotation={[0.9, 0.4, 0]} scale={[1, 1, 0.8]} />
        {legPos.map(([x, z], k) => (
          <group key={k} position={[x, -0.04, z]} ref={(el) => (legs.current[k] = el)}>
            <mesh geometry={legGeo} material={darkMat} position={[x > 0 ? 0.1 : -0.1, -0.04, 0]} rotation={[0, Math.PI / 2, x > 0 ? -0.5 : 0.5]} />
          </group>
        ))}
      </group>
      <group ref={bar} position={[0, 0.75, 0]} renderOrder={10}>
        <mesh geometry={barGeo} material={barBg} renderOrder={10} />
        <mesh ref={fill} geometry={barGeo} material={fillMat} position={[0, 0, 0.001]} scale={[1, 0.7, 1]} renderOrder={11} />
      </group>
    </group>
  )
}

// ---------------- shots and effects ----------------
const shotGeo = new THREE.SphereGeometry(1, 10, 8)
function ShotSlot({ i, g, accent }) {
  const m = useRef()
  const boltMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  useFrame(() => {
    const s = g.current.shots[i]
    if (!s) {
      m.current.visible = false
      return
    }
    m.current.visible = true
    m.current.position.set(s.x, s.y, s.z)
    if (s.kind === 'fire') {
      // a fireball: bigger and brighter every wave, flickering
      m.current.scale.setScalar((0.09 + 0.012 * s.lvl) * (1 + Math.sin(s.t * 60) * 0.15))
      boltMat.color.set(s.t * 20 % 2 < 1 ? '#ffb347' : '#ff6a1a')
      return
    }
    if (s.kind === 'frost') {
      m.current.scale.setScalar((0.1 + 0.01 * s.lvl) * (1 + Math.sin(s.t * 40) * 0.1))
      boltMat.color.set(FREEZE_COL)
      return
    }
    m.current.scale.setScalar(s.kind === 'shell' ? 0.11 : 0.055)
    boltMat.color.set(s.kind === 'shell' ? '#2a2420' : accent)
  })
  return <mesh ref={m} geometry={shotGeo} material={boltMat} visible={false} />
}

const ringGeo = new THREE.RingGeometry(0.86, 1, 40)
const discGeo = new THREE.CircleGeometry(1, 24)
function FxSlot({ i, fx }) {
  const m = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), [])
  const ball = useRef()
  const ballMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }), [])
  useFrame((_, dt) => {
    const f = fx.current[i]
    if (!f || !f.on) {
      m.current.visible = false
      ball.current.visible = false
      return
    }
    f.t += dt
    const u = f.t / f.life
    if (u >= 1) {
      f.on = false
      return
    }
    if (f.kind === 'boom') {
      ball.current.visible = true
      ball.current.position.set(f.x, 0.25, f.z)
      ball.current.scale.setScalar(f.r * (0.3 + u * 0.8))
      ballMat.color.set(u < 0.25 ? '#fff4c2' : f.color)
      ballMat.opacity = 0.85 * (1 - u)
    } else ball.current.visible = false
    m.current.visible = true
    m.current.geometry = f.kind === 'splat' ? discGeo : ringGeo
    m.current.position.set(f.x, 0.07, f.z)
    const r = f.kind === 'splat' ? f.r * (0.6 + 0.4 * Math.min(1, u * 4)) : f.r * (0.2 + u * 0.85)
    m.current.scale.setScalar(r)
    mat.color.set(f.color)
    mat.opacity = (f.kind === 'splat' ? 0.75 : 0.8) * (1 - u)
  })
  return (
    <>
      <mesh ref={m} rotation={[-Math.PI / 2, 0, 0]} material={mat} geometry={ringGeo} visible={false} />
      <mesh ref={ball} geometry={shotGeo} material={ballMat} visible={false} />
    </>
  )
}

// ---------------- towers ----------------
const crystalGeo = new THREE.OctahedronGeometry(0.15)
const torusGeo = new THREE.TorusGeometry(0.24, 0.025, 8, 28)
function Tower({ t, selected, onSelect, g }) {
  const head = useRef()
  const barrel = useRef()
  const beam = useRef()
  const crystal = useRef()
  const orb = useRef()
  const ring = useRef()
  const pal = usePalette()
  const beamMat = useMemo(() => new THREE.MeshBasicMaterial({ color: pal.accent, transparent: true, opacity: 0.85, toneMapped: false }), [pal.accent])
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }, dt) => {
    const time = clock.elapsedTime
    if (head.current) head.current.rotation.y += ((t.aim - head.current.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 12)
    if (barrel.current) barrel.current.position.z = 0.18 - t.fx * 0.6
    if (crystal.current) {
      crystal.current.position.y = 0.95 + Math.sin(time * 2.4) * 0.05
      crystal.current.rotation.y = time * 1.5
    }
    if (beam.current) {
      const on = t.firing > 0 && !g.current.over
      beam.current.visible = on
      if (on) {
        // a beam from the crystal to the bug
        const from = v.set(t.x, 0.95, t.z)
        const to = new THREE.Vector3(t.tx, 0.25, t.tz)
        const len = from.distanceTo(to)
        beam.current.position.copy(from).add(to).multiplyScalar(0.5)
        beam.current.scale.set(1 + Math.sin(time * 40) * 0.3, len, 1 + Math.sin(time * 40) * 0.3)
        beam.current.lookAt(to)
        beam.current.rotateX(Math.PI / 2)
      }
    }
    if (orb.current) {
      orb.current.scale.setScalar(0.2 * (1 + t.fx * 0.6))
      ring.current.rotation.x = Math.PI / 2 + Math.sin(time) * 0.3
      ring.current.rotation.z = time * 1.2
    }
  })
  const pips = []
  for (let l = 0; l < t.lvl; l++) pips.push(<Box key={l} p={[-0.16 + l * 0.16, 0.04, 0.37]} s={[0.1, 0.06, 0.04]} c="accent" e={1.4} shadow={false} />)
  return (
    <group
      position={[t.x, 0.03, t.z]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(t.id)
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {t.type === 'unity' && (
        <>
          <Box p={[0, 0, 0]} s={[0.66, 0.18, 0.66]} c="dark" />
          <Cyl p={[0, 0.18, 0]} rad={0.16} h={0.22} c="metal" seg={14} />
          <group ref={head} position={[0, 0.48, 0]}>
            <Box p={[0, -0.1, 0]} s={[0.34, 0.24, 0.34]} c="white" />
            <Box p={[0, -0.1, 0]} s={[0.36, 0.06, 0.36]} c="accent" e={0.8} />
            <group ref={barrel}>
              <Cyl p={[-0.07, 0, 0.18]} r={[Math.PI / 2, 0, 0]} rad={0.035} h={0.34} c="dark" seg={10} />
              <Cyl p={[0.07, 0, 0.18]} r={[Math.PI / 2, 0, 0]} rad={0.035} h={0.34} c="dark" seg={10} />
            </group>
          </group>
        </>
      )}
      {t.type === 'laser' && (
        <>
          <Cyl p={[0, 0, 0]} rad={0.32} rt={0.8} h={0.16} c="dark" seg={6} />
          <Cyl p={[0, 0.16, 0]} rad={0.18} rt={0.7} h={0.58} c="metal" seg={6} />
          <Box p={[0, 0.3, 0]} s={[0.39, 0.05, 0.05]} c="accent" e={1} />
          <mesh ref={crystal} geometry={crystalGeo} position={[0, 0.95, 0]}>
            <meshStandardMaterial color={pal.accent} emissive={pal.accent} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
          <mesh ref={beam} material={beamMat} visible={false}>
            <cylinderGeometry args={[0.025, 0.025, 1, 6]} />
          </mesh>
        </>
      )}
      {t.type === 'freeze' && (
        <>
          <Cyl p={[0, 0, 0]} rad={0.3} h={0.14} c="dark" seg={20} />
          <Cyl p={[0, 0.14, 0]} rad={0.12} rt={1.4} h={0.26} c="white" seg={16} />
          <mesh ref={orb} geometry={shotGeo} position={[0, 0.6, 0]} scale={0.2}>
            <meshStandardMaterial color={FREEZE_COL} emissive={FREEZE_COL} emissiveIntensity={1.4} roughness={0.1} toneMapped={false} />
          </mesh>
          <mesh ref={ring} geometry={torusGeo} position={[0, 0.6, 0]}>
            <meshBasicMaterial color={FREEZE_COL} toneMapped={false} />
          </mesh>
        </>
      )}
      {t.type === 'cannon' && (
        <>
          <Box p={[0, 0, 0]} s={[0.7, 0.22, 0.7]} c="metal" />
          <group ref={head} position={[0, 0.38, 0]}>
            <Ball p={[0, 0, 0]} rad={0.22} c="dark" />
            <group ref={barrel}>
              <Cyl p={[0, 0.06, 0.16]} r={[Math.PI / 2 - 0.45, 0, 0]} rad={0.09} h={0.42} c="dark" seg={14} />
              <Cyl p={[0, 0.14, 0.33]} r={[Math.PI / 2 - 0.45, 0, 0]} rad={0.105} h={0.07} c="accent" e={0.9} seg={14} />
            </group>
          </group>
        </>
      )}
      {pips}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.42, 0.48, 32]} />
          <meshBasicMaterial color={pal.accent} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

// ---------------- input: hover tile, ghost and range ring ----------------
function Cursor({ shopType, g, onCell, selTower }) {
  const pal = usePalette()
  const tile = useRef()
  const ring = useRef()
  const [cell, setCell] = useState(null)
  const okMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false }), [])
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }), [])
  const pick = (e) => {
    const cx = Math.round(e.point.x + (GW - 1) / 2)
    const cz = Math.round(e.point.z + (GH - 1) / 2)
    return cx >= 0 && cx < GW && cz >= 0 && cz < GH ? [cx, cz] : null
  }
  const free = cell && buildable(cell[0], cell[1]) && !g.current.towers.some((t) => t.cx === cell[0] && t.cz === cell[1])
  const afford = shopType && g.current.coffee >= TOWERS[shopType].cost
  const good = free && afford
  // aiming at the path (or with no tower picked) means a fireball: an orange target, not a red "can't build"
  const aimFire = cell && (!shopType || !buildable(cell[0], cell[1]))
  okMat.color.set(aimFire ? '#ff8a2a' : good ? pal.accent : '#ff5a4a')
  ringMat.color.set(pal.accent)
  const show = !!cell && (shopType || aimFire)
  const sel = selTower ? g.current.towers.find((t) => t.id === selTower) : null
  const range = show && !aimFire ? TOWERS[shopType].splash || 0.35 : sel ? statsOf(sel, g.current.wave).range : 0
  const [rx, rz] = show ? toWorld(cell[0], cell[1]) : sel ? [sel.x, sel.z] : [0, 0]
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.06, 0]}
        onPointerMove={(e) => {
          const c = pick(e)
          if (!c || !cell || c[0] !== cell[0] || c[1] !== cell[1]) setCell(c)
        }}
        onPointerLeave={() => setCell(null)}
        onClick={(e) => {
          const c = pick(e)
          setCell(c)
          if (c) onCell(c[0], c[1], e.point)
        }}
      >
        <planeGeometry args={[GW, GH]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {show && (
        <mesh ref={tile} rotation={[-Math.PI / 2, 0, 0]} position={[rx, 0.07, rz]} material={okMat}>
          <planeGeometry args={[0.94, 0.94]} />
        </mesh>
      )}
      {range > 0 && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[rx, 0.075, rz]} scale={range} material={ringMat}>
          <ringGeometry args={[0.96, 1, 64]} />
        </mesh>
      )}
    </>
  )
}

// ---------------- the game loop ----------------
function Loop({ g, fx, running, speed, onEvents }) {
  const pal = usePalette()
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1)
    if (running.current) {
      let left = dt * speed.current
      while (left > 0) {
        const s = Math.min(left, 0.03)
        step(g.current, s)
        left -= s
      }
    }
    const evs = g.current.events
    if (evs.length) {
      for (const ev of evs) {
        const add = (f) => {
          const slot = fx.current.find((x) => !x.on)
          if (slot) Object.assign(slot, { on: true, t: 0, ...f })
        }
        if (ev.e === 'kill') add({ kind: 'splat', x: ev.x, z: ev.z, r: ev.type === 'boss' ? 1.4 : 0.35 * BUGS[ev.type].size, life: 0.9, color: BUGS[ev.type].color })
        if (ev.e === 'freeze') add({ kind: 'ring', x: ev.x, z: ev.z, r: ev.r, life: 0.55, color: FREEZE_COL })
        if (ev.e === 'boom') add({ kind: 'boom', x: ev.x, z: ev.z, r: ev.r, life: 0.45, color: pal.accent })
        if (ev.e === 'blast') {
          add({ kind: 'boom', x: ev.x, z: ev.z, r: ev.r * 1.25, life: 0.5, color: '#ff6a1a' })
          add({ kind: 'ring', x: ev.x, z: ev.z, r: ev.r * 1.1, life: 0.4, color: '#ffb347' })
        }
        if (ev.e === 'fire' || ev.e === 'boomfire') add({ kind: 'ring', x: ev.x, z: ev.z, r: 0.45, life: 0.25, color: '#ffb347' })
        if (ev.e === 'frostfire') add({ kind: 'ring', x: ev.x, z: ev.z, r: 0.45, life: 0.25, color: FREEZE_COL })
        if (ev.e === 'zap') add({ kind: 'boom', x: ev.x, z: ev.z, r: 0.4, life: 0.3, color: pal.accent })
      }
      onEvents(evs.slice())
      evs.length = 0
    }
  })
  return null
}

// dev only: lets the automated test find a tile on screen
function DevProbe({ g }) {
  const { camera, size } = useThree()
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__crunch = {
      g,
      tile: (cx, cz) => {
        const [x, z] = toWorld(cx, cz)
        const v = new THREE.Vector3(x, 0.06, z).project(camera)
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height]
      },
    }
  }, [camera, size, g])
  return null
}

function Scene({ g, fx, running, speed, onEvents, shopType, selTower, onCell, onSelect, towers, shake }) {
  const pal = usePalette()
  return (
    <>
      <Framing shake={shake} />
      <hemisphereLight args={[pal.hemiSky, pal.hemiGround, pal.hemiI * 0.7]} />
      <ambientLight intensity={pal.amb} />
      <directionalLight position={[4, 9, 6]} intensity={pal.keyI} color={pal.key} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0005} />
      <Board />
      {towers.map((t) => (
        <Tower key={t.id} t={t} g={g} selected={t.id === selTower} onSelect={onSelect} />
      ))}
      {Array.from({ length: MAX_BUGS }, (_, i) => (
        <BugSlot key={i} i={i} g={g} />
      ))}
      {Array.from({ length: MAX_SHOTS }, (_, i) => (
        <ShotSlot key={i} i={i} g={g} accent={pal.accent} />
      ))}
      {Array.from({ length: MAX_FX }, (_, i) => (
        <FxSlot key={i} i={i} fx={fx} />
      ))}
      <Cursor shopType={shopType} g={g} onCell={onCell} selTower={selTower} />
      <Loop g={g} fx={fx} running={running} speed={speed} onEvents={onEvents} />
      <DevProbe g={g} />
    </>
  )
}

// ---------------- the HUD and game flow ----------------
const snap = (g) => ({
  coffee: g.coffee,
  lives: g.lives,
  wave: g.wave,
  waveActive: g.waveActive,
  over: g.over,
  boss: g.enemies.find((e) => e.type === 'boss'),
  charges: g.charges,
  chargeK: g.chargeT / blasterOf(g.wave).recharge,
  blaster: blasterOf(g.wave),
  slots: maxCharges(g.score),
  score: g.score,
  next: nextSlotAt(g.score),
})

export default function Crunch({ onBack }) {
  const g = useRef(createGame())
  const fx = useRef(Array.from({ length: MAX_FX }, () => ({ on: false })))
  const running = useRef(false)
  const speedRef = useRef(1)
  const shake = useRef(0)
  const [phase, setPhase] = useState('intro') // intro | play | over
  const [hud, setHud] = useState(() => snap(g.current))
  const [towers, setTowers] = useState([])
  const [shopType, setShopType] = useState(null)
  const [selTower, setSelTower] = useState(null)
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [banner, setBanner] = useState(null)
  const bannerT = useRef(0)

  useEffect(() => {
    running.current = phase === 'play' && !paused
  }, [phase, paused])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])
  // the HUD reads the game state a few times a second
  useEffect(() => {
    const id = setInterval(() => setHud(snap(g.current)), 120)
    return () => clearInterval(id)
  }, [])

  const say = (text, kind = '', ms = 1800) => {
    setBanner({ text, kind, key: Date.now() })
    clearTimeout(bannerT.current)
    bannerT.current = setTimeout(() => setBanner(null), ms)
  }

  const onEvents = (evs) => {
    for (const ev of evs) {
      switch (ev.e) {
        case 'pew':
          sfx('pew', 0, 0.07)
          break
        case 'zap':
          sfx('zap', 0, 0.05)
          break
        case 'frostfire':
          sfx('flick', 0, 0.04)
          break
        case 'slot':
          play('unlock')
          say(`🔥 NEW FIREBALL! You now hold ${ev.n}`, 'good', 2200)
          break
        case 'freeze':
          sfx('freeze', 0, 0.2)
          break
        case 'boomfire':
          sfx('thump', 0, 0.12)
          break
        case 'boom':
          sfx('boom', 0, 0.1)
          break
        case 'fire':
          sfx('flick', 0, 0.04)
          break
        case 'blast':
          sfx('boom', 0, 0.05)
          shake.current = Math.max(shake.current, 0.12)
          break
        case 'empty':
          sfx('locked', 0, 0.2)
          break
        case 'kill':
          sfx('squash', ev.type, 0.05)
          if (ev.type === 'boss') {
            shake.current = 0.6
            say('💥 MERGE CONFLICT RESOLVED!', 'big', 2400)
          }
          break
        case 'leak':
          sfx('leak', 0, 0.15)
          shake.current = 0.3
          break
        case 'wave':
          play('wave')
          say(ev.n > 1 ? `WAVE ${ev.n}/${WAVES} · 🔥 FIRE POWER UP!` : `WAVE ${ev.n}/${WAVES} · tap the bugs to fire!`, '', 1900)
          break
        case 'boss':
          play('bossroar')
          say('⚠ BOSS INCOMING: MERGE CONFLICT', 'warn', 2600)
          break
        case 'cleared':
          if (ev.n < WAVES) {
            play('cleared')
            say(`WAVE CLEARED  +${ev.bonus} ☕`, 'good', 2000)
          }
          break
        case 'won':
          play('fanfare')
          setTimeout(() => setPhase('over'), 900)
          break
        case 'lost':
          play('lose')
          setTimeout(() => setPhase('over'), 900)
          break
        default:
      }
    }
  }

  const refreshTowers = () => setTowers([...g.current.towers])
  // a tap on the board: select a tower, build on a free tile, or fire a fireball at that spot
  const onCell = (cx, cz, point) => {
    if (phase !== 'play') return
    const existing = g.current.towers.find((t) => t.cx === cx && t.cz === cz)
    if (existing) return setSelTower(existing.id)
    // a tap right next to a bug always fires, even with a tower picked in the shop
    const nearBug = point && g.current.enemies.some((en) => (en.x - point.x) ** 2 + (en.z - point.z) ** 2 < 0.55 * 0.55)
    if (shopType && buildable(cx, cz) && !nearBug) {
      const t = placeTower(g.current, shopType, cx, cz)
      if (t) {
        play('build')
        refreshTowers()
        setHud(snap(g.current))
        setShopType(null) // built: the next tap fires again
      } else play('locked')
      return
    }
    setSelTower(null)
    if (point) fireAt(g.current, point.x, point.z)
  }
  const sel = towers.find((t) => t.id === selTower)

  const begin = () => {
    g.current = createGame()
    fx.current.forEach((f) => (f.on = false))
    setTowers([])
    setSelTower(null)
    setShopType('unity')
    setPaused(false)
    setHud(snap(g.current))
    setPhase('play')
    play('select')
    say('Build a tower next to the path, start the wave, then tap the bugs to fire 🔥', '', 3600)
  }
  const nextWave = () => {
    if (startWave(g.current)) setHud(snap(g.current))
  }

  // keys: 1-4 pick a tower, Space next wave, P pause, F speed, Esc deselect (then back to the menu)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (shopType || selTower) {
          e.stopImmediatePropagation()
          setShopType(null)
          setSelTower(null)
        }
        return
      }
      if (phase !== 'play') return
      const n = ['1', '2', '3', '4'].indexOf(e.key)
      if (n >= 0) {
        setShopType(TOWER_IDS[n])
        setSelTower(null)
        play('move')
      } else if (e.key === ' ') {
        e.preventDefault()
        nextWave()
      } else if (e.key.toLowerCase() === 'p') setPaused((p) => !p)
      else if (e.key.toLowerCase() === 'f') setSpeed((s) => (s === 1 ? 2 : 1))
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const best = useMemo(() => {
    try {
      return +localStorage.getItem('zj-crunch-best') || 0
    } catch {
      return 0
    }
  }, [phase])
  useEffect(() => {
    if (phase !== 'over') return
    const reached = hud.over === 'won' ? WAVES + 1 : g.current.wave
    if (reached > best)
      try {
        localStorage.setItem('zj-crunch-best', String(reached))
      } catch {
        /* storage blocked */
      }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="crunch">
      <div className="crunch-hud">
        <button className="btn btn-ghost btn-sm" onClick={onBack} aria-label="Quit to the games menu">
          ◀
        </button>
        <span className="crunch-title">CRUNCH TIME</span>
        <span className="crunch-stat" title="Wave">
          🌊 <b>{Math.max(1, hud.wave)}</b>/{WAVES}
        </span>
        <span className={'crunch-stat' + (hud.lives <= 5 ? ' low' : '')} title="Deadline health: bugs that reach release day cost health">
          ❤️ <b>{hud.lives}</b>
        </span>
        <span className="crunch-stat" title="Coffee: spend it on towers">
          ☕ <b>{hud.coffee}</b>
        </span>
        <span className="crunch-fire" title="Your fireballs: tap the path to fire. They get stronger every wave.">
          🔥 <b>Lv {hud.blaster.lvl}</b>
          <span className="crunch-charges" aria-label={`${hud.charges} of ${hud.slots} fireballs ready`}>
            {Array.from({ length: hud.slots }, (_, i) => (
              <i key={i} className={i < hud.charges ? 'on' : i === hud.charges ? 'fill' : ''} style={i === hud.charges ? { '--k': hud.chargeK } : undefined} />
            ))}
          </span>
        </span>
        <span className="crunch-stat crunch-score" title="Score: squash bugs to earn more fireballs">
          ⭐ <b>{hud.score}</b>
          {hud.next && <small> · next 🔥 at {hud.next}</small>}
        </span>
        <span className="crunch-tools">
          <button className="icon-btn" onClick={() => setSpeed(speed === 1 ? 2 : 1)} aria-pressed={speed === 2} title="Speed (F)">
            ×{speed}
          </button>
          <button className="icon-btn" onClick={() => setPaused(!paused)} aria-pressed={paused} title="Pause (P)">
            {paused ? '▶' : '⏸'}
          </button>
          <button className="btn btn-primary btn-sm crunch-next" onClick={nextWave} disabled={phase !== 'play' || hud.waveActive || !!hud.over}>
            {hud.over ? 'Game over' : hud.waveActive ? 'Wave running…' : hud.wave === 0 ? '▶ Start wave 1' : `▶ Wave ${hud.wave + 1}`}
          </button>
        </span>
      </div>

      {hud.boss && (
        <div className="crunch-boss" aria-label="Boss health">
          <span>👾 MERGE CONFLICT</span>
          <div>
            <i style={{ width: Math.max(0, (hud.boss.hp / hud.boss.max) * 100) + '%' }} />
          </div>
        </div>
      )}

      <div className="crunch-stage">
        <Canvas orthographic shadows dpr={[1, 1.75]} camera={{ position: [15, 30, 30], zoom: 50, near: 0.1, far: 100 }} gl={{ antialias: true }} onCreated={({ gl }) => (gl.toneMapping = THREE.NeutralToneMapping)}>
          <Scene
            g={g}
            fx={fx}
            running={running}
            speed={speedRef}
            onEvents={onEvents}
            shopType={phase === 'play' ? shopType : null}
            selTower={selTower}
            onCell={onCell}
            onSelect={(id) => {
              setSelTower(id)
              setShopType(null)
            }}
            towers={towers}
            shake={shake}
          />
        </Canvas>
        {banner && (
          <div className={'crunch-banner ' + banner.kind} key={banner.key} role="status">
            {banner.text}
          </div>
        )}
        {paused && phase === 'play' && <div className="crunch-paused">PAUSED</div>}

        {sel && phase === 'play' && (
          <div className="crunch-panel" role="dialog" aria-label={TOWERS[sel.type].name}>
            <header>
              <span aria-hidden="true">{TOWERS[sel.type].icon}</span>
              <strong>{TOWERS[sel.type].name}</strong>
              <em>Lv {sel.lvl}</em>
              <button className="icon-btn" onClick={() => setSelTower(null)} aria-label="Close">
                ✕
              </button>
            </header>
            <p>{TOWERS[sel.type].short}</p>
            <div className="crunch-panel-btns">
              <button
                className="btn btn-primary btn-sm"
                disabled={sel.lvl >= MAX_LVL || hud.coffee < upgradeCost(sel)}
                onClick={() => {
                  if (upgradeTower(g.current, sel)) {
                    play('upgrade')
                    refreshTowers()
                    setHud(snap(g.current))
                  }
                }}
              >
                {sel.lvl >= MAX_LVL ? 'MAX LEVEL' : `Upgrade ☕${upgradeCost(sel)}`}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  sellTower(g.current, sel)
                  play('sell')
                  setSelTower(null)
                  refreshTowers()
                  setHud(snap(g.current))
                }}
              >
                Sell +☕{sellValue(sel)}
              </button>
            </div>
          </div>
        )}

        {phase === 'intro' && (
          <div className="crunch-overlay">
            <div className="crunch-card">
              <p className="crunch-kicker">🐞 SQUASH THE BUGS</p>
              <h2>CRUNCH TIME</h2>
              <p>
                Bugs are crawling from the <b>Bug Tracker</b> toward <b>Release Day</b>. Spend ☕ coffee on towers next to the path, but towers don’t shoot on their own: <b>tap a bug and the nearest tower fires</b> its own shot (fireball, laser, frost or cannon). You start with <b>one fireball</b>; squash bugs to earn more, up to six. Your fire gets stronger every wave. Survive {WAVES} waves and beat the boss to ship the game.
              </p>
              <ul className="crunch-legend">
                {TOWER_IDS.map((id) => (
                  <li key={id}>
                    <span aria-hidden="true">{TOWERS[id].icon}</span>
                    <b>{TOWERS[id].name}</b> {TOWERS[id].short}
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary crunch-go" onClick={begin} autoFocus>
                ▶ START CRUNCH
              </button>
              {best > 0 && <p className="crunch-best">Your best: {best > WAVES ? 'Shipped! 🚀' : `wave ${best}`}</p>}
            </div>
          </div>
        )}

        {phase === 'over' && (
          <div className="crunch-overlay">
            <div className={'crunch-card ' + hud.over}>
              <p className="crunch-big" aria-hidden="true">
                {hud.over === 'won' ? '🚀' : '💥'}
              </p>
              <h2>{hud.over === 'won' ? 'SHIPPED!' : 'RELEASE SLIPPED'}</h2>
              <p>{hud.over === 'won' ? 'Every bug squashed. The game launched on time. That’s how Zubia ships.' : `The bugs reached Release Day on wave ${g.current.wave}. Try a different tower mix!`}</p>
              <ul className="crunch-stats">
                <li>
                  <b>{g.current.kills}</b>bugs squashed
                </li>
                <li>
                  <b>{hud.over === 'won' ? WAVES : g.current.wave - 1}</b>waves survived
                </li>
                <li>
                  <b>{g.current.lives}</b>health left
                </li>
                <li>
                  <b>{g.current.built}</b>towers built
                </li>
              </ul>
              <div className="crunch-cta">
                <button className="btn btn-primary" onClick={begin} autoFocus>
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
          </div>
        )}
      </div>

      <div className="crunch-shop" role="toolbar" aria-label="Towers">
        {TOWER_IDS.map((id, i) => {
          const d = TOWERS[id]
          const poor = hud.coffee < d.cost
          return (
            <button
              key={id}
              className={'crunch-tower' + (shopType === id ? ' on' : '') + (poor ? ' poor' : '')}
              onClick={() => {
                setShopType(shopType === id ? null : id)
                setSelTower(null)
                play('move')
              }}
              aria-pressed={shopType === id}
              disabled={phase !== 'play'}
            >
              <span className="crunch-tower-ico" aria-hidden="true">
                {d.icon}
              </span>
              <span className="crunch-tower-text">
                <strong>{d.name}</strong>
                <small>{d.short}</small>
              </span>
              <em>☕{d.cost}</em>
              <kbd>{i + 1}</kbd>
            </button>
          )
        })}
      </div>
    </div>
  )
}
