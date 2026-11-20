// The cinematic welcome: letterbox bars and a title card while the camera swoops from the wide
// shot of the whole studio down to the lobby and the avatar walks in. ~5 seconds, skippable.
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { profile } from '../data/content'

const LENGTH = 5200

export default function Intro() {
  const finish = useStore((s) => s.finishIntro)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const done = () => {
      setLeaving(true)
      setTimeout(finish, 650)
    }
    const timer = setTimeout(done, LENGTH)
    const skipKeys = (e) => {
      if (['Escape', 'Enter', ' ', 'ArrowDown', 'PageDown'].includes(e.key)) done()
    }
    window.addEventListener('wheel', done, { once: true, passive: true })
    window.addEventListener('touchmove', done, { once: true, passive: true })
    window.addEventListener('keydown', skipKeys)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('wheel', done)
      window.removeEventListener('touchmove', done)
      window.removeEventListener('keydown', skipKeys)
    }
  }, [finish])

  return (
    <div className={'intro' + (leaving ? ' leaving' : '')} role="dialog" aria-label="Welcome">
      <div className="bar top" />
      <div className="bar bottom" />
      <div className="intro-card">
        <p className="intro-kicker">Welcome to</p>
        <p className="intro-title">{profile.first}’s Studio</p>
        <p className="intro-sub">Game Developer · Unity · Unreal · VR/XR</p>
      </div>
      <button className="intro-skip" onClick={() => { setLeaving(true); setTimeout(finish, 300) }} autoFocus>
        Skip intro <span aria-hidden="true">›</span>
      </button>
    </div>
  )
}
