// FIT CHECK client: the requirement cards and the calls to /api/fit (results cached for the visit).
export const FIT_CARDS = [
  { id: 'unity', label: 'Unity expertise', icon: '🎮' },
  { id: 'vr', label: 'VR / XR development', icon: '🥽' },
  { id: 'ai', label: 'Enemy AI & gameplay systems', icon: '🤖' },
  { id: 'unreal', label: 'Unreal Engine', icon: '🏛️' },
  { id: 'multiplayer', label: 'Multiplayer & backend', icon: '🌐' },
  { id: 'art', label: '3D modelling & animation', icon: '🧊' },
  { id: 'team', label: 'Teamwork', icon: '🤝' },
  { id: 'consistency', label: 'Consistency', icon: '📈' },
  { id: 'learner', label: 'Fast learner', icon: '⚡' },
  { id: 'deadlines', label: 'Ships on deadlines', icon: '🚀' },
]

const KEY = 'zj-fit-v2'
const readCache = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

export class OfflineError extends Error {}

async function post(body, timeout = 25000) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new OfflineError('offline')
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeout)
  let r
  try {
    r = await fetch('/api/fit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal })
  } catch (err) {
    if (navigator.onLine === false) throw new OfflineError('offline')
    throw new Error(err.name === 'AbortError' ? 'The scorer took too long. Please try again.' : 'Could not reach the scorer. Please try again.')
  } finally {
    clearTimeout(t)
  }
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data.results
}

let presetPromise = null
/** Scores for all preset cards, as { id: result }. Fetched once per visit. */
export function loadPresets() {
  const cached = readCache()
  if (cached) return Promise.resolve(cached)
  presetPromise =
    presetPromise ||
    post({ preset: true })
      .then((list) => {
        const map = Object.fromEntries(list.map((r) => [r.id, r]))
        try {
          sessionStorage.setItem(KEY, JSON.stringify(map))
        } catch {
          /* storage blocked */
        }
        return map
      })
      .catch((err) => {
        presetPromise = null
        throw err
      })
  return presetPromise
}

/** Score one requirement the visitor typed. */
export const checkCustom = (text) => post({ custom: text }).then((list) => list[0])
