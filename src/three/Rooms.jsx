// The miniature studio: shell (base, floors, walls, glowing path) plus one furnished room per zone.
// Room-local coordinates: x and z run from -3.5 to 3.5, the back wall is at z = -3.5.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import * as THREE from 'three'
import { Box, Cyl, Ball, Plant, Sign, usePalette, material } from './kit'
import { ROOM, HALF, COUNT, WALL_H, LANE_Z, LIFT, lifts, roomX, arcadeRig } from './layout'
import { zones, zoneIndex } from '../data/zones'
import { profile, promo } from '../data/content'
import { reducedMotion, useStore } from '../store'

const BACK = -HALF + 0.12 // just in front of the back wall

function Shell() {
  const startX = -HALF - 2.2
  const endX = roomX(COUNT - 1) + HALF + 0.4
  const len = endX - startX
  const mid = (startX + endX) / 2
  return (
    <group>
      {/* the model's base */}
      <Box p={[mid, -0.9, 0]} s={[len, 0.9, ROOM + 0.8]} c="base" shadow={false} />
      <Box p={[mid, -0.96, 0]} s={[len + 0.3, 0.06, ROOM + 1.1]} c="dark" shadow={false} />
      {/* porch outside the entrance */}
      <Box p={[-HALF - 1.1, 0, LANE_Z]} s={[2.2, 0.04, 1.8]} c="trim" />
      {/* back wall with a glowing top trim */}
      <Box p={[mid + 1.1, 0, -HALF - 0.1]} s={[len - 2.2, WALL_H, 0.2]} c="wall" />
      <Box p={[mid + 1.1, WALL_H, -HALF - 0.02]} s={[len - 2.2, 0.06, 0.06]} c="accent" e={1.4} shadow={false} />
      {/* left wall with the entrance */}
      <Box p={[-HALF - 0.1, 0, -HALF + (LANE_Z - 0.85 + HALF) / 2]} s={[0.2, WALL_H, LANE_Z - 0.85 + HALF]} c="wall" />
      <Box p={[-HALF - 0.1, 0, (LANE_Z + 0.85 + HALF) / 2]} s={[0.2, WALL_H, HALF - LANE_Z - 0.85]} c="wall" />
      <Box p={[-HALF - 0.1, 2.3, LANE_Z]} s={[0.2, WALL_H - 2.3, 1.7]} c="wall" />
      <Box p={[-HALF + 0.02, 0, LANE_Z - 0.86]} s={[0.06, 2.3, 0.06]} c="accent" e={1.6} shadow={false} />
      <Box p={[-HALF + 0.02, 0, LANE_Z + 0.86]} s={[0.06, 2.3, 0.06]} c="accent" e={1.6} shadow={false} />
      <Box p={[-HALF + 0.02, 2.27, LANE_Z]} s={[0.06, 0.06, 1.78]} c="accent" e={1.6} shadow={false} />
      {/* partitions between rooms: a tall pier at the back and a low wall, with a doorway on the path */}
      {zones.slice(1).map((z, i) => {
        const x = roomX(i) + HALF
        return (
          <group key={z.id}>
            <Box p={[x, 0, -HALF + 0.8]} s={[0.22, WALL_H, 1.6]} c="wall" />
            <Box p={[x, 0, (-HALF + 1.6 + LANE_Z - 1.0) / 2]} s={[0.16, 0.55, LANE_Z - 1.0 + HALF - 1.6]} c="trim" />
            <Box p={[x, 0, (LANE_Z + 1.0 + HALF) / 2]} s={[0.16, 0.55, HALF - LANE_Z - 1.0]} c="trim" />
            <Box p={[x, 0.55, (-HALF + 1.6 + LANE_Z - 1.0) / 2]} s={[0.18, 0.03, LANE_Z - 1.0 + HALF - 1.6]} c="accent" e={0.8} shadow={false} />
          </group>
        )
      })}
      {/* the glowing path the avatar follows, like the brand-coloured route in a miniature city */}
      <Box p={[(startX + 0.3 - HALF) / 2, 0.04, LANE_Z]} s={[-HALF - startX - 0.3, 0.012, 0.08]} c="accent" e={1.8} shadow={false} />
    </group>
  )
}

function RoomTitle({ i }) {
  const z = zones[i]
  return (
    <Sign
      p={[-1.0, 2.66, BACK]}
      size={[3.4, 0.42]}
      bg="none"
      lines={[{ text: `${z.no}  ${z.label.toUpperCase()}`, size: 0.42, weight: 700, color: 'accent', spacing: 5 }]}
    />
  )
}

/* ---------------- rooms ---------------- */

function Lobby() {
  return (
    <group>
      <Sign
        p={[0.9, 1.95, BACK]}
        size={[4.2, 1.5]}
        bg="dark"
        border="accent"
        glow={0.7}
        lines={[
          { text: 'ZJ STUDIO', size: 0.32, weight: 800, color: 'accent', spacing: 18 },
          { text: 'GAME DEVELOPMENT · VR/XR', size: 0.11, weight: 600, color: 'white', spacing: 10 },
        ]}
      />
      <Cyl p={[0.8, 0.06, -0.2]} rad={1.9} h={0.012} c="fabric" seg={48} shadow={false} />
      {/* reception desk */}
      <Box p={[1.0, 0.06, -1.6]} s={[2.8, 0.95, 0.8]} c="wood" />
      <Box p={[1.0, 1.01, -1.6]} s={[3.0, 0.06, 1.0]} c="dark" />
      <Box p={[1.0, 0.45, -1.19]} s={[2.6, 0.05, 0.02]} c="accent" e={1.8} shadow={false} />
      <Box p={[1.6, 1.07, -1.75]} s={[0.7, 0.42, 0.04]} c="dark" />
      <Box p={[1.6, 1.1, -1.72]} s={[0.62, 0.34, 0.01]} c="screen" e={0.9} shadow={false} />
      {/* waiting seats */}
      <Box p={[2.75, 0.06, 0.9]} s={[0.8, 0.42, 1.8]} c="fabric2" />
      <Box p={[3.05, 0.48, 0.9]} s={[0.2, 0.45, 1.8]} c="fabric2" />
      <Plant p={[-2.8, 0.06, -2.8]} size={1.25} />
      <Plant p={[3.0, 0.06, -2.9]} size={1.1} />
    </group>
  )
}

