// The guide: Zubia's rigged Blender avatar (Module 2).
// Clips baked in Blender: Idle, Walk, Wave, Point, Guide, Present, Celebrate.
//  - walks between rooms (Walk speeds up with the distance), then plays the room's gesture
//  - idles, and turns her head (and a little of her body) towards the cursor
//  - click her: she waves and says something
//  - her hoodie takes the colour of the active theme
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useStore, reducedMotion } from '../store'
import { FILM } from '../film'
import { zones, zoneIndex } from '../data/zones'
import { usePalette } from './kit'
import { DOOR_X, LANE_Z, REST_ROT, spotX, rig, liftAt, arcadeRig } from './layout'
import { makeCoin } from './coin'
import { useStudioEnv } from './Rooms'
import { play as sound } from '../game/sound'
import { keys, joy, attachKeys, moveWithCollision, SCREEN_UP, SCREEN_RIGHT, roomIndexAt, SPOTS, TALK_RADIUS } from '../game/world'

const URL = '/models/avatar.glb'

// the gesture she makes on arriving in each room
// (the furniture is always on her left, so the room gestures use her left hand)
const GESTURE = {
  home: 'Wave',
  about: 'Present',
  skills: 'Point',
  career: 'Guide',
  projects: 'Point',
  achievements: 'Celebrate',
  showreel: 'Present',
  contact: 'Wave',
}

const CLICK_LINES = [
  'Ask me about my VR flight simulator!',
  'I love building enemy AI that feels alive.',
  'Unity, Unreal or VR? Every room has something.',
  'Psst: every project has a trailer in the gallery.',
  'Thanks for visiting my studio!',
]

// InsertCoin clip timing (seconds): the hand reaches the pocket, comes out holding the coin,
// and lets go on the flick
const GRAB = 0.64
const RELEASE = 1.85
const FLIGHT = 0.42
const ARCADE_3D = ['walk', 'insert', 'boot', 'menu', 'fit', 'quiz', 'crunch']
const v1 = new THREE.Vector3()
const v2 = new THREE.Vector3()
const v3 = new THREE.Vector3()

function dampAngle(a, b, lambda, dt) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * (1 - Math.exp(-lambda * dt))
}

