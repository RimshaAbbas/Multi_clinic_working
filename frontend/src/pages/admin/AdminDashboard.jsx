/**
 * AdminDashboard.jsx  — Route: /admin/dashboard  (Protected)
 * -------------------------------------------------------------
 * Shell layout for the hospital management interface.
 * Sidebar tabs:
 *   1. Live Appointments  — incoming bookings, status actions
 *   2. Lab Orders         — prescribed tests pipeline + SMS log
 *   3. Doctor Schedules   — doctor CRUD
 *   4. Staff Profiles     — staff accounts
 *   5. Lab Configurations — lab test catalogue
 */

import { useState } from 'react'
import {
  Activity, CalendarDays, Stethoscope, Users,
  FlaskConical, LogOut, Menu, X, ChevronRight,
  Bell, TestTube,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import LiveAppointments  from './LiveAppointments'
import LabOrders         from './LabOrders'
import DoctorSchedules   from './DoctorSchedules'
import StaffProfiles     from './StaffProfiles'
import LabConfigurations from './LabConfigurations'

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'appointments', label: 'Live Appointments',  icon: CalendarDays },
  { id: 'lab_orders',   label: 'Lab Orders',         icon: TestTube     },
  { id: 'doctors',      label: 'Doctor Schedules',   icon: Stethoscope  },
  { id: 'staff',        label: 'Staff Profiles',     icon: Users        },
  { id: 'labs',         label: 'Lab Configurations', icon: FlaskConical },
]

const TAB_TITLES = {
  appointments: 'Live Appointments',
  lab_orders:   'Lab Orders & Results',
  doctors:      'Doctor Schedules',
  staff:        'Staff Profiles',
  labs:         'Lab Configurations',
}

const TAB_COMPONENTS = {
  appointments: LiveAppointments,
  lab_orders:   LabOrders,
  doctors:      DoctorSchedules,
  staff:        StaffProfiles,
  labs:         LabConfigurations,
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, onSignOut, profile, mobile, onClose }) {
  return (
    <aside className={`flex flex-col bg-[#1E3A8A] text-white h-full ${mobile ? 'w-72' : 'w-64'}`}>

      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none">MultiCare</p>
            <p className="text-[10px] text-blue-200 leading-none mt-0.5 uppercase tracking-widest">Admin Panel</p>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
            <X size={17} />
          </button>
        )}
      </div>

      {/* User info */}
      {profile && (
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(profile.full_name || 'S')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">{profile.full_name || 'Staff'}</p>
              <p className="text-[11px] text-blue-200 capitalize mt-0.5">{profile.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => { setActiveTab(id); if (mobile) onClose?.() }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-[#1E3A8A] shadow-md'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-[#1E3A8A]' : 'text-blue-300'} />
              <span className="flex-1 text-left">{label}</span>
              {isActive && <ChevronRight size={13} className="text-[#1E3A8A]" />}
            </button>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </aside>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab,      setActiveTab]      = useState('appointments')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const ActiveView = TAB_COMPONENTS[activeTab]

  const today = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={signOut} profile={profile} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="flex-shrink-0">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={signOut} profile={profile}
              mobile onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 shadow-sm px-5 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base font-bold text-[#1E3A8A]">{TAB_TITLES[activeTab]}</h1>
              <p className="text-xs text-slate-400 hidden sm:block">{today}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
            </div>
            <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
              <Bell size={18} />
            </button>
            {profile && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center text-white text-sm font-bold">
                {(profile.full_name || 'S')[0].toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          <div className="relative z-10 max-w-screen-xl mx-auto">
            <ActiveView />
          </div>
        </main>
      </div>
    </div>
  )
}
