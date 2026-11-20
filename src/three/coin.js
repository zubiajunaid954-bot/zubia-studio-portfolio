// The ZJ Arcade coin: a small gold coin with "ZJ" stamped on both faces.
// Its axis runs along local X, so coin.rotation.y = yaw stands it upright facing sideways,
// ready to slide edge-first into a vertical slot.
import * as THREE from 'three'

const R = 0.075
const geo = new THREE.CylinderGeometry(R, R, 0.016, 40, 1)
geo.rotateZ(Math.PI / 2)

let faceTex = null
function face() {
  if (faceTex) return faceTex
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(100, 90, 10, 128, 128, 128)
  grd.addColorStop(0, '#fff3c4')
  grd.addColorStop(0.55, '#f0c04f')
  grd.addColorStop(1, '#a8701c')
  g.fillStyle = grd
  g.fillRect(0, 0, 256, 256)
  g.lineWidth = 10
  g.strokeStyle = '#b8801f'
  g.beginPath()
  g.arc(128, 128, 110, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = 3
  g.strokeStyle = '#ffe9a3'
  g.beginPath()
  g.arc(128, 128, 98, 0, Math.PI * 2)
  g.stroke()
  g.font = '800 104px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = '#9a6414'
  g.fillText('ZJ', 131, 135)
  g.fillStyle = '#fff1b8'
  g.fillText('ZJ', 127, 130)
  faceTex = new THREE.CanvasTexture(c)
  faceTex.colorSpace = THREE.SRGBColorSpace
  return faceTex
}

export function makeCoin(env) {
  const metal = { metalness: 0.9, roughness: 0.22, envMap: env || null, envMapIntensity: 2.2 }
  const side = new THREE.MeshStandardMaterial({ color: '#e7b443', emissive: '#7a5210', emissiveIntensity: 0.5, ...metal })
  const cap = new THREE.MeshStandardMaterial({ color: '#ffffff', map: face(), emissive: '#ffffff', emissiveMap: face(), emissiveIntensity: 0.35, ...metal })
  const coin = new THREE.Mesh(geo, [side, cap, cap])
  coin.rotation.order = 'YXZ'
  coin.castShadow = true
  coin.visible = false
  return coin
}