function Portrait() {
  const tex = useTexture(profile.photo)
  tex.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh position={[2.35, 1.75, BACK + 0.05]}>
      <planeGeometry args={[0.95, 0.95]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
    </mesh>
  )
}

function AboutRoom() {
  return (
    <group>
      <RoomTitle i={1} />
      {/* framed photo */}
      <Box p={[2.35, 1.2, BACK - 0.03]} s={[1.15, 1.15, 0.06]} c="accent" e={0.3} />
      <Suspense fallback={null}>
        <Portrait />
      </Suspense>
      {/* bookshelf */}
      <Box p={[-1.6, 0.06, -3.1]} s={[1.6, 2.3, 0.5]} c="wood2" />
      {[0.5, 1.1, 1.7].map((y, r) =>
        [0, 1, 2, 3, 4, 5].map((b) => (
          <Box
            key={r + '-' + b}
            p={[-2.2 + b * 0.22 + (r % 2) * 0.05, 0.06 + y, -2.95]}
            s={[0.14, 0.38 + ((b * 7 + r * 3) % 4) * 0.04, 0.32]}
            c={['accent', 'fabric2', 'white', 'accent2', 'fabric', 'metal'][(b + r) % 6]}
            e={(b + r) % 6 === 0 ? 0.25 : 0}
          />
        )),
      )}
      {/* sofa */}
      <Box p={[0.9, 0.06, -2.5]} s={[2.4, 0.42, 0.95]} c="fabric" />
      <Box p={[0.9, 0.48, -2.88]} s={[2.4, 0.55, 0.22]} c="fabric" />
      <Box p={[-0.2, 0.48, -2.5]} s={[0.22, 0.28, 0.95]} c="fabric" />
      <Box p={[2.0, 0.48, -2.5]} s={[0.22, 0.28, 0.95]} c="fabric" />
      <Box p={[0.5, 0.48, -2.45]} s={[0.55, 0.12, 0.6]} c="fabric2" />
      <Box p={[1.3, 0.48, -2.45]} s={[0.55, 0.12, 0.6]} c="fabric2" />
      {/* coffee table + mug */}
      <Box p={[0.9, 0.06, -1.2]} s={[1.3, 0.38, 0.65]} c="wood" />
      <Cyl p={[1.15, 0.44, -1.2]} rad={0.06} h={0.12} c="white" seg={12} />
      {/* floor lamp */}
      <Cyl p={[3.0, 0.06, -2.2]} rad={0.2} h={0.04} c="dark" />
      <Cyl p={[3.0, 0.1, -2.2]} rad={0.025} h={1.5} c="metal" seg={8} />
      <Cyl p={[3.0, 1.55, -2.2]} rad={0.28} rt={0.6} h={0.35} c="screen" e={1.2} />
      <Plant p={[-2.9, 0.06, -1.3]} size={0.9} />
    </group>
  )
}

function Blink({ p, phase = 0 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.visible = reducedMotion || Math.sin(clock.elapsedTime * 3 + phase) > -0.3
  })
  return (
    <mesh ref={ref} position={p} material={material('#7dff9a', 2)}>
      <boxGeometry args={[0.05, 0.03, 0.01]} />
    </mesh>
  )
}

function Spin({ children, speed = 0.6, p }) {
  const ref = useRef()
  useFrame((_, dt) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y += dt * speed
  })
  return (
    <group ref={ref} position={p}>
      {children}
    </group>
  )
}

function Bob({ children, amp = 0.06, speed = 1.4, phase = 0, p }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current && !reducedMotion) ref.current.position.y = p[1] + Math.sin(clock.elapsedTime * speed + phase) * amp
  })
  return (
    <group ref={ref} position={p}>
      {children}
    </group>
  )
}

