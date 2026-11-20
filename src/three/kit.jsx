// Tiny building kit for the miniature studio: boxes, cylinders and canvas-drawn signs.
// Geometries and materials are shared so hundreds of props stay cheap to render.
import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { themes } from '../themes'

export function usePalette() {
  const theme = useStore((s) => s.theme)
  return themes[theme].scene
}

const unitBox = new THREE.BoxGeometry(1, 1, 1)
const cylCache = new Map()
function cylGeo(top, seg) {
  const key = top + '|' + seg
  if (!cylCache.has(key)) cylCache.set(key, new THREE.CylinderGeometry(top, 1, 1, seg))
  return cylCache.get(key)
}
const sphere = new THREE.SphereGeometry(1, 20, 14)

const matCache = new Map()
export function material(color, emissive = 0, opts = {}) {
  const key = color + '|' + emissive + '|' + (opts.rough ?? 0.82) + '|' + (opts.metal ?? 0) + '|' + (opts.opacity ?? 1)
  if (!matCache.has(key)) {
    matCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        emissive: emissive ? color : '#000000',
        emissiveIntensity: emissive,
        roughness: opts.rough ?? 0.82,
        metalness: opts.metal ?? 0,
        transparent: (opts.opacity ?? 1) < 1,
        opacity: opts.opacity ?? 1,
      }),
    )
  }
  return matCache.get(key)
}

const resolve = (pal, c) => pal[c] ?? c

// p = [x, bottomY, z]; s = [w, h, d]. The box rests on bottomY.
export function Box({ p = [0, 0, 0], s = [1, 1, 1], c = 'wood', r, e = 0, rough, metal, shadow = true, opacity }) {
  const pal = usePalette()
  return (
    <mesh
      geometry={unitBox}
      material={material(resolve(pal, c), e, { rough, metal, opacity })}
      position={[p[0], p[1] + s[1] / 2, p[2]]}
      scale={s}
      rotation={r}
      castShadow={shadow}
      receiveShadow
    />
  )
}

// Cylinder resting on bottomY. rt = top radius as a fraction of the bottom radius.
export function Cyl({ p = [0, 0, 0], rad = 0.5, h = 1, rt = 1, seg = 24, c = 'wood', e = 0, rough, metal, shadow = true, r }) {
  const pal = usePalette()
  return (
    <mesh
      geometry={cylGeo(rt, seg)}
      material={material(resolve(pal, c), e, { rough, metal })}
      position={[p[0], p[1] + h / 2, p[2]]}
      scale={[rad, h, rad]}
      rotation={r}
      castShadow={shadow}
      receiveShadow
    />
  )
}

export function Ball({ p = [0, 0, 0], rad = 0.3, c = 'plant', e = 0, rough, metal, sy = 1 }) {
  const pal = usePalette()
  return (
    <mesh geometry={sphere} material={material(resolve(pal, c), e, { rough, metal })} position={p} scale={[rad, rad * sy, rad]} castShadow receiveShadow />
  )
}

export function Plant({ p = [0, 0, 0], size = 1 }) {
  return (
    <group position={p} scale={size}>
      <Cyl p={[0, 0, 0]} rad={0.24} rt={1.25} h={0.42} c="dark" seg={16} />
      <Ball p={[0, 0.72, 0]} rad={0.34} sy={1.15} />
      <Ball p={[0.16, 0.95, 0.06]} rad={0.24} />
      <Ball p={[-0.14, 1.0, -0.05]} rad={0.22} />
    </group>
  )
}

// ---- canvas-drawn signs and screens ----
const texCache = new Map()
function canvasTexture(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  texCache.set(key, t)
  return t
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/**
 * A flat panel with text. lines: [{ text, size (fraction of height), weight, color, font }]
 * Drawn on a canvas so it uses the site's own fonts and theme colours.
 */
export function Sign({ p, size = [2, 0.6], r, lines, bg = 'dark', fg = 'white', border, glow = 0, align = 'center', radius = 0.08, res = 512 }) {
  const pal = usePalette()
  const fontsReady = useStore((s) => s.fontsReady)
  const bgc = bg === 'none' ? null : resolve(pal, bg)
  const fgc = resolve(pal, fg)
  const bc = border ? resolve(pal, border) : null
  const key = JSON.stringify([size, lines, bgc, fgc, bc, align, radius, fontsReady])
  const tex = useMemo(() => {
    const w = res * 2
    const h = Math.round((w * size[1]) / size[0])
    return canvasTexture(key, w, h, (ctx) => {
      if (bgc) {
        ctx.fillStyle = bgc
        roundRect(ctx, 0, 0, w, h, radius * h)
        ctx.fill()
      }
      if (bc) {
        ctx.strokeStyle = bc
        ctx.lineWidth = h * 0.03
        roundRect(ctx, h * 0.03, h * 0.03, w - h * 0.06, h - h * 0.06, radius * h)
        ctx.stroke()
      }
      const total = lines.reduce((a, l) => a + l.size * 1.25, 0)
      let y = (h - total * h) / 2
      for (const l of lines) {
        const px = l.size * h
        y += px * 1.25
        ctx.font = `${l.weight ?? 700} ${px}px ${l.font ?? 'Sora, sans-serif'}`
        ctx.fillStyle = l.color ? resolve(pal, l.color) : fgc
        ctx.textAlign = align
        ctx.letterSpacing = (l.spacing ?? 0) + 'px'
        const x = align === 'center' ? w / 2 : align === 'left' ? h * 0.18 : w - h * 0.18
        ctx.fillText(l.text, x, y - px * 0.22)
      }
    })
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh position={p} rotation={r}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} transparent={!bgc} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={glow} roughness={0.9} toneMapped={!glow} />
    </mesh>
  )
}