export default function Avatar() {
  const { scene, animations } = useGLTF(URL)
  const pal = usePalette()

  // a proper skinned clone, with shadows, no frustum culling (raised arms leave the bind-pose bounds)
  const { model, hoodie, head, neck, headRest, neckRest, hand, forearm } = useMemo(() => {
    const m = cloneSkinned(scene)
    let hood = null
    m.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.frustumCulled = false
        o.material = o.material.clone()
        o.material.side = THREE.FrontSide
        if (o.material.name === 'Hoodie_Material') hood = o.material
      }
    })
    const head = m.getObjectByName('head')
    const neck = m.getObjectByName('neck')
    return {
      model: m,
      hand: m.getObjectByName('handR') || m.getObjectByName('hand.R'),
      forearm: m.getObjectByName('forearmR') || m.getObjectByName('forearm.R'),
      hoodie: hood,
      head,
      neck,
      // rest rotations: the look-at offset is always applied on top of these (or the clip),
      // never on top of the previous frame, so it can't accumulate
      headRest: head?.quaternion.clone(),
      neckRest: neck?.quaternion.clone(),
    }
  }, [scene])

  useEffect(() => {
    if (hoodie) hoodie.color.set(pal.hoodie || '#ffffff')
  }, [hoodie, pal])

  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])
  const actions = useMemo(() => {
    const a = {}
    for (const clip of animations) {
      const act = mixer.clipAction(clip)
      if (clip.name !== 'Idle' && clip.name !== 'Walk') {
        act.setLoop(THREE.LoopOnce, 1)
        // hold the last frame (her relaxed pose) until Idle has fully faded in; otherwise the
        // skeleton briefly falls back to the Blender rest pose (arms out) between clips
        act.clampWhenFinished = true
      }
      a[clip.name] = act
    }
    return a
  }, [animations, mixer])

  // the arcade coin (in her hand, then flying into the slot) and the bonus-coin pop above her head
  const scene3 = useThree((t) => t.scene)
  const env = useStudioEnv()
  const coin = useMemo(() => makeCoin(env), [env])
  const popCoin = useMemo(() => makeCoin(env), [env])
  useEffect(() => {
    scene3.add(coin)
    return () => scene3.remove(coin)
  }, [scene3, coin])
  const coinPop = useStore((s) => s.coinPop)
  const pop = useRef({ t: -1 })
  const [popLabel, setPopLabel] = useState(0)
  useEffect(() => {
    if (!coinPop) return
    pop.current.t = 0
    setPopLabel(coinPop)
    sound('coin')
    const id = setTimeout(() => setPopLabel(0), 1300)
    return () => clearTimeout(id)
  }, [coinPop])

  const zone = useStore((s) => s.zone)
  const introDone = useStore((s) => s.introDone)
  const outer = useRef()
  const st = useRef({
    x: reducedMotion || introDone ? spotX(zoneIndex(useStore.getState().zone)) : DOOR_X,
    z: LANE_Z,
    rot: Math.PI / 2,
    moving: null,
    gameMoving: false,
    current: null,
    look: new THREE.Vector2(),
    lookWeight: 0,
  })
  const [bubble, setBubble] = useState(null)
  const bubbleTimer = useRef(0)

  // crossfade helper
  const play = (name, fade = 0.3) => {
    const s = st.current
    const next = actions[name]
    if (!next) return
    if (s.current === next && next.isRunning()) return
    next.reset().setEffectiveTimeScale(next.timeScale || 1).setEffectiveWeight(1).play()
    if (s.current && s.current !== next) s.current.crossFadeTo(next, fade, false)
    else next.fadeIn(fade)
    s.current = next
  }

  // after a one-shot gesture, settle back into Idle
  useEffect(() => {
    const done = (e) => {
      if (e.action === st.current.current && !st.current.moving) play('Idle', 0.45)
    }
    mixer.addEventListener('finished', done)
    return () => mixer.removeEventListener('finished', done)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => mixer.stopAllAction(), [mixer])
  useEffect(() => {
    if (import.meta.env.DEV) window.__avatarHead = head // dev-only: lets the head rotation be inspected
  }, [head])

  const say = (text, ms) => {
    setBubble(text)
    clearTimeout(bubbleTimer.current)
    if (ms) bubbleTimer.current = setTimeout(() => setBubble(zones[zoneIndex(useStore.getState().zone)].line), ms)
  }

  useEffect(() => attachKeys(), [])
  const game = useStore((s) => s.game)
  const talkSpot = useStore((s) => s.talkSpot)
  const arcade = useStore((s) => s.arcade)
  useEffect(() => {
    if (game !== 'off' || arcade) setBubble(null)
  }, [game, arcade])
  // a message was sent from the contact form: she celebrates and thanks the visitor
  const contactSent = useStore((s) => s.contactSent)
  useEffect(() => {
    const st0 = useStore.getState()
    if (!contactSent || st0.game !== 'off' || st0.arcade) return
    play('Celebrate', 0.25)
    say('Got it! Thank you for your message 💌', 5000)
  }, [contactSent]) // eslint-disable-line react-hooks/exhaustive-deps

  // when the visitor starts talking to an object, she turns to it and presents it
  useEffect(() => {
    if (talkSpot && useStore.getState().game === 'on') play('Present', 0.25)
  }, [talkSpot]) // eslint-disable-line react-hooks/exhaustive-deps

  // Free Roam: the visitor drives the avatar around the studio
  const gameStep = (dt) => {
    const s = st.current
    const store = useStore.getState()
    let ix = 0
    let iz = 0
    if (!store.talkSpot) {
      const up = keys.has('w') || keys.has('arrowup')
      const down = keys.has('s') || keys.has('arrowdown')
      const left = keys.has('a') || keys.has('arrowleft')
      const right = keys.has('d') || keys.has('arrowright')
      ix = (up ? SCREEN_UP.x : 0) - (down ? SCREEN_UP.x : 0) + (right ? SCREEN_RIGHT.x : 0) - (left ? SCREEN_RIGHT.x : 0)
      iz = (up ? SCREEN_UP.z : 0) - (down ? SCREEN_UP.z : 0) + (right ? SCREEN_RIGHT.z : 0) - (left ? SCREEN_RIGHT.z : 0)
      // phone joystick: push up = walk "up" the screen, like the W key
      const jm = Math.hypot(joy.x, joy.y)
      if (!ix && !iz && joy.active && jm > 0.15) {
        ix = joy.x * SCREEN_RIGHT.x - joy.y * SCREEN_UP.x
        iz = joy.x * SCREEN_RIGHT.z - joy.y * SCREEN_UP.z
      }
      if (ix || iz) rig.moveTo = null
      else if (rig.moveTo) {
        // tap / click to walk
        const dx = rig.moveTo.x - s.x
        const dz = rig.moveTo.z - s.z
        const d = Math.hypot(dx, dz)
        if (d < 0.12) rig.moveTo = null
        else {
          ix = dx / d
          iz = dz / d
        }
      }
    } else rig.moveTo = null
    const len = Math.hypot(ix, iz)
    const speed = keys.has('shift') || (joy.active && Math.hypot(joy.x, joy.y) > 0.9) ? 4.2 : 2.7
    let moved = 0
    if (len > 0) {
      ix /= len
      iz /= len
      const [nx, nz] = moveWithCollision(s.x, s.z, ix * speed * dt, iz * speed * dt)
      moved = Math.hypot(nx - s.x, nz - s.z)
      s.x = nx
      s.z = nz
      if (moved < 0.0005) rig.moveTo = null // walked into something
    }
    const moving = moved > 0.0005
    if (moving !== s.gameMoving) {
      s.gameMoving = moving
      play(moving ? 'Walk' : 'Idle', 0.2)
    }
    if (moving && actions.Walk) actions.Walk.timeScale = speed / 2.4
    let want = s.rot
    if (moving) want = Math.atan2(ix, iz)
    else if (store.talkSpot) {
      const sp = SPOTS.find((p) => p.id === store.talkSpot)
      if (sp) want = Math.atan2(sp.x - s.x, sp.z - s.z)
    }
    s.rot = dampAngle(s.rot, want, 10, dt)
    // the room she is in becomes the active room (it lifts, the stage light follows)
    const zid = zones[roomIndexAt(s.x)].id
    if (zid !== store.zone) store.setZone(zid)
    // the nearest object she can talk to
    let near = null
    let best = TALK_RADIUS
    for (const p of SPOTS) {
      const d = Math.hypot(p.x - s.x, p.z - s.z)
      if (d < best) {
        best = d
        near = p.id
      }
    }
    if (near !== store.nearSpot) store.setNearSpot(near)
    if (keys.has('e') && near && !store.talkSpot) {
      keys.delete('e')
      store.talkTo(near)
    }
  }

  // ZJ Arcade: walk to the machine, take the coin out of the hoodie pocket, flick it into the slot
  const arc = useRef({})
  const arcadeStep = (dt, a) => {
    const s = st.current
    const c = arc.current
    arcadeRig.stand.getWorldPosition(v1)
    if (!c.active) {
      // a fresh run: reset the coin
      Object.assign(c, { active: true, walking: false, arrived: false, shown: false, flying: false, clinked: false, booted: false })
      coin.visible = false
    }
    if (a === 'walk') {
      // along the glowing path until she is in the gallery, then straight to the machine
      const far = Math.abs(s.x - v1.x) > 2.6
      const gz = far ? LANE_Z : v1.z
      const dx = v1.x - s.x
      const dz = gz - s.z
      const d = Math.hypot(dx, dz) || 1
      const left = Math.hypot(v1.x - s.x, v1.z - s.z)
      if (left > 0.03) {
        const speed = reducedMotion ? 99 : Math.min(6, Math.max(left < 1 ? 1.5 : 2.2, left * 1.3))
        const step = Math.min(d, speed * dt)
        s.x += (dx / d) * step
        s.z += (dz / d) * step
        if (!c.walking) {
          c.walking = true
          play('Walk', 0.25)
        }
        if (actions.Walk) actions.Walk.timeScale = Math.min(2.2, Math.max(0.9, speed / 2.2))
        s.rot = dampAngle(s.rot, Math.atan2(dx, dz), 9, dt)
      } else {
        s.x = v1.x
        s.z = v1.z
        if (c.walking) {
          c.walking = false
          play('Idle', 0.25)
        }
        // turn to face the machine, then reach for the coin
        const face = arcadeRig.yaw + Math.PI
        s.rot = dampAngle(s.rot, face, 8, dt)
        let diff = face - s.rot
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        if (Math.abs(diff) < 0.06 && !c.arrived) {
          c.arrived = true
          play('InsertCoin', 0.25)
          useStore.getState().setArcade('insert')
        }
      }
      return
    }
    if (a !== 'insert' && !(c.flying && !c.clinked)) {
      if (!c.flying) coin.visible = false // skipped: the coin never left her pocket
      return
    }
    const T = actions.InsertCoin
    const ct = s.current === T ? T.time : 0
    const yaw = arcadeRig.yaw
    if (!c.flying && ct >= GRAB && ct < RELEASE && hand && forearm) {
      // in her hand, just past the fingers, with a little glint and wobble
      if (!c.shown) {
        c.shown = true
        c.age = 0
        sound('glint')
      }
      c.age += dt
      hand.getWorldPosition(v2)
      forearm.getWorldPosition(v3)
      v3.subVectors(v2, v3).normalize()
      coin.position.copy(v2).addScaledVector(v3, 0.08)
      const k = Math.min(1, c.age / 0.16)
      coin.scale.setScalar(0.8 * k * (1 + 0.25 * Math.sin(k * Math.PI)))
      coin.rotation.set(Math.sin(c.age * 7) * 0.35, yaw, 0)
      coin.visible = true
    }
    if (!c.flying && ct >= RELEASE && c.shown) {
      c.flying = true
      c.ft = 0
      c.from = coin.position.clone()
      sound('flick')
    }
    if (c.flying && !c.clinked) {
      c.ft += dt
      const u = Math.min(1, c.ft / FLIGHT)
      arcadeRig.slot.getWorldPosition(v2)
      // an arc that peaks early, then drops edge-first into the slot
      const e = 1 - Math.pow(1 - u, 1.6)
      coin.position.lerpVectors(c.from, v2, e)
      coin.position.y += Math.sin(Math.PI * Math.min(1, u * 1.25)) * 0.16
      if (u > 0.85) {
        // last stretch: slide into the machine
        coin.position.x -= Math.sin(yaw) * (u - 0.85) * 0.5
        coin.position.z -= Math.cos(yaw) * (u - 0.85) * 0.5
      }
      coin.rotation.set(-c.ft * 34, yaw, 0)
      coin.scale.setScalar(0.8 * (u > 0.85 ? Math.max(0.01, 1 - (u - 0.85) * 5) : 1 - u * 0.15))
      if (u >= 1) {
        c.clinked = true
        c.bootIn = 0.4
        coin.visible = false
        arcadeRig.flash = 1
        sound('clink')
      }
    }
    if (c.clinked && !c.booted) {
      c.bootIn -= dt
      if (c.bootIn <= 0) {
        c.booted = true
        if (useStore.getState().arcade === 'insert') {
          useStore.getState().spendCoin()
          useStore.getState().setArcade('boot')
        }
      }
    }
  }

  // bonus coin: pops out above her head, spins, and fades away
  const popStep = (dt) => {
    const p = pop.current
    if (p.t < 0) {
      popCoin.visible = false
      return
    }
    p.t += dt
    const u = p.t / 1.1
    if (u >= 1) {
      p.t = -1
      popCoin.visible = false
      return
    }
    popCoin.visible = true
    popCoin.position.set(0, 2.75 + (1 - Math.pow(1 - Math.min(1, u * 1.6), 3)) * 0.55, 0)
    popCoin.rotation.set(0, p.t * 14, 0)
    popCoin.scale.setScalar(1.5 * (u < 0.15 ? u / 0.15 : u > 0.75 ? (1 - u) / 0.25 : 1))
  }

  const onClick = (e) => {
    e.stopPropagation()
    if (useStore.getState().game !== 'off' || useStore.getState().arcade) return
    if (st.current.moving) return
    say(CLICK_LINES[Math.floor(Math.random() * CLICK_LINES.length)], 3500)
    if (st.current.current === actions.Wave) actions.Wave.reset().play()
    else play('Wave', 0.2)
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    if (useStore.getState().game === 'on') {
      gameStep(dt)
      popStep(dt)
      outer.current.position.set(s.x, 0.06 + liftAt(s.x), s.z)
      outer.current.rotation.y = s.rot
      rig.avatar.set(s.x, 0.06 + liftAt(s.x), s.z)
      if (head) head.quaternion.copy(headRest)
      if (neck) neck.quaternion.copy(neckRest)
      mixer.update(dt)
      return
    }
    const a = useStore.getState().arcade
    if (ARCADE_3D.includes(a) && arcadeRig.stand) {
      arcadeStep(dt, a)
      outer.current.position.set(s.x, 0.06 + liftAt(s.x), s.z)
      outer.current.rotation.y = s.rot
      rig.avatar.set(s.x, 0.06 + liftAt(s.x), s.z)
      if (head) head.quaternion.copy(headRest)
      if (neck) neck.quaternion.copy(neckRest)
      mixer.update(dt)
      popStep(dt)
      s.moving = false
      return
    }
    if (arc.current.active) {
      // back from the arcade: hide the coin and let the tour walk her back to her spot
      arc.current.active = false
      coin.visible = false
      s.moving = null
    }
    popStep(dt)
    if (s.gameMoving) s.gameMoving = false
    s.z += (LANE_Z - s.z) * (1 - Math.exp(-4 * dt)) // back onto the path after Free Roam
    const idx = zoneIndex(zone)
    const tx = spotX(idx)
    const dist = tx - s.x
    const moving = Math.abs(dist) > 0.02
    let speed = 0
    if (moving) {
      if (reducedMotion) s.x = tx
      else {
        speed = Math.min(7, Math.max(2.0, Math.abs(dist) * 1.4))
        s.x += Math.sign(dist) * Math.min(Math.abs(dist), speed * dt)
      }
    }

    // animation state changes
    if (s.moving !== moving) {
      s.moving = moving
      if (moving) {
        setBubble(null)
        play('Walk', 0.25)
      } else {
        say(zones[idx].line)
        play(reducedMotion ? 'Idle' : GESTURE[zones[idx].id] || 'Idle', 0.3)
      }
    }
    if (moving && actions.Walk) actions.Walk.timeScale = Math.min(2.4, Math.max(1, speed / 2.2))

    // facing: along the path while walking, towards the visitor (and a touch towards the cursor) when standing
    const want = moving ? (dist > 0 ? Math.PI / 2 : -Math.PI / 2) : REST_ROT + rig.pointer.x * 0.18
    s.rot = dampAngle(s.rot, want, moving ? 9 : 4, dt)
    outer.current.position.set(s.x, 0.06 + liftAt(s.x), s.z)
    outer.current.rotation.y = s.rot
    rig.avatar.set(s.x, 0.06 + liftAt(s.x), s.z)

    // reset head/neck first: if a clip has no track for them, the mixer won't overwrite them
    if (head) head.quaternion.copy(headRest)
    if (neck) neck.quaternion.copy(neckRest)
    mixer.update(dt)

    // head follows the cursor on top of the animation, fading out while walking (limited range)
    s.lookWeight += ((moving ? 0 : 1) - s.lookWeight) * (1 - Math.exp(-4 * dt))
    s.look.lerp(rig.pointer, 1 - Math.exp(-5 * dt))
    if (head && !reducedMotion) {
      const yaw = THREE.MathUtils.clamp(s.look.x, -1, 1) * 0.45 * s.lookWeight
      const pitch = -THREE.MathUtils.clamp(s.look.y, -1, 1) * 0.18 * s.lookWeight
      head.rotateY(yaw * 0.65)
      head.rotateX(pitch)
      neck?.rotateY(yaw * 0.35)
    }
  })

  return (
    <group ref={outer}>
      <group
        onClick={onClick}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        {/* slightly larger than life so the guide reads clearly in the miniature */}
        <primitive object={model} scale={1.45} />
      </group>
      <primitive object={popCoin} />
      {popLabel > 0 && !FILM && (
        <Html position={[0, 3.6, 0]} center zIndexRange={[20, 0]} pointerEvents="none">
          <div className="coin-pop" key={popLabel}>
            +1 COIN
          </div>
        </Html>
      )}
      {/* soft contact shadow so she sits on the floor even without shadow maps */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {bubble && !FILM && (
        <Html position={[0, 3.05, 0]} zIndexRange={[20, 0]} pointerEvents="none">
          {/* anchored by its bottom edge so it always sits above her head, never over her face */}
          <div className="bubble-anchor">
            <div className="bubble" key={bubble}>
              {bubble}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

useGLTF.preload(URL)