function SkillsRoom() {
  const screens = [
    { x: -0.25, t: 'C#', s: 'GAMEPLAY' },
    { x: 0.75, t: 'UNITY', s: '3D · 2D · XR' },
    { x: 1.75, t: 'UE5', s: 'BLUEPRINTS' },
  ]
  return (
    <group>
      <RoomTitle i={2} />
      {/* desk */}
      <Box p={[0.75, 0.72, -2.3]} s={[3.4, 0.06, 1.0]} c="dark" />
      {[-0.85, 2.35].map((x) => (
        <Box key={x} p={[x, 0.06, -2.3]} s={[0.08, 0.66, 0.9]} c="metal" />
      ))}
      <Box p={[0.75, 0.73, -1.86]} s={[3.3, 0.02, 0.04]} c="accent" e={1.4} shadow={false} />
      {screens.map((m, i) => (
        <group key={m.t} position={[m.x, 0.78, -2.55]} rotation={[0, (1 - i) * 0.22, 0]}>
          <Box p={[0, 0, 0]} s={[0.08, 0.25, 0.08]} c="metal" />
          <Box p={[0, 0.25, 0]} s={[0.92, 0.56, 0.05]} c="dark" />
          <Sign
            p={[0, 0.53, 0.03]}
            size={[0.84, 0.48]}
            bg="dark"
            glow={0.9}
            radius={0.03}
            lines={[
              { text: m.t, size: 0.3, weight: 800, color: 'screen' },
              { text: m.s, size: 0.1, weight: 600, color: 'white', spacing: 4 },
            ]}
          />
        </group>
      ))}
      <Box p={[0.75, 0.78, -1.95]} s={[0.9, 0.03, 0.3]} c="metal" />
      {/* gaming chair */}
      <group position={[0.75, 0.06, -1.25]} rotation={[0, 0.15, 0]}>
        <Cyl p={[0, 0, 0]} rad={0.32} h={0.05} c="dark" seg={5} />
        <Cyl p={[0, 0.05, 0]} rad={0.04} h={0.38} c="metal" seg={8} />
        <Box p={[0, 0.43, 0]} s={[0.62, 0.12, 0.58]} c="fabric" />
        <Box p={[0, 0.55, 0.27]} s={[0.6, 0.85, 0.12]} c="fabric" />
        <Box p={[0, 0.7, 0.34]} s={[0.12, 0.6, 0.02]} c="accent" e={1.2} shadow={false} />
      </group>
      {/* PC tower */}
      <Box p={[2.75, 0.06, -2.4]} s={[0.45, 0.9, 0.9]} c="dark" />
      <Box p={[2.52, 0.2, -2.4]} s={[0.01, 0.6, 0.04]} c="accent" e={2} shadow={false} />
      {/* server rack */}
      <Box p={[-2.6, 0.06, -2.9]} s={[0.8, 2.1, 0.7]} c="dark" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
        <group key={k}>
          <Box p={[-2.6, 0.25 + k * 0.23, -2.54]} s={[0.66, 0.16, 0.01]} c="metal" shadow={false} />
          <Blink p={[-2.38, 0.33 + k * 0.23, -2.53]} phase={k * 1.7} />
        </group>
      ))}
      {/* VR headset on a stand */}
      <Cyl p={[2.6, 0.06, -0.6]} rad={0.28} h={0.9} c="trim" seg={20} />
      <Spin p={[2.6, 1.12, -0.6]} speed={0.7}>
        <Box p={[0, -0.09, 0]} s={[0.34, 0.18, 0.2]} c="dark" rough={0.4} />
        <Box p={[0, -0.05, 0.101]} s={[0.3, 0.08, 0.01]} c="accent" e={1.3} shadow={false} />
        <Box p={[0, -0.04, -0.12]} s={[0.36, 0.05, 0.08]} c="metal" />
      </Spin>
    </group>
  )
}

function CareerRoom() {
  const stops = [
    { x: -2.5, z: -2.3, t: 'NED UNIVERSITY', s: 'BS CSIT · 2023' },
    { x: -0.8, z: -1.5, t: 'TECHCAMI', s: 'INTERN · 2025' },
    { x: 0.9, z: -2.3, t: 'TREEOBIT', s: 'INTERN · 2026' },
    { x: 2.6, z: -1.5, t: 'GAME STORM', s: 'INTERN · 2026' },
  ]
  return (
    <group>
      <RoomTitle i={3} />
      {/* winding path linking the milestones */}
      {stops.slice(1).map((st, i) => {
        const a = stops[i]
        const dx = st.x - a.x
        const dz = st.z - a.z
        const len = Math.hypot(dx, dz)
        return (
          <Box
            key={st.t}
            p={[(a.x + st.x) / 2, 0.06, (a.z + st.z) / 2]}
            s={[len, 0.012, 0.09]}
            r={[0, -Math.atan2(dz, dx), 0]}
            c="accent"
            e={1.2}
            shadow={false}
          />
        )
      })}
      {stops.map((st, i) => (
        <group key={st.t} position={[st.x, 0.06, st.z]}>
          <Cyl p={[0, 0, 0]} rad={0.42} h={0.18} c="trim" seg={32} />
          <Cyl p={[0, 0.18, 0]} rad={0.36} h={0.02} c="accent" e={1.1} seg={32} shadow={false} />
          <Cyl p={[0, 0.2, 0]} rad={0.05} h={0.95} c="metal" seg={8} />
          <Bob p={[0, 1.55, 0]} phase={i * 1.3} amp={0.04}>
            <Sign
              p={[0, 0, 0]}
              r={[0, 0.25, 0]}
              size={[1.7, 0.78]}
              bg="dark"
              border="accent"
              glow={0.6}
              lines={[
                { text: st.t, size: 0.22, weight: 800, color: 'accent', spacing: 2 },
                { text: st.s, size: 0.16, weight: 600, color: 'white', spacing: 2 },
              ]}
            />
          </Bob>
        </group>
      ))}
      {/* graduation cap above the university stop */}
      <Spin p={[-2.5, 2.15, -2.3]} speed={0.5}>
        <Box p={[0, 0, 0]} s={[0.5, 0.04, 0.5]} c="dark" />
        <Cyl p={[0, -0.14, 0]} rad={0.17} h={0.14} c="dark" seg={16} />
        <Ball p={[0.18, 0.05, 0.18]} rad={0.035} c="accent" e={1} />
      </Spin>
      <Plant p={[3.0, 0.06, -3.0]} size={1} />
    </group>
  )
}

const GALLERY = [
  { src: '/media/unbroken-oath-poster.jpg', x: -2.15, y: 1.75 },
  { src: '/media/vr-uavsim-poster.jpg', x: 0, y: 1.75 },
  { src: '/media/abduction-poster.jpg', x: 2.15, y: 1.75 },
]

function Posters() {
  const texes = useTexture(GALLERY.map((g) => g.src))
  return GALLERY.map((g, i) => {
    texes[i].colorSpace = THREE.SRGBColorSpace
    return (
      <mesh key={g.src} position={[g.x, g.y, BACK + 0.06]}>
        <planeGeometry args={[1.75, 0.98]} />
        <meshStandardMaterial map={texes[i]} roughness={0.85} emissive="#ffffff" emissiveMap={texes[i]} emissiveIntensity={0.25} />
      </mesh>
    )
  })
}

// The arcade machines are the doorway into ZJ Arcade: click one (or the Arcade button in the top bar)
// and the avatar walks over, pulls a coin out of her hoodie pocket and flicks it into the slot.
// The front machine is the "main" one: it owns the coin slot, the chase lights and the boot screen.
const ARCADE_R = [0, -0.35, 0]
const BULBS = (() => {
  const out = []
  for (let i = 0; i < 6; i++) out.push([-0.3 + i * 0.12, 1.965]) // top row, left -> right
  out.push([0.345, 1.86])
  for (let i = 5; i >= 0; i--) out.push([-0.3 + i * 0.12, 1.755]) // bottom row, right -> left
  out.push([-0.345, 1.86])
  return out
})()
const bulbGeo = new THREE.SphereGeometry(1, 10, 8)

