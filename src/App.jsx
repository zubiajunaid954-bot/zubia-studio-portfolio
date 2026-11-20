import { lazy, Suspense, useEffect } from 'react'
import { useStore } from './store'
import { themes } from './themes'
import { zones } from './data/zones'
import Header from './components/Header'
import Intro from './components/Intro'
import ZoneRail from './components/ZoneRail'
import Sections from './components/Sections'
import ProjectModal from './components/ProjectModal'
import { FILM } from './film'
import ChatPanel from './components/ChatPanel'
import GameUI from './components/GameUI'
import Arcade from './components/Arcade'

const Studio = lazy(() => import('./three/Studio.jsx'))

const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())

function useTheme() {
  const theme = useStore((s) => s.theme)
  useEffect(() => {
    const t = themes[theme]
    const root = document.documentElement
    for (const [k, v] of Object.entries(t.ui)) root.style.setProperty('--' + kebab(k), v)
    root.dataset.mode = t.mode
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.ui.bg)
  }, [theme])
}

// The section crossing the middle of the screen is the active zone.
function useActiveZone() {
  const setZone = useStore((s) => s.setZone)
  useEffect(() => {
    if (FILM) return // film mode drives the camera directly
    const io = new IntersectionObserver(
      (entries) => {
        // the arcade and Free Roam drive the camera themselves
        const s = useStore.getState()
        if (s.arcade || s.game !== 'off') return
        for (const e of entries) if (e.isIntersecting) setZone(e.target.id)
      },
      { rootMargin: '-48% 0px -48% 0px' },
    )
    zones.forEach((z) => {
      const el = document.getElementById(z.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [setZone])
}

export default function App() {
  const lite = useStore((s) => s.lite)
  const introDone = useStore((s) => s.introDone)
  useTheme()
  useActiveZone()

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="backdrop" aria-hidden="true" />
      {!lite && (
        <div className="stage" aria-hidden="true">
          <Suspense fallback={<div className="loader-chip">Building the studio…</div>}>
            <Studio />
          </Suspense>
        </div>
      )}
      <Header />
      <main id="main" className={(lite ? 'lite' : 'tour') + (!lite && !introDone ? ' in-intro' : '')}>
        <Sections />
      </main>
      {!lite && <ZoneRail />}
      {!lite && !introDone && <Intro />}
      <ProjectModal />
      {!FILM && <ChatPanel />}
      {!lite && !FILM && <GameUI />}
      {!FILM && <Arcade />}
    </>
  )
}
