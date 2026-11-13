import { useEffect, useMemo, useState } from 'react'
import { PageHeader, Pill } from '../components/ui'
import { DemoTag } from '../components/Results'
import SignInGate from '../components/SignInGate'
import { getHistory, downloadReport, clearHistory } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const FILTERS = [['all', 'All'], ['character', 'Letters'], ['word', 'Words'], ['essay', 'Essays']]
const LABEL = { character: 'Letter', word: 'Word', essay: 'Essay' }
const fmt = d => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function Row({ r, open, onToggle, token, demo }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pdf = async () => {
    setBusy(true); setErr('')
    try { await downloadReport(r.id, token) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <li className="glass rounded-[28px] transition duration-700 ease-soft">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-4 px-5 py-4 text-left">
        <span className="w-16 shrink-0 rounded-full bg-ink px-2 py-1 text-center text-[10px] uppercase tracking-[.14em] text-mist">{LABEL[r.mode] || r.mode}</span>
        <span className="min-w-0 flex-1 truncate text-sm">{r.snippet}</span>
        <span className="hidden text-xs opacity-60 sm:block">{fmt(r.created_at)}</span>
        <span className="w-12 text-right text-xs">{Math.round(r.confidence * 100)}%</span>
        <span className={`grid h-7 w-7 place-items-center rounded-full bg-jelly text-xs transition duration-500 ease-soft ${open ? 'rotate-180' : ''}`}>↓</span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-700 ease-soft ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="space-y-4 px-5 pb-5">
            {r.image_url && <img src={r.image_url} alt="Original upload" className="max-h-56 rounded-2xl bg-white/80 object-contain p-2" />}
            <p className="whitespace-pre-wrap text-sm leading-relaxed opacity-80">{r.result_text || r.snippet}</p>
            <p className="text-xs opacity-50">{fmt(r.created_at)} · {Math.round(r.confidence * 100)}% confidence</p>
            {r.mode === 'essay' && (
              <div>
                <Pill onClick={pdf} disabled={busy || demo} title={demo ? 'Available once the backend is connected' : ''}>{busy ? 'Preparing…' : 'PDF report'}</Pill>
                {err && <p role="alert" className="mt-2 text-xs text-red-700">{err}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

export default function HistoryPage() {
  const { enabled, user, token } = useAuth()
  const gated = enabled && !user
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const [clearing, setClearing] = useState(false)

  const clearAll = async () => {
    if (!window.confirm('Delete all your saved scans? This clears both History and Insights and cannot be undone.')) return
    setClearing(true)
    try { await clearHistory(token); setRows([]); setOpenId(null) } catch (e) { setErr(e.message) } finally { setClearing(false) }
  }

  useEffect(() => {
    if (gated) return
    let live = true
    setRows(null); setErr('')
    getHistory(token).then(r => live && setRows(r)).catch(e => live && setErr(e.message))
    return () => { live = false }
  }, [gated, token])

  const shown = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    return rows.filter(r => (filter === 'all' || r.mode === filter) && (!needle || (r.snippet || '').toLowerCase().includes(needle)))
  }, [rows, filter, q])

  return (
    <div className="mx-auto max-w-6xl px-5">
      <PageHeader index="05 · History" title="History" sub="Every letter, word and essay you have scanned. Open a row to see the full result." />

      {gated ? (
        <SignInGate text="Sign in to save your scans and come back to them any time." />
      ) : err ? (
        <p role="alert" className="text-sm text-red-700">{err}</p>
      ) : !rows ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="glass h-16 animate-pulse rounded-[28px]" />)}</div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="glass inline-flex rounded-full p-1">
              {FILTERS.map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-[.14em] transition duration-500 ease-soft ${filter === key ? 'bg-ink text-mist' : 'hover:bg-white/70'}`}>{label}</button>
              ))}
            </div>
            <input
              value={q} onChange={e => setQ(e.target.value)} placeholder="Search your scans"
              aria-label="Search your scans"
              className="glass w-full max-w-xs rounded-full px-5 py-2.5 text-sm outline-none placeholder:opacity-40 focus:bg-white/80"
            />
            {rows.demo && <DemoTag />}
            {rows.length > 0 && !rows.demo && <button onClick={clearAll} disabled={clearing} className="ml-auto rounded-full border border-red-700/30 bg-white/60 px-5 py-2.5 text-[11px] uppercase tracking-[.14em] text-red-700 transition duration-500 ease-soft hover:bg-red-50 disabled:opacity-40">{clearing ? 'Clearing…' : 'Clear all'}</button>}
          </div>

          {shown.length === 0 ? (
            <div className="glass rounded-[40px] px-8 py-20 text-center">
              <p className="font-display text-3xl uppercase">{rows.length === 0 ? 'Nothing here yet' : 'No matches'}</p>
              <p className="mt-3 text-sm opacity-70">{rows.length === 0 ? 'Upload your first image and it will show up here.' : 'Try a different filter or search.'}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {shown.map(r => (
                <Row key={r.id} r={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} token={token} demo={rows.demo} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