function Arcade({ p, r, main = false }) {
  const openArcade = useStore((st) => st.openArcade)
  const game = useStore((st) => st.game)
  const arcade = useStore((st) => st.arcade)
  const pal = usePalette()
  const [hover, setHover] = useState(false)
  const idle = game === 'off' && !arcade
  const blink = useRef()
  const flash = useRef()
  const slot = useRef()
  const stand = useRef()
  const screen = useRef()
  const bulbs = useMemo(() => BULBS.map(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })), [])
  const slotMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const flashMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), [])
  const tmp = useMemo(() => ({ dim: new THREE.Color(), lit: new THREE.Color(), boot: 0 }), [])

  useEffect(() => {
    if (!main) return
    arcadeRig.slot = slot.current
    arcadeRig.stand = stand.current
    arcadeRig.screen = screen.current
    arcadeRig.yaw = r[1]
    return () => {
      arcadeRig.slot = arcadeRig.stand = arcadeRig.screen = null
    }
  }, [main, r])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const a = useStore.getState().arcade
    const booting = main && !!a && a !== 'walk' && a !== 'insert'
    if (blink.current) blink.current.visible = reducedMotion || a || Math.sin(t * 4) > -0.2
    // chase lights: a slow chase while idle, racing (with full flashes) once a coin is in
    tmp.dim.set(pal.dark).lerp(tmp.lit.set(pal.accent), 0.25)
    tmp.lit.set(pal.accent)
    const speed = booting ? 18 : main && a ? 7 : 3
    const head = Math.floor(t * speed) % BULBS.length
    const allOn = booting && Math.floor(t * 5) % 2 === 0
    bulbs.forEach((m, i) => {
      const d = (head - i + BULBS.length) % BULBS.length
      const on = reducedMotion ? i % 2 === 0 : allOn || d === 0 || d === 1 || (main && a && d === 4)
      m.color.copy(on ? tmp.lit : tmp.dim)
      if (on && d === 0) m.color.lerp(new THREE.Color('#ffffff'), 0.45)
    })
    if (!main) return
    // the coin slot breathes, and flashes when the coin drops in
    arcadeRig.flash = Math.max(0, arcadeRig.flash - dt * 1.6)
    const breathe = a === 'walk' || a === 'insert' ? 0.55 + 0.45 * Math.sin(t * 6) : 0.35
    slotMat.color.copy(tmp.dim).lerp(tmp.lit, Math.min(1, breathe + arcadeRig.flash))
    if (arcadeRig.flash > 0.6) slotMat.color.lerp(new THREE.Color('#ffffff'), arcadeRig.flash - 0.6)
    // the screen powers on: white flash, then a soft glow
    tmp.boot = booting ? tmp.boot + dt : 0
    flashMat.opacity = booting ? Math.max(0.12, 0.9 * Math.exp(-tmp.boot * 2.5)) : 0
    flashMat.color.copy(tmp.lit).lerp(new THREE.Color('#ffffff'), 0.6)
  })

  const screenLines =
    main && arcade && arcade !== 'walk' && arcade !== 'insert'
      ? [
          { text: 'ZJ', size: 0.24, weight: 800, color: 'screen', spacing: 6 },
          { text: 'ARCADE', size: 0.13, weight: 800, color: 'screen', spacing: 5 },
          { text: 'LOADING…', size: 0.08, weight: 700, color: 'white', spacing: 3 },
        ]
      : main && arcade
        ? [
            { text: 'INSERT', size: 0.2, weight: 800, color: 'screen', spacing: 4 },
            { text: 'COIN', size: 0.2, weight: 800, color: 'screen', spacing: 4 },
            { text: '1 PLAYER', size: 0.09, weight: 700, color: 'white', spacing: 2 },
          ]
        : [
            { text: 'INSERT', size: 0.2, weight: 800, color: 'screen', spacing: 4 },
            { text: 'COIN', size: 0.2, weight: 800, color: 'screen', spacing: 4 },
            { text: '▶ PRESS START', size: 0.09, weight: 700, color: 'white', spacing: 2 },
          ]

  return (
    <group
      position={p}
      rotation={r}
      scale={hover && idle ? 1.04 : 1}
      onClick={(e) => {
        e.stopPropagation()
        if (idle) openArcade()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        if (idle) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      <Box p={[0, 0, 0]} s={[0.75, 1.75, 0.7]} c="dark" />
      <Box p={[0, 1.75, 0.05]} s={[0.75, 0.22, 0.6]} c="accent" e={hover && idle ? 2.2 : 1.1} />
      {/* marquee chase lights */}
      {BULBS.map(([x, y], i) => (
        <mesh key={i} geometry={bulbGeo} material={bulbs[i]} position={[x, y, 0.358]} scale={0.019} />
      ))}
      <Box p={[0, 0.95, 0.36]} s={[0.6, 0.5, 0.02]} c="dark" e={0} shadow={false} />
      <group ref={blink}>
        <Sign p={[0, 1.2, 0.372]} size={[0.56, 0.46]} bg="dark" glow={1} radius={0.04} lines={screenLines} />
      </group>
      <mesh position={[0, 1.2, 0.375]} material={flashMat} renderOrder={2}>
        <planeGeometry args={[0.56, 0.46]} />
      </mesh>
      <Box p={[0, 0.82, 0.38]} s={[0.66, 0.08, 0.2]} c="metal" />
      <Ball p={[-0.15, 0.93, 0.42]} rad={0.035} c="accent" e={1} />
      <Ball p={[0.12, 0.92, 0.44]} rad={0.03} c="white" />
      {/* coin door with two glowing slots */}
      <Box p={[0, 0.3, 0.355]} s={[0.32, 0.32, 0.03]} c="metal" metal={0.6} rough={0.35} />
      {[-0.07, 0.07].map((x) => (
        <group key={x}>
          <Box p={[x, 0.47, 0.37]} s={[0.075, 0.11, 0.012]} c="dark" shadow={false} />
          <mesh position={[x, 0.525, 0.3775]} material={slotMat}>
            <planeGeometry args={[0.014, 0.075]} />
          </mesh>
        </group>
      ))}
      <Box p={[0, 0.34, 0.37]} s={[0.12, 0.05, 0.012]} c="accent" e={0.6} shadow={false} />
      {main && (
        <>
          <object3D ref={slot} position={[-0.07, 0.525, 0.39]} />
          <object3D ref={stand} position={[0, 0, 1.22]} />
          <object3D ref={screen} position={[0, 1.2, 0.38]} />
        </>
      )}
    </group>
  )
}

function ProjectsRoom() {
  return (
    <group>
      <RoomTitle i={4} />
      {GALLERY.map((g) => (
        <Box key={g.src} p={[g.x, g.y - 0.55, BACK - 0.02]} s={[1.9, 1.1, 0.06]} c="dark" />
      ))}
      {GALLERY.map((g) => (
        <Box key={g.src + 'l'} p={[g.x, 2.38, BACK + 0.2]} s={[0.5, 0.04, 0.12]} c="accent" e={1.4} shadow={false} />
      ))}
      <Suspense fallback={null}>
        <Posters />
      </Suspense>
      {/* gallery bench */}
      <Box p={[0.3, 0.06, -1.1]} s={[2.2, 0.42, 0.55]} c="wood" />
      <Arcade p={[2.75, 0.06, -0.7]} r={[0, 0.25, 0]} />
      <Arcade p={[2.75, 0.06, 0.45]} r={ARCADE_R} main />
    </group>
  )
}

// ---- shiny trophies: real metal needs something to reflect, so they get a small studio environment map
let envTex = null
export function useStudioEnv() {
  const gl = useThree((st) => st.gl)
  if (!envTex) {
    const pm = new THREE.PMREMGenerator(gl)
    envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture
    pm.dispose()
  }
  return envTex
}

// trophies stay real gold in every theme
const GOLD = '#efbf4f'
const goldCache = new Map()
function useGold(colorKey) {
  const pal = usePalette()
  const env = useStudioEnv()
  const color = pal[colorKey] ?? colorKey
  if (!goldCache.has(color)) {
    goldCache.set(
      color,
      new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.2, envMap: env, envMapIntensity: 2.4, emissive: color, emissiveIntensity: 0.25 }),
    )
  }
  return goldCache.get(color)
}

