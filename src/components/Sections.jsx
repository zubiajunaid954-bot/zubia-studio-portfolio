import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { zones } from '../data/zones'
import {
  profile, stats, about, skillGroups, education, experience, achievements, certifications, memberships,
  categories, projects, promo,
} from '../data/content'
import { goTo } from './ZoneRail'
import ContactForm from './ContactForm'
import { IconArrow, IconDownload, IconPlay, IconMail, IconLinkedIn, IconGitHub, IconGamepad, IconPin } from './Icons'

function Zone({ id, children, className = '' }) {
  const z = zones.find((x) => x.id === id)
  return (
    <section id={id} className={'zone ' + className} aria-labelledby={id + '-title'}>
      <div className="panel">
        <p className="kicker">
          <span className="kicker-no">{z.no}</span>
          <span className="kicker-line" aria-hidden="true" />
          {z.label}
        </p>
        {children}
      </div>
    </section>
  )
}

function Home() {
  return (
    <Zone id="home" className="zone-home">
      <p className="avail">
        <span className="avail-dot" aria-hidden="true" />
        {profile.availability}
      </p>
      <h1 id="home-title">
        <span className="h1-small">Hi, I’m</span>
        {profile.name}
      </h1>
      <p className="role">
        {profile.role} <span className="role-sep">/</span> <span className="accent-text">{profile.roleLine}</span>
      </p>
      <p className="lead">{profile.hook}</p>
      <div className="cta">
        <button className="btn btn-primary" onClick={() => goTo('projects')}>
          View projects <IconArrow />
        </button>
        <a className="btn btn-ghost" href={profile.cv} download>
          <IconDownload /> Download CV
        </a>
        <button className="btn btn-ghost" onClick={() => goTo('contact')}>
          Contact me
        </button>
      </div>
      <dl className="stats">
        {stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      <button className="scroll-hint" onClick={() => goTo('about')}>
        <span className="mouse" aria-hidden="true" />
        Scroll to tour the studio
      </button>
    </Zone>
  )
}

function About() {
  return (
    <Zone id="about">
      <div className="about-head">
        <img className="about-photo" src={profile.photo} alt="Portrait of Zubia Junaid" width="96" height="96" loading="lazy" />
        <div>
          <h2 id="about-title">About me</h2>
          <p className="muted small">
            <IconPin /> {profile.location}
          </p>
        </div>
      </div>
      {about.paragraphs.map((p) => (
        <p key={p.slice(0, 20)}>{p}</p>
      ))}
      <dl className="facts">
        {about.facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="h3">What I focus on</h3>
      <ul className="focus-grid">
        {about.focus.map((f) => (
          <li key={f.title}>
            <strong>{f.title}</strong>
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
    </Zone>
  )
}

function Skills() {
  return (
    <Zone id="skills">
      <h2 id="skills-title">Skills & technologies</h2>
      <p className="muted">The engines, languages and tools I use to take a game from prototype to playable build.</p>
      <div className="skill-groups">
        {skillGroups.map((g) => (
          <div key={g.title} className="skill-group">
            <div className="skill-head">
              <h3>{g.title}</h3>
              <span className={'level level-' + g.level.toLowerCase()}>{g.level}</span>
            </div>
            <ul className="chips">
              {g.items.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Zone>
  )
}

function Career() {
  return (
    <Zone id="career">
      <h2 id="career-title">Education & experience</h2>
      <h3 className="h3">Experience</h3>
      <ol className="timeline">
        {experience.map((e) => (
          <li key={e.place + e.when}>
            <div className="tl-head">
              <strong>{e.title}</strong>
              <span className="tl-when">{e.when}</span>
            </div>
            <p className="tl-place">{e.place}</p>
            <ul className="tl-points">
              {e.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <h3 className="h3">Education</h3>
      <ol className="timeline">
        {education.map((e) => (
          <li key={e.title}>
            <div className="tl-head">
              <strong>{e.title}</strong>
              <span className="tl-when">{e.when}</span>
            </div>
            <p className="tl-place">{e.place}</p>
            <p className="small muted">{e.note}</p>
          </li>
        ))}
      </ol>
    </Zone>
  )
}

function Projects() {
  const openProject = useStore((s) => s.openProject)
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return projects.filter(
      (p) => (cat === 'all' || p.cat === cat) && (!needle || [p.title, p.kind, p.tagline, ...p.stack].join(' ').toLowerCase().includes(needle)),
    )
  }, [cat, q])
  const count = (id) => (id === 'all' ? projects.length : projects.filter((p) => p.cat === id).length)

  return (
    <Zone id="projects" className="zone-wide">
      <h2 id="projects-title">Projects</h2>
      <p className="muted">Games, VR and apps I have built. Open any project for the trailer, details and links.</p>
      <div className="proj-tools">
        <div className="filters" role="group" aria-label="Filter projects">
          {categories.map((c) => (
            <button key={c.id} className={cat === c.id ? 'on' : ''} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
              {c.label} <small>{count(c.id)}</small>
            </button>
          ))}
        </div>
        <label className="search">
          <span className="sr-only">Search projects</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: VR, C#, Unreal…" />
        </label>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {shown.length} projects shown
      </p>
      {shown.length ? (
        <ul className="proj-grid">
          {shown.map((p) => (
            <li key={p.id} className={'proj-card' + (p.featured ? ' featured' : '')}>
              <button className="proj-hit" onClick={() => openProject(p)} aria-label={`Open ${p.title}`}>
                <span className="proj-media">
                  {p.poster ? <img src={p.poster} alt="" loading="lazy" /> : <span className="proj-ph">{p.title}</span>}
                  {p.video && (
                    <span className="proj-play">
                      <IconPlay /> Trailer
                    </span>
                  )}
                </span>
                <span className="proj-body">
                  <span className="proj-cat">{categories.find((c) => c.id === p.cat).label}</span>
                  <span className="proj-title">{p.title}</span>
                  <span className="proj-kind">{p.kind}</span>
                  <span className="tags">
                    {p.stack.slice(0, 3).map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No projects match “{q}”. Try another word or choose All.</p>
      )}
    </Zone>
  )
}

function Achievements() {
  return (
    <Zone id="achievements">
      <h2 id="achievements-title">Achievements</h2>
      <ul className="trophies">
        {achievements.map((a) => (
          <li key={a.title}>
            <span className="trophy-badge" aria-hidden="true">
              {a.badge}
            </span>
            <div>
              <strong>{a.title}</strong>
              <span className="small muted">{a.place}</span>
              <p>{a.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <h3 className="h3">Certifications</h3>
      <ul className="cert-list">
        {certifications.map((c) => (
          <li key={c.title}>
            <strong>{c.title}</strong>
            <span>{c.org}</span>
          </li>
        ))}
      </ul>
      <h3 className="h3">Memberships</h3>
      <ul className="plain-list">
        {memberships.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </Zone>
  )
}

function Showreel() {
  return (
    <Zone id="showreel">
      <h2 id="showreel-title">Showreel</h2>
      {promo.src ? (
        <video className="reel" src={promo.src} poster={promo.poster || undefined} controls playsInline preload="none" />
      ) : (
        <div className="reel reel-soon">
          <span className="reel-play" aria-hidden="true">
            <IconPlay />
          </span>
          <strong>My promo video premieres here soon</strong>
          <span className="small muted">A 30–60 second introduction to me and my work. Until then, every project has its own trailer.</span>
          <button className="btn btn-ghost btn-sm" onClick={() => goTo('projects')}>
            Watch project trailers <IconArrow />
          </button>
        </div>
      )}
    </Zone>
  )
}

function Contact() {
  return (
    <Zone id="contact" className="zone-contact">
      <h2 id="contact-title">Let’s work together</h2>
      <p className="muted">I’m open to game developer roles and internships. Send a message, or reach me directly.</p>
      <ul className="contact-links">
        <li>
          <a href={'mailto:' + profile.email}>
            <IconMail /> {profile.email}
          </a>
        </li>
        <li>
          <a href={profile.links.linkedin} target="_blank" rel="noreferrer">
            <IconLinkedIn /> LinkedIn
          </a>
        </li>
        <li>
          <a href={profile.links.github} target="_blank" rel="noreferrer">
            <IconGitHub /> GitHub
          </a>
        </li>
        <li>
          <a href={profile.links.itch} target="_blank" rel="noreferrer">
            <IconGamepad /> itch.io
          </a>
        </li>
      </ul>
      <ContactForm />
      <footer className="foot small muted">
        © {new Date().getFullYear()} {profile.name} · Built with React, Three.js and Blender ·{' '}
        <a href={profile.cv} download>
          CV (PDF)
        </a>
      </footer>
    </Zone>
  )
}

export default function Sections() {
  return (
    <>
      <Home />
      <About />
      <Skills />
      <Career />
      <Projects />
      <Achievements />
      <Showreel />
      <Contact />
    </>
  )
}
