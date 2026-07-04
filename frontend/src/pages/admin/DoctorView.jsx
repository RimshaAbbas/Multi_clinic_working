/**
 * DoctorView.jsx
 * ──────────────
 * Doctor's personal dashboard — today's patients + patient history panel.
 *
 * Features
 * ─────────────────────────────────────────────────────────────────────────
 *  • Doctor selector dropdown (all active doctors)
 *  • 4 stat cards: Today / Pending / Confirmed / Completed
 *  • Patient cards for today's appointments
 *  • Click a patient → expandable history panel showing:
 *      - All previous appointments (any date) for that patient name
 *      - All lab orders ever prescribed for that patient
 *  • Prescribe Lab Test modal on confirmed/completed patients
 *  • Supabase Realtime refresh
 *  • All dates/times rendered via dateTime.js (Asia/Karachi)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Stethoscope, CalendarDays, Clock, CheckCircle, XCircle,
  Loader2, RefreshCw, FlaskConical, X, AlertCircle,
  User, Phone, ClipboardList, ChevronRight, Activity,
  ChevronDown, ChevronUp, History, FlaskConical as LabIcon,
} from 'lucide-react'
import supabase from '../../lib/supabaseClient'
import { displayDate, displayTime, isTodayLocal, todayLocal } from '../../utils/dateTime'

// ── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:          'bg-amber-100  text-amber-700  border border-amber-200',
  confirmed:        'bg-blue-100   text-blue-700   border border-blue-200',
  completed:        'bg-green-100  text-green-700  border border-green-200',
  cancelled:        'bg-red-100    text-red-500    border border-red-200',
  prescribed:       'bg-slate-100  text-slate-600  border border-slate-200',
  sample_collected: 'bg-amber-100  text-amber-700  border border-amber-200',
  processing:       'bg-purple-100 text-purple-700 border border-purple-200',
  results_ready:    'bg-green-100  text-green-700  border border-green-200',
}

function StatusBadge({ status }) {
  const label = status?.replace(/_/g, ' ') ?? '—'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-500'}`}>
      {label}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, colorClass, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        {loading
          ? <div className="h-7 w-8 bg-slate-100 rounded animate-pulse mb-1" />
          : <p className="text-2xl font-extrabold text-[#1E3A8A] leading-none">{value}</p>
        }
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  )
}

// ── Patient History Panel ─────────────────────────────────────────────────────
/**
 * Shown below a patient card when the doctor clicks "View History".
 * Queries by patient_name (best match we have without a patient_id).
 */
