/**
 * AuthContext.jsx
 * ---------------
 * Provides global authentication state to the entire app.
 *
 * Exposes via useAuth():
 *   session   — the current Supabase session (null if not logged in)
 *   user      — shortcut to session.user
 *   profile   — the row from the `profiles` table for this user
 *   loading   — true while the initial session check is in flight
 *   signOut() — logs the user out and redirects to /login
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabaseClient'

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const navigate = useNavigate()

  // Fetch the staff profile row from the `profiles` table
  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('[AuthContext] Could not fetch profile:', error.message)
      return null
    }
    return data
  }

  useEffect(() => {
    // 1. Get the session that may already exist in localStorage
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) {
        const p = await fetchProfile(s.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    // 2. Subscribe to future auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s)
        if (s?.user) {
          const p = await fetchProfile(s.user.id)
          setProfile(p)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ── Sign out ────────────────────────────────────────────────────────────────
  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    navigate('/login')
  }

  const value = {
    session,
    user:    session?.user ?? null,
    profile,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
