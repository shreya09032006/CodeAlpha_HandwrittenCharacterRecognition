import { useState } from 'react'
import { downloadReport } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Pill } from './ui'

const pct = v => `${Math.round(v * 100)}%`

export const DemoTag = () => (
  <span className="rounded-full bg-jelly/70 px-3 py-1 text-[10px] normal-case tracking-normal">
    Sample output · backend not connected
  </span>
)

export function Panel({ label, tag, children, className = '' }) {
  return (
    <section className={`glass pop flex flex-col rounded-[32px] p-6 ${className}`}>
      <h3 className="mb-4 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[.18em]">
        <span>{label}</span>
        {tag}
      </h3>
      {children}
    </section>
  )
}

export function OriginalCard({ url, name, scanning }) {
  return (
    <Panel label="Original" tag={<span className="max-w-[55%] truncate normal-case tracking-normal opacity-50">{name}</span>}>
      <div className="relative grid flex-1 place-items-center overflow-hidden rounded-2xl bg-white/80 p-3">
        <img src={url} alt="Uploaded handwriting" className="max-h-[440px] w-full object-contain" />
        {scanning && (
          <span
            className="pointer-events-none absolute inset-x-0 h-14 bg-gradient-to-b from-transparent via-jelly/70 to-transparent"
            style={{ animation: 'sweep 1.4s ease-in-out infinite alternate' }}
          />
        )}
      </div>
    </Panel>
  )
}

export function Waiting({ title, loading, note }) {
  return (
    <Panel label="Prediction">
      <div className="grid flex-1 place-items-center py-10 text-center">
        <div>
          <p className="font-display text-3xl uppercase leading-none opacity-80">{loading ? 'Reading…' : title}</p>
          <p className="mt-3 text-xs opacity-60">{loading ? 'Hold on, this takes a moment.' : 'Your result appears here, next to the image.'}</p>
          {note && <p className="mx-auto mt-4 max-w-xs rounded-2xl bg-white/60 px-4 py-3 text-xs leading-relaxed">{note}</p>}
        </div>
      </div>
    </Panel>
  )
}