// all trophy metals share a gentle glow pulse
function GoldPulse() {
  useFrame(({ clock }) => {
    if (reducedMotion) return
    const t = clock.elapsedTime
    for (const m of goldCache.values()) m.emissiveIntensity = 0.22 + 0.22 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.2), 3)
  })
  return null
}

const cupGeo = new THREE.CylinderGeometry(0.15, 0.075, 0.24, 28, 1, true)
const cupBase = new THREE.CircleGeometry(0.075, 28)
const stemGeo = new THREE.CylinderGeometry(0.03, 0.045, 0.16, 16)
const handleGeo = new THREE.TorusGeometry(0.06, 0.014, 8, 20, Math.PI)
const rimGeo = new THREE.TorusGeometry(0.15, 0.012, 8, 32)

function Trophy({ p, scale = 1, c = GOLD }) {
  const gold = useGold(c)
  return (
    <group position={p} scale={scale}>
      <Box p={[0, 0, 0]} s={[0.26, 0.08, 0.26]} c="dark" />
      <Box p={[0, 0.08, 0]} s={[0.17, 0.03, 0.17]} c={c} metal={0.8} rough={0.25} />
      <mesh geometry={stemGeo} material={gold} position={[0, 0.19, 0]} castShadow />
      <mesh geometry={cupGeo} material={gold} position={[0, 0.39, 0]} castShadow>
        <mesh geometry={cupBase} material={gold} position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      </mesh>
      <mesh geometry={rimGeo} material={gold} position={[0, 0.51, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={handleGeo} material={gold} position={[0.15, 0.4, 0]} rotation={[0, 0, -Math.PI / 2]} />
      <mesh geometry={handleGeo} material={gold} position={[-0.15, 0.4, 0]} rotation={[0, 0, Math.PI / 2]} />
    </group>
  )
}

const starGeo = (() => {
  // a flat four-pointed star
  const sh = new THREE.Shape()
  const pts = 8
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2
    const r = i % 2 ? 0.22 : 1
    const x = Math.sin(a) * r
    const y = Math.cos(a) * r
    if (i === 0) sh.moveTo(x, y)
    else sh.lineTo(x, y)
  }
  return new THREE.ShapeGeometry(sh)
})()

function Twinkles({ count, box, p, size = 0.09 }) {
  const pal = usePalette()
  const group = useRef()
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.sin(i * 12.9898) * 0.5) * box[0],
        y: ((Math.sin(i * 78.233) * 0.5 + 0.5)) * box[1],
        z: (Math.sin(i * 39.425) * 0.5) * box[2],
        ph: i * 2.399,
        sp: 1.4 + (i % 5) * 0.35,
      })),
    [count, box],
  )
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: pal.screen, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    [pal.screen],
  )
  useFrame(({ clock, camera }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.children.forEach((m, i) => {
      const st = stars[i]
      const k = reducedMotion ? 0.6 : Math.max(0, Math.sin(t * st.sp + st.ph)) ** 3
      m.scale.setScalar(size * (0.25 + k))
      m.position.y = st.y + (reducedMotion ? 0 : ((t * 0.12 + st.ph) % 1) * 0.25)
      m.quaternion.copy(camera.quaternion) // always face the camera
      m.rotateZ(t * 0.8 + st.ph)
    })
    mat.opacity = 0.95
  })
  return (
    <group ref={group} position={p}>
      {stars.map((st, i) => (
        <mesh key={i} geometry={starGeo} material={mat} position={[st.x, st.y, st.z]} />
      ))}
    </group>
  )
}

