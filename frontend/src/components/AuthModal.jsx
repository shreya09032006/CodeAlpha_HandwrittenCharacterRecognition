import { useEffect } from 'react'
import AuthForm from './AuthForm'

export default function AuthModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Account" onClick={onClose}>
      <div className="glass pop relative w-full max-w-md rounded-[36px] p-8" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/70 text-sm transition hover:bg-white">✕</button>
        <h2 className="font-display text-4xl uppercase leading-none">Welcome</h2>
        <p className="mb-6 mt-2 text-sm opacity-70">Sign in to save your scans and essays.</p>
        <AuthForm onDone={onClose} />
      </div>
    </div>
  )
}
