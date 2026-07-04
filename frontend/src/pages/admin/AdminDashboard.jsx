/**
 * AdminDashboard.jsx  —  Route: /admin/dashboard  (Protected)
 * ─────────────────────────────────────────────────────────────
 * Shell layout for the hospital management interface.
 *
 * Layout architecture
 * ────────────────────────────────────────────────────────────
 *  Desktop (≥1024px) : fixed w-72 dark sidebar + scrollable content area
 *  Mobile  (<1024px) : floating top app-bar + animated slide-over drawer
 *
 * Typography spec (§ 3)
 * ────────────────────────────────────────────────────────────
 *  Page title   : font-bold text-3xl lg:text-4xl text-slate-800 tracking-tight
 *  Date sub     : text-sm font-medium text-slate-400 tracking-wide mt-1
 *  Section head : text-lg font-bold text-slate-700 tracking-tight
 */

import { useState } from 'react'
import {
  Activity, CalendarDays, Stethoscope, Users,
  FlaskConical, LogOut, Menu, X, ChevronRight,
  Bell, TestTube, UserCheck, Settings, Shield,
} from 'lucide-react'
import { useAuth }        from '../../context/AuthContext'
import { useSettings }    from '../../context/SettingsContext'
import LiveAppointments   from './LiveAppointments'
import LabOrders          from './LabOrders'
import DoctorSchedules    from './DoctorSchedules'
import StaffProfiles      from './StaffProfiles'
import LabConfigurations  from './LabConfigurations'
import DoctorView         from './DoctorView'
import SettingsPage       from './SettingsPage'

// ── Nav items config ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'appointments', label: 'Live Appointments',  icon: CalendarDays },
  { id: 'doctor_view',  label: "Doctor's Today View", icon: UserCheck    },
  { id: 'lab_orders',   label: 'Lab Orders',          icon: TestTube     },
  { id: 'doctors',      label: 'Doctor Schedules',    icon: Stethoscope  },
  { id: 'staff',        label: 'Staff Profiles',      icon: Users        },
  { id: 'labs',         label: 'Lab Configurations',  icon: FlaskConical },
  { id: 'settings',     label: 'System Settings',     icon: Settings, divider: true },
]

const TAB_TITLES = {
  appointments: 'Live Appointments',
  doctor_view:  "Doctor's Today View",
  lab_orders:   'Lab Orders & Results',
  doctors:      'Doctor Schedules',
  staff:        'Staff Profiles',
  labs:         'Lab Configurations',
  settings:     'System Settings',
}

const TAB_SUBTITLES = {
  appointments: 'Real-time consultation booking matrix',
  doctor_view:  "Today's scheduled patients by doctor",
  lab_orders:   'Lab test pipeline & notification terminal',
  doctors:      'Manage doctor profiles and schedules',
  staff:        'Staff accounts and role management',
  labs:         'Lab test catalogue and pricing',
  settings:     'Branding, colours, and system configuration',
}