function TrophyGlow() {
  const pal = usePalette()
  const low = useStore((st) => st.lowQuality)
  return (
    <>
      {/* a warm spot on the podium makes the big cup gleam */}
      <pointLight position={[1.05, 2.3, -0.7]} color={pal.accent} intensity={5} distance={3.2} decay={2} />
      <Twinkles count={low ? 8 : 14} box={[1.2, 1.3, 1.2]} p={[1.05, 0.9, -1.4]} size={0.11} />
      <Twinkles count={low ? 6 : 12} box={[3.0, 1.5, 0.4]} p={[-1.0, 0.65, -2.85]} size={0.07} />
    </>
  )
}

function TrophyRoom() {
  return (
    <group>
      <RoomTitle i={5} />
      {/* shelf unit */}
      <Box p={[-1.0, 0.06, -3.28]} s={[3.2, 2.2, 0.16]} c="wood2" />
      {[0.55, 1.15, 1.75].map((y) => (
        <group key={y}>
          <Box p={[-1.0, y, -3.0]} s={[3.2, 0.06, 0.42]} c="wood2" />
          <Box p={[-1.0, y, -2.78]} s={[3.2, 0.03, 0.03]} c="accent" e={1.1} shadow={false} />
        </group>
      ))}
      {[-2.2, -1.4, -0.6, 0.2].map((x, i) => (
        <Trophy key={x} p={[x, 0.62, -3.0]} scale={0.9} c={i % 2 ? '#d9dde3' : GOLD} />
      ))}
      {[-2.0, -1.0, 0].map((x) => (
        <Trophy key={x} p={[x, 1.22, -3.0]} scale={0.8} c={x === -1.0 ? GOLD : '#c98a4b'} />
      ))}
      {/* podium: the big trophy sits on the 2nd-place step (GameCon runner-up) */}
      <Box p={[1.95, 0.06, -1.4]} s={[0.9, 0.9, 0.9]} c="trim" />
      <Box p={[1.05, 0.06, -1.4]} s={[0.9, 0.62, 0.9]} c="trim" />
      <Box p={[2.85, 0.06, -1.4]} s={[0.9, 0.4, 0.9]} c="trim" />
      <Sign p={[1.95, 0.55, -0.94]} size={[0.6, 0.5]} bg="none" lines={[{ text: '1', size: 0.7, weight: 800, color: 'white' }]} />
      <Sign p={[1.05, 0.4, -0.94]} size={[0.6, 0.5]} bg="none" lines={[{ text: '2', size: 0.7, weight: 800, color: 'accent' }]} />
      <Sign p={[2.85, 0.28, -0.94]} size={[0.5, 0.4]} bg="none" lines={[{ text: '3', size: 0.7, weight: 800, color: 'white' }]} />
      <Spin p={[1.05, 0.68, -1.4]} speed={0.5}>
        <Trophy p={[0, 0, 0]} scale={2.1} c={GOLD} />
      </Spin>
      <GoldPulse />
      <TrophyGlow />
      <Sign
        p={[1.5, 2.0, BACK]}
        size={[2.6, 0.8]}
        bg="dark"
        border="accent"
        glow={0.6}
        lines={[
          { text: 'GAMECON RUNNER-UP', size: 0.22, weight: 800, color: 'accent', spacing: 4 },
          { text: 'NED UNIVERSITY', size: 0.14, weight: 600, color: 'white', spacing: 6 },
        ]}
      />
    </group>
  )
}

function ScreenGlow() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current && !reducedMotion) ref.current.emissiveIntensity = 0.75 + Math.sin(clock.elapsedTime * 1.6) * 0.12
  })
  const pal = usePalette()
  return <meshStandardMaterial ref={ref} color={pal.dark} emissive={pal.accent} emissiveIntensity={0.75} />
}

// ---- a small seated audience: simple stylised people built from primitives, facing the screen (-z)
const AUDIENCE = [
  { skin: '#e8b996', top: '#f1ece2', hair: 'hijab', hc: '#4f6fb0', popcorn: true },
  { skin: '#c68c62', top: 'accent', hair: 'short', hc: '#1d1612' },
  { skin: '#8d5a3b', top: '#4f86c6', hair: 'cap', hc: '#1d1612', cap: '#f2efe8' },
  { skin: '#f1c9a5', top: '#6fae7a', hair: 'long', hc: '#4a2c18' },
  { skin: '#a8714a', top: '#7d68b8', hair: 'hijab', hc: '#b0474a', popcorn: true },
  { skin: '#dca580', top: '#d9614f', hair: 'bun', hc: '#2a1a10' },
]
const capGeo = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)

function HairCap({ c, p, r = [0.35, 0, 0], s = 0.152 }) {
  return <mesh geometry={capGeo} material={material(c)} position={p} rotation={r} scale={s} castShadow />
}

