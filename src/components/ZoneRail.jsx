// A minimap of the tour on the right edge: where you are, and a one-click jump to any area.
import { useStore, reducedMotion } from '../store'
import { zones } from '../data/zones'

export function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
}

export default function ZoneRail() {
  const zone = useStore((s) => s.zone)
  const idx = zones.findIndex((z) => z.id === zone)
  return (
    <nav className="rail" aria-label="Studio map">
      <div className="rail-track" aria-hidden="true">
        <div className="rail-fill" style={{ transform: `scaleY(${idx / (zones.length - 1)})` }} />
      </div>
      <ol>
        {zones.map((z) => (
          <li key={z.id}>
            <button className={z.id === zone ? 'on' : ''} aria-current={z.id === zone ? 'location' : undefined} onClick={() => goTo(z.id)}>
              <span className="rail-label">{z.label}</span>
              <span className="rail-dot" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