function PatientHistoryPanel({ patientName, currentApptId }) {
  const [apptHistory, setApptHistory] = useState([])
  const [labHistory,  setLabHistory]  = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!patientName) return
    setLoading(true)

    Promise.all([
      // All appointments for this patient name (excluding current one)
      supabase
        .from('appointments')
        .select('*, doctors(name, specialty)')
        .ilike('patient_name', patientName)
        .order('appointment_date', { ascending: false })
        .limit(20),

      // All lab orders for this patient name
      supabase
        .from('lab_orders')
        .select('*, labs(name, test_type), doctors(name)')
        .ilike('patient_name', patientName)
        .order('prescribed_at', { ascending: false })
        .limit(20),
    ]).then(([apptRes, labRes]) => {
      setApptHistory(
        (apptRes.data || []).filter(a => a.id !== currentApptId)
      )
      setLabHistory(labRes.data || [])
      setLoading(false)
    })
  }, [patientName, currentApptId])

  if (loading) {
    return (
      <div className="mt-3 bg-slate-50 rounded-xl p-4 space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const hasHistory = apptHistory.length > 0 || labHistory.length > 0

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 space-y-4">

      {/* ── Previous Appointments ── */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
          <History size={11} /> Past Appointments ({apptHistory.length})
        </p>
        {apptHistory.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No previous appointments on record.</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {apptHistory.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">{displayDate(a.appointment_date)}</span>
                  <span className="text-slate-400 mx-1">·</span>
                  <span className="text-slate-500">{displayTime(a.appointment_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 hidden sm:inline">{a.doctors?.name}</span>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lab Orders ── */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
          <FlaskConical size={11} /> Lab Orders ({labHistory.length})
        </p>
        {labHistory.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No lab orders on record.</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {labHistory.map(l => (
              <div key={l.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">{l.labs?.name || '—'}</span>
                  <span className="text-slate-400 mx-1">·</span>
                  <span className="text-indigo-500">{l.labs?.test_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{displayDate(l.prescribed_at)}</span>
                  <StatusBadge status={l.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!hasHistory && (
        <p className="text-xs text-slate-400 text-center py-2 italic">
          This is the patient's first visit. No history found.
        </p>
      )}
    </div>
  )
}


// ── Prescribe Lab Modal ───────────────────────────────────────────────────────
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
    if (!selectedLab) { setError('Please select a lab test first.'); return }
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
    onPrescribed(appointment.patient_name, selectedLab.name)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#1E3A8A] flex items-center gap-2">
              <FlaskConical size={16} /> Prescribe Lab Test
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Patient: <span className="font-semibold text-slate-600">{appointment.patient_name}</span>
              {' '}· {appointment.patient_phone}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div>
            <label className="label">Select Lab Test *</label>
            {labsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}</div>
            ) : labs.length === 0 ? (
              <p className="text-sm text-slate-400 py-3 text-center">No active lab tests. Add them in Lab Configurations.</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {labs.map(lab => (
                  <button key={lab.id} type="button"
                    onClick={() => { setSelectedLab(lab); setError('') }}
                    className={`w-full p-3 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                      selectedLab?.id === lab.id ? 'border-[#1E3A8A] bg-[#1E3A8A]/5' : 'border-slate-200 hover:border-[#3B82F6]'
                    }`}>
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
          <div>
            <label className="label">Clinical Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Fasting required 12 hours before test…"
              className="input-field resize-none" />
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <p className="font-semibold mb-0.5">What happens next?</p>
            <p>Lab technician will see this in <strong>Lab Orders</strong>. Patient gets WhatsApp when results are ready.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="btn-outline text-sm px-5 py-2.5">Cancel</button>
          <button onClick={handleSave} disabled={saving || !selectedLab}
            className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-70">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Prescribing…</> : <><FlaskConical size={14} /> Prescribe Test</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Patient Card ──────────────────────────────────────────────────────────────
function PatientCard({ appt, onPrescribe, alreadyPrescribed, expanded, onToggleHistory }) {
  const canPrescribe = appt.status === 'confirmed' || appt.status === 'completed'

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 transition-all hover:shadow-md ${
      appt.status === 'cancelled' ? 'opacity-60 border-slate-100' : 'border-slate-200'
    }`}>

      {/* Time + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#1E3A8A]">
          <Clock size={14} />
          <span className="text-sm font-bold">{displayTime(appt.appointment_time)}</span>
        </div>
        <StatusBadge status={appt.status} />
      </div>

      {/* Patient info */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {appt.patient_name?.[0]?.toUpperCase() || 'P'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800">{appt.patient_name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Phone size={11} className="text-slate-400" />
            <span className="text-xs text-slate-500">{appt.patient_phone}</span>
          </div>
          {appt.patient_email && (
            <p className="text-xs text-slate-400 truncate mt-0.5">{appt.patient_email}</p>
          )}
        </div>
      </div>

      {/* Reason */}
      {appt.reason && (
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ClipboardList size={12} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{appt.reason}</p>
        </div>
      )}

      {/* Actions row */}
      <div className="flex gap-2">
        {/* History toggle */}
        <button
          onClick={onToggleHistory}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Hide History' : 'View History'}
        </button>

        {/* Prescribe lab */}
        {canPrescribe && (
          <button
            onClick={() => onPrescribe(appt)}
            disabled={alreadyPrescribed}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
              alreadyPrescribed
                ? 'border-green-200 bg-green-50 text-green-600 cursor-default'
                : 'border-[#1E3A8A]/30 text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white hover:border-[#1E3A8A]'
            }`}
          >
            <FlaskConical size={13} />
            {alreadyPrescribed ? 'Prescribed ✓' : 'Prescribe Lab'}
          </button>
        )}
      </div>

      {/* Expandable history panel */}
      {expanded && (
        <PatientHistoryPanel
          patientName={appt.patient_name}
          currentApptId={appt.id}
        />
      )}

      {appt.status === 'cancelled' && (
        <p className="text-xs text-center text-red-400">Appointment was cancelled</p>
      )}
      {appt.status === 'pending' && (
        <p className="text-xs text-center text-amber-500">Waiting for staff to confirm</p>
      )}
    </div>
  )
}


// ── Main component ────────────────────────────────────────────────────────────
export default function DoctorView() {
  const today = todayLocal()

  const [doctors,        setDoctors]        = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [appointments,   setAppointments]   = useState([])
  const [prescribedIds,  setPrescribedIds]  = useState(new Set())
  const [loading,        setLoading]        = useState(false)
  const [doctorsLoading, setDoctorsLoading] = useState(true)
  const [prescribing,    setPrescribing]    = useState(null)
  const [expandedId,     setExpandedId]     = useState(null) // which card shows history
  const [toast,          setToast]          = useState(null)

  // Load active doctors
  useEffect(() => {
    supabase.from('doctors').select('id, name, specialty')
      .eq('is_active', true).order('name')
      .then(({ data }) => { setDoctors(data || []); setDoctorsLoading(false) })
  }, [])

  // Fetch today's appointments for selected doctor
  const fetchAppointments = useCallback(async () => {
    if (!selectedDoctor) { setAppointments([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', selectedDoctor)
      .eq('appointment_date', today)
      .order('appointment_time', { ascending: true })
    if (!error) setAppointments(data || [])
    setLoading(false)
  }, [selectedDoctor, today])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  // Realtime: refresh when appointments change for this doctor
  useEffect(() => {
    if (!selectedDoctor) return
    const ch = supabase
      .channel(`doctor-view-${selectedDoctor}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments',
        filter: `doctor_id=eq.${selectedDoctor}`,
      }, () => fetchAppointments())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [selectedDoctor, fetchAppointments])

  // Track which appointments already have lab orders (no double-prescribing)
  useEffect(() => {
    if (appointments.length === 0) { setPrescribedIds(new Set()); return }
    const ids = appointments.map(a => a.id)
    supabase.from('lab_orders').select('appointment_id').in('appointment_id', ids)
      .then(({ data }) => {
        if (data) setPrescribedIds(new Set(data.map(r => r.appointment_id)))
      })
  }, [appointments])

  function showToast(text, type = 'success') {
    setToast({ text, type })
    setTimeout(() => setToast(null), 5000)
  }

  function handlePrescribed(patientName, testName) {
    setPrescribing(null)
    showToast(`✅ ${testName} prescribed for ${patientName}`)
    // Refresh prescribed IDs
    const ids = appointments.map(a => a.id)
    supabase.from('lab_orders').select('appointment_id').in('appointment_id', ids)
      .then(({ data }) => {
        if (data) setPrescribedIds(new Set(data.map(r => r.appointment_id)))
      })
  }

  function toggleHistory(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  const total     = appointments.length
  const pending   = appointments.filter(a => a.status === 'pending').length
  const confirmed = appointments.filter(a => a.status === 'confirmed').length
  const completed = appointments.filter(a => a.status === 'completed').length

  const todayLabel = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Karachi',
  })

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl animate-fade-in flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-[#1E3A8A]' : 'bg-red-600'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header + doctor selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#1E3A8A] flex items-center gap-2">
              <Activity size={18} /> Doctor's Today View
            </h2>
            <p className="text-xs text-slate-400 mt-1">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">Viewing Doctor:</label>
            {doctorsLoading
              ? <div className="h-9 w-52 bg-slate-100 rounded-xl animate-pulse" />
              : (
                <select value={selectedDoctor || ''} onChange={e => { setSelectedDoctor(e.target.value || null); setExpandedId(null) }}
                  className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-slate-700 bg-white min-w-[210px]">
                  <option value="">— Select Doctor —</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialty})</option>
                  ))}
                </select>
              )
            }
            <button onClick={fetchAppointments}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-[#1E3A8A] transition" title="Refresh">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {selectedDoctor && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Patients Today" value={total}     icon={User}        colorClass="bg-[#1E3A8A]" loading={loading} />
          <StatCard label="Pending"        value={pending}   icon={Clock}       colorClass="bg-amber-500"  loading={loading} />
          <StatCard label="Confirmed"      value={confirmed} icon={CheckCircle} colorClass="bg-blue-500"   loading={loading} />
          <StatCard label="Completed"      value={completed} icon={Activity}    colorClass="bg-green-500"  loading={loading} />
        </div>
      )}

      {/* Patient cards */}
      {!selectedDoctor ? (
        <div className="text-center py-20 text-slate-400">
          <Stethoscope size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-base font-semibold text-slate-500">Select a doctor above</p>
          <p className="text-sm mt-1">Today's patient list will appear here.</p>
        </div>
      ) : loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3 animate-pulse">
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-32 bg-slate-100 rounded" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-14 bg-slate-50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-base font-semibold text-slate-500">No patients today</p>
          <p className="text-sm mt-1">This doctor has no appointments scheduled for today.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">
              Today's Patients — {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.map(appt => (
              <PatientCard
                key={appt.id}
                appt={appt}
                onPrescribe={setPrescribing}
                alreadyPrescribed={prescribedIds.has(appt.id)}
                expanded={expandedId === appt.id}
                onToggleHistory={() => toggleHistory(appt.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Prescribe modal */}
      {prescribing && (
        <PrescribeLabModal
          appointment={prescribing}
          onClose={() => setPrescribing(null)}
          onPrescribed={handlePrescribed}
        />
      )}
    </div>
  )
}
