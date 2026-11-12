import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pill } from '../components/ui'
import AuthForm from '../components/AuthForm'
import Jellyfish from '../components/Jellyfish'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('in')
  const signup = mode === 'up'

  return (
    <div className="mx-auto flex min-h-[90svh] max-w-6xl flex-col items-center justify-center px-4 pb-10 pt-36 sm:px-5">
      <div className="relative w-full max-w-md">
        <div className="absolute -top-16 left-1/2 z-10 -translate-x-1/2">
          <Jellyfish className="jf-bob h-28 w-24" />
        </div>

        <div className="glass pop rounded-[40px] px-6 pb-8 pt-16 sm:px-10 sm:pb-10">
          <h1 className="text-center font-display text-4xl uppercase leading-none sm:text-5xl">
            {user ? "You're in" : signup ? 'Join InkLens' : 'Welcome back'}
          </h1>
          <p className="mb-7 mt-3 text-center text-sm leading-relaxed opacity-70">
            {user
              ? 'Your scans and essays are saved to your account.'
              : signup
                ? 'Create an account to keep every scan and essay in one place.'
                : 'Sign in to see your history and your own analytics.'}
          </p>

          {user ? (
            <div className="space-y-5 text-center">
              <p className="break-all text-sm opacity-70">{user.email}</p>
              <div className="flex flex-col gap-3">
                <Pill to="/alphabet" className="w-full">Start scanning</Pill>
                <Pill to="/history" variant="ghost" className="w-full">My history</Pill>
                <button onClick={signOut} className="text-xs underline opacity-70">Sign out</button>
              </div>
            </div>
          ) : (
            <AuthForm mode={mode} onMode={setMode} onDone={() => navigate('/alphabet')} />
          )}
        </div>
      </div>
      <p className="mt-8 text-center text-xs opacity-60"><Link to="/" className="underline">Back to home</Link></p>
    </div>
  )
}
