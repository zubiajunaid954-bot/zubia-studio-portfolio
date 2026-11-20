// The 3D layer: a fixed canvas behind the page. Scrolling picks the active zone and the camera
// glides to that room; the content cards stay as normal, accessible HTML on top.
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, reducedMotion } from '../store'
import { zoneIndex } from '../data/zones'
import Rooms from './Rooms'
import Avatar from './Avatar'
import GameLayer from './GameLayer'
import { usePalette } from './kit'
import { FILM, FILM_ZOOM } from '../film'
import { CAM_DIR, COUNT, ROOM, LIFT, roomX, rig, arcadeRig } from './layout'

const FOLLOW_OFFSET = new THREE.Vector3(0, 1.3, 0)
const tmp = new THREE.Vector3()
const right = new THREE.Vector3()
const up = new THREE.Vector3()
{
  const c = new THREE.OrthographicCamera()
  c.position.copy(CAM_DIR)
  c.lookAt(0, 0, 0)
  c.updateMatrixWorld()
  right.set(1, 0, 0).applyQuaternion(c.quaternion)
  up.set(0, 1, 0).applyQuaternion(c.quaternion)
}

// Where the camera should look and how far it should zoom for the current zone and screen.
function framing(idx, W, H, overview, out, chatOpen = false) {
  const mobile = W < 820 && !FILM
  const top = (mobile ? 58 : 64) + (W <= 1120 ? 46 : 0) // header + section bar
  let zoom
  if (overview) {
    out.set((roomX(0) + roomX(COUNT - 1)) / 2, 0.4, 0)
    zoom = Math.min(W / ((COUNT * ROOM) * 1.05), H / (ROOM * 2.2))
    return zoom
  }
  // aim between the avatar's spot and the room's furniture, at the raised floor height
  out.set(roomX(idx) - 0.35, 1.15 + LIFT, -0.55)
  if (FILM) {
    // promo footage: room centred, no UI to make room for
    zoom = Math.min(W / (ROOM * 1.25), H / (ROOM * 0.82)) * FILM_ZOOM
    out.x += 0.3
  } else if (mobile) {
    // the room fills the top part of the screen, the content card scrolls below it
    const bottom = H * 0.48
    const viewH = bottom - top
    zoom = Math.min(W / (ROOM * 1.42), viewH / (ROOM * 0.66))
    // phones: centre the whole room (avatar on the left, furniture on the right)
    out.x += 0.45
    // the empty floor at the front of the room can slip under the card, so frame a little lower
    out.addScaledVector(up, -(H / 2 - (top + bottom) / 2 - H * 0.07) / zoom)
  } else {
    // the content card covers the left side; frame the room in the space on the right
    const card = Math.min(600, W * 0.44) + 56
    // while the chat is open it takes the right side, so the room is framed between card and chat
    const railW = chatOpen ? 400 : W >= 1100 ? 70 : 0
    const free = W - card - railW
    zoom = Math.min(free / (ROOM * 1.2), (H - top) / (ROOM * 0.8))
    out.addScaledVector(right, -((card - railW) / 2) / zoom)
    out.addScaledVector(up, -(top / 2 / zoom))
  }
  return zoom
}

