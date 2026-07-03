import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { Menu, X, Phone, Calendar } from 'lucide-react'

const NAV_LINKS = [
  { to: '/',        label: 'Home' },
  { to: '/doctors', label: 'Doctors' },
  { to: '/book',    label: 'Book Appointment' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [scrolled,   setScrolled]   = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Add glass effect after scrolling
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
      {/* Top bar */}
      <div className="bg-[#1E3A8A] text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="hidden sm:flex items-center gap-1.5">
            <Phone size={11} /> Emergency: +92 21 111 000 911
          </span>
          <span className="text-blue-200">Mon–Sat: 9:00 AM – 8:00 PM | 3 Clinic Branches</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="white"/>
                <path d="M11 7h2v2h-2V7zm0 4h2v6h-2v-6z" fill="white" fillOpacity="0.5"/>
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold text-[#1E3A8A] leading-none block">MultiCare</span>
              <span className="text-[10px] font-medium text-slate-400 leading-none tracking-widest uppercase">Clinics</span>
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
                      isActive
                        ? 'bg-[#1E3A8A] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-[#1E3A8A]'
                    }`
                  }
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
              className="hidden md:flex items-center gap-2 btn-primary text-sm py-2.5 px-5"
            >
              <Calendar size={15} />
              Book Now
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
          <div className="md:hidden border-t border-slate-100 py-4 space-y-1 animate-slide-up">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#1E3A8A] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="pt-2 px-1">
              <Link to="/book" className="btn-primary flex items-center justify-center gap-2 text-sm w-full">
                <Calendar size={15} /> Book Appointment
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
