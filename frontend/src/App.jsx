import { useEffect, useState } from 'react'
import { Routes, Route, Outlet, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import RecognizePage from './pages/RecognizePage'
import Insights from './components/Insights'
import History from './components/History'
import SiteNav from './components/SiteNav'
import AuthModal from './components/AuthModal'
import { Footer } from './components/ui'

function Layout() {
  const { pathname } = useLocation()
  const [authOpen, setAuthOpen] = useState(false)
  const home = pathname === '/'
  const openAuth = () => setAuthOpen(true)

  useEffect(() => { scrollTo(0, 0) }, [pathname])

  return (
    <div className="relative min-h-screen">
      <div className="sky fixed inset-0 -z-10" />
      <SiteNav onAuth={openAuth} />
      <div key={pathname} className={home ? '' : 'page-in'}>
        <Outlet context={{ openAuth }} />
      </div>
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}

// Insights and History get their new look in the next step.
const Legacy = ({ children }) => <div className="pt-28">{children}</div>

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="alphabet" element={<RecognizePage mode="character" />} />
        <Route path="word" element={<RecognizePage mode="word" />} />
        <Route path="essay" element={<RecognizePage mode="essay" />} />
        <Route path="insights" element={<Legacy><Insights /></Legacy>} />
        <Route path="history" element={<Legacy><History onSignIn={() => {}} /></Legacy>} />
      </Route>
    </Routes>
  )
}