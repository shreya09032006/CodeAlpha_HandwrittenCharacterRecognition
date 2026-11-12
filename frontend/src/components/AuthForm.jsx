import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Pill } from './ui'

const field = 'mt-2 w-full rounded-full border border-ink/10 bg-white/70 px-5 py-3.5 text-base outline-none transition duration-500 ease-soft placeholder:opacity-40 focus:border-ink/40 focus:bg-white md:py-3 md:text-sm'
const label = 'block text-[11px] uppercase tracking-[.16em]'

// Email + password only. `mode` / `onMode` are optional so a parent can show a matching heading.
export default function AuthForm({ onDone, mode: modeProp, onMode }) {
  const { enabled, signIn, signUp } = useAuth()
  const [inner, setInner] = useState('in')
  const mode = modeProp ?? inner
  const setMode = onMode ?? setInner
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState({ text: '', ok: false })
  const [busy, setBusy] = useState(false)

  if (!enabled) {
    return (
      <p className="rounded-2xl bg-white/70 p-4 text-sm leading-relaxed">
        Sign-in is not set up yet. Add <code className="rounded bg-ink/10 px-1">VITE_SUPABASE_URL</code> and{' '}
        <code className="rounded bg-ink/10 px-1">VITE_SUPABASE_ANON_KEY</code> to your <code className="rounded bg-ink/10 px-1">.env</code> file, then restart the dev server.
      </p>
    )
  }

  const submit = async e => {
    e.preventDefault()
    setBusy(true); setMsg({ text: '', ok: false })
    const { error } = await (mode === 'in' ? signIn : signUp)(email, password)
    setBusy(false)
    if (error) return setMsg({ text: error.message, ok: false })
    if (mode === 'up') return setMsg({ text: 'Account created. Check your email to confirm it, then sign in.', ok: true })
    onDone?.()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className={label}>
        Email
        <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={field} />
      </label>
      <label className={label}>
        <span className="flex items-center justify-between">
          Password
          <button type="button" onClick={() => setShow(s => !s)} className="normal-case tracking-normal underline opacity-60">{show ? 'Hide' : 'Show'}</button>
        </span>
        <input type={show ? 'text' : 'password'} required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className={field} />
      </label>
      {msg.text && <p role="alert" className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${msg.ok ? 'bg-jelly/40' : 'bg-red-100 text-red-800'}`}>{msg.text}</p>}
      <div className="space-y-4">
        <Pill className="w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</Pill>
        <button type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg({ text: '', ok: false }) }} className="block w-full text-center text-xs underline opacity-70">
          {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </form>
  )
}