const TAB_COMPONENTS = {
  appointments: LiveAppointments,
  doctor_view:  DoctorView,
  lab_orders:   LabOrders,
  doctors:      DoctorSchedules,
  staff:        StaffProfiles,
  labs:         LabConfigurations,
  settings:     SettingsPage,
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Rendered in two contexts:
 *   - Desktop: as a static flex child (hidden on mobile)
 *   - Mobile:  inside a slide-over overlay drawer
 *
 * Design: bg-slate-900 dark sidebar for maximum contrast against white content.
 */
function Sidebar({ activeTab, setActiveTab, onSignOut, profile, onClose, isMobile }) {
  const { settings } = useSettings()

  // Use settings.primary_color for the active button; derive sidebar bg from it
  const primary = settings.primary_color || '#1E3A8A'

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0"
      style={{
        width: '280px',
        minWidth: '280px',
        background: 'linear-gradient(180deg, #dbeafe 0%, #eff6ff 50%, #dbeafe 100%)',
        borderRight: '1px solid #bfdbfe',
      }}
    >

      {/* ── Logo / brand header ── */}
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #bfdbfe' }}>
        <div className="flex items-center gap-3">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt="Logo"
              onError={e => { e.target.style.display = 'none' }}
              className="w-10 h-10 rounded-xl object-contain p-0.5 flex-shrink-0"
              style={{ background: primary + '22' }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
              style={{ background: primary }}
            >
              <Shield size={20} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight truncate max-w-[190px]" style={{ color: primary }}>
              {settings.hospital_name || 'MultiCare'}
            </p>
            <p className="text-[11px] uppercase tracking-widest mt-0.5 font-semibold" style={{ color: primary + 'aa' }}>
              Admin Panel
            </p>
          </div>
        </div>

        {/* Close button — mobile only */}
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition"
            style={{ color: primary }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Staff profile chip ── */}
      {profile && (
        <div className="px-4 py-4" style={{ borderBottom: '1px solid #bfdbfe' }}>
          <div
            className="flex items-center gap-3 rounded-xl px-3 py-3"
            style={{ background: primary + '18', border: `1px solid ${primary}33` }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md"
              style={{ background: primary }}
            >
              {(profile.full_name || 'S')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight truncate" style={{ color: primary }}>
                {profile.full_name || 'Staff'}
              </p>
              <p className="text-xs capitalize mt-0.5 font-medium" style={{ color: primary + 'bb' }}>
                {profile.role}
              </p>
            </div>
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full flex-shrink-0 ring-2 ring-emerald-200" />
          </div>
        </div>
      )}

      {/* ── Navigation links ── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon, divider }) => {
          const isActive = activeTab === id
          return (
            <div key={id}>
              {/* Divider before Settings */}
              {divider && (
                <div className="flex items-center gap-2 px-2 py-3 mt-1">
                  <div className="flex-1 h-px" style={{ background: primary + '40' }} />
                  <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: primary + '99' }}>Config</span>
                  <div className="flex-1 h-px" style={{ background: primary + '40' }} />
                </div>
              )}
              <button
                onClick={() => { setActiveTab(id); onClose?.() }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={isActive
                  ? { background: primary, color: '#ffffff', boxShadow: `0 4px 12px ${primary}44` }
                  : { color: primary + 'cc' }
                }
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = primary + '20'; e.currentTarget.style.color = primary } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = primary + 'cc' } }}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="flex-1 text-left leading-tight tracking-tight">{label}</span>
                {isActive && <ChevronRight size={15} className="opacity-70 flex-shrink-0" />}
              </button>
            </div>
          )
        })}
      </nav>

      {/* ── Sign out ── */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid #bfdbfe' }}>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{ color: '#ef4444' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD SHELL
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { profile, signOut }                = useAuth()
  const { settings }                        = useSettings()
  const [activeTab,      setActiveTab]      = useState('appointments')
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(false)  // mobile drawer

  const ActiveView = TAB_COMPONENTS[activeTab]

  // PKT-formatted date for the header subtitle
  const todayLabel = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Karachi',
  })

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* DESKTOP SIDEBAR — hidden below lg, fixed 320px on lg+               */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:block flex-shrink-0 h-full"
        style={{ width: '280px', minWidth: '280px', boxShadow: '4px 0 24px rgba(15,23,42,0.25)' }}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSignOut={signOut}
          profile={profile}
        />
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MOBILE SLIDE-OVER DRAWER                                             */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '280px' }}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSignOut={signOut}
          profile={profile}
          isMobile
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MAIN CONTENT COLUMN                                                  */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Mobile top app-bar (hidden on lg+) ── */}
        <header className="lg:hidden w-full bg-white border-b border-slate-100 px-4 py-3 flex justify-between items-center flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              {settings.logo_url
                ? <img src={settings.logo_url} alt="logo" className="h-7 w-7 rounded-lg object-contain" onError={e => { e.target.style.display = 'none' }} />
                : <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center"><Shield size={14} className="text-white" /></div>
              }
              <span className="text-sm font-bold text-slate-800 truncate max-w-[160px]">
                {settings.hospital_name || 'MultiCare'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
            </span>
            {profile && (
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {(profile.full_name || 'S')[0].toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* ── Desktop top bar ── */}
        <header className="hidden lg:flex bg-white border-b border-slate-100 shadow-sm px-8 py-5 items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-3xl lg:text-4xl text-slate-800 tracking-tight leading-none">
              {TAB_TITLES[activeTab]}
            </h1>
            <span className="text-sm font-medium text-slate-400 tracking-wide mt-1.5 block">
              {TAB_SUBTITLES[activeTab]}  ·  {todayLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
            </div>
            <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition">
              <Bell size={18} />
            </button>
            {profile && (
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {(profile.full_name || 'S')[0].toUpperCase()}
                </div>
                <div className="hidden xl:block">
                  <p className="text-xs font-bold text-slate-700 leading-tight">{profile.full_name || 'Staff'}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{profile.role}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── Mobile page title bar ── */}
        <div className="lg:hidden bg-white border-b border-slate-100 px-4 pt-3 pb-3">
          <h1 className="font-bold text-2xl text-slate-800 tracking-tight leading-tight">
            {TAB_TITLES[activeTab]}
          </h1>
          <span className="text-xs font-medium text-slate-400 tracking-wide mt-0.5 block">
            {TAB_SUBTITLES[activeTab]}
          </span>
        </div>

        {/* ── Scrollable main content area ── */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <ActiveView />
          </div>
        </main>
      </div>
    </div>
  )
}
