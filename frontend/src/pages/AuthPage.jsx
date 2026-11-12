import { Link, useNavigate } from 'react-router-dom'
import { PageHeader, Pill } from '../components/ui'
import AuthForm from '../components/AuthForm'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-6xl px-5">
      <PageHeader index="06 · Account" title="Account" sub="Sign in to keep every scan and essay in your history and see your own analytics." />
      <div className="glass pop mx-auto max-w-md rounded-[40px] p-8 md:p-10">
        {user ? (
          <div className="space-y-5">
            <p className="text-[11px] uppercase tracking-[.16em] opacity-60">Signed in as</p>
            <p className="break-all text-lg">{user.email}</p>
            <div className="flex flex-wrap gap-3">
              <Pill to="/history">My history</Pill>
              <Pill variant="ghost" onClick={signOut}>Sign out</Pill>
            </div>
          </div>
        ) : (
          <AuthForm onDone={() => navigate('/alphabet')} />
        )}
      </div>
      <p className="mt-6 text-center text-xs opacity-60"><Link to="/" className="underline">Back to home</Link></p>
    </div>
  )
}