function Viewer({ v, p, phase, scale = 1 }) {
  const body = useRef()
  const head = useRef()
  useFrame(({ clock }) => {
    if (reducedMotion || !body.current) return
    const t = clock.elapsedTime + phase
    // everyone reacts together now and then (a laugh), otherwise small fidgets and glances
    const laugh = Math.max(0, Math.sin(clock.elapsedTime * 0.9)) ** 12
    body.current.position.y = Math.abs(Math.sin(t * 7)) * 0.03 * laugh + Math.sin(t * 1.3) * 0.004
    body.current.rotation.x = -0.08 * laugh
    head.current.rotation.y = Math.sin(t * 0.45) * 0.35 + Math.sin(t * 1.7) * 0.05
    head.current.rotation.x = Math.sin(t * 0.8) * 0.06 - 0.1 * laugh
  })
  const headY = 0.34 + 0.17
  return (
    <group position={p} scale={scale}>
      {/* legs: thighs forward along the seat, shins down, shoes */}
      {[-0.08, 0.08].map((x) => (
        <group key={x}>
          <Box p={[x, 0, -0.14]} s={[0.12, 0.12, 0.34]} c="#2c2a30" />
          <Box p={[x, -0.38, -0.3]} s={[0.1, 0.38, 0.1]} c="#2c2a30" />
          <Box p={[x, -0.42, -0.33]} s={[0.11, 0.06, 0.18]} c="#eeeae2" />
        </group>
      ))}
      <group ref={body}>
        <Cyl p={[0, 0, 0.05]} rad={0.165} rt={0.82} h={0.34} c={v.top} seg={14} />
        {/* arms resting on the armrests */}
        {[-0.21, 0.21].map((x) => (
          <group key={x}>
            <Box p={[x, 0.1, 0.05]} s={[0.08, 0.24, 0.09]} c={v.top} />
            <Box p={[x, 0.06, -0.1]} s={[0.08, 0.07, 0.24]} c={v.top} />
            <Ball p={[x, 0.09, -0.24]} rad={0.045} c={v.skin} />
          </group>
        ))}
        {v.popcorn && (
          <group position={[0, 0.06, -0.17]}>
            <Cyl p={[0, 0, 0]} rad={0.07} rt={1.3} h={0.14} c="#c0392b" seg={12} />
            <Ball p={[0, 0.15, 0]} rad={0.08} c="#f6e7b8" sy={0.6} />
          </group>
        )}
        <group ref={head} position={[0, headY, 0.04]}>
          <Ball p={[0, 0, 0]} rad={0.14} c={v.skin} />
          {v.hair === 'hijab' && (
            <>
              <Ball p={[0, 0.01, 0.035]} rad={0.158} sy={1.08} c={v.hc} />
              <Cyl p={[0, -0.2, 0.03]} rad={0.15} rt={0.75} h={0.13} c={v.hc} seg={14} />
            </>
          )}
          {v.hair === 'short' && <HairCap c={v.hc} p={[0, 0.01, 0.025]} />}
          {v.hair === 'long' && (
            <>
              <HairCap c={v.hc} p={[0, 0.01, 0.025]} r={[0.3, 0, 0]} s={0.155} />
              <Box p={[0, -0.24, 0.1]} s={[0.24, 0.26, 0.06]} c={v.hc} />
            </>
          )}
          {v.hair === 'bun' && (
            <>
              <HairCap c={v.hc} p={[0, 0.01, 0.025]} />
              <Ball p={[0, 0.12, 0.1]} rad={0.07} c={v.hc} />
            </>
          )}
          {v.hair === 'cap' && (
            <>
              <HairCap c={v.hc} p={[0, 0, 0.03]} r={[0.5, 0, 0]} s={0.15} />
              <HairCap c={v.cap} p={[0, 0.03, 0]} r={[-0.15, 0, 0]} s={[0.155, 0.13, 0.155]} />
              <Box p={[0, 0.06, -0.17]} s={[0.2, 0.02, 0.12]} c={v.cap} />
            </>
          )}
        </group>
      </group>
    </group>
  )
}

function PremiereSign() {
  return (
    <Sign
      p={[0.5, 2.0, BACK + 0.06]}
      size={[4.3, 2.2]}
      bg="none"
      glow={1}
      lines={[
        { text: '▶', size: 0.22, weight: 700, color: 'white' },
        { text: 'SHOWREEL', size: 0.11, weight: 800, color: 'white', spacing: 14 },
        { text: 'PREMIERING SOON', size: 0.05, weight: 600, color: 'white', spacing: 8 },
      ]}
    />
  )
}

// The promo video plays (muted, looping) on the cinema screen, only while the Screening Room is
// the active area, so it costs nothing elsewhere on the tour.
function VideoScreen() {
  const zone = useStore((st) => st.zone)
  const video = useMemo(() => {
    const v = document.createElement('video')
    v.src = promo.src
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.preload = 'none'
    v.crossOrigin = 'anonymous'
    return v
  }, [])
  const tex = useMemo(() => {
    const t = new THREE.VideoTexture(video)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [video])
  const active = zone === 'showreel'
  useEffect(() => {
    if (active) video.play().catch(() => {})
    else video.pause()
  }, [active, video])
  useEffect(() => () => video.pause(), [video])
  return (
    <mesh position={[0.5, 2.0, BACK + 0.05]}>
      <planeGeometry args={[3.9, 2.19]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}

function ScreeningRoom() {
  return (
    <group>
      <RoomTitle i={6} />
      {/* big screen */}
      <Box p={[0.5, 0.75, BACK - 0.02]} s={[4.6, 2.5, 0.1]} c="dark" />
      {promo.src ? (
        <VideoScreen />
      ) : (
        <>
          <mesh position={[0.5, 2.0, BACK + 0.05]}>
            <planeGeometry args={[4.3, 2.2]} />
            <ScreenGlow />
          </mesh>
          <PremiereSign />
        </>
      )}
      {/* speakers */}
      {[-2.25, 3.25].map((x) => (
        <Box key={x} p={[x, 0.06, -3.0]} s={[0.5, 1.4, 0.45]} c="dark" />
      ))}
      {/* seats, two rows */}
      {[-1.2, 0.1].map((z, row) =>
        [0, 1, 2].map((k) => (
          <group key={row + '-' + k} position={[-0.1 + k * 0.95 + row * 0.3, 0.06 + row * 0.12, z]}>
            {row === 1 && <Box p={[0, -0.12, 0]} s={[0.9, 0.12, 0.9]} c="trim" />}
            <Box p={[0, 0, 0]} s={[0.78, 0.42, 0.72]} c="fabric" />
            <Box p={[0, 0.42, 0.3]} s={[0.78, 0.46, 0.14]} c="fabric" />
            <Box p={[-0.36, 0.42, 0]} s={[0.08, 0.16, 0.7]} c="fabric2" />
            <Box p={[0.36, 0.42, 0]} s={[0.08, 0.16, 0.7]} c="fabric2" />
          </group>
        )),
      )}
      {/* the audience */}
      {AUDIENCE.map((v, i) => {
        const row = i < 3 ? 0 : 1
        const k = i % 3
        return <Viewer key={i} v={v} scale={0.92} p={[-0.1 + k * 0.95 + row * 0.3, 0.06 + row * 0.12 + 0.42, row ? 0.1 : -1.2]} phase={i * 1.7} />
      })}
      {/* popcorn stand */}
      <Cyl p={[2.95, 0.06, 0.3]} rad={0.14} rt={1.25} h={0.32} c="accent2" seg={12} />
      <Ball p={[2.95, 0.4, 0.3]} rad={0.15} c="paper" sy={0.6} />
    </group>
  )
}

function PaperPlane({ p, phase }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    const t = clock.elapsedTime * 0.6 + phase
    ref.current.position.set(p[0] + Math.sin(t) * 0.6, p[1] + Math.sin(t * 2) * 0.12, p[2] + Math.cos(t) * 0.4)
    ref.current.rotation.y = -t + Math.PI
  })
  return (
    <group ref={ref} position={p}>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[0.6, 1, 0.12]} castShadow material={material('#f6f2ea', 0.15)}>
        <coneGeometry args={[0.16, 0.42, 3]} />
      </mesh>
    </group>
  )
}

