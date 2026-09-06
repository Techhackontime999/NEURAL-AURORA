import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SUPERUSER_EMAIL = import.meta.env.VITE_SUPERUSER_EMAIL || ''

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (!error && data?.session?.user) {
        setUser(data.session.user)
        fetchProfile(data.session.user.id)
      } else {
        setProfileLoading(false)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      setProfileLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user)
          fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          setProfileLoading(false)
        }
        setLoading(false)
      }
    )

    return () => authListener?.subscription?.unsubscribe()
  }, [])

  async function ensureSuperuser(email) {
    if (!SUPERUSER_EMAIL || email !== SUPERUSER_EMAIL) return
    try {
      await supabase.rpc('set_admin_email', { p_email: email })
    } catch (e) {
      console.warn('[Auth] Superuser promotion failed (may already be admin):', e.message)
    }
  }

  async function fetchProfile(userId) {
    setProfileLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('[Auth] Profile fetch error:', error.message)
    }

    if (data) {
      if (data.role !== 'admin') {
        await ensureSuperuser(data.email)
        const { data: refreshed } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (refreshed) setProfile(refreshed)
        else setProfile(data)
      } else {
        setProfile(data)
      }
    } else if (user) {
      await ensureSuperuser(user.email)
      try {
        await supabase.rpc('ensure_my_profile')
      } catch (err) {
        console.warn('[Auth] ensure_my_profile RPC failed or unmigrated:', err.message)
      }
      let { data: created } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!created) {
        const { data: inserted } = await supabase
          .from('profiles')
          .upsert({ id: userId, email: user.email, role: 'viewer' })
          .select('*')
          .single()
        created = inserted
      }

      if (created) {
        setProfile(created)
      } else {
        setProfile({ id: userId, role: 'viewer', email: user.email })
      }
    }
    setProfileLoading(false)
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async function signUp(email, password, options) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: options?.data || {},
      },
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw error
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        isAdmin,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile: () => fetchProfile(user?.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
