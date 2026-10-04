import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Profile } from '../types'

export function useAuth() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [noRole, setNoRole] = useState(false)

  async function loadProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile((data as Profile) || null)
    setNoRole(!data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid) loadProfile(uid).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user.id ?? null
      setUserId(uid)
      if (uid) loadProfile(uid)
      else {
        setProfile(null)
        setNoRole(false)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { loading, userId, profile, noRole, signIn, signOut }
}
