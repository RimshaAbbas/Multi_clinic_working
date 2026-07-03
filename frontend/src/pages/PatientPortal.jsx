/**
 * PatientPortal.jsx  — Route: /
 * --------------------------------
 * Public-facing booking interface for DOCTOR CONSULTATIONS only.
 *
 * Lab tests are NOT booked here. They are prescribed by the doctor
 * during a consultation and managed by the hospital's lab staff.
 *
 * Flow:
 *   1. Patient picks a doctor (filtered by specialty)
 *   2. Patient picks date & time slot
 *   3. Patient fills in their contact details
 *   4. Booking saved to `appointments` table in Supabase
 *   5. Admin dashboard receives it in real time
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Stethoscope, User, Phone, Mail, Calendar, Clock,
  ChevronRight, CheckCircle, AlertCircle, Loader2, Activity,
  FlaskConical, ArrowRight, Search,
} from 'lucide-react'
import supabase from '../lib/supabaseClient'

// ── All available time slots ──────────────────────────────────────────────────
const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '02:00 PM',
  '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
  '04:30 PM', '05:00 PM',
]

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
}

// ── Step section header ───────────────────────────────────────────────────────
function StepTitle({ number, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-[#1E3A8A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <h2 className="text-base font-bold text-[#1E3A8A]">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ── Confirmation screen ───────────────────────────────────────────────────────
function ConfirmationScreen({ booking, doctorName, onReset }) {
  return (
    <div className="text-center py-8 animate-fade-in">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow">
        <CheckCircle size={40} className="text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-[#1E3A8A] mb-1">Appointment Booked!</h2>
      <p className="text-slate-500 text-sm mb-1">Reference: <span className="font-mono font-bold text-[#1E3A8A]">#{booking.id.slice(0,8).toUpperCase()}</span></p>
      <p className="text-xs text-slate-400 mb-7">Our staff will confirm your slot shortly. Please arrive 10 minutes early.</p>

      <div className="max-w-sm mx-auto bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left space-y-3 text-sm mb-7">
        {[
          ['Patient',  booking.patient_name],
          ['Doctor',   doctorName],
          ['Date',     booking.appointment_date],
          ['Time',     booking.appointment_time],
          ['Status',   'Pending confirmation'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <span className="text-slate-400">{k}</span>
            <span className="font-semibold text-slate-800 text-right">{v}</span>
          </div>
        ))}
      </div>

      {/* Info about lab tests */}
      <div className="max-w-sm mx-auto bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left mb-7">
        <div className="flex items-start gap-2.5">
          <FlaskConical size={16} className="text-[#3B82F6] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#1E3A8A] mb-1">Need a Lab Test?</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              If your doctor prescribes a lab test during your consultation,
              the hospital's lab team will automatically receive the order and
              notify you when your results are ready.
            </p>
          </div>
        </div>
      </div>

      <button onClick={onReset} className="btn-primary text-sm">Book Another Appointment</button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PatientPortal() {
  const [doctors,     setDoctors]     = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [specFilter,  setSpecFilter]  = useState('all')
  const [searchTerm,  setSearchTerm]  = useState('')

  // Pre-compute today and tomorrow strings once (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [form, setForm] = useState({
    patient_name:     '',
    patient_phone:    '',
    patient_email:    '',
    appointment_date: tomorrow,   // default to tomorrow — no past dates
    appointment_time: '',
    reason:           '',
  })
  const [errors,      setErrors]      = useState({})
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmed,   setConfirmed]   = useState(null)

  // ── Fetch active doctors ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setDataLoading(true)
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (!error) setDoctors(data || [])
      setDataLoading(false)
    }
    load()
  }, [])

  // Unique specialties for filter pills
  const specialties = ['all', ...new Set(doctors.map(d => d.specialty))]

  const filteredDoctors = doctors.filter(d => {
    const matchSpec = specFilter === 'all' || d.specialty === specFilter
    const matchSearch = !searchTerm.trim() ||
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    return matchSpec && matchSearch
  })

  // ── Validation ────────────────────────────────────────────────────────────
  function validate() {
    const e = {}
    if (!selectedDoctor)                       e.doctor        = 'Please select a doctor.'
    if (!form.patient_name.trim())             e.patient_name  = 'Full name is required.'
    if (!form.patient_phone.trim())            e.patient_phone = 'Phone number is required.'
    else if (!/^[0-9+\s\-()]{7,15}$/.test(form.patient_phone.trim()))
                                               e.patient_phone = 'Enter a valid phone number.'
    if (form.patient_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.patient_email))
                                               e.patient_email = 'Enter a valid email.'
    if (!form.appointment_date) {
      e.appointment_date = 'Date is required.'
    } else if (form.appointment_date < today) {
      e.appointment_date = 'You cannot book an appointment in the past. Please select today or a future date.'
    }
    if (!form.appointment_time)                e.appointment_time = 'Time slot is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        doctor_id:        selectedDoctor.id,
        patient_name:     form.patient_name.trim(),
        patient_phone:    form.patient_phone.trim(),
        patient_email:    form.patient_email.trim() || null,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        reason:           form.reason.trim() || null,
        status:           'pending',
      }])
      .select()
      .single()

    if (error) {
      // Translate technical Supabase errors into human-friendly messages
      if (error.message?.includes('row-level security') || error.code === '42501') {
        setSubmitError(
          'Booking system is not fully configured yet. ' +
          'Please ask the clinic staff to run the database setup.'
        )
      } else if (error.message?.includes('violates check constraint')) {
        setSubmitError('Please check your details and try again.')
      } else if (error.message?.includes('not-null') || error.message?.includes('null value')) {
        setSubmitError('Please fill in all required fields.')
      } else {
        setSubmitError(error.message || 'Booking failed. Please try again.')
      }
      setSubmitting(false)
      return
    }

    setConfirmed(data)
    setSubmitting(false)
  }

  function handleReset() {
    setConfirmed(null)
    setSelectedDoctor(null)
    setForm({
      patient_name:     '',
      patient_phone:    '',
      patient_email:    '',
      appointment_date: tomorrow,   // reset to tomorrow, not empty
      appointment_time: '',
      reason:           '',
    })
    setErrors({})
    setSubmitError('')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">

      {/* Header */}
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-xl flex items-center justify-center shadow">
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-[#1E3A8A] leading-none">MultiCare</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none mt-0.5">Clinic Portal</p>
            </div>
          </div>
          <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-[#1E3A8A] transition-colors flex items-center gap-1">
            Staff Login <ChevronRight size={13} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#1d4ed8] py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Book a Consultation</h1>
          <p className="text-blue-200">Choose your specialist and schedule a visit at your convenience.</p>

          {/* Lab test info strip */}
          <div className="mt-5 inline-flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-blue-100">
            <FlaskConical size={15} className="text-blue-300 flex-shrink-0" />
            <span>Lab tests are prescribed by your doctor during the consultation — no separate booking needed.</span>
          </div>
        </div>
      </div>

      {/* Main form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-100 p-6 md:p-10">

          {confirmed ? (
            <ConfirmationScreen
              booking={confirmed}
              doctorName={selectedDoctor?.name || ''}
              onReset={handleReset}
            />
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-8">

              {/* ── Step 1: Pick a doctor ──────────────────────────── */}
              <div>
                <StepTitle number="1" title="Select a Doctor" subtitle="Filter by specialty or search by name" />

                {/* Search + filters */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search doctor or specialty…"
                      className="input-field pl-8 py-2.5 text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {specialties.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSpecFilter(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          specFilter === s
                            ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#3B82F6]'
                        }`}
                      >
                        {s === 'all' ? 'All' : s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Doctor grid */}
                {dataLoading ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
                  </div>
                ) : filteredDoctors.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No doctors found for this filter.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {filteredDoctors.map(doc => {
                      const isSelected = selectedDoctor?.id === doc.id
                      const initials   = doc.name.split(' ').slice(-1)[0]?.[0] || 'D'
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => { setSelectedDoctor(doc); setErrors(er => ({...er, doctor: ''})) }}
                          className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                            isSelected
                              ? 'border-[#1E3A8A] bg-[#1E3A8A]/5 shadow-md'
                              : 'border-slate-200 bg-white hover:border-[#3B82F6] hover:shadow-sm'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-800 truncate">{doc.name}</p>
                            <p className="text-xs text-[#3B82F6] font-medium">{doc.specialty}</p>
                            {doc.qualification && <p className="text-xs text-slate-400 truncate">{doc.qualification}</p>}
                          </div>
                          {isSelected && <CheckCircle size={16} className="text-[#1E3A8A] flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
                {errors.doctor && <p className="error-msg mt-2"><AlertCircle size={11} />{errors.doctor}</p>}
              </div>

              {/* ── Step 2: Date & Time ───────────────────────────── */}
              {selectedDoctor && (
                <div>
                  <StepTitle number="2" title="Choose Date & Time" />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Appointment Date</label>
                      <input
                        type="date"
                        min={today}
                        value={form.appointment_date}
                        onChange={e => {
                          const picked = e.target.value
                          // Double-check: reject past dates even if browser allows it
                          if (picked && picked < today) {
                            setErrors(er => ({
                              ...er,
                              appointment_date: 'Past dates are not allowed. Please select today or a future date.'
                            }))
                            setForm(f => ({...f, appointment_date: today}))
                            return
                          }
                          setForm(f => ({...f, appointment_date: picked}))
                          setErrors(er => ({...er, appointment_date: ''}))
                        }}
                        className={`input-field ${errors.appointment_date ? 'border-red-400' : ''}`}
                      />
                      {errors.appointment_date && (
                        <p className="error-msg"><AlertCircle size={11} />{errors.appointment_date}</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Time Slot</label>
                      <select
                        value={form.appointment_time}
                        onChange={e => { setForm(f => ({...f, appointment_time: e.target.value})); setErrors(er => ({...er, appointment_time: ''})) }}
                        className={`input-field ${errors.appointment_time ? 'border-red-400' : ''}`}
                      >
                        <option value="">— Select a time —</option>
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {errors.appointment_time && <p className="error-msg"><AlertCircle size={11} />{errors.appointment_time}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Patient details ───────────────────────── */}
              {form.appointment_time && (
                <div>
                  <StepTitle number="3" title="Your Details" />
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Full Name *</label>
                        <div className="relative">
                          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" value={form.patient_name} placeholder="e.g. Fatima Zahra"
                            onChange={e => { setForm(f => ({...f, patient_name: e.target.value})); setErrors(er => ({...er, patient_name: ''})) }}
                            className={`input-field pl-9 ${errors.patient_name ? 'border-red-400' : ''}`} />
                        </div>
                        {errors.patient_name && <p className="error-msg"><AlertCircle size={11} />{errors.patient_name}</p>}
                      </div>
                      <div>
                        <label className="label">Phone Number *</label>
                        <div className="relative">
                          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="tel" value={form.patient_phone} placeholder="+92 300 0000000"
                            onChange={e => { setForm(f => ({...f, patient_phone: e.target.value})); setErrors(er => ({...er, patient_phone: ''})) }}
                            className={`input-field pl-9 ${errors.patient_phone ? 'border-red-400' : ''}`} />
                        </div>
                        {errors.patient_phone && <p className="error-msg"><AlertCircle size={11} />{errors.patient_phone}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="label">Email (optional)</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" value={form.patient_email} placeholder="you@email.com"
                          onChange={e => { setForm(f => ({...f, patient_email: e.target.value})); setErrors(er => ({...er, patient_email: ''})) }}
                          className={`input-field pl-9 ${errors.patient_email ? 'border-red-400' : ''}`} />
                      </div>
                      {errors.patient_email && <p className="error-msg"><AlertCircle size={11} />{errors.patient_email}</p>}
                    </div>
                    <div>
                      <label className="label">Reason / Symptoms (optional)</label>
                      <textarea rows={3} value={form.reason} placeholder="Briefly describe your concern or symptoms…"
                        onChange={e => setForm(f => ({...f, reason: e.target.value}))}
                        className="input-field resize-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Submit ────────────────────────────────────────── */}
              {form.patient_name && (
                <div>
                  {submitError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm">
                      <AlertCircle size={15} /> {submitError}
                    </div>
                  )}
                  <button type="submit" disabled={submitting}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base disabled:opacity-70">
                    {submitting
                      ? <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                      : <><Calendar size={18} /> Confirm Appointment</>
                    }
                  </button>
                </div>
              )}

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