function ContactRoom() {
  return (
    <group>
      <RoomTitle i={7} />
      <Sign
        p={[1.4, 1.95, BACK]}
        size={[2.8, 0.95]}
        bg="dark"
        border="accent"
        glow={0.7}
        lines={[
          { text: 'LET’S TALK', size: 0.3, weight: 800, color: 'accent', spacing: 8 },
          { text: 'OPEN TO ROLES & INTERNSHIPS', size: 0.11, weight: 600, color: 'white', spacing: 5 },
        ]}
      />
      {/* desk with laptop, phone and mug */}
      <Box p={[1.2, 0.72, -2.0]} s={[2.4, 0.06, 1.0]} c="wood" />
      {[0.1, 2.3].map((x) => (
        <Box key={x} p={[x, 0.06, -2.0]} s={[0.08, 0.66, 0.9]} c="metal" />
      ))}
      <Box p={[1.0, 0.78, -1.9]} s={[0.7, 0.03, 0.45]} c="metal" />
      <group position={[1.0, 0.81, -2.12]} rotation={[-0.25, 0, 0]}>
        <Box p={[0, 0, 0]} s={[0.7, 0.45, 0.02]} c="metal" />
        <Box p={[0, 0.03, 0.012]} s={[0.62, 0.38, 0.005]} c="screen" e={0.9} shadow={false} />
      </group>
      <Box p={[1.8, 0.78, -1.85]} s={[0.12, 0.02, 0.22]} c="dark" />
      <Cyl p={[0.3, 0.78, -1.8]} rad={0.06} h={0.12} c="accent2" seg={12} />
      <Box p={[1.2, 0.06, -1.3]} s={[0.6, 0.45, 0.55]} c="fabric" />
      <Box p={[1.2, 0.51, -1.04]} s={[0.6, 0.6, 0.08]} c="fabric" />
      {/* mailbox */}
      <Cyl p={[-2.4, 0.06, -2.4]} rad={0.05} h={0.95} c="metal" seg={8} />
      <Box p={[-2.4, 1.0, -2.4]} s={[0.5, 0.4, 0.75]} c="accent" e={0.35} />
      <Box p={[-2.12, 1.15, -2.3]} s={[0.04, 0.4, 0.06]} c="white" />
      {/* paper planes flying in */}
      <PaperPlane p={[-1.6, 2.2, -1.6]} phase={0} />
      <PaperPlane p={[0.4, 2.5, -0.8]} phase={2.1} />
      <PaperPlane p={[2.4, 2.1, -0.4]} phase={4.2} />
      <Plant p={[3.0, 0.06, -3.0]} size={1.1} />
    </group>
  )
}

// Each room is its own slab: the active one rises out of the model so it reads as "in focus".
function RoomSlot({ i, children }) {
  const ref = useRef()
  const zone = useStore((s) => s.zone)
  const last = i === COUNT - 1
  useFrame((_, dt) => {
    const want = zoneIndex(zone) === i ? LIFT : 0
    lifts[i] = reducedMotion ? want : lifts[i] + (want - lifts[i]) * (1 - Math.exp(-4 * Math.min(dt, 0.05)))
    ref.current.position.y = lifts[i]
  })
  return (
    <group ref={ref} position={[roomX(i), 0, 0]}>
      {/* floor slab: thick so its edge shows when the room is raised */}
      <Box p={[0, -0.5, 0]} s={[ROOM - 0.08, 0.56, ROOM - 0.04]} c={i % 2 ? 'floor2' : 'floor'} shadow={false} />
      <Box p={[0, 0.01, HALF - 0.03]} s={[ROOM - 0.1, 0.03, 0.04]} c="accent" e={1.2} shadow={false} />
      {/* this room's stretch of the glowing path and the avatar's spot */}
      <Box p={[last ? (-HALF + 0.6) / 2 : 0, 0.06, LANE_Z]} s={[last ? HALF + 0.6 : ROOM - 0.08, 0.012, 0.08]} c="accent" e={1.8} shadow={false} />
      <Cyl p={[-1.4, 0.06, LANE_Z]} rad={0.48} rt={1} h={0.014} c="accent" e={0.9} seg={40} shadow={false} />
      {children}
    </group>
  )
}

const ROOMS = [Lobby, AboutRoom, SkillsRoom, CareerRoom, ProjectsRoom, TrophyRoom, ScreeningRoom, ContactRoom]

export default function Rooms() {
  return (
    <group>
      <Shell />
      {ROOMS.map((R, i) => (
        <RoomSlot key={i} i={i}>
          <R />
        </RoomSlot>
      ))}
    </group>
  )
}
