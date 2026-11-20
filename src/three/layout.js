import * as THREE from 'three'
import { zones } from '../data/zones'

// Rooms sit side by side along +X, like a miniature model on a table.
export const ROOM = 7 // room size in metres
export const HALF = ROOM / 2
export const COUNT = zones.length
export const WALL_H = 3.1
export const LANE_Z = 1.7 // the glowing path the avatar walks along
export const DOOR_X = -HALF - 1.7 // where the avatar starts, outside the lobby door

export const roomX = (i) => i * ROOM
export const spotX = (i) => roomX(i) - 1.4 // where the avatar stands in each room

// isometric-style camera direction (from the target towards the camera)
export const CAM_DIR = new THREE.Vector3(0.62, 0.8, 1).normalize()
export const REST_ROT = Math.atan2(CAM_DIR.x, CAM_DIR.z) // avatar faces the visitor

// how high the active room rises out of the model, and each room's current lift (animated)
export const LIFT = 0.32
export const lifts = new Float32Array(COUNT)
export const liftAt = (x) => {
  if (x < -HALF) return 0
  return lifts[Math.min(COUNT - 1, Math.max(0, Math.round(x / ROOM)))]
}

// shared, mutable: where the camera is looking (lights follow it)
export const rig = { target: new THREE.Vector3(), pointer: new THREE.Vector2(), avatar: new THREE.Vector3(), moveTo: null }
// ZJ Arcade: anchors on the main arcade machine (set by the machine itself) and the slot glow
export const arcadeRig = { slot: null, stand: null, screen: null, yaw: 0, flash: 0 }
