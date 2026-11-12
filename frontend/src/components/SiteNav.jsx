import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LINKS = [
  ['/alphabet', 'Alphabet'],
  ['/word', 'Word'],
  ['/essay', 'Essay'],
  ['/insights', 'Insights'],
  ['/history', 'History'],
]

export default function SiteNav({ onAuth }) {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [solid, setSolid] = useState(false)
  const links = pathname === '/' ? LINKS : [['/', 'Home'], ...LINKS]

  // Transparent over the jellyfish; frosted once real content scrolls underneath.
  useEffect(() => {
    const check = () => {
      const limit = pathname === '/' ? innerHeight * 7 - 80 : 24
      setSolid(scrollY > limit)
    }
    check()
    addEventListener('scroll', check, { passive: true })
    addEventListener('resize', check)
    return () => { removeEventListener('scroll', check); removeEventListener('resize', check) }
  }, [pathname])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ease-soft ${
        solid ? 'border-b border-ink/10 bg-lilac/70 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3 md:px-[30px] md:py-4">
        <Link to="/" aria-label="InkLens home" className="flex items-center gap-3.5 font-logo text-[22px] font-semibold leading-none tracking-[-.01em] md:text-[25px]">
          InkLens
          <svg viewBox="0 0 50 30" aria-hidden="true" className="hidden h-[30px] w-[50px] fill-none stroke-current sm:block" strokeWidth="1.3" strokeLinecap="round">
            <path d="M2 22C8 20 12 6 15 3c2-2-3 20-1 21 3 1 5-9 8-9-1 3-2 8 0 8 3 0 4-8 7-8s-1 8 2 8 5-6 8-6 2 4 9 2" />
          </svg>
        </Link>

        <nav aria-label="Main" className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto md:order-none md:mx-0 md:ml-auto md:w-auto">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[.16em] transition duration-500 ease-soft ${
                  isActive ? 'bg-ink text-mist' : 'hover:bg-white/60'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {user ? (
          <button onClick={signOut} title={user.email} className="rounded-full border border-ink/25 px-4 py-2 text-[11px] uppercase tracking-[.16em] transition duration-500 ease-soft hover:bg-white/60">
            Sign out
          </button>
        ) : (
          <button onClick={onAuth} className="rounded-full bg-jelly px-4 py-2 text-[11px] uppercase tracking-[.16em] transition duration-500 ease-soft hover:bg-jelly-deep">
            Sign in
          </button>
        )}
      </div>
    </header>
  )
}
