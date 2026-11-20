import { create } from 'zustand'
import { themes } from './themes'
import { FILM_ZONE } from './film'

const read = (store, k) => {
  try {
    return store.getItem(k)
  } catch {
    return null
  }
}
const write = (store, k, v) => {
  try {
    store.setItem(k, v)
  } catch {
    /* storage blocked: fine, the choice just isn't remembered */
  }
}

// Decide whether this device should start with the simple 2D view.
function detectDevice() {
  try {
    const c = document.createElement('canvas')
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return 'nogl'
  } catch {
    return 'nogl'
  }
  const mem = navigator.deviceMemory
  const cores = navigator.hardwareConcurrency
  if ((mem && mem <= 2) || (cores && cores <= 2)) return 'weak'
  return 'ok'
}

export const reducedMotion =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const device = detectDevice()
const savedTheme = read(localStorage, 'zj-theme')
const savedLite = read(localStorage, 'zj-lite')

export const useStore = create((set) => ({
  zone: FILM_ZONE || 'home',
  // every room visited for the first time earns a bonus arcade coin (the lobby is free)
  setZone: (zone) =>
    set((st) => {
      if (st.zone === zone) return {}
      if (!st.introDone || st.visited.includes(zone) || FILM_ZONE) return { zone }
      return { zone, visited: [...st.visited, zone], coins: st.coins + 1, coinPop: st.coinPop + 1 }
    }),

  // ZJ Arcade: coins, and the insert-coin -> boot -> menu -> game flow
  // arcade: null | 'walk' | 'insert' | 'boot' | 'drop' (2D coin drop) | 'menu' | 'fit' | 'quiz' | 'crunch'
  coins: 1,
  visited: ['home'],
  coinPop: 0,
  arcade: null,
  arcadeFrom: 'home',
  openArcade: () =>
    set((st) => {
      if (st.arcade || st.game !== 'off') return {}
      // without the 3D studio (or with reduced motion) the coin drops in 2D on the arcade screen
      const flat = st.lite || reducedMotion
      return { arcade: flat ? 'drop' : 'walk', arcadeFrom: st.zone, zone: flat ? st.zone : 'projects', project: null, chatOpen: false }
    }),
  setArcade: (arcade) => set({ arcade }),
  spendCoin: () => set((st) => ({ coins: Math.max(0, st.coins - 1) })),
  closeArcade: () => set((st) => ({ arcade: null, zone: st.arcadeFrom })),
  // Free Roam from the arcade menu: the coin is already in, so straight into play
  arcadeFreeRoam: () => set((st) => ({ arcade: null, game: 'on', tourZone: st.arcadeFrom, talkSpot: null, nearSpot: null })),

  theme: themes[savedTheme] ? savedTheme : 'amber',
  setTheme: (theme) => {
    write(localStorage, 'zj-theme', theme)
    set({ theme })
  },

  noWebGL: device === 'nogl',
  lite: device === 'nogl' ? true : savedLite !== null ? savedLite === '1' : device === 'weak',
  setLite: (lite) => {
    write(localStorage, 'zj-lite', lite ? '1' : '0')
    set({ lite })
  },

  // the cinematic welcome plays once per visit
  introDone: reducedMotion || read(sessionStorage, 'zj-intro') === '1',
  finishIntro: () => {
    write(sessionStorage, 'zj-intro', '1')
    set({ introDone: true })
  },

  lowQuality: false,
  setLowQuality: (lowQuality) => set({ lowQuality }),

  fontsReady: false,
  setFontsReady: () => set({ fontsReady: true }),

  // Free Roam Mode (the optional game)
  game: 'off', // 'off' | 'starting' | 'on'
  tourZone: 'home',
  discovered: [],
  nearSpot: null,
  talkSpot: null,
  gameDone: false,
  startGame: () =>
    set((st) => (st.game === 'off' ? { game: 'starting', tourZone: st.zone, talkSpot: null, nearSpot: null } : {})),
  beginPlay: () => set({ game: 'on' }),
  exitGame: () => set((st) => ({ game: 'off', zone: st.tourZone, talkSpot: null, nearSpot: null })),
  setNearSpot: (nearSpot) => set({ nearSpot }),
  talkTo: (id) =>
    set((st) => ({ talkSpot: id, discovered: id && !st.discovered.includes(id) ? [...st.discovered, id] : st.discovered })),
  closeTalk: () => set({ talkSpot: null }),
  markGameDone: () => set({ gameDone: true }),

  // the contact form sent a message: the avatar celebrates
  contactSent: 0,
  markContactSent: () => set((st) => ({ contactSent: st.contactSent + 1 })),

  chatOpen: false,
  setChatOpen: (chatOpen) => set({ chatOpen }),

  project: null,
  openProject: (project) => set({ project }),
  closeProject: () => set({ project: null }),
}))
