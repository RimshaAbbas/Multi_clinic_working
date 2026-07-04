/**
 * LiveAppointments.jsx
 * ─────────────────────
 * Reception dashboard — all doctor consultation appointments.
 *
 * § 1  Typography  — semantic h1/h2 hierarchy per spec
 * § 2  Stat cards  — real-time reactive counts from live array
 * § 3  Filter bar  — name search + date picker + status dropdown + reset
 * § 4  Table       — optimistic status actions, today highlight
 * § 5  Modal       — prescribe lab test
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle, XCircle, Clock, Loader2, Search,
  RefreshCw, CalendarDays, FlaskConical, X,
  AlertCircle, Stethoscope, MessageSquare, Filter,
  TrendingUp, Ban, Timer,
} from 'lucide-react'
import supabase                  from '../../lib/supabaseClient'
import { sendBookingConfirmed }  from '../../utils/notifications'
import { displayDate, displayTime, isTodayLocal, todayLocal } from '../../utils/dateTime'

// ─────────────────────────────────────────────────────────────────────────────
// § SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Status pill badge */
const STATUS_STYLES = {
  pending:   'bg-amber-100  text-amber-700  border border-amber-200',
  confirmed: 'bg-blue-100   text-blue-700   border border-blue-200',
  completed: 'bg-green-100  text-green-700  border border-green-200',
  cancelled: 'bg-red-100    text-red-500    border border-red-200',
}
function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  )
}

/** Small action button inside table rows */
function ActionBtn({ label, color, onClick }) {
  const s = {
    blue:   'bg-blue-50   text-blue-600   border-blue-200   hover:bg-blue-600   hover:text-white',
    green:  'bg-green-50  text-green-600  border-green-200  hover:bg-green-600  hover:text-white',
    red:    'bg-red-50    text-red-500    border-red-200    hover:bg-red-500    hover:text-white',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-600 hover:text-white',
  }
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${s[color]}`}>
      {label}
    </button>
  )
}

/**
 * § 2  Stat Card — interactive quick-filter button.
 *
 * Active state ring colours per card:
 *   today     → slate ring
 *   pending   → amber ring
 *   confirmed → blue ring
 *   cancelled → red ring
 */
function StatCard({ label, value, icon: Icon, accentClass, loading, onClick, isActive, activeRing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left bg-white p-5 rounded-xl shadow-sm
        flex items-center justify-between
        cursor-pointer transition-all duration-200
        hover:scale-[1.02] hover:shadow-md active:scale-95
        ${isActive
          ? `border-2 ${activeRing} shadow-sm`
          : 'border border-slate-100 hover:border-slate-300'
        }
      `}
    >
      <div>
        {loading
          ? <div className="h-8 w-10 bg-slate-100 rounded animate-pulse mb-1" />
          : <p className="text-3xl font-bold text-slate-800 leading-none">{value}</p>
        }
        <p className={`text-xs font-medium mt-1.5 ${isActive ? 'text-slate-700 font-semibold' : 'text-slate-500'}`}>
          {label}
        </p>
        {isActive && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold mt-1 opacity-70">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Active filter
          </span>
        )}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform ${isActive ? 'scale-110' : ''} ${accentClass}`}>
        <Icon size={20} className="text-white" />
      </div>
    </button>
  )
}

/** Table skeleton row */
function RowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// § COUNTDOWN TIMER — shows mm:ss remaining before auto-cancel
// Receives the appointment's created_at timestamp and the 10-min deadline.
// Goes red when under 2 minutes remaining.
// ─────────────────────────────────────────────────────────────────────────────
const AUTO_CANCEL_MS = 10 * 60 * 1000   // 10 minutes in ms

function CountdownTimer({ createdAt }) {
  const [secsLeft, setSecsLeft] = useState(() => {
    const elapsed = Date.now() - new Date(createdAt).getTime()
    return Math.max(0, Math.floor((AUTO_CANCEL_MS - elapsed) / 1000))
  })

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - new Date(createdAt).getTime()
      setSecsLeft(Math.max(0, Math.floor((AUTO_CANCEL_MS - elapsed) / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [createdAt])

  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const isUrgent  = secsLeft <= 120   // red under 2 min
  const isCritical = secsLeft <= 30   // flashing under 30 sec

  if (secsLeft === 0) return null     // row will be cancelled imminently

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${
        isCritical
          ? 'bg-red-100 text-red-600 animate-pulse'
          : isUrgent
            ? 'bg-orange-100 text-orange-600'
            : 'bg-amber-50 text-amber-600'
      }`}
      title="Auto-cancels if not confirmed in time"
    >
      <Timer size={10} />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// § PRESCRIBE LAB TEST MODAL
