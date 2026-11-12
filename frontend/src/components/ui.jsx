import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// Fades and rises into view once. Gives every section the same unhurried feel as the hero.
export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: 0.12 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} style={{ '--d': `${delay}ms` }} className={`reveal ${on ? 'in' : ''} ${className}`}>{children}</div>
}

export function Pill({ to, children, variant = 'ink', className = '', ...rest }) {
  const look = variant === 'ink' ? 'bg-ink text-mist' : 'border border-ink/20 bg-white/60 hover:bg-white'
  const cls = `group inline-flex items-center gap-3 rounded-full px-6 py-3 text-xs uppercase tracking-[.14em] transition duration-500 ease-soft hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40 ${look} ${className}`
  const inner = (
    <>
      {children}
      <span className="grid h-5 w-5 place-items-center rounded-full bg-jelly text-ink transition duration-500 ease-soft group-hover:translate-x-1">→</span>
    </>
  )
  return to ? <Link to={to} className={cls} {...rest}>{inner}</Link> : <button className={cls} {...rest}>{inner}</button>
}

export function PageHeader({ index, title, sub }) {
  return (
    <header className="pb-10 pt-36">
      <p className="text-xs uppercase tracking-[.2em] opacity-60">{index}</p>
      <h1 className="mt-3 font-display text-[clamp(3rem,8vw,6.5rem)] uppercase leading-[.86]">{title}</h1>
      <p className="mt-6 max-w-xl text-sm leading-relaxed opacity-75">{sub}</p>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="px-5 pb-8 pt-16 text-center text-[11px] uppercase tracking-[.2em] opacity-60">
      CodeAlpha Machine Learning Internship · Task 3 · Handwritten Character Recognition
    </footer>
  )
}