export function CharacterResult({ r }) {
  return (
    <Panel label="Prediction" tag={r.demo && <DemoTag />}>
      <div className="flex flex-1 flex-col items-center gap-5">
        <div className="relative grid h-64 w-full place-items-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_45%,#f4a3c4_0%,rgba(244,163,196,0)_68%)]">
          <span className="font-display text-[8rem] leading-none">{r.prediction}</span>
        </div>
        <p className="text-xs uppercase tracking-[.18em] opacity-70">{r.case} · {pct(r.confidence)} confident</p>
        <ul className="w-full space-y-2" aria-label="Top predictions">
          {r.top.map(t => (
            <li key={t.label} className="flex items-center gap-3 text-xs">
              <span className="w-5 text-center font-bold">{t.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-jelly to-jelly-deep" style={{ width: pct(t.prob), animation: 'bar 1.2s var(--ease-soft) both' }} />
              </span>
              <span className="w-10 text-right opacity-60">{pct(t.prob)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

export function WordResult({ r }) {
  const [text, setText] = useState(r.text)
  const [copied, setCopied] = useState(false)
  const lines = r.lines || r.words || []
  const copy = () => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  const save = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'inklens-text.txt' })
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <Panel label="Recognised text" tag={r.demo && <DemoTag />}>
      <div className="flex flex-1 flex-col gap-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={Math.min(10, Math.max(3, text.split('\n').length + 1))}
          aria-label="Recognised text, you can edit it"
          className="w-full resize-y rounded-2xl bg-white/70 p-4 text-base leading-relaxed outline-none focus:ring-2 focus:ring-ink/30"
        />
        <p className="text-xs uppercase tracking-[.18em] opacity-70">
          {pct(r.confidence)} overall confidence · edit anything that is wrong, then copy
        </p>
        {lines.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {lines.map((l, i) => (
              <span key={i} className="rounded-full bg-white/70 px-3 py-1.5 text-xs">
                Line {i + 1} <span className="opacity-50">· {pct(l.confidence)}</span>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Pill variant="ghost" onClick={copy}>{copied ? 'Copied' : 'Copy text'}</Pill>
          <Pill variant="ghost" onClick={save}>Download .txt</Pill>
        </div>
      </div>
    </Panel>
  )
}

// Wrap each changed phrase so the eye can find it.
function Marked({ text, phrases, cls }) {
  const list = [...new Set(phrases.filter(Boolean))].sort((a, b) => b.length - a.length)
  if (!list.length) return text
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${list.map(p => `\\b${esc(p)}\\b`).join('|')})`, 'g')
  return text.split(re).map((part, i) => (list.includes(part) ? <mark key={i} className={`rounded px-1 ${cls}`}>{part}</mark> : part))
}

const TYPE_STYLE = { grammar: 'bg-[#bcd9ff]', spelling: 'bg-jelly', style: 'bg-[#e2f0a0]', punctuation: 'bg-[#ffd9a0]' }

function CorrectedText({ r }) {
  const [text, setText] = useState(r.corrected_text)
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  const save = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'inklens-corrected-essay.txt' })
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <Panel label="Corrected essay" tag={r.demo && <DemoTag />}>
      <div className="flex flex-1 flex-col gap-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          aria-label="Corrected essay, you can edit it"
          className="min-h-[300px] w-full flex-1 resize-y rounded-2xl bg-white/70 p-4 text-base leading-relaxed outline-none focus:ring-2 focus:ring-ink/30"
        />
        <div className="flex flex-wrap gap-2">
          <Pill variant="ghost" onClick={copy}>{copied ? 'Copied' : 'Copy text'}</Pill>
          <Pill variant="ghost" onClick={save}>Download .txt</Pill>
        </div>
      </div>
    </Panel>
  )
}

export function EssayResult({ r }) {
  const { token } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const report = async () => {
    setBusy(true); setErr('')
    try { await downloadReport(r.id, token) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <>
      <CorrectedText r={r} />
      <div className="space-y-4 lg:col-span-2">
        <div className="grid gap-4 md:grid-cols-2">
          <Panel label="What you wrote" tag={r.demo && <DemoTag />}>
            <p className="whitespace-pre-wrap text-sm leading-[1.8]">
              <Marked text={r.raw_text} phrases={r.feedback.map(f => f.original)} cls="bg-ink/10 line-through decoration-ink/50" />
            </p>
          </Panel>
          <Panel label="Corrected">
            <p className="whitespace-pre-wrap text-sm leading-[1.8]">
              <Marked text={r.corrected_text} phrases={r.feedback.map(f => f.suggestion)} cls="bg-jelly/70" />
            </p>
          </Panel>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <Panel label="Scores">
            <dl className="space-y-4">
              {Object.entries(r.scores).map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-xs uppercase tracking-[.18em]"><dt>{k}</dt><dd>{v}</dd></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-jelly to-jelly-deep" style={{ width: `${v}%`, animation: 'bar 1.2s var(--ease-soft) both' }} />
                  </div>
                </div>
              ))}
            </dl>
            <div className="mt-6">
              <Pill onClick={report} disabled={busy || r.demo} title={r.demo ? 'Available once the backend is connected' : ''}>
                {busy ? 'Preparing…' : 'PDF report'}
              </Pill>
            </div>
            {err && <p role="alert" className="mt-2 text-xs text-red-700">{err}</p>}
          </Panel>

          <Panel label={`Feedback · ${r.feedback.length} changes`}>
            <ul className="space-y-2">
              {r.feedback.map((f, i) => (
                <li key={i} className="rounded-2xl bg-white/70 p-4 text-xs leading-relaxed">
                  <span className={`mr-2 rounded-full px-2.5 py-0.5 uppercase tracking-wide ${TYPE_STYLE[f.type] || 'bg-ink/10'}`}>{f.type}</span>
                  <s className="opacity-50">{f.original}</s> → <strong>{f.suggestion}</strong>
                  <p className="mt-1.5 opacity-65">{f.note}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}