function CameraRig() {
  const { camera, size } = useThree()
  const zone = useStore((s) => s.zone)
  const introDone = useStore((s) => s.introDone)
  const chatOpen = useStore((s) => s.chatOpen)
  const st = useRef({ t0: performance.now(), zoom: null, target: new THREE.Vector3(), first: true })
  const want = useMemo(() => new THREE.Vector3(), [])
  const smoothPointer = useRef(new THREE.Vector2())

  useEffect(() => {
    const move = (e) => rig.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const elapsed = (performance.now() - s.t0) / 1000
    const overview = !introDone && elapsed < 0.9
    const playing = useStore.getState().game === 'on'
    const arcade = useStore.getState().arcade
    const inArcade = arcade && arcade !== 'drop' && arcadeRig.screen
    let zoom
    if (inArcade && (arcade === 'walk' || arcade === 'insert')) {
      // ZJ Arcade: follow her to the machine, then frame her hand, the coin and the slot up close
      const close = arcade === 'insert'
      arcadeRig.slot.getWorldPosition(tmp)
      want.copy(rig.avatar).add(FOLLOW_OFFSET)
      if (close) want.lerp(tmp, 0.45).y += 0.35
      const f = close ? 0.5 : 0.8
      zoom = Math.min(size.width / (ROOM * f * (size.width < 820 ? 1.15 : 1.6)), size.height / (ROOM * f * 0.9))
    } else if (inArcade) {
      // the coin is in: glide into the machine's screen (the arcade UI takes over from there)
      arcadeRig.screen.getWorldPosition(want)
      zoom = Math.min(size.width / 0.5, size.height / 0.42)
    } else if (playing) {
      // Free Roam: follow the avatar, a little closer than the tour framing
      want.copy(rig.avatar).add(FOLLOW_OFFSET)
      zoom = Math.min(size.width / (ROOM * (size.width < 820 ? 0.95 : 1.15)), size.height / (ROOM * 0.75))
    } else zoom = framing(zoneIndex(zone), size.width, size.height, overview, want, chatOpen)
    // gentle parallax with the mouse (desktop only)
    if (!playing && !inArcade && size.width >= 820 && !reducedMotion) {
      smoothPointer.current.lerp(rig.pointer, 1 - Math.exp(-3 * dt))
      want.addScaledVector(right, smoothPointer.current.x * 0.35).addScaledVector(up, smoothPointer.current.y * 0.2)
    }
    if (s.first) {
      // start from the wide shot of the whole studio (or straight at the room if the intro is skipped)
      const z0 = framing(0, size.width, size.height, !introDone, s.target)
      s.zoom = introDone ? zoom : z0
      if (introDone) s.target.copy(want)
      s.first = false
    }
    const diving = inArcade && arcade !== 'walk' && arcade !== 'insert'
    const lambda = reducedMotion ? 60 : diving ? 4 : playing || inArcade ? 3.5 : introDone ? 2.8 : 1.25
    const k = 1 - Math.exp(-lambda * dt)
    // crane move: while travelling between rooms the camera pulls back, then pushes in on arrival
    const travel = s.target.distanceTo(want)
    if (!diving) s.dive = 0
    const pull = introDone && !reducedMotion && !playing && !inArcade ? Math.max(0.5, 1 / (1 + travel * 0.09)) : 1
    s.target.lerp(want, k)
    if (diving && !reducedMotion) {
      // an accelerating push into the screen
      s.dive = (s.dive || 0) + dt
      s.zoom = Math.min(zoom, s.zoom * (1 + (0.4 + s.dive * s.dive * 9) * dt))
    } else if (diving) s.zoom = zoom
    else s.zoom += (zoom * pull - s.zoom) * (1 - Math.exp(-(reducedMotion ? 60 : 3.4) * dt))
    camera.position.copy(s.target).addScaledVector(CAM_DIR, 40)
    camera.lookAt(s.target)
    camera.zoom = s.zoom
    camera.updateProjectionMatrix()
    rig.target.copy(s.target)
  })
  return null
}

function Lights() {
  const pal = usePalette()
  const low = useStore((s) => s.lowQuality)
  const light = useRef()
  const spot = useRef()
  const target = useMemo(() => new THREE.Object3D(), [])
  const spotTarget = useMemo(() => new THREE.Object3D(), [])
  const zone = useStore((s) => s.zone)
  const focus = useRef(0)
  useFrame((_, dt) => {
    if (!light.current) return
    light.current.position.set(rig.target.x + 5, rig.target.y + 11, rig.target.z + 8)
    target.position.copy(rig.target)
    target.updateMatrixWorld()
    // a stage light that follows the tour and keeps the current room brightest
    focus.current += (roomX(zoneIndex(zone)) - focus.current) * (1 - Math.exp(-3 * Math.min(dt, 0.05)))
    spot.current.position.set(focus.current + 1, 8, 3.5)
    spotTarget.position.set(focus.current, 0, -0.8)
    spotTarget.updateMatrixWorld()
  })
  return (
    <>
      <spotLight ref={spot} target={spotTarget} color={pal.key} intensity={pal.spotI ?? 85} angle={0.55} penumbra={0.75} distance={22} decay={1.6} />
      <primitive object={spotTarget} />
      <hemisphereLight args={[pal.hemiSky, pal.hemiGround, pal.hemiI * 0.55]} />
      <ambientLight intensity={pal.amb} />
      <directionalLight
        ref={light}
        target={target}
        color={pal.key}
        intensity={pal.keyI}
        castShadow={!low}
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
      <primitive object={target} />
    </>
  )
}

function Loader() {
  const { active, progress } = useProgress()
  if (!active && progress >= 100) return null
  return (
    <div className="loader-chip" role="status" aria-live="polite">
      <span className="loader-dot" aria-hidden="true" />
      Building the studio · {Math.round(progress)}%
    </div>
  )
}

export default function Studio() {
  const low = useStore((s) => s.lowQuality)
  const setLow = useStore((s) => s.setLowQuality)
  // while Crunch Time runs in its own canvas, the studio behind it (hidden) stops rendering
  const paused = useStore((s) => s.arcade === 'crunch')
  return (
    <>
      <Canvas
        frameloop={paused ? 'never' : 'always'}
        orthographic
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={low ? 1 : [1, 1.75]}
        camera={{ position: [20, 20, 30], zoom: 40, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping
        }}
      >
        <PerformanceMonitor onDecline={() => setLow(true)} flipflops={2} />
        <CameraRig />
        <Lights />
        <Rooms />
        <Suspense fallback={null}>
          <Avatar />
        </Suspense>
        <GameLayer />
      </Canvas>
      <Loader />
    </>
  )
}
