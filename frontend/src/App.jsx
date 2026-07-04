/**
 * App.jsx
 * -------
 * Root application component.
 * - Wraps everything in <AuthProvider> so all pages can call useAuth()
 * - <ProtectedRoute> redirects unauthenticated users to /login
 * - Three.js particle canvas is rendered once here and persists across routes
 */

import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth }         from './context/AuthContext'
import { SettingsProvider }              from './context/SettingsContext'
import ParticleBackground from './components/three/ParticleBackground'

// Public pages
import PatientPortal  from './pages/PatientPortal'
import AdminLogin     from './pages/AdminLogin'

// Admin pages (require auth)
import AdminDashboard from './pages/admin/AdminDashboard'

// ── Protected Route Guard ─────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  // While checking localStorage for an existing session, show nothing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

// ── Inner app (needs AuthProvider context already in scope) ───────────────────
function AppInner() {
  const location = useLocation()

  // Scroll to top on every route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  // Admin dashboard pages get their own layout (no public Navbar/Footer)
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <>
      {/* Persistent Three.js animated particle canvas — behind everything */}
      <ParticleBackground />

      <div className="relative z-10 min-h-screen">
        <Routes>
          {/* ── Public ── */}
          <Route path="/"      element={<PatientPortal />} />
          <Route path="/login" element={<AdminLogin />} />

          {/* ── Protected Admin ── */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all → patient portal */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  )
}

// ── Root export — AuthProvider + SettingsProvider wrap the Router children ────
export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppInner />
      </SettingsProvider>
    </AuthProvider>
  )
}
