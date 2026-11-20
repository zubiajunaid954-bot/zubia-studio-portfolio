// Free Roam Mode inside the 3D scene: glowing rings on the objects you can talk to, a floating
// prompt over the nearest one, and an invisible floor that turns clicks/taps into "walk here".
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useStore, reducedMotion } from '../store'
import { SPOTS } from '../game/world'
import { usePalette, material } from './kit'
import { ROOM, COUNT, roomX, liftAt, rig } from './layout'

function Spot({ spot, near, found }) {
  const ring = useRef()
  const pal = usePalette()
  const talkTo = useStore((s) => s.talkTo)
  useFrame(({ clock }) => {
    if (!ring.current) return
    const t = clock.elapsedTime
    ring.current.position.y = 0.075 + liftAt(spot.x)
    const pulse = reducedMotion ? 1 : 1 + Math.sin(t * 3 + spot.x) * 0.08
    ring.current.scale.setScalar((near ? 1.25 : 1) * pulse)
  })
  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} material={material(found ? pal.accent2 : pal.accent, near ? 2.2 : 1.2, { opacity: near ? 0.95 : 0.7 })}>
        <ringGeometry args={[0.36, 0.46, 40]} />
      </mesh>
      <Html position={[0, 1.9 + liftAt(spot.x), 0]} center zIndexRange={[30, 0]}>
        <button
          className={'spot-tag' + (near ? ' near' : '') + (found ? ' found' : '')}
          onClick={(e) => {
            e.stopPropagation()
            talkTo(spot.id)
          }}
          aria-label={`Talk about ${spot.label}`}
        >
          {near ? (
            <>
              <kbd>E</kbd> Talk · {spot.label}
            </>
          ) : (
            <span aria-hidden="true">{found ? '✓' : '✦'}</span>
          )}
        </button>
      </Html>
    </group>
  )
}

export default function GameLayer() {
  const game = useStore((s) => s.game)
  const nearSpot = useStore((s) => s.nearSpot)
  const discovered = useStore((s) => s.discovered)
  if (game !== 'on') return null
  const width = roomX(COUNT - 1) + ROOM
  return (
    <group>
      {/* invisible floor: click or tap anywhere to walk there */}
      <mesh
        position={[width / 2 - ROOM / 2, 0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => {
          e.stopPropagation()
          rig.moveTo = { x: e.point.x, z: e.point.z }
        }}
      >
        <planeGeometry args={[width, ROOM]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {SPOTS.map((s) => (
        <Spot key={s.id} spot={s} near={nearSpot === s.id} found={discovered.includes(s.id)} />
      ))}
    </group>
  )
}
