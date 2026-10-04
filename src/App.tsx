import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { PublicPage } from './pages/PublicPage'
import { Layout } from './components/Layout'
import { Toaster } from './components/Toaster'
import { Spinner, Card, EmptyState, GhostButton } from './components/ui'
import { LockIcon } from './components/Icons'

type View = 'app' | 'public'

export default function App() {
  const { loading, profile, noRole, signOut } = useAuth()
  const [view, setView] = useState<View>('app')

  let body
  if (view === 'public') {
    body = <PublicPage onBack={() => setView('app')} />
  } else if (loading) {
    body = (
      <div className="min-h-screen flex items-center justify-center text-zinc-400">
        <Spinner size={28} />
      </div>
    )
  } else if (noRole) {
    body = (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <EmptyState
            icon={<LockIcon width={22} height={22} />}
            title="No role assigned"
            body="You're signed in, but your account has no role yet. Ask the administrator to add you to the profiles table."
          />
          <GhostButton onClick={signOut} className="w-full">Sign out</GhostButton>
        </Card>
      </div>
    )
  } else if (!profile) {
    body = <LoginPage onGoPublic={() => setView('public')} />
  } else {
    body = (
      <Layout profile={profile} onSignOut={signOut} onGoPublic={() => setView('public')}>
        <DashboardPage profile={profile} />
      </Layout>
    )
  }

  return (
    <>
      {body}
      <Toaster />
    </>
  )
}
