import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader, Pill } from '../components/ui'
import { OriginalCard, Waiting, CharacterResult, WordResult, EssayResult } from '../components/Results'
import CameraCapture from '../components/CameraCapture'
import { shrink } from '../lib/image'
import { validateImage, recognizeCharacter, recognizeWord, correctEssay } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const MODES = {
  character: {
    index: '01 · Alphabet',
    title: 'Alphabet',
    sub: 'Upload one handwritten letter, A–Z or a–z. A CNN trained on EMNIST tells you which letter it is.',
    waiting: 'Letter',
    action: 'Recognise letter',
    run: recognizeCharacter,
  },
  word: {
    index: '02 · Word',
    title: 'Word',
    sub: 'Upload a handwritten word or line. A CRNN reads it left to right and returns the text.',
    waiting: 'Word',
    action: 'Recognise word',
    run: recognizeWord,
  },
  essay: {
    index: '03 · Essay',
    title: 'Essay',
    sub: 'Upload a handwritten page. TrOCR extracts the text, an AI editor corrects it, and you get a PDF report.',
    waiting: 'Essay',
    action: 'Read & correct',
    run: correctEssay,
  },
}

const TABS = [['/alphabet', 'Alphabet'], ['/word', 'Word'], ['/essay', 'Essay']]

// Phones open their own camera app; laptops get the in-page live camera.
const isTouch = () => matchMedia('(pointer: coarse)').matches

function Drop({ onFile, onLive }) {
  const browse = useRef(null)
  const snap = useRef(null)
  const [over, setOver] = useState(false)
  const takePhoto = () => (isTouch() ? snap.current?.click() : onLive())

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]) }}
      className={`glass pop flex flex-col items-center justify-center gap-4 rounded-[32px] border-dashed px-5 py-14 text-center transition duration-700 ease-soft sm:rounded-[40px] sm:px-6 sm:py-24 ${over ? 'scale-[1.01] !bg-white/80' : ''}`}
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-jelly sm:h-20 sm:w-20" style={{ animation: 'drift 5s ease-in-out infinite' }}>
        <svg viewBox="0 0 24 24" className="h-7 w-7 sm:h-8 sm:w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
      </div>
      <p className="font-display text-3xl uppercase leading-none sm:text-4xl md:text-5xl">Drop your image</p>
      <p className="text-xs opacity-60">JPG, JPEG or PNG · up to 10 MB</p>

      <div className="flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Pill onClick={() => browse.current?.click()}>Browse files</Pill>
        <Pill variant="ghost" onClick={takePhoto}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.5" />
          </svg>
          Take photo
        </Pill>
      </div>
      <p className="max-w-xs text-[11px] leading-relaxed opacity-50">Taking a photo? Hold the camera straight above the page, in good light.</p>

      <input ref={browse} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="hidden"
        onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={snap} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { onFile(e.target.files?.[0], true); e.target.value = '' }} />
    </div>
  )
}

export default function RecognizePage({ mode }) {
  const cfg = MODES[mode]
  const { token } = useAuth()
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [live, setLive] = useState(false)

  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  const reset = () => { setFile(null); setUrl(''); setResult(null); setState('idle'); setError('') }
  const choose = async (f, fromCamera = false) => {
    if (f && fromCamera) f = await shrink(f)
    const problem = validateImage(f)
    if (problem) { setError(problem); setState('error'); return }
    setFile(f); setUrl(URL.createObjectURL(f)); setResult(null); setError(''); setState('idle')
  }
  const run = async () => {
    setState('loading'); setError('')
    try { setResult(await cfg.run(file, token)); setState('done') }
    catch (e) { setError(e.message || 'Something went wrong.'); setState('error') }
  }

  const done = state === 'done' && result

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-5">
      <PageHeader index={cfg.index} title={cfg.title} sub={cfg.sub} />

      <div role="tablist" className="glass mb-6 inline-flex max-w-full overflow-x-auto rounded-full p-1 sm:mb-8">
        {TABS.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[.14em] transition duration-500 ease-soft ${isActive ? 'bg-ink text-mist' : 'hover:bg-white/70'}`}>
            {label}
          </NavLink>
        ))}
      </div>

      {!file ? (
        <Drop onFile={choose} onLive={() => setLive(true)} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <OriginalCard url={url} name={file.name} scanning={state === 'loading'} />
          {!done && <Waiting title={cfg.waiting} loading={state === 'loading'} />}
          {done && mode === 'character' && <CharacterResult r={result} />}
          {done && mode === 'word' && <WordResult r={result} />}
          {done && mode === 'essay' && <EssayResult r={result} />}
        </div>
      )}

      {state === 'error' && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}

      {file && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Pill onClick={run} disabled={state === 'loading'}>{done ? 'Run again' : cfg.action}</Pill>
          <Pill variant="ghost" onClick={reset}>New image</Pill>
        </div>
      )}

      {live && <CameraCapture onClose={() => setLive(false)} onCapture={f => choose(f)} />}
    </div>
  )
}
