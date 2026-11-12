import { useOutletContext } from 'react-router-dom'
import { Pill } from './ui'

export default function SignInGate({ text = 'Sign in to see this page.' }) {
  const { openAuth } = useOutletContext()
  return (
    <div className="glass pop mx-auto flex max-w-xl flex-col items-center gap-5 rounded-[40px] px-8 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-jelly" style={{ animation: 'drift 5s ease-in-out infinite' }}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <p className="font-display text-3xl uppercase leading-none">Sign in first</p>
      <p className="max-w-sm text-sm leading-relaxed opacity-70">{text}</p>
      <Pill onClick={openAuth}>Sign in</Pill>
    </div>
  )
}
