// Contact form (Module 5). The browser checks give instant hints; the real checks happen again on the
// server (/api/contact), which also handles spam protection and sends the email through Resend.
import { useEffect, useRef, useState } from 'react'
import { profile } from '../data/content'
import { useStore } from '../store'
import { play } from '../game/sound'

const RULES = {
  name: (v) => (v.trim().length < 2 ? 'Please enter your name.' : v.length > 80 ? 'Please keep your name under 80 characters.' : ''),
  email: (v) => (/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'),
  subject: (v) => (v.trim().length < 3 ? 'Please add a short subject (3+ characters).' : v.length > 120 ? 'Please keep the subject under 120 characters.' : ''),
  message: (v) => (v.trim().length < 10 ? 'Please write at least 10 characters.' : v.length > 3000 ? 'Please keep the message under 3000 characters.' : ''),
}
const EMPTY = { name: '', email: '', subject: '', message: '' }
const MAX = { name: 80, email: 120, subject: 120, message: 3000 }

export default function ContactForm() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState(null) // { type: 'error' | 'info', text }
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(null) // { name, email }
  const [trap, setTrap] = useState('') // honeypot: people never see this field, bots fill it in
  const shownAt = useRef(Date.now())
  const successRef = useRef(null)
  const contactSent = useStore((s) => s.contactSent)

  useEffect(() => {
    if (sent) successRef.current?.focus()
  }, [sent])

  const set = (k) => (e) => {
    const v = e.target.value
    setValues((s) => ({ ...s, [k]: v }))
    if (touched[k]) setErrors((s) => ({ ...s, [k]: RULES[k](v) }))
  }
  const blur = (k) => () => {
    setTouched((s) => ({ ...s, [k]: true }))
    setErrors((s) => ({ ...s, [k]: RULES[k](values[k]) }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (sending) return
    const errs = Object.fromEntries(Object.keys(RULES).map((k) => [k, RULES[k](values[k])]))
    setErrors(errs)
    setTouched({ name: true, email: true, subject: true, message: true })
    const first = Object.keys(errs).find((k) => errs[k])
    if (first) {
      setStatus({ type: 'error', text: 'Please fix the highlighted fields.' })
      document.getElementById('cf-' + first)?.focus()
      return
    }
    if (navigator.onLine === false) {
      setStatus({ type: 'error', text: `You seem to be offline. Please try again when you’re connected, or email me at ${profile.email}.` })
      return
    }
    setSending(true)
    setStatus({ type: 'info', text: 'Sending your message…' })
    try {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), 20000)
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, website: trap, elapsed: Date.now() - shownAt.current }),
        signal: ac.signal,
      }).finally(() => clearTimeout(timer))
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        if (data.errors) {
          setErrors(data.errors)
          const f = Object.keys(data.errors)[0]
          if (f) document.getElementById('cf-' + f)?.focus()
        }
        // 409 = this exact message already arrived: a friendly note, not an error
        setStatus({ type: r.status === 409 ? 'info' : 'error', text: data.error || 'Something went wrong. Please try again.' })
        return
      }
      setSent({ name: values.name.trim().split(/\s+/)[0], email: values.email.trim() })
      setValues(EMPTY)
      setTouched({})
      setErrors({})
      setStatus(null)
      useStore.getState().markContactSent()
      play('cleared')
    } catch (err) {
      setStatus({
        type: 'error',
        text: err.name === 'AbortError' ? `That took too long. Please try again, or email me at ${profile.email}.` : `Couldn’t reach the server. Please check your connection, or email me at ${profile.email}.`,
      })
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="contact-sent" ref={successRef} tabIndex={-1} role="status" aria-live="polite" key={contactSent}>
        <div className="contact-sent-ico" aria-hidden="true">
          <svg viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="24" />
            <path d="M15 27 l8 8 l15 -17" />
          </svg>
        </div>
        <div>
          <h3>Message sent! Thank you, {sent.name}.</h3>
          <p>
            It’s in my inbox now. I’ll reply to <b>{sent.email}</b>, usually within 1–2 days.
          </p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSent(null)
              shownAt.current = Date.now()
            }}
          >
            Send another message
          </button>
        </div>
      </div>
    )
  }

  const field = (k, label, props = {}) => (
    <div className={'field' + (errors[k] ? ' invalid' : '')}>
      <label htmlFor={'cf-' + k}>
        {label}
        {k === 'message' && values.message.length > 2400 && (
          <span className="field-count">
            {values.message.length}/{MAX.message}
          </span>
        )}
      </label>
      {props.multiline ? (
        <textarea id={'cf-' + k} rows={5} value={values[k]} onChange={set(k)} onBlur={blur(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? 'cf-' + k + '-err' : undefined} maxLength={MAX[k]} disabled={sending} />
      ) : (
        <input id={'cf-' + k} type={props.type || 'text'} autoComplete={props.auto} value={values[k]} onChange={set(k)} onBlur={blur(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? 'cf-' + k + '-err' : undefined} maxLength={MAX[k]} disabled={sending} />
      )}
      {errors[k] && (
        <span className="field-err" id={'cf-' + k + '-err'}>
          {errors[k]}
        </span>
      )}
    </div>
  )

  return (
    <form className="contact-form" onSubmit={submit} noValidate aria-busy={sending}>
      <div className="row2">
        {field('name', 'Name', { auto: 'name' })}
        {field('email', 'Email', { type: 'email', auto: 'email' })}
      </div>
      {field('subject', 'Subject')}
      {field('message', 'Message', { multiline: true })}
      {/* spam trap: hidden from people and screen readers */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="cf-website">Website</label>
        <input id="cf-website" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
      </div>
      <div className="form-foot">
        <button className="btn btn-primary" type="submit" disabled={sending}>
          {sending ? (
            <>
              <span className="btn-spin" aria-hidden="true" /> Sending…
            </>
          ) : (
            'Send message'
          )}
        </button>
        <p className={'form-status ' + (status?.type || '')} role="status" aria-live="polite">
          {status?.text}
        </p>
      </div>
      <p className="form-note small muted">Your details are only used to reply to you. Protected against spam.</p>
    </form>
  )
}
