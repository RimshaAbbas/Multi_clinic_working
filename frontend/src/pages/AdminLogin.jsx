/**
 * AdminLogin.jsx  — Route: /login
 * ---------------------------------
 * Secure staff login form.
 * Uses supabase.auth.signInWithPassword — on success the AuthContext
 * picks up the new session and redirects to the dashboard.
 */

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle, Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import supabase from '../lib/supabaseClient'

export default function AdminLogin() {
  const { session } = useAuth()
  const navigate    = useNavigate()

  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // If already logged in, go straight to dashboard
  useEffect(() => {
    if (session) navigate('/admin/dashboard', { replace: true })
  }, [session, navigate])

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    if (!email.trim())    { setError('Email address is required.'); return }
    if (!password.trim()) { setError('Password is required.'); return }

    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password: password.trim(),
    })

    if (authError) {
      const msg = authError.message || ''

      if (msg.includes('Invalid API key') || msg.includes('apikey') || msg.includes('JWT')) {
        // The .env file has a wrong or placeholder anon key
        setError(
          'Invalid API key — your VITE_SUPABASE_ANON_KEY in frontend/.env is wrong or still a placeholder. ' +
          'Go to Supabase Dashboard → Settings → API → copy the "anon public" key → paste it in .env → restart the dev server.'
        )
      } else if (msg.includes('Invalid login credentials')) {
        setError('Wrong email or password. Double-check and try again.')
      } else if (msg.includes('Email not confirmed')) {
        setError('Your email is not confirmed. Check your inbox for a confirmation link from Supabase.')
      } else if (msg.includes('User not found')) {
        setError('No account found with this email. Create one in Supabase Dashboard → Authentication → Users.')
      } else {
        setError(msg || 'Login failed. Please try again.')
      }
      setLoading(false)
      return
    }

    // AuthContext will detect the new session via onAuthStateChange
    // and ProtectedRoute will redirect to /admin/dashboard
    navigate('/admin/dashboard', { replace: true })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Card */}
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-100 p-8 md:p-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <Activity size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1E3A8A]">Staff Portal</h1>
          <p className="text-sm text-slate-400 mt-1">MultiCare Clinic Management System</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5 mb-5 text-sm animate-fade-in">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5" noValidate>

          {/* Email */}
          <div>
            <label className="label">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="staff@multicare.pk"
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                className="input-field pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base mt-2 disabled:opacity-70"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</>
              : <><LogIn size={17} /> Sign In to Dashboard</>
            }
          </button>
        </form>

        {/* Footer note */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-400">
            This portal is for authorised clinic staff only.
          </p>
          <Link to="/" className="text-xs text-[#3B82F6] hover:text-[#1E3A8A] font-medium transition-colors">
            ← Back to Patient Portal
          </Link>
        </div>
      </div>

      {/* Setup hint (visible in development) */}
      {import.meta.env.DEV && (
        <div className="mt-6 max-w-md w-full bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-800 space-y-2">
          <p className="font-bold text-sm">🔧 Getting "Invalid API key"?</p>
          <p>Your <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in <code className="bg-amber-100 px-1 rounded">frontend/.env</code> is missing or wrong.</p>
          <div className="space-y-1 mt-2">
            <p className="font-semibold">How to fix — follow exactly:</p>
            <p>1. Go to <a href="https://supabase.com/dashboard/project/jwyywicdrhcrhbglhohg/settings/api" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">Supabase → Settings → API</a></p>
            <p>2. Under <strong>"Project API keys"</strong>, copy the <strong>"anon  public"</strong> key</p>
            <p>3. It starts with <code className="bg-amber-100 px-1 rounded">eyJhbGciOiJIUzI1NiIs...</code></p>
            <p>4. Open <code className="bg-amber-100 px-1 rounded">frontend/.env</code> and replace <code className="bg-amber-100 px-1 rounded">PASTE_YOUR_ANON_KEY_HERE</code> with the full key</p>
            <p>5. Press <strong>Ctrl+C</strong> to stop the server, then run <code className="bg-amber-100 px-1 rounded">npm run dev</code> again</p>
          </div>
          <hr className="border-amber-200 my-2" />
          <p className="font-semibold">Login credentials for your existing user:</p>
          <p>Email: <code className="bg-amber-100 px-1 rounded">rimshaabbas2006@gmail.com</code></p>
          <p>Password: whatever you set when creating this user in Supabase</p>
        </div>
      )}
    </div>
  )
}
