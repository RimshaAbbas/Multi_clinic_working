import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { Menu, X, Phone, Calendar } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'

const NAV_LINKS = [
  { to: '/',        label: 'Home' },
  { to: '/doctors', label: 'Doctors' },
  { to: '/book',    label: 'Book Appointment' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  // Pull live branding from SettingsContext
  const { settings } = useSettings()
  const primary = settings.primary_color || '#1E3A8A'
  const accent  = settings.accent_color  || '#3B82F6'

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Glass effect on scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-md border-b border-slate-100'
          : 'bg-white/70 backdrop-blur-sm border-b border-transparent'
      }`}
    >
      {/* Top info bar — dynamic primary color */}
      <div className="text-white text-xs py-1.5 px-4" style={{ backgroundColor: primary }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="hidden sm:flex items-center gap-1.5">
            <Phone size={11} /> {settings.support_phone || '+92-21-111-222-333'}
          </span>
          <span style={{ color: `${accent}cc` }}>Mon–Sat: 9:00 AM – 8:00 PM | 3 Clinic Branches</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo — dynamic name + optional image */}
          <Link to="/" className="flex items-center gap-2.5 group">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.hospital_name}
                className="w-9 h-9 rounded-xl object-contain group-hover:scale-105 transition-transform"
                onError={e => { e.target.style.display = 'none' }}
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"
                style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="white"/>
                </svg>
              </div>
            )}
            <div>
              <span className="text-xl font-bold leading-none block" style={{ color: primary }}>
                {settings.hospital_name || 'MultiCare'}
              </span>
              <span className="text-[10px] font-medium text-slate-400 leading-none tracking-widest uppercase">
                {settings.tagline ? settings.tagline.slice(0, 28) : 'Clinics'}
              </span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                  style={({ isActive }) => isActive ? { backgroundColor: primary } : {}}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* CTA + Hamburger */}
          <div className="flex items-center gap-3">
            <Link
              to="/book"
              className="hidden md:flex items-center gap-2 text-white text-sm py-2.5 px-5 rounded-xl font-semibold shadow-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primary }}
            >
              <Calendar size={15} /> Book Now
            </Link>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 py-4 space-y-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive ? 'text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
                style={({ isActive }) => isActive ? { backgroundColor: primary } : {}}
              >
                {label}
              </NavLink>
            ))}
            <div className="pt-2 px-1">
              <Link to="/book"
                className="flex items-center justify-center gap-2 text-white text-sm w-full py-2.5 rounded-xl font-semibold"
                style={{ backgroundColor: primary }}>
                <Calendar size={15} /> Book Appointment
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