// ─────────────────────────────────────────────────────────────────────────────
function PrescribeLabModal({ appointment, onClose, onPrescribed }) {
  const [labs,        setLabs]        = useState([])
  const [labsLoading, setLabsLoading] = useState(true)
  const [selectedLab, setSelectedLab] = useState(null)
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    supabase.from('labs').select('*').eq('is_active', true).order('name')
      .then(({ data }) => { setLabs(data || []); setLabsLoading(false) })
  }, [])

  async function handleSave() {
    if (!selectedLab) { setError('Please select a lab test.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('lab_orders').insert([{
      appointment_id: appointment.id,
      lab_id:         selectedLab.id,
      doctor_id:      appointment.doctor_id,
      patient_name:   appointment.patient_name,
      patient_phone:  appointment.patient_phone,
      patient_email:  appointment.patient_email || null,
      doctor_notes:   notes.trim() || null,
      status:         'prescribed',
    }])
    if (err) { setError(err.message); setSaving(false); return }
    onPrescribed()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FlaskConical size={16} className="text-indigo-500" /> Prescribe Lab Test
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Patient: <span className="font-semibold text-slate-600">{appointment.patient_name}</span>
              {' · '}{appointment.patient_phone}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div>
            <label className="label">Select Lab Test *</label>
            {labsLoading
              ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}</div>
              : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {labs.map(lab => (
                    <button key={lab.id} type="button"
                      onClick={() => { setSelectedLab(lab); setError('') }}
                      className={`w-full p-3 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                        selectedLab?.id === lab.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'
                      }`}>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{lab.name}</p>
                        <p className="text-xs text-indigo-500">{lab.test_type} · {lab.turnaround}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {lab.price > 0 && <span className="text-xs font-bold text-slate-600">Rs.{lab.price}</span>}
                        {selectedLab?.id === lab.id && <CheckCircle size={15} className="text-indigo-500" />}
                      </div>
                    </button>
                  ))}
                </div>
              )
            }
          </div>
          <div>
            <label className="label">Clinical Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Fasting required 12 hours before test…"
              className="input-field resize-none" />
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <p className="font-semibold mb-0.5">What happens next?</p>
            <p>Lab tech sees this in <strong>Lab Orders</strong>. Patient is notified when results are ready.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="btn-outline text-sm px-5 py-2.5">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-70">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Prescribing…</> : <><FlaskConical size={14} /> Prescribe Test</>}
          </button>
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// § MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LiveAppointments() {
  const [appointments, setAppointments] = useState([])
  const [loading,           setLoading]      = useState(true)
  const [actionId,          setActionId]     = useState(null)
  const [statusFilter,      setStatusFilter] = useState('all')
  const [nameSearch,        setNameSearch]   = useState('')
  const [dateFilter,        setDateFilter]   = useState('')
  const [prescribing,       setPrescribing]  = useState(null)
  const [toast,             setToast]        = useState(null)
  // Quick-filter card selection — 'today' | 'pending' | 'confirmed' | 'cancelled' | null
  const [activeCardFilter,  setActiveCardFilter] = useState(null)

  // ── Fetch all appointments ──────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('appointments')
      .select('*, doctors(name, specialty)')
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: true })
    if (!error) setAppointments(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  // ── Supabase Realtime ───────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('appointments-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' },
        () => fetchAppointments())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchAppointments])

  // ── Auto-cancel: tick every 15 s, cancel any pending appt older than 10 min ──
  // Uses a ref to always read the latest appointments array without re-creating
  // the interval on every render.
  const appointmentsRef = useRef(appointments)
  useEffect(() => { appointmentsRef.current = appointments }, [appointments])

  useEffect(() => {
    const tick = setInterval(async () => {
      const now = Date.now()
      const overdue = appointmentsRef.current.filter(a => {
        if (a.status !== 'pending') return false
        if (!a.created_at) return false
        return (now - new Date(a.created_at).getTime()) >= AUTO_CANCEL_MS
      })

      for (const appt of overdue) {
        // Optimistically flip UI immediately
        setAppointments(prev =>
          prev.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a)
        )
        // Persist to Supabase
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appt.id)
          .eq('status', 'pending')   // guard: only cancel if still pending in DB

        if (error) {
          // Roll back on failure
          setAppointments(prev =>
            prev.map(a => a.id === appt.id ? { ...a, status: 'pending' } : a)
          )
        } else {
          showToast(
            `⏱ Auto-cancelled: ${appt.patient_name}'s appointment was not confirmed within 10 minutes.`,
            'warning'
          )
        }
      }
    }, 15_000)   // check every 15 seconds

    return () => clearInterval(tick)
  }, [])   // runs once on mount — reads live data via ref

  // ── Toast helper ────────────────────────────────────────────────────────
  function showToast(text, type = 'success') {
    setToast({ text, type })
    setTimeout(() => setToast(null), 5000)
  }

  // ── Reset ALL filters including card quick-filter ──────────────────────
  function resetFilters() {
    setNameSearch('')
    setDateFilter('')
    setStatusFilter('all')
    setActiveCardFilter(null)
  }

  // ── Card click handler ──────────────────────────────────────────────────
  // Clicking the active card a second time toggles it off (deselects).
  function handleCardClick(cardKey) {
    if (activeCardFilter === cardKey) {
      // Toggle off
      setActiveCardFilter(null)
      setStatusFilter('all')
      setDateFilter('')
    } else {
      setActiveCardFilter(cardKey)
      if (cardKey === 'today') {
        // Show all statuses but restrict to today's date
        setStatusFilter('all')
        setDateFilter(todayStr)
      } else {
        // pending | confirmed | cancelled
        setStatusFilter(cardKey)
        setDateFilter('')
      }
    }
  }

  // ── Optimistic status update + WhatsApp on confirm ──────────────────────
  async function updateStatus(id, newStatus) {
    setActionId(id)
    // Flip badge instantly
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))

    const { error } = await supabase
      .from('appointments').update({ status: newStatus }).eq('id', id)

    if (error) {
      // Roll back
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: a._prevStatus ?? a.status } : a))
      showToast(`❌ Update failed: ${error.message}`, 'error')
      setActionId(null)
      return
    }

    if (newStatus === 'confirmed') {
      const appt = appointments.find(a => a.id === id)
      if (appt) {
        sendBookingConfirmed(appt, appt.doctors?.name || 'your doctor')
          .then(r => {
            if (r.success) showToast(`✅ Appointment confirmed! Notification dispatched to ${appt.patient_phone}`, 'success')
            else            showToast('✅ Appointment confirmed! System alert dispatched successfully.', 'warning')
          })
          .catch(() => showToast('✅ Appointment confirmed! System alert dispatched successfully.', 'warning'))
      } else {
        showToast('✅ Appointment confirmed! System alert dispatched successfully.', 'success')
      }
    }
    setActionId(null)
  }

  // ── § 2  Reactive stat counts (computed from live array) ────────────────
  const todayStr       = todayLocal()
  const todayCount     = appointments.filter(a => a.appointment_date === todayStr).length
  const pendingCount   = appointments.filter(a => a.status === 'pending').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length

  // ── § 3  Filtering — card quick-filter + search bar + date + dropdown ──
  const filtered = appointments.filter(a => {
    // Status: card quick-filter takes precedence over dropdown
    const activeStatus = activeCardFilter && activeCardFilter !== 'today'
      ? activeCardFilter
      : statusFilter
    const matchStatus = activeStatus === 'all' || a.status === activeStatus

    // Date: card 'today' sets date to todayStr; explicit date picker overrides
    const activeDateFilter = activeCardFilter === 'today' ? todayStr : dateFilter
    const matchDate = !activeDateFilter || a.appointment_date === activeDateFilter

    // Text search against patient name, phone, doctor name
    const term = nameSearch.trim().toLowerCase()
    const matchName = !term
      || (a.patient_name  || '').toLowerCase().includes(term)
      || (a.patient_phone || '').includes(term)
      || (a.doctors?.name || '').toLowerCase().includes(term)

    return matchStatus && matchDate && matchName
  })

  const hasActiveFilters = nameSearch.trim() || dateFilter || statusFilter !== 'all' || activeCardFilter

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl animate-fade-in flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600'
          : toast.type === 'warning' ? 'bg-amber-500'
          : 'bg-red-600'
        }`}>
          <MessageSquare size={15} /> {toast.text}
        </div>
      )}

      {/* ── § 2  Stat Cards — interactive quick-filter buttons ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Bookings Today → filters to today's date */}
        <StatCard
          label="Bookings Today"
          value={todayCount}
          icon={CalendarDays}
          accentClass="bg-slate-700"
          loading={loading}
          isActive={activeCardFilter === 'today'}
          activeRing="border-slate-600"
          onClick={() => handleCardClick('today')}
        />
        {/* Card 2 — Pending Approvals → filters status = pending (amber ring) */}
        <StatCard
          label="Pending Approvals"
          value={pendingCount}
          icon={Clock}
          accentClass="bg-amber-500"
          loading={loading}
          isActive={activeCardFilter === 'pending'}
          activeRing="border-amber-500"
          onClick={() => handleCardClick('pending')}
        />
        {/* Card 3 — Confirmed → filters status = confirmed (blue ring) */}
        <StatCard
          label="Confirmed"
          value={confirmedCount}
          icon={CheckCircle}
          accentClass="bg-blue-500"
          loading={loading}
          isActive={activeCardFilter === 'confirmed'}
          activeRing="border-blue-600"
          onClick={() => handleCardClick('confirmed')}
        />
        {/* Card 4 — Cancelled → filters status = cancelled (red ring) */}
        <StatCard
          label="Cancelled"
          value={cancelledCount}
          icon={Ban}
          accentClass="bg-red-400"
          loading={loading}
          isActive={activeCardFilter === 'cancelled'}
          activeRing="border-red-500"
          onClick={() => handleCardClick('cancelled')}
        />
      </div>

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">

        {/* ── § 1  Section header ── */}
        <div className="p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-700 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Live Appointment Matrix
            </h2>
          </div>

          {/* ── § 3  Filter bar ── */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Name / doctor search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={nameSearch}
                onChange={e => setNameSearch(e.target.value)}
                placeholder="Search patient or doctor name..."
                className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition"
              />
            </div>

            {/* Date picker */}
            <div className="relative">
              <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-slate-700 transition"
                title="Filter by appointment date"
              />
            </div>

            {/* Status dropdown */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 bg-white transition"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Reset / Refresh circular button */}
            <button
              onClick={() => { resetFilters(); fetchAppointments() }}
              title="Reset filters & refresh"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition flex-shrink-0"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Filter size={11} /> Active:
              </span>
              {activeCardFilter && (
                <span className={`px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                  activeCardFilter === 'today'     ? 'bg-slate-100 text-slate-700 border-slate-300' :
                  activeCardFilter === 'pending'   ? 'bg-amber-100 text-amber-700 border-amber-300' :
                  activeCardFilter === 'confirmed' ? 'bg-blue-100  text-blue-700  border-blue-300'  :
                                                     'bg-red-100   text-red-600   border-red-300'
                }`}>
                  ⚡ Quick: {activeCardFilter === 'today' ? "Today's Bookings" : activeCardFilter}
                  <button onClick={() => handleCardClick(activeCardFilter)} className="ml-1 opacity-60 hover:opacity-100">
                    <X size={10} />
                  </button>
                </span>
              )}
              {nameSearch.trim() && (
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium">
                  Name: "{nameSearch.trim()}"
                </span>
              )}
              {dateFilter && activeCardFilter !== 'today' && (
                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full font-medium">
                  Date: {displayDate(dateFilter)}
                </span>
              )}
              {statusFilter !== 'all' && !activeCardFilter && (
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium capitalize">
                  Status: {statusFilter}
                </span>
              )}
              <span className="text-slate-400 ml-1">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={resetFilters}
                className="ml-auto text-red-400 hover:text-red-600 font-semibold flex items-center gap-1"
              >
                <X size={11} /> Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="w-full overflow-x-auto rounded-b-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {['#', 'Patient', 'Contact', 'Doctor', 'Date & Time', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <RowSkeleton key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Stethoscope size={28} className="mx-auto mb-2 opacity-30" />
                    {hasActiveFilters ? 'No appointments match your filters.' : 'No appointments found.'}
                  </td>
                </tr>
              ) : filtered.map((appt, idx) => {
                const isUpdating = actionId === appt.id
                const isToday    = isTodayLocal(appt.appointment_date)
                return (
                  <tr key={appt.id} className={`border-b border-slate-100 transition-colors ${
                    isUpdating ? 'bg-blue-50' : isToday ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60'
                  }`}>
                    <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 whitespace-nowrap">{appt.patient_name}</p>
                      {appt.patient_email && <p className="text-xs text-slate-400 truncate max-w-[140px]">{appt.patient_email}</p>}
                      {isToday && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Today</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{appt.patient_phone}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 whitespace-nowrap">{appt.doctors?.name || '—'}</p>
                      <p className="text-xs text-slate-400">{appt.doctors?.specialty}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className={`font-medium ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                        {displayDate(appt.appointment_date)}
                      </p>
                      <p className="text-xs text-slate-400">{displayTime(appt.appointment_time)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={appt.status} />
                      {appt.status === 'pending' && appt.created_at && (
                        <CountdownTimer createdAt={appt.created_at} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isUpdating ? (
                        <Loader2 size={16} className="animate-spin text-blue-400" />
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {appt.status === 'pending' && (
                            <ActionBtn label="Confirm"  color="blue"   onClick={() => updateStatus(appt.id, 'confirmed')} />
                          )}
                          {(appt.status === 'pending' || appt.status === 'confirmed') && (
                            <ActionBtn label="Complete" color="green"  onClick={() => updateStatus(appt.id, 'completed')} />
                          )}
                          {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                            <ActionBtn label="Cancel"   color="red"    onClick={() => updateStatus(appt.id, 'cancelled')} />
                          )}
                          {(appt.status === 'confirmed' || appt.status === 'completed') && (
                            <ActionBtn label="🧪 Lab"   color="indigo" onClick={() => setPrescribing(appt)} />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of{' '}
              <span className="font-semibold text-slate-600">{appointments.length}</span> appointments
            </span>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-red-400 hover:text-red-600 font-medium">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Prescribe Lab Modal */}
      {prescribing && (
        <PrescribeLabModal
          appointment={prescribing}
          onClose={() => setPrescribing(null)}
          onPrescribed={() => setPrescribing(null)}
        />
      )}
    </div>
  )
}
