import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { categories } from '../data/content'

export default function ProjectModal() {
  const p = useStore((s) => s.project)
  const close = useStore((s) => s.closeProject)
  const closeBtn = useRef(null)
  const lastFocus = useRef(null)

  useEffect(() => {
    if (!p) return
    lastFocus.current = document.activeElement
    closeBtn.current?.focus()
    const key = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab') {
        // keep focus inside the dialog
        const items = [...document.querySelectorAll('.modal button, .modal a, .modal video')]
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', key)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', key)
      document.body.classList.remove('modal-open')
      lastFocus.current?.focus?.()
    }
  }, [p, close])

  if (!p) return null
  const specs = Object.entries(p.specs || {})
  return (
    <div className="modal-wrap" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close icon-btn" ref={closeBtn} onClick={close}>
          <span aria-hidden="true">✕</span>
          <span className="sr-only">Close project</span>
        </button>
        <div className="modal-media">
          {p.video ? (
            <video src={p.video} poster={p.poster} controls playsInline preload="metadata" />
          ) : p.poster ? (
            <img src={p.poster} alt="" />
          ) : (
            <div className="proj-ph big">{p.title}</div>
          )}
        </div>
        <div className="modal-body">
          <p className="proj-cat">{categories.find((c) => c.id === p.cat).label}</p>
          <h2 id="modal-title">{p.title}</h2>
          <p className="muted">
            {p.kind} · {p.tagline}
          </p>
          <p>{p.summary}</p>
          <h3 className="h3">Highlights</h3>
          <ul className="tl-points">
            {p.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          {specs.length > 0 && (
            <dl className="specs">
              {specs.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="tags">
            {p.stack.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          {p.links.length > 0 && (
            <p className="modal-links">
              {p.links.map((l) => (
                <a key={l.href} className="btn btn-ghost btn-sm" href={l.href} target="_blank" rel="noreferrer">
                  {l.label} ↗
                </a>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
