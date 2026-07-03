/**
 * LiveAppointments.jsx
 * ---------------------
 * Displays all doctor consultation appointments in a live table.
 *
 * Subscribes to Supabase Realtime → any INSERT/UPDATE on `appointments`
 * instantly updates the UI without a browser reload.
 *
 * Staff actions per row:
 *   • Confirm / Complete / Cancel — mutate appointment status
 *   • Prescribe Lab Test          — opens a modal to create a lab_order
 *     row linked to this appointment (visible in the Lab Orders tab)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, XCircle, Clock, Loader2, Search,
  RefreshCw, CalendarDays, FlaskConical, X, Save,
  AlertCircle, Stethoscope, MessageSquare,
} from 'lucide-react'
import supabase from '../../lib/supabaseClient'
import { sendBookingConfirmed } from '../../utils/notifications'
import { format, isToday, parseISO } from 'date-fns'

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:   'bg-amber-100  text-amber-700  border border-amber-200',
  confirmed: 'bg-blue-100   text-blue-700   border border-blue-200',
  completed: 'bg-green-100  text-green-700  border border-green-200',
  cancelled: 'bg-red-100    text-red-500    border border-red-200',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status] || ''}`}>
      {status}
    </span>
  )
}

function ActionBtn({ label, color, onClick, small }) {
  const styles = {
    blue:  'bg-blue-50  text-blue-600  border-blue-200  hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
    red:   'bg-red-50   text-red-500   border-red-200   hover:bg-red-100',
    indigo:'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100',
  }
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${styles[color]}`}
    >
      {label}
    </button>
  )
}

// ── Stats card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        {loading
          ? <div className="h-7 w-10 bg-slate-100 rounded animate-pulse mb-1" />
          : <p className="text-2xl font-extrabold text-[#1E3A8A] leading-none">{value}</p>
        }
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  )
}

function RowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
      ))}
    </tr>
  )
}

// ── Prescribe Lab Test Modal ──────────────────────────────────────────────────
function PrescribeLabModal({ appointment, onClose, onPrescribed }) {
  const [labs,       setLabs]       = useState([])
  const [labsLoading, setLabsLoading] = useState(true)
  const [selectedLab, setSelectedLab] = useState(null)
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    async function fetchLabs() {
      setLabsLoading(true)
      const { data } = await supabase.from('labs').select('*').eq('is_active', true).order('name')
      setLabs(data || [])
      setLabsLoading(false)
    }
    fetchLabs()
  }, [])

  async function handleSave() {
    if (!selectedLab) { setError('Please select a lab test.'); return }
    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('lab_orders').insert([{
      appointment_id:  appointment.id,
      lab_id:          selectedLab.id,
      doctor_id:       appointment.doctor_id,
      patient_name:    appointment.patient_name,
      patient_phone:   appointment.patient_phone,
      patient_email:   appointment.patient_email || null,
      doctor_notes:    notes.trim() || null,
      status:          'prescribed',
    }])

    if (err) { setError(err.message); setSaving(false); return }
    onPrescribed()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#1E3A8A] flex items-center gap-2">
              <FlaskConical size={16} /> Prescribe Lab Test
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              For: <span className="font-semibold text-slate-600">{appointment.patient_name}</span>
              {' '}· {appointment.patient_phone}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Lab test selection */}
          <div>
            <label className="label">Select Lab Test *</label>
            {labsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {labs.map(lab => (
                  <button
                    key={lab.id}
                    type="button"
                    onClick={() => { setSelectedLab(lab); setError('') }}
                    className={`w-full p-3 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                      selectedLab?.id === lab.id
                        ? 'border-[#1E3A8A] bg-[#1E3A8A]/5'
                        : 'border-slate-200 hover:border-[#3B82F6]'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{lab.name}</p>
                      <p className="text-xs text-indigo-500">{lab.test_type} · {lab.turnaround}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {lab.price > 0 && <span className="text-xs font-bold text-slate-600">Rs.{lab.price}</span>}
                      {selectedLab?.id === lab.id && <CheckCircle size={15} className="text-[#1E3A8A]" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Doctor notes */}
          <div>
            <label className="label">Clinical Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Fasting required 12 hours before test…"
              className="input-field resize-none"
            />
          </div>

          {/* What happens next info */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <p className="font-semibold mb-1">What happens next?</p>
            <p>The lab technician will see this order in the <strong>Lab Orders</strong> tab.</p>
            <p className="mt-0.5">When results are ready, <strong>{appointment.patient_name}</strong> ({appointment.patient_phone}) will be notified automatically.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="btn-outline text-sm px-5 py-2.5">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-70">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
            Prescribe Test
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LiveAppointments() {
  const [appointments, setAppointments] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [actionId,     setActionId]     = useState(null)
  const [filter,       setFilter]       = useState('all')
  const [search,       setSearch]       = useState('')
  const [prescribing,  setPrescribing]  = useState(null)  // appointment being prescribed for

  // ── Fetch appointments ────────────────────────────────────────────────────
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

  // ── Supabase Realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('appointments-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchAppointments])

  // ── Update status + send WhatsApp on confirm ─────────────────────────────
  async function updateStatus(id, newStatus) {
    setActionId(id)

    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      console.error('[LiveAppts] Update failed:', error.message)
      setActionId(null)
      return
    }

    // Send real WhatsApp message when status becomes 'confirmed'
    if (newStatus === 'confirmed') {
      const appt = appointments.find(a => a.id === id)
      if (appt) {
        const doctorName = appt.doctors?.name || 'your doctor'
        // Fire and forget — don't block the UI
        sendBookingConfirmed(appt, doctorName)
          .then(result => {
            if (result.success) {
              console.log(`[WhatsApp] Booking confirmation sent to ${appt.patient_phone}`)
            } else {
              console.warn(`[WhatsApp] Failed to send confirmation: ${result.error}`)
            }
          })
      }
    }

    setActionId(null)
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const todayCount     = appointments.filter(a => isToday(parseISO(a.appointment_date))).length
  const pendingCount   = appointments.filter(a => a.status === 'pending').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = appointments.filter(a => {
    const matchStatus = filter === 'all' || a.status === filter
    const term = search.toLowerCase()
    const matchSearch = !term ||
      a.patient_name.toLowerCase().includes(term) ||
      a.patient_phone.includes(term) ||
      (a.doctors?.name || '').toLowerCase().includes(term)
    return matchStatus && matchSearch
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Bookings Today"    value={todayCount}    icon={CalendarDays}  color="bg-[#1E3A8A]" loading={loading} />
        <StatCard label="Pending Approvals" value={pendingCount}  icon={Clock}         color="bg-amber-500"  loading={loading} />
        <StatCard label="Confirmed"         value={confirmedCount} icon={CheckCircle}  color="bg-blue-500"   loading={loading} />
        <StatCard label="Cancelled"         value={cancelledCount} icon={XCircle}      color="bg-red-400"    loading={loading} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-bold text-[#1E3A8A] flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live Appointment Matrix
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search patient, doctor…"
                className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] w-52" />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-slate-700 bg-white">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button onClick={fetchAppointments}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-slate-500 hover:text-[#1E3A8A]" title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
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
                    No appointments found.
                  </td>
                </tr>
              ) : (
                filtered.map((appt, idx) => {
                  const isUpdating = actionId === appt.id

                  return (
                    <tr key={appt.id}
                      className={`border-b border-slate-100 transition-colors ${isUpdating ? 'bg-blue-50' : 'hover:bg-slate-50/70'}`}>

                      <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 whitespace-nowrap">{appt.patient_name}</p>
                        {appt.patient_email && <p className="text-xs text-slate-400 truncate max-w-[140px]">{appt.patient_email}</p>}
                      </td>

                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{appt.patient_phone}</td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700 whitespace-nowrap">{appt.doctors?.name || '—'}</p>
                        <p className="text-xs text-slate-400">{appt.doctors?.specialty}</p>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className={`font-medium ${isToday(parseISO(appt.appointment_date)) ? 'text-[#1E3A8A]' : 'text-slate-700'}`}>
                          {format(parseISO(appt.appointment_date), 'dd MMM yyyy')}
                        </p>
                        <p className="text-xs text-slate-400">{appt.appointment_time}</p>
                      </td>

                      <td className="px-4 py-3"><StatusBadge status={appt.status} /></td>

                      <td className="px-4 py-3">
                        {isUpdating ? (
                          <Loader2 size={16} className="animate-spin text-[#3B82F6]" />
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {appt.status === 'pending' && (
                              <ActionBtn label="Confirm" color="blue" onClick={() => updateStatus(appt.id, 'confirmed')} />
                            )}
                            {(appt.status === 'pending' || appt.status === 'confirmed') && (
                              <ActionBtn label="Complete" color="green" onClick={() => updateStatus(appt.id, 'completed')} />
                            )}
                            {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                              <ActionBtn label="Cancel" color="red" onClick={() => updateStatus(appt.id, 'cancelled')} />
                            )}
                            {/* Prescribe Lab — available on confirmed or completed appointments */}
                            {(appt.status === 'confirmed' || appt.status === 'completed') && (
                              <ActionBtn
                                label="🧪 Lab"
                                color="indigo"
                                onClick={() => setPrescribing(appt)}
                              />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 text-right">
            Showing {filtered.length} of {appointments.length} appointments
          </div>
        )}
      </div>

      {/* Prescribe Lab Modal */}
      {prescribing && (
        <PrescribeLabModal
          appointment={prescribing}
          onClose={() => setPrescribing(null)}
          onPrescribed={() => {
            setPrescribing(null)
            // Switch to Lab Orders tab is handled by parent — this just closes
            // the modal. The lab_orders table picks it up via Realtime.
          }}
        />
      )}
    </div>
  )
}
