import { useEffect, useState } from 'react'
import { getHistory } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { DemoTag } from './Results'

const MODE_LABEL = { character: 'Letter', word: 'Word', essay: 'Essay' }

export default function History({ onSignIn }) {
  const { enabled, user, token } = useAuth()
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (enabled && !user) { setRows(null); return }
    let live = true
    getHistory(token).then(r => live && setRows(r)).catch(e => live && setErr(e.message))
    return () => { live = false }
  }, [enabled, user, token])

  return (
    <section id="history" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <p className="text-xs uppercase tracking-widest opacity-70">03 · History</p>
      <h2 className="mt-2 font-display text-3xl uppercase leading-none md:text-5xl">Your past scans</h2>

      {enabled && !user ? (
        <div className="mt-8 rounded-2xl border border-ink/80 bg-white/60 p-8 text-center">
          <p className="text-sm">Sign in to save and revisit your essays and scans.</p>
          <button onClick={onSignIn} className="mt-4 rounded-full bg-ink px-6 py-2.5 text-xs uppercase tracking-widest text-[#f3f0ff]">Sign in</button>
        </div>
      ) : (
        <div className="mt-8">
          {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
          {rows?.demo && <DemoTag />}
          {!rows && !err && <p className="text-sm opacity-70">Loading…</p>}
          {rows && rows.length === 0 && <p className="text-sm opacity-70">Nothing here yet. Upload your first image above.</p>}
          {rows && rows.length > 0 && (
            <ul className="divide-y divide-ink/20 overflow-hidden rounded-2xl border border-ink/80 bg-white/60">
              {rows.map(r => (
                <li key={r.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                  <span className="w-16 rounded-full bg-ink px-2 py-0.5 text-center text-[10px] uppercase tracking-widest text-[#f3f0ff]">{MODE_LABEL[r.mode] || r.mode}</span>
                  <span className="flex-1 truncate">{r.snippet}</span>
                  <span className="hidden text-xs opacity-60 sm:block">{new Date(r.created_at).toLocaleDateString()}</span>
                  <span className="w-12 text-right text-xs">{Math.round(r.confidence * 100)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
