/**
 * DoctorSchedules.jsx
 * --------------------
 * Manage the clinic's doctor profiles.
 * Add new doctors, toggle active/inactive, view schedule.
 *
 * Fix applied: proper error display + success toast + RLS-safe operations.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Clock, CheckCircle, XCircle,
  Loader2, AlertCircle, X, Save, RefreshCw,
} from 'lucide-react'
import supabase from '../../lib/supabaseClient'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ALL_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]

const SPECIALTIES = [
  'General Medicine', 'Dental', 'Dermatology', 'Physiotherapy',
  'Cardiology', 'Ophthalmology', 'ENT', 'Orthopedics', 'Neurology',
]

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Add Doctor Modal ──────────────────────────────────────────────────────────
function AddDoctorModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', specialty: '', qualification: '', phone: '', email: '',
  })
  const [schedule, setSchedule] = useState({})
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  function toggleSlot(day, slot) {
    setSchedule(prev => {
      const current = prev[day] || []
      const updated  = current.includes(slot)
        ? current.filter(s => s !== slot)
        : [...current, slot].sort()
      // Remove the day key entirely if no slots selected
      if (updated.length === 0) {
        const next = { ...prev }
        delete next[day]
        return next
      }
      return { ...prev, [day]: updated }
    })
  }

  function validateForm() {
    const fe = {}
    if (!form.name.trim())    fe.name      = 'Doctor name is required.'
    if (!form.specialty)      fe.specialty  = 'Please select a specialty.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      fe.email = 'Enter a valid email address.'
    }
    setFieldErrors(fe)
    return Object.keys(fe).length === 0
  }

  async function handleSave() {
    setError('')
    if (!validateForm()) return

    setSaving(true)

    // Verify the user is still authenticated before attempting write
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Your session has expired. Please log out and log in again.')
      setSaving(false)
      return
    }

    const payload = {
      name:          form.name.trim(),
      specialty:     form.specialty,
      qualification: form.qualification.trim() || null,
      phone:         form.phone.trim()         || null,
      email:         form.email.trim()         || null,
      schedule:      Object.keys(schedule).length > 0 ? schedule : {},
      is_active:     true,
    }

    const { data, error: insertError } = await supabase
      .from('doctors')
      .insert([payload])
      .select()  // return the inserted row so we can confirm it saved

    if (insertError) {
      // Translate technical errors into readable messages
      if (insertError.message?.includes('row-level security') || insertError.code === '42501') {
        setError(
          'Permission denied. Make sure you are logged in as admin and the database ' +
          'RLS policy allows authenticated users to insert doctors.'
        )
      } else {
        setError(`Save failed: ${insertError.message}`)
      }
      setSaving(false)
      return
    }

    if (!data || data.length === 0) {
      setError('Doctor was not saved — no data returned from database. Check RLS policies.')
      setSaving(false)
      return
    }

    // Success — close modal and refresh list
    setSaving(false)
    onSaved(data[0].name)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-[#1E3A8A]">Add New Doctor</h3>
            <p className="text-xs text-slate-400 mt-0.5">Fill in the details and select availability slots</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 text-red-700 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Field label="Full Name" required>
                <input
                  className={`input-field ${fieldErrors.name ? 'border-red-400' : ''}`}
                  placeholder="Dr. Jane Smith"
                  value={form.name}
                  onChange={e => {
                    setForm(f => ({ ...f, name: e.target.value }))
                    setFieldErrors(fe => ({ ...fe, name: '' }))
                  }}
                />
              </Field>
              {fieldErrors.name && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} />{fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <Field label="Specialty" required>
                <select
                  className={`input-field ${fieldErrors.specialty ? 'border-red-400' : ''}`}
                  value={form.specialty}
                  onChange={e => {
                    setForm(f => ({ ...f, specialty: e.target.value }))
                    setFieldErrors(fe => ({ ...fe, specialty: '' }))
                  }}
                >
                  <option value="">— Select specialty —</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              {fieldErrors.specialty && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} />{fieldErrors.specialty}
                </p>
              )}
            </div>

            <Field label="Qualification">
              <input
                className="input-field"
                placeholder="MBBS, FCPS"
                value={form.qualification}
                onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
              />
            </Field>

            <Field label="Phone">
              <input
                className="input-field"
                placeholder="+92-300-0000000"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </Field>
          </div>

          <div>
            <Field label="Email">
              <input
                className={`input-field ${fieldErrors.email ? 'border-red-400' : ''}`}
                type="email"
                placeholder="doctor@multicare.pk"
                value={form.email}
                onChange={e => {
                  setForm(f => ({ ...f, email: e.target.value }))
                  setFieldErrors(fe => ({ ...fe, email: '' }))
                }}
              />
            </Field>
            {fieldErrors.email && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={11} />{fieldErrors.email}
              </p>
            )}
          </div>

          {/* Schedule grid */}
          <div>
            <label className="label mb-3 block">
              Availability Schedule
              <span className="text-xs text-slate-400 font-normal ml-2">
                (click slots to toggle — optional)
              </span>
            </label>
            <div className="space-y-2 border border-slate-100 rounded-xl p-4 bg-slate-50">
              {DAYS.map(day => (
                <div key={day} className="flex items-start gap-3">
                  <span className="w-9 text-xs font-bold text-slate-500 pt-1.5 flex-shrink-0">{day}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SLOTS.map(slot => {
                      const active = (schedule[day] || []).includes(slot)
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleSlot(day, slot)}
                          className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                            active
                              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-[#3B82F6] hover:text-[#3B82F6]'
                          }`}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected slots summary */}
            {Object.keys(schedule).length > 0 && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle size={11} />
                {Object.entries(schedule)
                  .map(([d, slots]) => `${d}: ${slots.length} slot${slots.length !== 1 ? 's' : ''}`)
                  .join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="btn-outline text-sm px-5 py-2.5">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm px-6 py-2.5 flex items-center gap-2 disabled:opacity-70"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><Save size={14} /> Save Doctor</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Schedule summary helper ───────────────────────────────────────────────────
function scheduleSummary(schedule) {
  const days = Object.keys(schedule || {})
  if (!days.length) return 'No schedule set'
  return days
    .map(d => `${d}: ${(schedule[d] || []).length} slots`)
    .join(', ')
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DoctorSchedules() {
  const [doctors,    setDoctors]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [showModal,  setShowModal]  = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [toast,      setToast]      = useState('')  // success message

  // ── Fetch all doctors ───────────────────────────────────────────────────────
  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('name')

    if (error) {
      setFetchError(`Could not load doctors: ${error.message}`)
    } else {
      setDoctors(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchDoctors() }, [fetchDoctors])

  // ── Toggle active/inactive ──────────────────────────────────────────────────
  async function toggleActive(doc) {
    setTogglingId(doc.id)
    const { error } = await supabase
      .from('doctors')
      .update({ is_active: !doc.is_active })
      .eq('id', doc.id)

    if (error) {
      showToast(`Failed to update status: ${error.message}`, true)
    } else {
      await fetchDoctors()
    }
    setTogglingId(null)
  }

  // ── Show toast notification ─────────────────────────────────────────────────
  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  // ── Handle successful save ──────────────────────────────────────────────────
  function handleSaved(doctorName) {
    setShowModal(false)
    fetchDoctors()
    showToast(`✅ Dr. ${doctorName || 'Doctor'} saved successfully!`)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-[#1E3A8A] text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl animate-fade-in flex items-center gap-2">
          {toast}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#1E3A8A]">Doctor Profiles</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDoctors}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-[#1E3A8A] transition"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-sm flex items-center gap-2 py-2.5 px-4"
          >
            <Plus size={15} /> Add Doctor
          </button>
        </div>
      </div>

      {/* Fetch error */}
      {fetchError && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
          <AlertCircle size={15} /> {fetchError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {['Name', 'Specialty', 'Qualification', 'Schedule', 'Status'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : doctors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400 text-sm">
                    No doctors added yet. Click "Add Doctor" to get started.
                  </td>
                </tr>
              ) : (
                doctors.map(doc => (
                  <tr
                    key={doc.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Name + phone */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {doc.name.split(' ').slice(-1)[0]?.[0]?.toUpperCase() || 'D'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{doc.name}</p>
                          {doc.phone && (
                            <p className="text-xs text-slate-400">{doc.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Specialty */}
                    <td className="px-4 py-3 text-[#3B82F6] font-medium">{doc.specialty}</td>

                    {/* Qualification */}
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {doc.qualification || '—'}
                    </td>

                    {/* Schedule */}
                    <td className="px-4 py-3">
                      <p
                        className="text-xs text-slate-500 max-w-[200px] truncate"
                        title={scheduleSummary(doc.schedule)}
                      >
                        <Clock size={11} className="inline mr-1 text-slate-400" />
                        {scheduleSummary(doc.schedule)}
                      </p>
                    </td>

                    {/* Status toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(doc)}
                        disabled={togglingId === doc.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                          doc.is_active
                            ? 'bg-green-50 text-green-600 border-green-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                            : 'bg-red-50 text-red-500 border-red-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
                        }`}
                      >
                        {togglingId === doc.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : doc.is_active ? (
                          <><CheckCircle size={11} /> Active</>
                        ) : (
                          <><XCircle size={11} /> Inactive</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && doctors.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 text-right">
            {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} registered
          </div>
        )}
      </div>

      {/* Add Doctor Modal */}
      {showModal && (
        <AddDoctorModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
