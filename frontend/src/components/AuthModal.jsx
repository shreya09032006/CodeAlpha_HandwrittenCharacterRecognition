import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthModal({ open, onClose }) {
  const { enabled, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const submit = async e => {
    e.preventDefault(); setBusy(true); setMsg('')
    const { error } = await (mode === 'in' ? signIn : signUp)(email, password)
    setBusy(false)
    if (error) return setMsg(error.message)
    if (mode === 'up') return setMsg('Check your email to confirm your account.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-label="Account" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-lilac p-6" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-3xl uppercase">{mode === 'in' ? 'Sign in' : 'Create account'}</h2>
        {!enabled ? (
          <p className="mt-4 text-sm">Sign-in is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code>.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <label className="block text-xs uppercase tracking-widest">Email
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/60 bg-white/80 px-3 py-2 text-sm normal-case" />
            </label>
            <label className="block text-xs uppercase tracking-widest">Password
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/60 bg-white/80 px-3 py-2 text-sm normal-case" />
            </label>
            {msg && <p role="alert" className="text-xs">{msg}</p>}
            <button disabled={busy} className="w-full rounded-full bg-ink py-2.5 text-xs uppercase tracking-widest text-[#f3f0ff] disabled:opacity-50">
              {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Sign up'}
            </button>
            <button type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }} className="w-full text-xs underline">
              {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
            </button>
          </form>
        )}
        <button onClick={onClose} className="mt-4 w-full text-xs opacity-70">Close</button>
      </div>
    </div>
  )
}
