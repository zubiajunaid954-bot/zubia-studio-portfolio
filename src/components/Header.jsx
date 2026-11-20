import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { zones } from '../data/zones'
import { profile } from '../data/content'
import { themes, themeIds } from '../themes'
import { IconCube, IconFlat, IconPalette, IconDownload } from './Icons'
import { FILM } from '../film'

function ThemePicker() {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])
  return (
    <div className="theme-picker" ref={ref}>
      <button className="icon-btn" aria-haspopup="true" aria-expanded={open} aria-controls="theme-list" onClick={() => setOpen((o) => !o)} title="Change theme">
        <IconPalette />
        <span className="sr-only">Change colour theme (current: {themes[theme].name})</span>
      </button>
      {open && (
        <div className="theme-list" id="theme-list" role="group" aria-label="Colour themes">
          {themeIds.map((id) => (
            <button
              key={id}
              className={'theme-opt' + (id === theme ? ' on' : '')}
              aria-pressed={id === theme}
              onClick={() => {
                setTheme(id)
                setOpen(false)
              }}
            >
              <span className="swatches" aria-hidden="true">
                {themes[id].swatch.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              {themes[id].name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const zone = useStore((s) => s.zone)
  const lite = useStore((s) => s.lite)
  const noWebGL = useStore((s) => s.noWebGL)
  const setLite = useStore((s) => s.setLite)
  const openArcade = useStore((s) => s.openArcade)
  const navRef = useRef(null)

  // on small screens the section bar scrolls sideways: keep the current section's tab in view
  useEffect(() => {
    const nav = navRef.current
    const a = nav?.querySelector('a[aria-current]')
    if (!nav || !a || nav.scrollWidth <= nav.clientWidth) return
    const target = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2
    nav.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [zone])

  return (
    <header className="topbar">
      <a href="#home" className="brand" aria-label="Zubia Junaid, back to the lobby">
        <span className="brand-mark" aria-hidden="true">
          ZJ
        </span>
        <span className="brand-text">
          <strong>Zubia Junaid</strong>
          <small>Game Developer</small>
        </span>
      </a>

      <nav aria-label="Studio sections" className="nav" id="site-nav" ref={navRef}>
        <ul>
          {zones.map((z) => (
            <li key={z.id}>
              <a href={'#' + z.id} aria-current={zone === z.id ? 'location' : undefined}>
                <span className="nav-no" aria-hidden="true">
                  {z.no}
                </span>
                {z.nav}
              </a>
            </li>
          ))}
          <li className="nav-cv">
            <a href={profile.cv} download>
              Download CV
            </a>
          </li>
        </ul>
      </nav>

      <div className="tools">
        {!FILM && (
          <button className="arcade-btn" onClick={openArcade} title="ZJ Arcade: mini games">
            <span aria-hidden="true">🎮</span>
            <span className="arcade-btn-text">Arcade</span>
          </button>
        )}
        <ThemePicker />
        {!noWebGL && (
          <button className="icon-btn" aria-pressed={!lite} onClick={() => setLite(!lite)} title={lite ? 'Switch to the 3D studio' : 'Switch to the simple 2D view'}>
            {lite ? <IconCube /> : <IconFlat />}
            <span className="sr-only">{lite ? 'Switch to the 3D studio' : 'Switch to the simple 2D view'}</span>
          </button>
        )}
        <a className="btn btn-primary btn-sm cv-btn" href={profile.cv} download>
          <IconDownload /> CV
        </a>
      </div>
    </header>
  )
}
